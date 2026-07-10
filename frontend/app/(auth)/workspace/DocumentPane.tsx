"use client"

/**
 * DocumentPane — Phase 1 annotated ATS text viewer.
 *
 * Renders ats_text_preview with inline highlights anchored to scan issues.
 * Highlights reflect what automated parsers extracted — not the original
 * document layout or visual formatting.
 *
 * Confidence tiers:
 *   high    → solid background + solid underline (exact match)
 *   medium  → dashed underline, no background (approximate token match)
 *   section → left-border block on the whole section (fallback)
 *   absent  → no highlight; special "absent" card state
 *   none    → no highlight; card note only
 */

import { useMemo } from "react"
import type { Issue } from "@/types/workspace"
import {
  buildSegments, buildIssueSpanMap,
  type AnchorResult, type RenderSpan, type SectionBlock, type Segment,
  SEV_HIGHLIGHT,
} from "@/lib/anchor-match"

// ── Design tokens (same palette as WorkspaceResults) ─────────────────────────
const FA   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)"
const BG   = "#FDFCF9"
const SURF = "#FFFFFF"
const BD   = "rgba(26,25,23,0.08)"
const T1   = "#1a1917"
const T2   = "#6e6b66"
const T3   = "#a09890"

// ── Props ─────────────────────────────────────────────────────────────────────

interface DocumentPaneProps {
  atsText: string
  sections: Record<string, string>
  issues: Issue[]
  anchors: AnchorResult[]
  sectionBlocks: SectionBlock[]
  inlineSpans: RenderSpan[]
  sectionSpans: RenderSpan[]
  issueSpanMap: Map<number, RenderSpan>
  selectedIssue: number | null
  hoveredIssue: number | null
  onSelectIssue: (i: number | null) => void
  onHoverIssue: (i: number | null) => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isSpanActive(
  span: RenderSpan,
  selectedIssue: number | null,
  hoveredIssue: number | null,
): "selected" | "hovered" | "secondary" | "rest" {
  if (selectedIssue !== null && span.issueIndices.includes(selectedIssue)) return "selected"
  if (hoveredIssue !== null && span.issueIndices.includes(hoveredIssue)) return "hovered"
  // Secondary: another issue is selected/hovered but this span shares that selection
  if (selectedIssue !== null || hoveredIssue !== null) return "secondary"
  return "rest"
}

function inlineSpanStyle(
  span: RenderSpan,
  state: "selected" | "hovered" | "secondary" | "rest",
): React.CSSProperties {
  const { bg, line } = SEV_HIGHLIGHT[span.severity] ?? SEV_HIGHLIGHT.low

  const base: React.CSSProperties = {
    borderRadius: "2px",
    cursor: "pointer",
    transition: "background-color 0.15s, opacity 0.15s, outline 0.1s",
  }

  if (span.confidence === "high") {
    const activeBg = bg.replace(/[\d.]+\)$/, m =>
      (parseFloat(m) * 1.8).toFixed(2) + ")"
    )
    return {
      ...base,
      backgroundColor: state === "secondary" ? "transparent" : state !== "rest" ? activeBg : bg,
      textDecoration: "underline",
      textDecorationColor: line,
      textDecorationStyle: "solid",
      textDecorationThickness: "2px",
      opacity: state === "secondary" ? 0.35 : 1,
      outline: state === "selected" ? `2px solid ${line}44` : "none",
      outlineOffset: "1px",
    }
  }

  // medium: dashed underline, no fill
  return {
    ...base,
    textDecoration: "underline",
    textDecorationColor: `${line}99`,
    textDecorationStyle: "dashed",
    textDecorationThickness: "2px",
    opacity: state === "secondary" ? 0.25 : state === "rest" ? 0.75 : 1,
    outline: state === "selected" ? `2px solid ${line}33` : "none",
    outlineOffset: "1px",
  }
}

function sectionBlockStyle(
  span: RenderSpan,
  state: "selected" | "hovered" | "secondary" | "rest",
): React.CSSProperties {
  const { bg, line } = SEV_HIGHLIGHT[span.severity] ?? SEV_HIGHLIGHT.low
  return {
    display: "block",
    borderLeft: `3px solid ${line}`,
    paddingLeft: "0.625rem",
    marginLeft: "-0.625rem",
    backgroundColor: state === "secondary" ? "transparent" : bg,
    opacity: state === "secondary" ? 0.3 : 1,
    transition: "background-color 0.15s, opacity 0.15s",
    cursor: "pointer",
  }
}

// ── Multi-issue badge ─────────────────────────────────────────────────────────

function MultiBadge({ count, severity }: { count: number; severity: string }) {
  const { line } = SEV_HIGHLIGHT[severity] ?? SEV_HIGHLIGHT.low
  return (
    <sup style={{
      fontFamily: MONO,
      fontSize: "0.52rem",
      lineHeight: 1,
      background: line,
      color: "#fff",
      padding: "0 3px",
      borderRadius: "3px",
      marginLeft: "2px",
      verticalAlign: "super",
      userSelect: "none",
    }}>
      {count}
    </sup>
  )
}

// ── Segment renderer ──────────────────────────────────────────────────────────

interface SegmentRendererProps {
  segments: Segment[]
  sectionSpans: RenderSpan[]
  selectedIssue: number | null
  hoveredIssue: number | null
  onSelectIssue: (i: number | null) => void
  onHoverIssue: (i: number | null) => void
}

function SegmentRenderer({
  segments, sectionSpans,
  selectedIssue, hoveredIssue, onSelectIssue, onHoverIssue,
}: SegmentRendererProps) {
  // Map each position to its section-level highlight span (if any).
  // Uses seg.start directly — no string re-search.
  function sectionBlockForPos(pos: number): RenderSpan | null {
    for (const sp of sectionSpans) {
      if (pos >= sp.start && pos < sp.end) return sp
    }
    return null
  }

  // Group consecutive segments by the section block they fall inside.
  // Each segment now carries an explicit start offset from buildSegments,
  // so repeated identical text strings can never be misidentified.
  type GroupedSegments = { sectionSpan: RenderSpan | null; items: Segment[] }
  const groups = useMemo<GroupedSegments[]>(() => {
    const result: GroupedSegments[] = []
    let currentSectionSpan: RenderSpan | null = null
    let current: Segment[] = []

    for (const seg of segments) {
      const sp = sectionBlockForPos(seg.start)
      if (sp !== currentSectionSpan) {
        if (current.length > 0) result.push({ sectionSpan: currentSectionSpan, items: current })
        currentSectionSpan = sp
        current = []
      }
      current.push(seg)
    }
    if (current.length > 0) result.push({ sectionSpan: currentSectionSpan, items: current })
    return result
  }, [segments, sectionSpans])

  return (
    <>
      {groups.map((group, gi) => {
        const content = group.items.map((seg, si) => {
          if (seg.type === "text") {
            return <span key={si}>{seg.content}</span>
          }
          // Inline highlight
          const span = seg.span
          const state = isSpanActive(span, selectedIssue, hoveredIssue)
          const style = inlineSpanStyle(span, state)
          const isMulti = span.issueIndices.length > 1

          return (
            <span
              key={si}
              style={style}
              onClick={e => {
                e.stopPropagation()
                const primary = span.issueIndices[0]
                onSelectIssue(selectedIssue === primary ? null : primary)
              }}
              onMouseEnter={() => onHoverIssue(span.issueIndices[0])}
              onMouseLeave={() => onHoverIssue(null)}
              title={
                isMulti
                  ? `${span.issueIndices.length} issues on this passage`
                  : undefined
              }
            >
              {seg.content}
              {isMulti && <MultiBadge count={span.issueIndices.length} severity={span.severity} />}
            </span>
          )
        })

        // Section-level block wrapping
        if (group.sectionSpan) {
          const sp = group.sectionSpan
          const state = isSpanActive(sp, selectedIssue, hoveredIssue)
          const style = sectionBlockStyle(sp, state)
          return (
            <span
              key={gi}
              style={style}
              onClick={e => {
                e.stopPropagation()
                onSelectIssue(selectedIssue === sp.issueIndices[0] ? null : sp.issueIndices[0])
              }}
              onMouseEnter={() => onHoverIssue(sp.issueIndices[0])}
              onMouseLeave={() => onHoverIssue(null)}
            >
              {content}
            </span>
          )
        }

        return <span key={gi}>{content}</span>
      })}
    </>
  )
}

// ── Legend ────────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap", alignItems: "center" }}>
      <LegendItem
        label="Exact match"
        style={{ textDecoration: "underline", textDecorationThickness: "2px", background: "rgba(26,25,23,0.07)", padding: "0 3px", borderRadius: "2px" }}
      />
      <LegendItem
        label="Approximate"
        style={{ textDecoration: "underline", textDecorationStyle: "dashed", textDecorationThickness: "2px", textDecorationColor: "#1a1917", opacity: 0.8 }}
      />
      <LegendItem
        label="Section only"
        style={{ borderLeft: "3px solid #a09890", paddingLeft: "4px" }}
      />
    </div>
  )
}

function LegendItem({ label, style }: { label: string; style: React.CSSProperties }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
      <span style={{ fontFamily: MONO, fontSize: "0.65rem", ...style }}>{label}</span>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function DocumentPane({
  atsText, sections, issues,
  anchors, sectionBlocks, inlineSpans, sectionSpans, issueSpanMap,
  selectedIssue, hoveredIssue, onSelectIssue, onHoverIssue,
}: DocumentPaneProps) {

  const segments = useMemo(
    () => buildSegments(atsText, inlineSpans),
    [atsText, inlineSpans],
  )

  const isEmpty = !atsText?.trim()

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      width: "50%", minWidth: 0,
      borderRight: `1px solid ${BD}`,
      background: BG,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: "0.875rem 1.25rem",
        borderBottom: `1px solid ${BD}`,
        background: SURF,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.3rem" }}>
          <span style={{
            fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.14em",
            textTransform: "uppercase", color: T3,
          }}>
            Annotated ATS text
          </span>
          <span style={{
            fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.08em",
            textTransform: "uppercase", color: T3,
            padding: "0.1rem 0.4rem", border: `1px solid ${BD}`, borderRadius: "2px",
          }}>
            {Object.keys(sections).filter(k => k !== "_unparsed").length} sections
          </span>
        </div>
        <div style={{ fontFamily: FA, fontSize: "0.72rem", color: T3, lineHeight: 1.5, marginBottom: "0.6rem" }}>
          Highlights reflect what automated parsers extracted — not the original document layout.
        </div>
        <Legend />
      </div>

      {/* Text area */}
      <div
        style={{ flex: 1, overflowY: "auto", padding: "1.25rem 1.5rem" }}
        onClick={() => onSelectIssue(null)}
      >
        {isEmpty ? (
          <div style={{
            padding: "2rem",
            fontFamily: FA, fontSize: "0.82rem", color: T3,
            textAlign: "center", lineHeight: 1.8,
          }}>
            Text could not be extracted from this document.
            <br />
            The file may be image-based or use a format that cannot be parsed.
          </div>
        ) : (
          <div style={{
            fontFamily: MONO, fontSize: "0.75rem", lineHeight: 1.85,
            color: T1, whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            <SegmentRenderer
              segments={segments}
              sectionSpans={sectionSpans}
              selectedIssue={selectedIssue}
              hoveredIssue={hoveredIssue}
              onSelectIssue={onSelectIssue}
              onHoverIssue={onHoverIssue}
            />
          </div>
        )}
      </div>
    </div>
  )
}
