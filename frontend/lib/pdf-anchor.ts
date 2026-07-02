/**
 * pdf-anchor.ts
 *
 * Matches issue source_excerpts against reconstructed PDF text,
 * returning multi-rect anchors with CSS-pixel bounding boxes ready
 * for direct use in the overlay layer.
 *
 * Confidence tiers:
 *   "exact"       — normalized substring found in PDF text layer
 *   "approximate" — token sequence match (≥70% density, ≤2.5× needle length)
 *   "none"        — no match; issue goes to unanchored strip
 */

import type { Issue } from "@/types/workspace"
import { normalizeNeedle } from "@/lib/anchor-match"
import {
  reconstructPageText, buildMultiPageText,
  type RawTextItem, type ReconstructedPage, type MultiPageText,
} from "@/lib/pdf-text"

// ── Exported types ────────────────────────────────────────────────────────────

export interface PDFAnchorRect {
  /** CSS pixels from left edge of the page container div. */
  x: number
  /** CSS pixels from top edge of the page container div. */
  y: number
  width: number
  height: number
  pageIndex: number
}

export interface PDFAnchor {
  issueIndex: number
  /** One rect per visual line of the matched region, top-to-bottom. */
  rects: PDFAnchorRect[]
  /** Right-margin pin position, aligned to first matched line. */
  pin: { x: number; y: number; pageIndex: number }
  confidence: "exact" | "approximate" | "none"
}

// ── Text normalisation (haystack form) ───────────────────────────────────────

/**
 * Normalise multi-page text for matching.
 * Only lowercase + \n→space — both 1-to-1 so positions are preserved exactly.
 */
function normHaystack(s: string): string {
  return s.toLowerCase().replace(/\n/g, " ")
}

// ── Token-sequence match (approximate) ───────────────────────────────────────

const STOP = new Set([
  "the","and","of","in","a","an","to","for","is","was","with","at","by",
  "on","as","are","be","or","it","its","this","that","not","but","from",
  "my","we","our","their","your",
])

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

function tokenMatch(
  needle: string,
  haystack: string,
): { start: number; end: number } | null {
  const tokens = needle
    .split(/[\s,.\-!?;:'"()/\\]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3 && !STOP.has(t))
    .slice(0, 8)

  if (tokens.length < 4) return null

  const maxLen = needle.length * 2.5
  let re: RegExp
  try {
    re = new RegExp(tokens.map(escapeRe).join("[\\w\\s,\\.\\-'\"/]{0,25}"), "gi")
  } catch { return null }

  let best: { start: number; end: number; len: number } | null = null
  let m: RegExpExecArray | null
  while ((m = re.exec(haystack)) !== null) {
    const len = m[0].length
    if (len > maxLen) continue
    const hits = tokens.filter(t => m![0].includes(t)).length
    if (hits / tokens.length < 0.7) continue
    if (!best || len < best.len) best = { start: m.index, end: m.index + len, len }
  }
  return best ? { start: best.start, end: best.end } : null
}

// ── Coordinate conversion ─────────────────────────────────────────────────────

/**
 * Convert a PDF text item's position from PDF user space to CSS pixels.
 * PDF origin: bottom-left, y↑.  CSS origin: top-left, y↓.
 *
 * pageHeightPx = viewport.height (already in CSS pixels = pagePts × scale).
 */
function itemToCanvasBbox(
  item: RawTextItem,
  pageHeightPx: number,
  scale: number,
): { x: number; y: number; w: number; h: number } {
  const pdfX = item.transform[4]
  const pdfY = item.transform[5]
  const pdfW = item.width
  const pdfH = item.height

  return {
    x: pdfX * scale,
    y: pageHeightPx - pdfY * scale - pdfH * scale,
    w: Math.max(pdfW * scale, 1),   // floor at 1px so zero-width items show a sliver
    h: Math.max(pdfH * scale, 4),   // floor at 4px for tiny subscript/superscript items
  }
}

// ── Multi-rect derivation ─────────────────────────────────────────────────────

/**
 * Given a set of matched item indices (within one page), group them into
 * visual lines and return one PDFAnchorRect per line.
 *
 * Uses the same y-tolerance as pdf-text.ts reconstructPageText.
 */
function rectsFromItems(
  itemIndices: number[],
  items: RawTextItem[],
  pageHeightPx: number,
  scale: number,
  pageIndex: number,
): PDFAnchorRect[] {
  const unique = Array.from(new Set(itemIndices.filter(i => i >= 0)))
  if (unique.length === 0) return []

  const matched = unique.map(i => items[i]).filter(Boolean)

  // Sort: top of page first (descending PDF y), then left
  matched.sort((a, b) => {
    const dy = b.transform[5] - a.transform[5]
    return Math.abs(dy) > 0.01 ? dy : a.transform[4] - b.transform[4]
  })

  // Group into visual lines
  const lineGroups: RawTextItem[][] = []
  for (const item of matched) {
    const last = lineGroups[lineGroups.length - 1]
    if (last) {
      const prev = last[last.length - 1]
      const tol = Math.max(Math.max(prev.height, item.height) * 0.5, 2)
      if (Math.abs(item.transform[5] - prev.transform[5]) <= tol) {
        last.push(item); continue
      }
    }
    lineGroups.push([item])
  }

  return lineGroups.map(group => {
    const xs  = group.map(i => i.transform[4])
    const xrs = group.map(i => i.transform[4] + i.width)
    const ys  = group.map(i => i.transform[5])
    const hs  = group.map(i => i.height)

    const pdfX = Math.min(...xs)
    const pdfXR = Math.max(...xrs)
    const pdfY  = Math.min(...ys)          // lowest baseline in group
    const pdfH  = Math.max(...hs)          // tallest font in group

    return {
      x:      pdfX * scale,
      y:      pageHeightPx - pdfY * scale - pdfH * scale,
      width:  Math.max((pdfXR - pdfX) * scale, 4),
      height: Math.max(pdfH * scale, 4),
      pageIndex,
    }
  })
}

// ── Pin position ──────────────────────────────────────────────────────────────

function derivePin(
  rects: PDFAnchorRect[],
  pageWidthPx: number,
): { x: number; y: number; pageIndex: number } {
  const first = rects[0]
  return {
    x: pageWidthPx - 10,                   // 10px from right edge
    y: first.y + first.height * 0.5,        // midpoint of first line
    pageIndex: first.pageIndex,
  }
}

// ── Anchorability test ────────────────────────────────────────────────────────

/**
 * True when an issue carries enough document evidence to even attempt a PDF
 * anchor: a non-trivial source_excerpt and a type that refers to a concrete
 * passage (keyword_gap / missing_section describe ABSENT content, so they are
 * unanchorable by design and live in the unanchored strip).
 *
 * Exported as the single source of truth for the anchored-coverage ratio in
 * PDFViewer — the denominator must use exactly the same precondition as the
 * matcher, or coverage measurement drifts from reality.
 */
export function isAnchorableIssue(issue: Issue): boolean {
  if (!issue.source_excerpt?.trim()) return false
  if (issue.issue_type === "keyword_gap" || issue.issue_type === "missing_section") return false
  return normalizeNeedle(issue.source_excerpt).length >= 8
}

// ── Per-issue anchor computation ──────────────────────────────────────────────

function computeAnchorForIssue(
  issue: Issue,
  issueIndex: number,
  mpt: MultiPageText,
  pageDims: Array<{ w: number; h: number }>,
  scale: number,
): PDFAnchor {
  const noAnchor: PDFAnchor = { issueIndex, rects: [], pin: { x: 0, y: 0, pageIndex: 0 }, confidence: "none" }

  if (!isAnchorableIssue(issue)) return noAnchor

  const needle = normalizeNeedle(issue.source_excerpt)

  const haystack = normHaystack(mpt.text)

  // ── Step 1: exact normalized substring ──────────────────────────────────
  let matchStart = -1, matchEnd = -1, confidence: "exact" | "approximate" = "exact"

  const exactIdx = haystack.indexOf(needle)
  if (exactIdx >= 0) {
    matchStart = exactIdx
    matchEnd = exactIdx + needle.length
  } else {
    // ── Step 2: token-sequence match ──────────────────────────────────────
    const tok = tokenMatch(needle, haystack)
    if (!tok) return noAnchor
    matchStart = tok.start
    matchEnd = tok.end
    confidence = "approximate"
  }

  // Collect matched item indices, grouped by page
  const byPage = new Map<number, number[]>()
  for (let ci = matchStart; ci < matchEnd; ci++) {
    const itemIdx = mpt.charItemMap[ci]
    const pageIdx = mpt.charPageMap[ci]
    if (itemIdx < 0 || pageIdx < 0) continue
    if (!byPage.has(pageIdx)) byPage.set(pageIdx, [])
    byPage.get(pageIdx)!.push(itemIdx)
  }

  if (byPage.size === 0) return noAnchor

  // For each page that has matched items, compute rects
  // Phase 1: only handle single-page matches (résumé bullets don't cross pages)
  // Cross-page matches are treated as approximate and use the first page only
  const allRects: PDFAnchorRect[] = []
  const sortedPageIndices = Array.from(byPage.keys()).sort((a, b) => a - b)

  for (const pi of sortedPageIndices) {
    const indices = byPage.get(pi)!
    const pageDim = pageDims[pi]
    if (!pageDim) continue
    const page = mpt.pages[pi]
    if (!page) continue
    const rects = rectsFromItems(indices, page.items, pageDim.h, scale, pi)
    allRects.push(...rects)
  }

  if (allRects.length === 0) return noAnchor

  // Sort all rects top-to-bottom globally (by page, then y within page)
  allRects.sort((a, b) =>
    a.pageIndex !== b.pageIndex ? a.pageIndex - b.pageIndex : a.y - b.y,
  )

  const firstPageDim = pageDims[allRects[0].pageIndex]
  const pin = derivePin(allRects, firstPageDim?.w ?? 600)

  return { issueIndex, rects: allRects, pin, confidence }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Compute PDF anchors for all issues.
 *
 * @param textContents  Raw getTextContent() results, one per page
 * @param pageDims      CSS pixel dimensions of each rendered page
 * @param issues        All scan issues
 * @param scale         Render scale used (e.g. 1.5)
 */
export function computePDFAnchors(
  textContents: Array<{ items: unknown[] }>,
  pageDims: Array<{ w: number; h: number }>,
  issues: Issue[],
  scale: number,
): PDFAnchor[] {
  // Reconstruct text for each page
  const pages: ReconstructedPage[] = textContents.map((tc, pi) =>
    reconstructPageText(tc, pi),
  )

  // Bail early if no text was extracted (image-based PDF)
  const totalChars = pages.reduce((s, p) => s + p.text.trim().length, 0)
  if (totalChars < 20) {
    if (process.env.NODE_ENV === "development") {
      console.log("[TraceRank PDF] No text extracted — image-based PDF, falling back to ATS text")
    }
    return []
  }

  const mpt = buildMultiPageText(pages)
  const anchors = issues.map((issue, i) =>
    computeAnchorForIssue(issue, i, mpt, pageDims, scale),
  )

  // ── Dev diagnostics ────────────────────────────────────────────────────────
  if (process.env.NODE_ENV === "development") {
    const exact  = anchors.filter(a => a.confidence === "exact").length
    const approx = anchors.filter(a => a.confidence === "approximate").length
    const none   = anchors.filter(a => a.confidence === "none").length
    console.log(
      `[TraceRank PDF] anchors: ${exact} exact, ${approx} approx, ${none} none / ${issues.length} total`,
      `| pages: ${pages.length}`,
      `| chars: ${totalChars}`,
    )
  }

  return anchors
}
