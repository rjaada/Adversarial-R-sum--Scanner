"use client"

/**
 * PDFViewer — PDF-first review experience.
 *
 * Renders the uploaded PDF at full fidelity using PDF.js, then overlays
 * issue anchors as highlight rects and margin pin markers.
 *
 * Architecture:
 *   Phase 1 (load):   PDF.js loads the file → determine page count + dims
 *   Phase 2 (render): canvases mount → pages are drawn, text is extracted,
 *                     anchors are computed
 *   Phase 3 (ready):  PDFOverlay renders on each page; issue panel syncs
 *
 * Fallback: calls onFallback() when PDF.js fails to parse, or when the
 * extracted text is too sparse to anchor (image-based PDF).
 */

import { useState, useEffect, useRef, useCallback } from "react"
import { PDFOverlay } from "./PDFOverlay"
import { MissingSectionPanel } from "./MissingSectionPanel"
import { KeywordPlacementHint } from "./KeywordPlacementHint"
import { IssueGate } from "@/components/IssueGate"
import { computePDFAnchors, isAnchorableIssue, type PDFAnchor } from "@/lib/pdf-anchor"
import { confidenceLabel, SEV_HIGHLIGHT } from "@/lib/anchor-match"
import type { Issue } from "@/types/workspace"

/**
 * Low-coverage fallback threshold (measured, not guessed).
 *
 * Fixture measurement against the production pipeline (pdfplumber excerpts
 * matched by pdf.js v6 reconstruction) was bimodal: clean single-column and
 * multi-page résumés anchored at ratio 1.00 (exact/approximate), while
 * column-collapsed two-column résumés anchored at 0.00 — pdfplumber and
 * pdf.js interleave the columns differently, so excerpts never match.
 *
 * 0.4 sits in the middle of that gap: "fewer than ~half of the locatable
 * findings could be located" means the PDF overlay would mostly be an empty
 * page with a long unanchored strip — worse than the ATS text view, where
 * excerpts always match (ats_text_preview comes from the same pdfplumber
 * text). It also tolerates a single miss in small sets (1 of 2 anchored =
 * 0.5 → stays in PDF review).
 *
 * The candidate floor avoids deciding off one data point: with 0 or 1
 * anchorable issues, the PDF (the user's real document) is still the better
 * canvas even if nothing anchors.
 */
const MIN_ANCHOR_RATIO = 0.4
const MIN_ANCHOR_CANDIDATES = 2

// ── Design tokens ─────────────────────────────────────────────────────────────
const FA   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)"
const BG   = "#FDFCF9"
const SURF = "#FFFFFF"
const BD   = "rgba(26,25,23,0.08)"
const T1   = "#1a1917"
const T2   = "#6e6b66"
const T3   = "#a09890"

/** Render scale. 1.5 → 108 DPI — clear on standard displays, manageable width. */
const SCALE = 1.5

// ── Props ─────────────────────────────────────────────────────────────────────

interface PDFViewerProps {
  file: File
  issues: Issue[]
  isSignedIn: boolean
  selectedIssue: number | null
  hoveredIssue: number | null
  onSelectIssue: (i: number | null) => void
  onHoverIssue: (i: number | null) => void
  /** Called when PDF can't be rendered or no text extracted — triggers ATS fallback. */
  onFallback: (reason: string) => void
}

// ── Internal state shape ──────────────────────────────────────────────────────

type ViewerState = "loading" | "rendering" | "ready" | "error"

interface PageDim { w: number; h: number }

// ── Severity badge (mirror WorkspaceResults) ──────────────────────────────────

// Monochrome severity: filled pips + graphite label (mirrors WorkspaceResults).
function SevBadge({ sev }: { sev: string }) {
  const level = ({ critical: 4, high: 3, medium: 2, low: 1 } as Record<string, number>)[sev] ?? 1
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem", flexShrink: 0 }}>
      <span style={{ display: "inline-flex", gap: "2px" }}>
        {[1, 2, 3, 4].map(i => (
          <span key={i} style={{
            width: "4.5px", height: "4.5px", borderRadius: "50%",
            border: `1px solid ${T1}`, background: i <= level ? T1 : "transparent",
          }} />
        ))}
      </span>
      <span style={{
        fontFamily: MONO, fontSize: "0.5rem", letterSpacing: "0.1em",
        textTransform: "uppercase", color: T1,
      }}>
        {sev}
      </span>
    </span>
  )
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <div style={{ padding: "3rem 2rem", textAlign: "center" }}>
      <div style={{ fontFamily: MONO, fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3, marginBottom: "0.75rem" }}>
        Loading PDF
      </div>
      <div style={{ display: "flex", justifyContent: "center", gap: "4px" }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: "50%",
            background: T3, opacity: 0.4,
            animation: `tr-dot-bounce 1s ease-in-out ${i * 0.15}s infinite`,
          }} />
        ))}
      </div>
      <style>{`
        @keyframes tr-dot-bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40%            { transform: translateY(-6px); opacity: 1; }
        }
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 1ms !important; }
        }
      `}</style>
    </div>
  )
}

// ── Unanchored issues strip ───────────────────────────────────────────────────

function UnanchoredStrip({
  issues, anchors, selectedIssue, hoveredIssue, onSelectIssue, onHoverIssue,
}: {
  issues: Issue[]
  anchors: PDFAnchor[]
  selectedIssue: number | null
  hoveredIssue: number | null
  onSelectIssue: (i: number | null) => void
  onHoverIssue: (i: number | null) => void
}) {
  const unanchored = issues
    .map((iss, i) => ({ iss, i, conf: anchors[i]?.confidence }))
    .filter(x => x.conf === "none")

  if (unanchored.length === 0) return null

  return (
    <div style={{ marginTop: "1.5rem", padding: "1rem 1.25rem", border: `1px solid ${BD}`, borderRadius: "6px", background: SURF }}>
      <div style={{ fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3, marginBottom: "0.75rem" }}>
        Issues without document location — {unanchored.length}
      </div>
      {unanchored.map(({ iss, i }) => {
        const isSelected = selectedIssue === i
        return (
          <div
            key={i}
            onClick={() => onSelectIssue(isSelected ? null : i)}
            onMouseEnter={() => onHoverIssue(i)}
            onMouseLeave={() => onHoverIssue(null)}
            style={{
              padding: "0.6rem 0",
              borderBottom: `1px solid ${BD}`,
              cursor: "pointer",
              display: "flex", gap: "0.75rem", alignItems: "flex-start",
            }}
          >
            <SevBadge sev={iss.severity} />
            <div>
              <div style={{ fontFamily: FA, fontSize: "0.82rem", fontWeight: 600, color: T1, lineHeight: 1.4 }}>{iss.title}</div>
              {isSelected && (
                <div style={{ marginTop: "0.5rem", fontFamily: FA, fontSize: "0.76rem", color: T2, lineHeight: 1.65 }}>
                  {iss.fix_pattern || iss.suggested_fix}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Empty annotation notice ───────────────────────────────────────────────────

/**
 * Shown when the PDF renders fine but every issue is of a type that has no
 * document location (keyword_gap, missing_section, parse_warning). These
 * describe what is *absent*, so there is nothing to pin. Without this notice
 * the user sees a plain PDF with a populated issue panel and no explanation
 * of why the two are not connected.
 */
function EmptyAnnotationNotice({ issues, isSignedIn }: { issues: Issue[]; isSignedIn: boolean }) {
  const types = new Set(issues.map(i => i.issue_type))

  const reasons: string[] = []
  if (types.has("missing_section")) reasons.push("missing sections")
  if (types.has("keyword_gap"))     reasons.push("keyword gaps")
  if (types.has("parse_warning"))   reasons.push("parse warnings")

  const reasonText = reasons.length > 0 ? reasons.join(", ") : "document-level issues"
  const count = issues.length

  return (
    <div style={{
      margin: "0 0 1.25rem",
      padding: "1rem 1.25rem",
      background: SURF,
      border: `1px solid ${BD}`,
      borderLeft: `3px solid ${T3}`,
      borderRadius: "4px",
      maxWidth: "520px",
    }}>
      <div style={{ fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3, marginBottom: "0.5rem" }}>
        No document annotations for this scan
      </div>
      <div style={{ fontFamily: FA, fontSize: "0.82rem", color: T1, lineHeight: 1.65, marginBottom: "0.625rem" }}>
        {count > 0
          ? <>The {count} finding{count !== 1 ? "s" : ""} ({reasonText}) describe what is <em>absent</em> from the résumé rather than a specific passage — there is nothing to pin to a line.</>
          : "No findings for this scan."
        }
      </div>
      {count > 0 && (
        <div style={{ fontFamily: FA, fontSize: "0.76rem", color: T2, lineHeight: 1.6 }}>
          {isSignedIn
            ? <>See the <strong style={{ color: T1, fontWeight: 600 }}>issues panel</strong> on the right for every finding. A résumé with weak phrasing or unquantified bullets will produce pins directly on this document.</>
            : <>Sign in to unlock the full scan — weak phrasing and impact language findings anchor directly to lines in your résumé.</>
          }
        </div>
      )}
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PDFViewer({
  file, issues, isSignedIn,
  selectedIssue, hoveredIssue, onSelectIssue, onHoverIssue, onFallback,
}: PDFViewerProps) {
  const [viewerState, setViewerState]   = useState<ViewerState>("loading")
  const [pageDims, setPageDims]         = useState<PageDim[]>([])
  const [anchors, setAnchors]           = useState<PDFAnchor[]>([])
  const [fallbackNote, setFallbackNote] = useState("")

  const pdfDocRef    = useRef<any>(null)
  const canvasRefs   = useRef<(HTMLCanvasElement | null)[]>([])
  const pageRefs     = useRef<(HTMLDivElement | null)[]>([])
  const cancelledRef = useRef(false)

  // ── Issue display number map (anchored issues only, 1-indexed) ────────────
  const issueDisplayNumbers = useRef(new Map<number, number>())

  // ── Phase 1: load PDF, determine page dimensions ──────────────────────────
  useEffect(() => {
    cancelledRef.current = false
    setViewerState("loading")
    setPageDims([])
    setAnchors([])

    async function loadPDF() {
      try {
        const pdfjsLib = await import("pdfjs-dist")
        pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs"

        const arrayBuffer = await file.arrayBuffer()
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer })
        const pdf = await loadingTask.promise

        if (cancelledRef.current) return
        pdfDocRef.current = pdf

        const dims: PageDim[] = []
        for (let p = 1; p <= pdf.numPages; p++) {
          const page = await pdf.getPage(p)
          const vp = page.getViewport({ scale: SCALE })
          dims.push({ w: vp.width, h: vp.height })
          page.cleanup()
        }

        if (cancelledRef.current) return
        setPageDims(dims)
        setViewerState("rendering")
      } catch (err) {
        if (cancelledRef.current) return
        const msg = err instanceof Error ? err.message : String(err)
        if (process.env.NODE_ENV === "development")
          console.log("[TraceRank PDF] Load error:", msg)
        setFallbackNote(msg)
        setViewerState("error")
        onFallback(msg)
      }
    }

    loadPDF()
    return () => { cancelledRef.current = true }
  }, [file]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Phase 2: render pages into canvases, extract text, compute anchors ────
  useEffect(() => {
    if (viewerState !== "rendering" || pageDims.length === 0) return

    // Track in-flight pdf.js render tasks so we can cancel them on cleanup.
    // This is the primary guard against the React StrictMode double-invoke
    // crash: "Cannot use the same canvas during multiple render() operations."
    // Without cleanup, StrictMode fires the effect, cleans up (nothing), then
    // fires it again — the second call hits the same canvas while the first
    // render is still running → pdf.js throws.
    const activeTasks: Array<{ cancel(): void }> = []
    let cleanedUp = false

    async function renderAndAnchor() {
      const pdf = pdfDocRef.current
      if (!pdf) return

      const textContents: Array<{ items: unknown[] }> = []

      for (let p = 1; p <= pageDims.length; p++) {
        if (cancelledRef.current || cleanedUp) return
        const canvas = canvasRefs.current[p - 1]
        if (!canvas) continue

        const page = await pdf.getPage(p)
        if (cancelledRef.current || cleanedUp) { page.cleanup(); return }

        const viewport = page.getViewport({ scale: SCALE })
        const dpr = window.devicePixelRatio || 1

        canvas.width  = Math.floor(viewport.width  * dpr)
        canvas.height = Math.floor(viewport.height * dpr)

        const ctx = canvas.getContext("2d")!
        const renderTask = page.render({
          canvasContext: ctx,
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        })
        activeTasks.push(renderTask)

        try {
          await renderTask.promise
        } catch {
          // pdf.js throws RenderingCancelledException when .cancel() is called.
          // Any render error during cleanup is expected — exit silently.
          page.cleanup()
          return
        }

        if (cancelledRef.current || cleanedUp) { page.cleanup(); return }

        const tc = await page.getTextContent()
        textContents.push(tc as { items: unknown[] })
        page.cleanup()
      }

      if (cancelledRef.current || cleanedUp) return

      // Compute anchors (returns [] if image-based PDF)
      const computed = computePDFAnchors(textContents, pageDims, issues, SCALE)

      // If no text at all → fall back
      if (computed.length === 0 && issues.length > 0) {
        const reason = "No text extracted from PDF"
        if (process.env.NODE_ENV === "development")
          console.log("[TraceRank PDF] ATS fallback triggered:", reason)
        setFallbackNote(reason)
        setViewerState("error")
        onFallback(reason)
        return
      }

      // Low anchor coverage → fall back. When most locatable findings can't
      // be matched to the PDF text layer (e.g. two-column layouts, where
      // pdfplumber and pdf.js interleave columns differently), a near-empty
      // overlay is a weaker experience than the ATS text view, where the
      // excerpts always match. See MIN_ANCHOR_RATIO above for the measured
      // justification.
      const candidates = issues.filter(isAnchorableIssue).length
      const located = computed.filter(a => a.confidence !== "none").length
      if (candidates >= MIN_ANCHOR_CANDIDATES && located / candidates < MIN_ANCHOR_RATIO) {
        const reason = `Low anchor coverage — located ${located} of ${candidates} locatable findings`
        if (process.env.NODE_ENV === "development")
          console.log("[TraceRank PDF] ATS fallback triggered:", reason)
        setFallbackNote(reason)
        setViewerState("error")
        onFallback(reason)
        return
      }

      // Build display number map: only anchored issues get numbers
      const numMap = new Map<number, number>()
      let num = 1
      for (const a of computed) {
        if (a.confidence !== "none") numMap.set(a.issueIndex, num++)
      }
      issueDisplayNumbers.current = numMap

      setAnchors(computed)
      setViewerState("ready")
    }

    renderAndAnchor()
    return () => {
      cleanedUp = true
      for (const task of activeTasks) {
        try { task.cancel() } catch {}
      }
    }
  }, [viewerState, pageDims, issues]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to anchor on selectedIssue change ──────────────────────────────
  useEffect(() => {
    if (selectedIssue === null || anchors.length === 0) return
    const anchor = anchors[selectedIssue]
    if (!anchor || anchor.confidence === "none") return
    const pageEl = pageRefs.current[anchor.pin.pageIndex]
    if (pageEl) pageEl.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [selectedIssue, anchors])

  // ── Keyboard: Esc to deselect ─────────────────────────────────────────────
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === "Escape") onSelectIssue(null) }
    window.addEventListener("keydown", h)
    return () => window.removeEventListener("keydown", h)
  }, [onSelectIssue])

  const visibleIssues = isSignedIn ? issues : issues.slice(0, 3)
  const hasSelection  = selectedIssue !== null || hoveredIssue !== null

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0, minWidth: 0 }}>

      {/* ── PDF pane ───────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1, overflowY: "auto", overflowX: "auto",
          background: "#ECEAE6",   // slightly darker than page bg — shows page edges
          padding: "1.5rem 1.5rem 3rem",
          minWidth: 0,
        }}
        onClick={() => onSelectIssue(null)}
      >
        {/* Label */}
        <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#8a8680" }}>
            PDF review
          </span>
          {viewerState === "ready" && (
            <span style={{ fontFamily: MONO, fontSize: "0.52rem", color: "#8a8680" }}>
              {anchors.filter(a => a.confidence === "exact").length} exact ·{" "}
              {anchors.filter(a => a.confidence === "approximate").length} approx ·{" "}
              {anchors.filter(a => a.confidence === "none").length} unlocated
            </span>
          )}
        </div>

        {/* Empty annotation notice — shown when PDF renders but all issues are unlocatable */}
        {viewerState === "ready" && issues.length > 0 && !anchors.some(a => a.confidence !== "none") && (
          <EmptyAnnotationNotice issues={issues} isSignedIn={isSignedIn} />
        )}

        {viewerState === "loading" && <LoadingState />}

        {/* Pages */}
        {(viewerState === "rendering" || viewerState === "ready") && pageDims.map((dim, pi) => (
          <div
            key={pi}
            ref={el => { pageRefs.current[pi] = el }}
            style={{
              position: "relative",
              width: dim.w,
              height: dim.h,
              marginBottom: "1rem",
              boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
              background: SURF,
              // Fade in as page renders
              animation: "tr-page-in 180ms ease-out both",
              animationDelay: `${pi * 60}ms`,
            }}
            onClick={e => e.stopPropagation()}  // don't deselect when clicking page bg
          >
            <canvas
              ref={el => { canvasRefs.current[pi] = el }}
              style={{ display: "block", width: dim.w, height: dim.h }}
            />
            {viewerState === "ready" && (
              <PDFOverlay
                anchors={anchors}
                pageIndex={pi}
                pageWidthPx={dim.w}
                pageHeightPx={dim.h}
                issues={issues}
                selectedIssue={selectedIssue}
                hoveredIssue={hoveredIssue}
                onSelectIssue={onSelectIssue}
                onHoverIssue={onHoverIssue}
                issueDisplayNumbers={issueDisplayNumbers.current}
              />
            )}
          </div>
        ))}

        {/* Unanchored issues below last page */}
        {viewerState === "ready" && (
          <UnanchoredStrip
            issues={issues}
            anchors={anchors}
            selectedIssue={selectedIssue}
            hoveredIssue={hoveredIssue}
            onSelectIssue={onSelectIssue}
            onHoverIssue={onHoverIssue}
          />
        )}

        <style>{`
          @keyframes tr-page-in {
            from { opacity: 0; transform: translateY(4px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @media (prefers-reduced-motion: reduce) {
            * { animation-duration: 1ms !important; transition-duration: 1ms !important; }
          }
        `}</style>
      </div>

      {/* ── Issues panel ───────────────────────────────────────────────── */}
      <div style={{
        width: 300, flexShrink: 0,
        borderLeft: `1px solid ${BD}`,
        background: BG,
        overflowY: "auto",
        display: "flex", flexDirection: "column",
      }}>
        <div style={{ padding: "0.875rem 1.125rem", borderBottom: `1px solid ${BD}`, background: SURF, flexShrink: 0 }}>
          <span style={{ fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3 }}>
            Issues — {issues.length} found
          </span>
        </div>

        {visibleIssues.map((issue, i) => {
          const anchor     = anchors[i]
          const isSelected = selectedIssue === i
          const isHovered  = hoveredIssue  === i
          const conf       = anchor?.confidence ?? "none"
          const dispNum    = issueDisplayNumbers.current.get(i)
          const { line }   = SEV_HIGHLIGHT[issue.severity] ?? SEV_HIGHLIGHT.low

          const confIndicator =
            conf === "exact"       ? `✓ p.${(anchor.pin.pageIndex + 1)}` :
            conf === "approximate" ? `~ p.${(anchor.pin.pageIndex + 1)}` :
            "—"
          const confColor =
            conf === "exact"       ? T1 :
            conf === "approximate" ? T2 : T3

          return (
            <div
              key={i}
              onClick={() => onSelectIssue(isSelected ? null : i)}
              onMouseEnter={() => onHoverIssue(i)}
              onMouseLeave={() => onHoverIssue(null)}
              style={{
                padding: "0.875rem 1.125rem",
                borderBottom: `1px solid ${BD}`,
                background: isSelected ? "rgba(26,25,23,0.02)" : isHovered ? "rgba(26,25,23,0.01)" : "transparent",
                cursor: "pointer",
                transition: "background 0.1s",
                // Dim if another issue is selected/hovered in the PDF
                opacity: hasSelection && !isSelected && !isHovered ? 0.55 : 1,
              }}
            >
              <div style={{ display: "flex", gap: "0.625rem", alignItems: "flex-start", marginBottom: isSelected ? "0.75rem" : 0 }}>
                {/* Pin number badge */}
                {dispNum && conf !== "none" && (
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    background: conf === "exact" ? line : "transparent",
                    border: conf === "approximate" ? `1.5px dashed ${line}` : "none",
                    color: conf === "exact" ? "#fff" : line,
                    fontFamily: MONO, fontSize: "8px", fontWeight: 700,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, marginTop: "2px",
                  }}>
                    {dispNum}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.25rem" }}>
                    <SevBadge sev={issue.severity} />
                    <span style={{ fontFamily: MONO, fontSize: "0.54rem", color: confColor, marginLeft: "auto" }}>
                      {confIndicator}
                    </span>
                  </div>
                  <div style={{ fontFamily: FA, fontSize: "0.82rem", fontWeight: 600, color: T1, lineHeight: 1.4 }}>
                    {issue.title}
                  </div>
                </div>
              </div>

              {/* Expanded detail */}
              {isSelected && (
                <div onClick={e => e.stopPropagation()}>
                  {issue.issue_type === "missing_section" ? (
                    <MissingSectionPanel issue={issue} />
                  ) : issue.issue_type === "keyword_gap" ? (
                    <>
                      <div style={{ fontFamily: FA, fontSize: "0.76rem", color: T2, lineHeight: 1.65, marginBottom: "0.625rem" }}>
                        {issue.description}
                      </div>
                      <KeywordPlacementHint
                        keyword={issue.title.replace(/^missing keyword:\s*/i, "").trim()}
                      />
                    </>
                  ) : (
                    <>
                      <div style={{ fontFamily: FA, fontSize: "0.76rem", color: T2, lineHeight: 1.65, marginBottom: "0.625rem" }}>
                        {issue.description}
                      </div>
                      {issue.evidence && (
                        <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: "4px", padding: "0.625rem 0.75rem", marginBottom: "0.5rem", fontFamily: MONO, fontSize: "0.68rem", color: T2, lineHeight: 1.75 }}>
                          {issue.evidence}
                        </div>
                      )}
                      <div style={{ background: SURF, border: `1px solid ${BD}`, borderRadius: "4px", padding: "0.625rem 0.75rem" }}>
                        <div style={{ fontFamily: MONO, fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T3, marginBottom: "0.35rem" }}>Fix</div>
                        <div style={{ fontFamily: FA, fontSize: "0.78rem", color: T1, lineHeight: 1.65 }}>
                          {issue.fix_pattern || issue.suggested_fix}
                        </div>
                      </div>
                      {issue.rewrite_starter && (
                        <div style={{ marginTop: "0.5rem", padding: "0.625rem 0.75rem", background: "rgba(26,25,23,0.025)", borderLeft: "2px solid rgba(26,25,23,0.18)", fontFamily: MONO, fontSize: "0.74rem", color: T1, lineHeight: 1.65 }}>
                          <div style={{ fontFamily: MONO, fontSize: "0.5rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T3, marginBottom: "0.35rem" }}>Rewrite starter</div>
                          {issue.rewrite_starter}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )
        })}

        {!isSignedIn && issues.length > 3 && <IssueGate remaining={issues.length - 3} />}
      </div>
    </div>
  )
}
