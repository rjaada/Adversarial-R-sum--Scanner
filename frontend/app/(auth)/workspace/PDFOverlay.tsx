"use client"

/**
 * PDFOverlay — per-page annotation layer for the PDF review experience.
 *
 * Renders highlight rects and right-margin pin markers for issues whose
 * anchors fall on a given page.  All coordinates are in CSS pixels,
 * already scaled and flipped from PDF user space by pdf-anchor.ts.
 *
 * Confidence rendering:
 *   exact        → filled background + solid underline
 *   approximate  → dashed underline only, no fill
 *   (none issues are handled by the parent — not rendered here)
 *
 * Animations are CSS-only; prefers-reduced-motion collapses durations to 0.
 */

import React from "react"
import type { PDFAnchor } from "@/lib/pdf-anchor"
import type { Issue } from "@/types/workspace"
import { SEV_HIGHLIGHT } from "@/lib/anchor-match"

// ── Design tokens ─────────────────────────────────────────────────────────────
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)"
const FA   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"

// ── Animations CSS ────────────────────────────────────────────────────────────
// Injected once per overlay mount — tiny, pure CSS.
const ANIMATION_CSS = `
@keyframes tr-pin-pulse {
  0%   { box-shadow: 0 0 0 0 var(--pulse-color); }
  60%  { box-shadow: 0 0 0 7px transparent; }
  100% { box-shadow: 0 0 0 0 transparent; }
}
@keyframes tr-highlight-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes tr-select-glow {
  0%   { box-shadow: 0 0 0 0 var(--glow-color); }
  40%  { box-shadow: 0 0 12px 2px var(--glow-color); }
  100% { box-shadow: 0 0 0 0 transparent; }
}
@media (prefers-reduced-motion: reduce) {
  * { animation-duration: 1ms !important; transition-duration: 1ms !important; }
}
`

// ── Props ─────────────────────────────────────────────────────────────────────

interface PDFOverlayProps {
  /** All computed anchors (will be filtered to this page). */
  anchors: PDFAnchor[]
  pageIndex: number
  pageWidthPx: number
  pageHeightPx: number
  issues: Issue[]
  selectedIssue: number | null
  hoveredIssue: number | null
  onSelectIssue: (i: number | null) => void
  onHoverIssue: (i: number | null) => void
  /** Sequential display numbers per issue (1-indexed), for pin labels. */
  issueDisplayNumbers: Map<number, number>
}

// ── Severity → colour helpers ─────────────────────────────────────────────────

function sevColors(sev: string): { bg: string; line: string } {
  return SEV_HIGHLIGHT[sev] ?? SEV_HIGHLIGHT.low
}

// ── Highlight rect ────────────────────────────────────────────────────────────

interface HighlightRectProps {
  x: number; y: number; width: number; height: number
  confidence: "exact" | "approximate"
  severity: string
  state: "active" | "hovered" | "dimmed" | "resting"
  animDelay: number  // ms, for staggered reveal
}

function HighlightRect({ x, y, width, height, confidence, severity, state, animDelay }: HighlightRectProps) {
  const { bg, line } = sevColors(severity)

  let background = "none"
  let borderBottom = "none"
  let opacity = 1
  let animation = `tr-highlight-in 120ms ease-out ${animDelay}ms both`
  let outline = "none"

  if (confidence === "exact") {
    if (state === "dimmed") {
      background = bg.replace(/[\d.]+\)$/, "0.25)")
      borderBottom = `3px solid ${line}66`
      opacity = 0.5
    } else if (state === "active") {
      background = bg.replace(/[\d.]+\)$/, "0.55)")
      borderBottom = `3px solid ${line}`
      animation += `, tr-select-glow 350ms ease-in-out`
    } else if (state === "hovered") {
      background = bg.replace(/[\d.]+\)$/, "0.48)")
      borderBottom = `3px solid ${line}`
    } else {
      // resting — was nearly invisible (0.06-0.10); boosted to 0.40 so highlights show
      background = bg.replace(/[\d.]+\)$/, "0.40)")
      borderBottom = `3px solid ${line}`
    }
  } else {
    // approximate — dashed underline, boosted from 2px/0.8 to 3px/1.0
    borderBottom = `3px dashed ${line}${state === "dimmed" ? "55" : "CC"}`
    opacity = state === "dimmed" ? 0.35 : 1
  }

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        height,
        background,
        borderBottom,
        opacity,
        borderRadius: "1px",
        pointerEvents: "none",          // transparent to mouse — pin handles clicks
        animation,
        outline,
        // CSS custom props for animation keyframes
        ["--glow-color" as string]: `${line}55`,
      }}
    />
  )
}

// ── Pin marker ────────────────────────────────────────────────────────────────

interface PinProps {
  x: number; y: number
  label: number
  severity: string
  confidence: "exact" | "approximate"
  state: "active" | "hovered" | "dimmed" | "resting"
  onClick: () => void
  onMouseEnter: () => void
  onMouseLeave: () => void
}

function Pin({ x, y, label, severity, confidence, state, onClick, onMouseEnter, onMouseLeave }: PinProps) {
  const { line } = sevColors(severity)
  const size = state === "active" ? 28 : state === "hovered" ? 26 : 22
  const isApprox = confidence === "approximate"

  return (
    <button
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: "absolute",
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
        borderRadius: "50%",
        background: isApprox ? "#fff" : state === "dimmed" ? `${line}44` : line,
        border: isApprox ? `1.5px dashed ${line}${state === "dimmed" ? "55" : "CC"}` : "none",
        color: isApprox ? line : "#fff",
        fontFamily: MONO,
        fontSize: "9px",
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        opacity: state === "dimmed" ? 0.35 : 1,
        transition: "width 150ms ease, height 150ms ease, left 150ms ease, top 150ms ease, opacity 150ms ease",
        pointerEvents: "auto",
        zIndex: state === "active" ? 10 : state === "hovered" ? 8 : 5,
        // Active pulse animation
        animation: state === "active"
          ? "tr-pin-pulse 1.4s ease-out infinite"
          : "none",
        ["--pulse-color" as string]: `${line}55`,
        boxShadow: state === "hovered" ? `0 0 0 3px ${line}22` : "none",
      }}
      aria-label={`Issue ${label}: ${severity}`}
    >
      {label}
    </button>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function PDFOverlay({
  anchors, pageIndex, pageWidthPx, pageHeightPx,
  issues, selectedIssue, hoveredIssue, onSelectIssue, onHoverIssue,
  issueDisplayNumbers,
}: PDFOverlayProps) {
  // Filter anchors that have rects or pins on this page
  const pageAnchors = anchors.filter(
    a => a.confidence !== "none" &&
         (a.rects.some(r => r.pageIndex === pageIndex) || a.pin.pageIndex === pageIndex),
  )

  const hasSelection = selectedIssue !== null || hoveredIssue !== null

  return (
    <>
      {/* Inject animation keyframes once */}
      <style>{ANIMATION_CSS}</style>

      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",   // restored per-element below
          overflow: "hidden",
        }}
      >
        {pageAnchors.map((anchor, ai) => {
          const issue = issues[anchor.issueIndex]
          if (!issue) return null

          const isSelected = selectedIssue === anchor.issueIndex
          const isHovered  = hoveredIssue  === anchor.issueIndex
          const state = isSelected ? "active"
                      : isHovered  ? "hovered"
                      : hasSelection ? "dimmed"
                      : "resting"

          const displayNum = issueDisplayNumbers.get(anchor.issueIndex) ?? anchor.issueIndex + 1

          // Rects for this page only
          const pageRects = anchor.rects.filter(r => r.pageIndex === pageIndex)

          return (
            <React.Fragment key={anchor.issueIndex}>
              {/* Highlight rects */}
              {pageRects.map((rect, ri) => (
                <HighlightRect
                  key={ri}
                  x={rect.x}
                  y={rect.y}
                  width={rect.width}
                  height={rect.height}
                  confidence={anchor.confidence as "exact" | "approximate"}
                  severity={issue.severity}
                  state={state}
                  animDelay={ai * 50}
                />
              ))}

              {/* Pin — only on the pin's home page */}
              {anchor.pin.pageIndex === pageIndex && (
                <Pin
                  x={anchor.pin.x}
                  y={anchor.pin.y}
                  label={displayNum}
                  severity={issue.severity}
                  confidence={anchor.confidence as "exact" | "approximate"}
                  state={state}
                  onClick={() => onSelectIssue(isSelected ? null : anchor.issueIndex)}
                  onMouseEnter={() => onHoverIssue(anchor.issueIndex)}
                  onMouseLeave={() => onHoverIssue(null)}
                />
              )}
            </React.Fragment>
          )
        })}
      </div>
    </>
  )
}

