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
import { IssueGate } from "@/components/IssueGate"
import { computePDFAnchors, type PDFAnchor } from "@/lib/pdf-anchor"
import { confidenceLabel, SEV_HIGHLIGHT } from "@/lib/anchor-match"
import type { Issue } from "@/types/workspace"

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

function SevBadge({ sev }: { sev: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    critical: { bg: "rgba(140,47,78,0.08)",  color: "#8c2f4e" },
    high:     { bg: "rgba(154,77,34,0.08)",  color: "#9a4d22" },
    medium:   { bg: "rgba(122,110,40,0.08)", color: "#7a6e28" },
    low:      { bg: "rgba(26,25,23,0.05)",   color: T2       },
  }
  const s = colors[sev] ?? colors.low
  return (
    <span style={{
      fontFamily: MONO, fontSize: "0.5rem", letterSpacing: "0.1em",
      textTransform: "uppercase", color: s.color, background: s.bg,
      padding: "0.15rem 0.4rem", borderRadius: "2px", flexShrink: 0,
      border: `1px solid ${s.color}22`,
    }}>
      {sev}
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

    async function renderAndAnchor() {
      const pdf = pdfDocRef.current
      if (!pdf) return

      const textContents: Array<{ items: unknown[] }> = []

      for (let p = 1; p <= pageDims.length; p++) {
        if (cancelledRef.current) return
        const canvas = canvasRefs.current[p - 1]
        if (!canvas) continue

        const page = await pdf.getPage(p)
        const viewport = page.getViewport({ scale: SCALE })
        const dpr = window.devicePixelRatio || 1

        canvas.width  = Math.floor(viewport.width  * dpr)
        canvas.height = Math.floor(viewport.height * dpr)

        const ctx = canvas.getContext("2d")!
        await page.render({
          canvasContext: ctx,
          viewport,
          transform: [dpr, 0, 0, dpr, 0, 0],
        }).promise

        const tc = await page.getTextContent()
        textContents.push(tc as { items: unknown[] })
        page.cleanup()
      }

      if (cancelledRef.current) return

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
            conf === "exact"       ? "#7c8e5c" :
            conf === "approximate" ? "#9a4d22" : T3

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
                  <div style={{ fontFamily: FA, fontSize: "0.76rem", color: T2, lineHeight: 1.65, marginBottom: "0.625rem" }}>
                    {issue.description}
                  </div>
                  {issue.evidence && issue.issue_type !== "missing_section" && (
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
