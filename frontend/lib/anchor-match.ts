/**
 * anchor-match.ts
 *
 * Phase 1 text-span anchor matching for the annotated ATS text viewer.
 * Pure functions — no React, no I/O, no side effects.
 *
 * Implements the exact normalization pipeline, fallback match order,
 * overlap merging, and segment builder from the Phase 1 spec.
 */

import type { Issue } from "@/types/workspace"

// ── Types ─────────────────────────────────────────────────────────────────────

export type AnchorConfidence = "high" | "medium" | "section" | "absent" | "none"

export interface AnchorResult {
  issueIndex: number
  confidence: AnchorConfidence
  /** Offset into original ats_text_preview string. */
  charStart?: number
  charEnd?: number
  /** Set when confidence === 'section'. */
  sectionKey?: string
  severity: string
}

export interface RenderSpan {
  start: number
  end: number
  issueIndices: number[]
  severity: string        // highest among constituent issues
  confidence: "high" | "medium" | "section"
}

export interface SectionBlock {
  sectionKey: string
  start: number
  end: number
}

export type Segment =
  | { type: "text";   content: string; start: number; end: number }
  | { type: "inline"; content: string; span: RenderSpan; start: number; end: number }

// ── Issue type → section hint ─────────────────────────────────────────────────

const ISSUE_SECTION_MAP: Record<string, string | null> = {
  keyword_gap:              null,
  weak_phrasing:            "experience",
  missing_section:          null,
  low_quantification:       "experience",
  summary_keyword_mismatch: "summary",
}

// ── Severity ordering ─────────────────────────────────────────────────────────

const SEV_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 }

function higherSeverity(a: string, b: string): string {
  return (SEV_ORDER[a] ?? 0) >= (SEV_ORDER[b] ?? 0) ? a : b
}

// ── Normalization pipeline ────────────────────────────────────────────────────

/** Remove leading and trailing "..." excerpt wrapper sequences. */
function stripExcerptWrappers(text: string): string {
  return text.replace(/^\.{3}\s*/, "").replace(/\s*\.{3}$/, "").trim()
}

/**
 * Normalize a source_excerpt (needle) for matching.
 *
 * Pipeline:
 *   1. Strip "..." wrappers
 *   2. Replace non-ASCII [^0x20-0x7E] with space  (mirrors _strip_to_ats)
 *   3. Collapse whitespace: \n \r \t → space, then 2+ spaces → 1
 *   4. Trim
 *   5. Lowercase (comparison form only)
 */
export function normalizeNeedle(raw: string): string {
  let s = stripExcerptWrappers(raw)
  s = s.replace(/[^\x20-\x7E]/g, " ")   // step 2
  s = s.replace(/[\n\r\t]/g, " ")        // step 3a
  s = s.replace(/ {2,}/g, " ")           // step 3b
  s = s.trim()                           // step 4
  s = s.toLowerCase()                    // step 5
  return s
}

/**
 * Produce the matching form of ats_text_preview.
 *
 * ats_text_preview is already ASCII-only with collapsed spaces (from _strip_to_ats).
 * Only changes: lowercase + \n → space.
 * Positions in normHaystack are IDENTICAL to positions in the original atsText
 * (both substitutions are 1:1 — no length change).
 */
export function normalizeHaystack(atsText: string): string {
  return atsText.toLowerCase().replace(/\n/g, " ")
}

// ── Section block detection ───────────────────────────────────────────────────

/**
 * Locate each section's text block within atsText by probing with the
 * first 60 normalized characters of its content.
 *
 * Returns blocks sorted by start position.
 * Sections whose probe text is not found (encoding drift, very short content)
 * are silently omitted.
 */
export function findSectionBlocks(
  atsText: string,
  sections: Record<string, string>,
): SectionBlock[] {
  const normHaystack = normalizeHaystack(atsText)
  const hits: Array<{ sectionKey: string; start: number }> = []

  for (const [key, text] of Object.entries(sections)) {
    if (key === "_unparsed" || !text.trim()) continue
    const probe = normalizeNeedle(text.slice(0, 60))
    if (probe.length < 8) continue
    const idx = normHaystack.indexOf(probe)
    if (idx >= 0) hits.push({ sectionKey: key, start: idx })
  }

  hits.sort((a, b) => a.start - b.start)

  return hits.map((h, i) => ({
    sectionKey: h.sectionKey,
    start: h.start,
    end: hits[i + 1]?.start ?? atsText.length,
  }))
}

// ── Step 3: Token sequence match ──────────────────────────────────────────────

const STOP_WORDS = new Set([
  "the", "and", "of", "in", "a", "an", "to", "for", "is", "was", "with",
  "at", "by", "on", "as", "are", "be", "or", "it", "its", "this", "that",
  "not", "but", "from", "my", "we", "our", "their", "your",
])

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

interface MatchWindow { start: number; end: number }

/**
 * Find the densest (shortest) contiguous region in normHaystack that
 * contains ≥70% of the needle's meaningful tokens in order.
 *
 * Rejects any candidate region longer than 2.5× the needle's length.
 * If multiple candidates qualify, returns the shortest.
 *
 * Returns null when fewer than 4 meaningful tokens exist or no match qualifies.
 */
function tokenSequenceMatch(
  normNeedle: string,
  normHaystack: string,
): MatchWindow | null {
  // Extract meaningful tokens (≥3 chars, not stop words, cap at 8)
  const tokens = normNeedle
    .split(/[\s,.\-!?;:'"()/\\]+/)
    .map(t => t.trim())
    .filter(t => t.length >= 3 && !STOP_WORDS.has(t))
    .slice(0, 8)

  if (tokens.length < 4) return null

  const maxLen = normNeedle.length * 2.5
  // Allow up to 25 chars of filler between each token pair
  const pattern = tokens.map(escapeRe).join("[\\w\\s,\\.\\-'\"/]{0,25}")
  let re: RegExp
  try {
    re = new RegExp(pattern, "gi")
  } catch {
    return null // malformed pattern — skip
  }

  let best: (MatchWindow & { regionLen: number }) | null = null
  let m: RegExpExecArray | null

  while ((m = re.exec(normHaystack)) !== null) {
    const regionLen = m[0].length
    // Spec: reject if region > 2.5× needle length
    if (regionLen > maxLen) continue
    // Density check: ≥70% of tokens present in matched region
    const matchedCount = tokens.filter(t => m![0].includes(t)).length
    if (matchedCount / tokens.length < 0.7) continue
    // Spec: choose shortest (densest) qualifying region
    if (!best || regionLen < best.regionLen) {
      best = { start: m.index, end: m.index + regionLen, regionLen }
    }
  }

  return best ? { start: best.start, end: best.end } : null
}

// ── Per-issue anchor computation ──────────────────────────────────────────────

/**
 * Compute the anchor for one issue, running through the full fallback chain:
 *   1. Exact normalized substring match (full haystack)
 *   2. Section-constrained exact match (if section hint available)
 *   3. Token sequence match (section-constrained, then full haystack fallback)
 *   4. Section-level block fallback
 *   5. No-anchor
 *
 * Positions in the returned charStart/charEnd are offsets into the original
 * atsText string (not the normalized form).
 */
export function computeAnchor(
  issue: Issue,
  issueIndex: number,
  normHaystack: string,
  sectionBlocks: SectionBlock[],
): AnchorResult {
  const base = { issueIndex, severity: issue.severity }

  // Unconditional no-anchor issue types
  if (issue.issue_type === "missing_section") {
    return { ...base, confidence: "absent" }
  }
  if (issue.issue_type === "keyword_gap" || !issue.source_excerpt?.trim()) {
    return { ...base, confidence: "none" }
  }

  const normNeedle = normalizeNeedle(issue.source_excerpt)

  // Minimum length gate (< 8 chars → too short to match reliably)
  if (normNeedle.length < 8) {
    return { ...base, confidence: "none" }
  }

  const sectionHint = ISSUE_SECTION_MAP[issue.issue_type] ?? null
  const block = sectionHint ? sectionBlocks.find(b => b.sectionKey === sectionHint) : null

  // ── Step 1: Exact normalized match (full haystack) ──────────────────────
  const idx = normHaystack.indexOf(normNeedle)
  if (idx >= 0) {
    return { ...base, confidence: "high", charStart: idx, charEnd: idx + normNeedle.length }
  }

  // ── Step 2: Section-constrained exact match ─────────────────────────────
  if (block) {
    const windowNorm = normHaystack.slice(block.start, block.end)
    const relIdx = windowNorm.indexOf(normNeedle)
    if (relIdx >= 0) {
      return {
        ...base, confidence: "high",
        charStart: block.start + relIdx,
        charEnd: block.start + relIdx + normNeedle.length,
      }
    }
  }

  // ── Step 3a: Token match in section window ──────────────────────────────
  if (block) {
    const windowNorm = normHaystack.slice(block.start, block.end)
    const tok = tokenSequenceMatch(normNeedle, windowNorm)
    if (tok) {
      return {
        ...base, confidence: "medium",
        charStart: block.start + tok.start,
        charEnd: block.start + tok.end,
      }
    }
  }

  // ── Step 3b: Token match on full haystack (section fallback) ────────────
  const tokFull = tokenSequenceMatch(normNeedle, normHaystack)
  if (tokFull) {
    return {
      ...base, confidence: "medium",
      charStart: tokFull.start,
      charEnd: tokFull.end,
    }
  }

  // ── Step 4: Section-level block ─────────────────────────────────────────
  if (block) {
    return {
      ...base, confidence: "section",
      charStart: block.start, charEnd: block.end,
      sectionKey: sectionHint!,
    }
  }

  // ── Step 5: No anchor ────────────────────────────────────────────────────
  return { ...base, confidence: "none" }
}

// ── Batch computation ─────────────────────────────────────────────────────────

export function computeAllAnchors(
  issues: Issue[],
  atsText: string,
  sections: Record<string, string>,
): { anchors: AnchorResult[]; sectionBlocks: SectionBlock[] } {
  if (!atsText?.trim()) {
    return {
      anchors: issues.map((iss, i) => ({
        issueIndex: i, confidence: "none" as const, severity: iss.severity,
      })),
      sectionBlocks: [],
    }
  }
  const normHaystack = normalizeHaystack(atsText)
  const sectionBlocks = findSectionBlocks(atsText, sections)
  const anchors = issues.map((issue, i) =>
    computeAnchor(issue, i, normHaystack, sectionBlocks)
  )
  return { anchors, sectionBlocks }
}

// ── Span merging ──────────────────────────────────────────────────────────────

/**
 * Merge overlapping inline spans (high/medium confidence) into a
 * non-overlapping set of RenderSpans, sorted by start position.
 *
 * Merge rules:
 *   - Severity: take the highest among constituent issues.
 *   - Confidence: take the lowest (medium beats high if any is medium).
 *
 * Section-level anchors are returned separately — they are block-level
 * and do not participate in inline merging.
 */
export function mergeSpans(anchors: AnchorResult[]): {
  inlineSpans: RenderSpan[]
  sectionSpans: RenderSpan[]
} {
  const inline = anchors.filter(
    a => (a.confidence === "high" || a.confidence === "medium") &&
         a.charStart !== undefined && a.charEnd !== undefined,
  )
  const sectionAnchors = anchors.filter(
    a => a.confidence === "section" && a.charStart !== undefined,
  )

  // Sort: by start asc, then end desc (so longer spans come first when starts match)
  const sorted = [...inline].sort((a, b) =>
    a.charStart! !== b.charStart!
      ? a.charStart! - b.charStart!
      : b.charEnd! - a.charEnd!,
  )

  const merged: RenderSpan[] = []
  for (const anchor of sorted) {
    const last = merged[merged.length - 1]
    if (last && anchor.charStart! < last.end) {
      // Overlapping — extend existing span
      last.end = Math.max(last.end, anchor.charEnd!)
      last.issueIndices.push(anchor.issueIndex)
      last.severity = higherSeverity(last.severity, anchor.severity)
      if (anchor.confidence === "medium") last.confidence = "medium"
    } else {
      merged.push({
        start: anchor.charStart!,
        end: anchor.charEnd!,
        issueIndices: [anchor.issueIndex],
        severity: anchor.severity,
        confidence: anchor.confidence as "high" | "medium",
      })
    }
  }

  const sectionSpans: RenderSpan[] = sectionAnchors.map(a => ({
    start: a.charStart!,
    end: a.charEnd!,
    issueIndices: [a.issueIndex],
    severity: a.severity,
    confidence: "section" as const,
  }))

  return { inlineSpans: merged, sectionSpans }
}

// ── Segment builder ───────────────────────────────────────────────────────────

/**
 * Split atsText into text/inline segments based on a sorted,
 * non-overlapping list of inline spans.
 *
 * Every segment carries explicit start/end offsets into atsText.
 * These are the source of truth for position-dependent logic downstream
 * (section block grouping, etc.) — never re-derive them via indexOf.
 */
export function buildSegments(atsText: string, inlineSpans: RenderSpan[]): Segment[] {
  const segments: Segment[] = []
  let pos = 0

  for (const span of inlineSpans) {
    const start = Math.max(span.start, pos)
    const end   = Math.min(span.end, atsText.length)
    if (start >= end) continue

    if (start > pos) {
      segments.push({ type: "text", content: atsText.slice(pos, start), start: pos, end: start })
    }
    segments.push({ type: "inline", content: atsText.slice(start, end), span, start, end })
    pos = end
  }

  if (pos < atsText.length) {
    segments.push({ type: "text", content: atsText.slice(pos), start: pos, end: atsText.length })
  }

  return segments
}

// ── Helpers for UI ────────────────────────────────────────────────────────────

/** Map issue index → which RenderSpan contains it (if any). */
export function buildIssueSpanMap(
  inlineSpans: RenderSpan[],
  sectionSpans: RenderSpan[],
): Map<number, RenderSpan> {
  const m = new Map<number, RenderSpan>()
  for (const span of [...inlineSpans, ...sectionSpans]) {
    for (const idx of span.issueIndices) m.set(idx, span)
  }
  return m
}

/** Human-readable confidence label for issue card badges. */
export function confidenceLabel(c: AnchorConfidence): string {
  switch (c) {
    case "high":    return "Located"
    case "medium":  return "Approx."
    case "section": return "Section"
    case "absent":  return "Absent"
    case "none":    return "—"
  }
}

/** Severity → highlight colors. */
export const SEV_HIGHLIGHT: Record<string, { bg: string; line: string }> = {
  critical: { bg: "rgba(26,25,23,0.12)", line: "#1a1917" },
  high:     { bg: "rgba(26,25,23,0.09)", line: "#3a3733" },
  medium:   { bg: "rgba(26,25,23,0.07)", line: "#6e6b66" },
  low:      { bg: "rgba(26,25,23,0.05)", line: "#a09890" },
}
