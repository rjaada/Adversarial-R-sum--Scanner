"use client"

/**
 * Results phase of the workspace (Phase 3).
 * Replaces the old sidebar+dense-report layout with a clean two-column
 * layout that follows the v2 design language: generous spacing, clear
 * hierarchy, secondary info collapsed by default.
 */

import { useState, useRef, useMemo, useEffect } from "react"
import { IssueGate } from "@/components/IssueGate"
import { UpgradePrompt } from "@/components/UpgradePrompt"
import { DocumentPane } from "./DocumentPane"
import { PDFViewer } from "./PDFViewer"
import { MissingSectionPanel } from "./MissingSectionPanel"
import { KeywordPlacementHint } from "./KeywordPlacementHint"
import { FeedbackCard } from "./FeedbackCard"
import { ReportProblemModal } from "./ReportProblemModal"
import {
  pct, scoreColor, scoreBand, compareScans, track,
  SEV_COLOR,
} from "@/lib/scan-utils"
import {
  computeAllAnchors, mergeSpans, buildIssueSpanMap, confidenceLabel,
  type AnchorResult,
} from "@/lib/anchor-match"
import type {
  ScanResult, ScanSummary, Issue, LLMStatus, SubDeltas,
} from "@/types/workspace"

// ── Design tokens ────────────────────────────────────────────────────────────
const FA   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)"
const BG   = "#FDFCF9"
const SURF = "#FFFFFF"
const BD   = "rgba(26,25,23,0.08)"
const BD2  = "rgba(26,25,23,0.14)"
const T1   = "#1a1917"
const T2   = "#6e6b66"
const T3   = "#a09890"

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  display: ScanResult
  isMock: boolean
  isSignedIn: boolean
  result: ScanResult
  selectedIssue: number | null
  setSelectedIssue: (i: number | null) => void
  onNewScan: () => void
  onExport: () => void
  exporting: boolean
  history: ScanSummary[]
  rewriteVariants: Record<number, string[]>
  rewriteLoading: Record<number, boolean>
  onGenerateRewrites: (i: number, issue: Issue) => void
  llmStatus: LLMStatus | null
  compareBase: ScanResult | null
  setCompareBase: (r: ScanResult | null) => void
  previousResult: ScanResult | null
  issuesSectionRef: React.RefObject<HTMLDivElement>
  fileInputRef: React.RefObject<HTMLInputElement>
  file: File | null
  setFile: (f: File) => void
  jdText: string
  setJdText: (t: string) => void
  onScan: () => void
  scanning: boolean
  error: string | null
  onLoadScan: (id: string) => void
  onLoadScanForCompare: (id: string) => void
}

// ── Small helpers ─────────────────────────────────────────────────────────────
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontFamily: MONO, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3, marginBottom: "1rem" }}>
      {children}
    </div>
  )
}

function SectionDivider() {
  return <div style={{ height: "1px", background: BD, margin: "0" }} />
}

function SevBadge({ sev }: { sev: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    critical: { bg: "rgba(140,47,78,0.08)",  color: "#8c2f4e" },
    high:     { bg: "rgba(154,77,34,0.08)",   color: "#9a4d22" },
    medium:   { bg: "rgba(122,110,40,0.08)",  color: "#7a6e28" },
    low:      { bg: "rgba(26,25,23,0.05)",    color: T2       },
  }
  const s = colors[sev.toLowerCase()] ?? colors.low
  return (
    <span style={{
      fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.1em",
      textTransform: "uppercase", color: s.color, background: s.bg,
      padding: "0.2rem 0.5rem", borderRadius: "2px", flexShrink: 0,
      border: `1px solid ${s.color}22`,
    }}>
      {sev}
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function WorkspaceResults({
  display, isMock, isSignedIn, result,
  selectedIssue, setSelectedIssue,
  onNewScan, onExport, exporting,
  history, rewriteVariants, rewriteLoading, onGenerateRewrites, llmStatus,
  compareBase, setCompareBase, previousResult,
  issuesSectionRef, fileInputRef, file, setFile, jdText, setJdText,
  onScan, scanning, error, onLoadScan, onLoadScanForCompare,
}: Props) {

  const [showKeywords, setShowKeywords]       = useState(false)
  const [showAtsPreview, setShowAtsPreview]   = useState(false)
  const [showHistory, setShowHistory]         = useState(false)
  const [showSimulation, setShowSimulation]   = useState(false)
  const [reportModalOpen, setReportModalOpen] = useState(false)
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null)
  const [viewMode, setViewMode]               = useState<"report" | "review">("report")
  const [hoveredIssue, setHoveredIssue]       = useState<number | null>(null)
  const [pdfFailed, setPdfFailed]             = useState(false)
  const [pdfFailNote, setPdfFailNote]         = useState("")
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const check = () => { setIsMobile(window.innerWidth <= 639) }
    check()
    window.addEventListener("resize", check)
    return () => { window.removeEventListener("resize", check) }
  }, [])

  // Reset PDF failure state when a new file is scanned
  useEffect(() => { setPdfFailed(false); setPdfFailNote("") }, [display.scan_id])

  // Anonymous users always land on Report — Review has no line annotations for gated scans.
  // Fires on new scan (scan_id change) and on auth change (sign-out resets to Report).
  useEffect(() => {
    if (!isSignedIn) setViewMode("report")
  }, [display.scan_id, isSignedIn])

  // Review mode shows a split PDF+panel layout that is unusable below 640px.
  useEffect(() => {
    if (isMobile && viewMode === "review") { setViewMode("report") }
  }, [isMobile, viewMode])

  // Esc → deselect
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSelectedIssue(null) }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [setSelectedIssue])

  // Anchor computation (memoised on scan data)
  const { anchors, sectionBlocks } = useMemo(
    () => computeAllAnchors(
      display.issues,
      display.ats_text_preview ?? "",
      display.resume_sections ?? {},
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [display.scan_id],
  )
  const { inlineSpans, sectionSpans } = useMemo(
    () => mergeSpans(anchors),
    [anchors],
  )
  const issueSpanMap = useMemo(
    () => buildIssueSpanMap(inlineSpans, sectionSpans),
    [inlineSpans, sectionSpans],
  )

  // ── Score data ────────────────────────────────────────────────────────
  const jdReqs = (display.jd_requirements ?? {}) as { required_keywords?: string[]; min_years_experience?: number | null }
  const jdHasKeywords = (jdReqs.required_keywords?.length ?? 0) > 0
  const jdHasYearsReq = jdReqs.min_years_experience != null && jdReqs.min_years_experience > 0
  const neutralDefaults: Record<string, string> = {}
  if (!jdHasKeywords) neutralDefaults.keyword_match = "Defaulted to neutral — JD vocabulary not recognized"
  if (!jdHasYearsReq) neutralDefaults.experience_alignment = "Defaulted to neutral — no years requirement in JD"

  const scoreItems = [
    { label: "Keyword match",  key: "keyword_match",        value: display.scores.keyword_match,        weight: "35%" },
    { label: "Experience",     key: "experience_alignment", value: display.scores.experience_alignment, weight: "25%" },
    { label: "Parse integrity",key: "parse_integrity",      value: display.scores.parse_integrity,      weight: "20%" },
    { label: "Structure",      key: "structure",            value: display.scores.structure,            weight: "10%" },
    { label: "Impact language",key: "quantified_impact",    value: display.scores.quantified_impact,    weight: "10%" },
  ]

  const parseScore   = pct(display.scores.parse_integrity)
  const defaultCount = Object.keys(neutralDefaults).length
  const confidence   = !jdHasKeywords || parseScore < 40 ? "low" : defaultCount > 0 ? "moderate" : "high"
  const confLabel    = { high: "High confidence", moderate: "Moderate confidence", low: "Low confidence" }[confidence]
  const confColor    = { high: "#7c8e5c", moderate: "#6e6b66", low: "#858585" }[confidence]

  // ── Gating ──────────────────────────────────────────────────────────────
  // The backend truncates issues and strips content for unauthenticated
  // callers and sets `gated`. `total_issues` is the true count before
  // truncation, so the "N more — sign in" nudge stays honest. On a gated
  // result every sub-score except keyword match is locked.
  const totalIssues   = display.total_issues ?? display.issues.length
  const isGated       = !!display.gated
  // A result can be gated even while the client is signed in (e.g. a scan
  // that ran before the session token attached). Content sections must
  // follow the payload, not the client auth state, or they render empty.
  const limited       = !isSignedIn || isGated
  const shownCount    = limited ? Math.min(display.issues.length, 3) : display.issues.length
  const gateRemaining = totalIssues - shownCount

  // Keyboard activation for non-button clickable rows (WCAG 2.1 AA).
  const onKey = (fn: () => void) => (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); fn() }
  }

  return (
    <div style={{ display: "flex", flex: 1, overflow: "hidden", background: BG }}>

      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={{
        width: 220, flexShrink: 0,
        borderRight: `1px solid ${BD}`,
        background: SURF,
        display: isMobile ? "none" : "flex", flexDirection: "column",
        overflowY: "auto",
      }}>
        {/* Re-scan controls */}
        <div style={{ padding: "1.25rem 1rem", borderBottom: `1px solid ${BD}` }}>
          <div style={{ fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3, marginBottom: "0.75rem" }}>
            Résumé
          </div>
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
            onDragOver={e => e.preventDefault()}
            style={{
              border: `1px dashed ${file ? BD2 : BD}`,
              borderRadius: "6px", padding: "0.75rem",
              cursor: "pointer", background: BG, textAlign: "center",
              marginBottom: "0.75rem", transition: "border-color 0.2s",
            }}
          >
            <input ref={fileInputRef} type="file" accept=".pdf,.docx" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
            <span style={{ fontFamily: FA, fontSize: "0.72rem", color: file ? T1 : T3 }}>
              {file ? file.name : "PDF or DOCX"}
            </span>
          </div>

          <div style={{ fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3, marginBottom: "0.5rem" }}>
            Job description
          </div>
          <textarea
            value={jdText}
            onChange={e => setJdText(e.target.value)}
            placeholder="Paste job description"
            style={{
              width: "100%", minHeight: "100px", resize: "vertical",
              border: `1px solid ${BD}`, borderRadius: "4px",
              padding: "0.6rem", fontSize: "0.72rem",
              fontFamily: FA, color: T1, background: BG,
              outline: "none", lineHeight: 1.6, boxSizing: "border-box",
              marginBottom: "0.75rem",
            }}
          />

          {error && (
            <div style={{ fontFamily: FA, fontSize: "0.68rem", color: "#8c2f4e", marginBottom: "0.5rem", lineHeight: 1.4 }}>
              {error}
            </div>
          )}

          <button
            onClick={() => void onScan()}
            disabled={scanning || !file || !jdText.trim()}
            style={{
              width: "100%", fontFamily: FA, fontSize: "0.78rem", fontWeight: 500,
              background: !scanning && file && jdText.trim() ? T1 : "rgba(26,25,23,0.08)",
              color: !scanning && file && jdText.trim() ? SURF : T3,
              border: "none", borderRadius: "4px", padding: "0.6rem 0",
              cursor: !scanning && file && jdText.trim() ? "pointer" : "not-allowed",
              transition: "background 0.2s",
            }}
          >
            {scanning ? "Analyzing…" : "Analyze résumé"}
          </button>
        </div>

        {/* Compare */}
        {previousResult !== null && (
          <div style={{ padding: "1rem", borderBottom: `1px solid ${BD}` }}>
            <div style={{ fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3, marginBottom: "0.5rem" }}>
              Compare
            </div>
            <button
              onClick={() => {
                if (compareBase?.scan_id === previousResult.scan_id) setCompareBase(null)
                else { setCompareBase(previousResult); track("compare_started", {}) }
              }}
              style={{
                width: "100%", fontFamily: FA, fontSize: "0.72rem",
                padding: "0.4rem 0",
                background: compareBase?.scan_id === previousResult.scan_id ? "rgba(26,25,23,0.06)" : "transparent",
                color: T2, border: `1px solid ${BD}`, borderRadius: "4px", cursor: "pointer",
              }}
            >
              {compareBase?.scan_id === previousResult.scan_id ? "× Exit compare" : "↔ Compare with previous"}
            </button>
          </div>
        )}

        {/* History */}
        <div style={{ padding: "1rem" }}>
          <button
            onClick={() => setShowHistory(v => !v)}
            style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
              fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase",
              color: T3, background: "none", border: "none", cursor: "pointer", padding: 0, marginBottom: showHistory ? "0.75rem" : 0,
            }}
          >
            <span>History</span>
            <span>{showHistory ? "▴" : "▾"}</span>
          </button>
          {showHistory && (
            history.length === 0
              ? <div style={{ fontFamily: FA, fontSize: "0.72rem", color: T3, fontStyle: "italic" }}>No saved scans.</div>
              : history.map(h => (
                <div key={h.scan_id} style={{ padding: "0.5rem 0", borderBottom: `1px solid ${BD}` }}>
                  <div
                    role="button"
                    tabIndex={0}
                    aria-label={`Load scan ${h.source_id}`}
                    onClick={() => void onLoadScan(h.scan_id)}
                    onKeyDown={onKey(() => void onLoadScan(h.scan_id))}
                    style={{ cursor: "pointer" }}
                  >
                    <div style={{ fontFamily: FA, fontSize: "0.72rem", color: T1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.source_id}</div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.15rem" }}>
                      <span style={{ fontFamily: FA, fontSize: "0.62rem", color: T3 }}>{new Date(h.scanned_at).toLocaleDateString()}</span>
                      <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: scoreColor(pct(h.overall_score)) }}>{pct(h.overall_score)}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (compareBase?.scan_id === h.scan_id) setCompareBase(null)
                      else void onLoadScanForCompare(h.scan_id)
                    }}
                    style={{ marginTop: "0.2rem", fontFamily: FA, fontSize: "0.6rem", padding: "0.1rem 0.4rem", background: compareBase?.scan_id === h.scan_id ? "rgba(26,25,23,0.08)" : "transparent", color: T3, border: `1px solid ${BD}`, borderRadius: "2px", cursor: "pointer" }}
                  >
                    {compareBase?.scan_id === h.scan_id ? "comparing" : "↔ compare"}
                  </button>
                </div>
              ))
          )}
        </div>
      </aside>

      {/* ── Main content area ───────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>

        {/* Top action bar */}
        <div style={{ padding: isMobile ? "0.625rem 1rem" : "0.75rem 2rem", borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", gap: isMobile ? "0.75rem" : "1.5rem", background: SURF, flexShrink: 0 }}>
          <button
            onClick={onNewScan}
            style={{ fontFamily: FA, fontSize: "0.82rem", color: T2, background: "none", border: "none", cursor: "pointer", padding: 0, whiteSpace: "nowrap" }}
          >
            ← New scan
          </button>
          <span style={{ display: isMobile ? "none" : "inline", fontFamily: MONO, fontSize: "0.62rem", color: T3, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 200 }}>
            {display.source_id}
          </span>
          <span style={{ display: isMobile || !isMock ? "none" : "inline", fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T3, padding: "0.15rem 0.5rem", border: `1px solid ${BD}`, borderRadius: "2px" }}>sample</span>

          {/* View toggle — hidden on mobile (Review requires desktop width) */}
          <div style={{ display: isMobile ? "none" : "flex", border: `1px solid ${BD}`, borderRadius: "4px", overflow: "hidden" }}>
            {(["report", "review"] as const).map(mode => {
              const reviewLimited = mode === "review" && !isSignedIn
              return (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  title={reviewLimited ? "Sign in to unlock line-level annotations in Review" : undefined}
                  style={{
                    fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.1em",
                    textTransform: "uppercase", padding: "0.3rem 0.75rem",
                    background: viewMode === mode ? T1 : "transparent",
                    color: viewMode === mode ? SURF : T3,
                    border: "none", cursor: "pointer", transition: "background 0.15s",
                    display: "flex", alignItems: "center", gap: "0.35rem",
                  }}
                >
                  {mode === "report" ? "Report" : "Review"}
                  {reviewLimited && (
                    <span style={{
                      fontSize: "0.45rem", letterSpacing: "0.06em",
                      opacity: viewMode === "review" ? 0.65 : 0.45,
                      fontWeight: 400,
                    }}>
                      limited
                    </span>
                  )}
                </button>
              )
            })}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "0.625rem" }}>
            <button
              onClick={() => setReportModalOpen(true)}
              style={{ fontFamily: FA, fontSize: "0.75rem", padding: "0.4rem 0.875rem", background: "transparent", border: `1px solid ${BD}`, color: T3, borderRadius: "100px", cursor: "pointer" }}
            >
              Feedback
            </button>
            <button
              onClick={() => void onExport()}
              disabled={exporting}
              style={{ fontFamily: FA, fontSize: "0.75rem", padding: "0.4rem 1rem", background: "transparent", border: `1px solid ${BD2}`, color: T2, borderRadius: "100px", cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.5 : 1 }}
            >
              {exporting ? "Exporting…" : "Export"}
            </button>
          </div>
        </div>

        {/* ── Review mode ─────────────────────────────────────────────── */}
        {viewMode === "review" && compareBase === null && (
          <div style={{ display: "flex", flex: 1, overflow: "hidden", minHeight: 0 }}>

            {/* PDF-first: use PDFViewer when file is a PDF and hasn't failed */}
            {file?.type === "application/pdf" && !pdfFailed ? (
              <PDFViewer
                file={file}
                issues={display.issues}
                isSignedIn={isSignedIn}
                selectedIssue={selectedIssue}
                hoveredIssue={hoveredIssue}
                onSelectIssue={setSelectedIssue}
                onHoverIssue={setHoveredIssue}
                onFallback={(reason) => {
                  setPdfFailed(true)
                  setPdfFailNote(reason)
                  if (process.env.NODE_ENV === "development")
                    console.log("[TraceRank PDF] ATS fallback triggered:", reason)
                }}
              />
            ) : (
              /* ATS text fallback: DOCX, image PDF, no file, or PDF.js error */
              <>
                {pdfFailed && pdfFailNote && (
                  <div style={{ position: "absolute", top: 56, left: 240, zIndex: 20, fontFamily: MONO, fontSize: "0.54rem", color: T3, padding: "0.25rem 0.75rem", background: SURF, border: `1px solid ${BD}`, borderRadius: "2px", pointerEvents: "none" }}>
                    Showing parsed text — PDF preview unavailable
                  </div>
                )}
                <DocumentPane
                  atsText={display.ats_text_preview ?? ""}
                  sections={display.resume_sections ?? {}}
                  issues={display.issues}
                  anchors={anchors}
                  sectionBlocks={sectionBlocks}
                  inlineSpans={inlineSpans}
                  sectionSpans={sectionSpans}
                  issueSpanMap={issueSpanMap}
                  selectedIssue={selectedIssue}
                  hoveredIssue={hoveredIssue}
                  onSelectIssue={setSelectedIssue}
                  onHoverIssue={setHoveredIssue}
                />

            {/* Issues panel */}
            <div style={{ width: "50%", minWidth: 0, overflowY: "auto", background: BG }}>
              <div style={{ padding: "0.875rem 1.25rem", borderBottom: `1px solid ${BD}`, background: SURF }}>
                <span style={{ fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3 }}>
                  Issues — {totalIssues} found
                </span>
              </div>
              {(limited ? display.issues.slice(0, 3) : display.issues).map((issue, i) => {
                const anchor = anchors[i]
                const isSelected = selectedIssue === i
                const isHovered = hoveredIssue === i
                const spanForIssue = issueSpanMap.get(i)
                const confLabel = anchor ? confidenceLabel(anchor.confidence) : "—"
                const confColor: Record<string, string> = {
                  Located: "#7c8e5c", "Approx.": "#9a4d22",
                  Section: T2, Absent: T3, "—": T3,
                }
                const sevColors: Record<string, { bg: string; color: string }> = {
                  critical: { bg: "rgba(140,47,78,0.08)", color: "#8c2f4e" },
                  high:     { bg: "rgba(154,77,34,0.08)", color: "#9a4d22" },
                  medium:   { bg: "rgba(122,110,40,0.08)", color: "#7a6e28" },
                  low:      { bg: "rgba(26,25,23,0.05)",   color: T2       },
                }
                const sc = sevColors[issue.severity] ?? sevColors.low

                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={`Issue: ${issue.title}`}
                    aria-expanded={isSelected}
                    onClick={() => setSelectedIssue(isSelected ? null : i)}
                    onKeyDown={onKey(() => setSelectedIssue(isSelected ? null : i))}
                    onMouseEnter={() => setHoveredIssue(i)}
                    onMouseLeave={() => setHoveredIssue(null)}
                    style={{
                      padding: "0.875rem 1.25rem",
                      borderBottom: `1px solid ${BD}`,
                      background: isSelected
                        ? "rgba(26,25,23,0.02)"
                        : isHovered ? "rgba(26,25,23,0.012)" : "transparent",
                      cursor: "pointer",
                      transition: "background 0.1s",
                      outline: isHovered && !isSelected && spanForIssue
                        ? `1px solid ${BD}`
                        : "none",
                    }}
                  >
                    {/* Row: severity + title + confidence */}
                    <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start", marginBottom: isSelected ? "0.75rem" : 0 }}>
                      <span style={{
                        fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.1em",
                        textTransform: "uppercase", color: sc.color, background: sc.bg,
                        padding: "0.2rem 0.45rem", borderRadius: "2px", flexShrink: 0,
                        border: `1px solid ${sc.color}22`,
                        marginTop: "2px",
                      }}>
                        {issue.severity}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FA, fontSize: "0.84rem", fontWeight: 600, color: T1, lineHeight: 1.4 }}>
                          {issue.title}
                        </div>
                        <div style={{ marginTop: "0.25rem", fontFamily: MONO, fontSize: "0.58rem", color: confColor[confLabel] ?? T3, letterSpacing: "0.06em" }}>
                          {anchor?.confidence === "medium" ? "~ Approx. location" :
                           anchor?.confidence === "high"   ? "✓ Located in text"  :
                           anchor?.confidence === "section" ? `⟳ ${anchor.sectionKey} section` :
                           anchor?.confidence === "absent"  ? "Section not found"  :
                           "No document anchor"}
                        </div>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isSelected && (
                      <div onClick={e => e.stopPropagation()}>
                        {issue.issue_type === "missing_section" ? (
                          <MissingSectionPanel
                            issue={issue}
                            resumeSections={display.resume_sections}
                          />
                        ) : issue.issue_type === "keyword_gap" ? (
                          <>
                            <div style={{ fontFamily: FA, fontSize: "0.78rem", color: T2, lineHeight: 1.65, marginBottom: "0.75rem" }}>
                              {issue.description}
                            </div>
                            <KeywordPlacementHint
                              keyword={issue.title.replace(/^missing keyword:\s*/i, "").trim()}
                              resumeSections={display.resume_sections ?? undefined}
                            />
                          </>
                        ) : (
                          <>
                            <div style={{ fontFamily: FA, fontSize: "0.78rem", color: T2, lineHeight: 1.65, marginBottom: "0.75rem" }}>
                              {issue.description}
                            </div>
                            {issue.evidence && (
                              <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: "4px", padding: "0.75rem", marginBottom: "0.5rem", fontFamily: MONO, fontSize: "0.7rem", color: T2, lineHeight: 1.8 }}>
                                {issue.evidence}
                              </div>
                            )}
                            <div style={{ background: SURF, border: `1px solid ${BD}`, borderRadius: "4px", padding: "0.75rem" }}>
                              <div style={{ fontFamily: MONO, fontSize: "0.52rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T3, marginBottom: "0.4rem" }}>Fix</div>
                              <div style={{ fontFamily: FA, fontSize: "0.8rem", color: T1, lineHeight: 1.65 }}>
                                {issue.fix_pattern || issue.suggested_fix}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
              {limited && gateRemaining > 0 && <IssueGate remaining={gateRemaining} />}
            </div>
            </>
            )}

          </div>
        )}

        {/* ── Report mode wrapper ──────────────────────────────────────────── */}
        {(viewMode === "report" || compareBase !== null) && (
        <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

        {/* ── Compare mode ─────────────────────────────────────────────── */}
        {compareBase !== null && (() => {
          const cmp = compareScans(compareBase, result)
          const VERDICT: Record<string, { color: string; label: string }> = {
            improved:  { color: "#7c8e5c", label: "Improved"  },
            neutral:   { color: T2,        label: "Neutral"   },
            regressed: { color: "#8c2f4e", label: "Regressed" },
          }
          const v = VERDICT[cmp.verdict]
          const SUB: [keyof SubDeltas, string][] = [
            ["keyword_match", "Keywords"], ["experience_alignment", "Experience"],
            ["parse_integrity", "Parse"], ["structure", "Structure"], ["quantified_impact", "Impact"],
          ]
          function DeltaChip({ n }: { n: number }) {
            const color = n > 0 ? "#7c8e5c" : n < 0 ? "#8c2f4e" : T3
            return <span style={{ fontFamily: MONO, fontSize: "0.72rem", color }}>{n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : "±0"}</span>
          }
          return (
            <div style={{ padding: isMobile ? "1.25rem 1rem" : "2rem", borderBottom: `1px solid ${BD}`, maxWidth: 640 }}>
              <Eyebrow>Compare mode</Eyebrow>
              <div style={{ fontFamily: FA, fontSize: "0.78rem", color: T2, lineHeight: 1.8, marginBottom: "1.25rem" }}>
                <div><span style={{ color: T3 }}>Before  </span>{compareBase.source_id}</div>
                <div><span style={{ color: T3 }}>After   </span>{result.source_id}</div>
              </div>
              <div style={{ padding: "0.75rem 1rem", border: `1px solid ${BD}`, borderRadius: "4px", display: "flex", justifyContent: "space-between", marginBottom: "1.5rem", alignItems: "center" }}>
                <span style={{ fontFamily: FA, fontSize: "0.82rem", fontWeight: 600, color: v.color }}>{v.label}</span>
                <span style={{ fontFamily: MONO, fontSize: "0.78rem", color: T2 }}>{cmp.scoreBefore} → {cmp.scoreAfter} &nbsp;(<DeltaChip n={cmp.scoreDelta} />)</span>
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                {SUB.map(([key, label]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "0.4rem 0", borderBottom: `1px solid ${BD}` }}>
                    <span style={{ fontFamily: FA, fontSize: "0.78rem", color: T2 }}>{label}</span>
                    <DeltaChip n={cmp.subDeltas[key]} />
                  </div>
                ))}
              </div>
              {cmp.keywordsGained.length > 0 && (
                <div style={{ marginTop: "1.25rem" }}>
                  <Eyebrow>Keywords gained</Eyebrow>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {cmp.keywordsGained.map(k => <span key={k} style={{ fontFamily: MONO, fontSize: "0.68rem", color: "#7c8e5c", padding: "0.15rem 0.4rem", border: "1px solid rgba(124,142,92,0.3)", borderRadius: "2px" }}>{k}</span>)}
                  </div>
                </div>
              )}
              {cmp.issuesResolved.length > 0 && (
                <div style={{ marginTop: "1rem" }}>
                  <Eyebrow>Resolved</Eyebrow>
                  {cmp.issuesResolved.map((iss, i) => <div key={i} style={{ fontFamily: FA, fontSize: "0.78rem", color: "#7c8e5c", marginBottom: "0.2rem" }}>✓ {iss.title}</div>)}
                </div>
              )}
              <button onClick={() => setCompareBase(null)} style={{ marginTop: "1.25rem", fontFamily: FA, fontSize: "0.75rem", padding: "0.4rem 1rem", background: "transparent", border: `1px solid ${BD2}`, color: T2, borderRadius: "100px", cursor: "pointer" }}>Exit compare</button>
            </div>
          )
        })()}

        {/* ── Normal results ────────────────────────────────────────────── */}
        {compareBase === null && (
          <div>

            {/* Score section */}
            <div style={{ padding: isMobile ? "1.25rem 1rem 1rem" : "2rem 2rem 1.75rem", borderBottom: `1px solid ${BD}` }}>
              <Eyebrow>Score breakdown</Eyebrow>

              {/* Overall score */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: "0.875rem", marginBottom: "1.75rem", flexWrap: "wrap" }}>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.4rem" }}>
                  <span style={{ fontFamily: FA, fontSize: isMobile ? "3rem" : "4.5rem", fontWeight: 700, color: T1, lineHeight: 1 }}>{pct(display.scores.overall)}</span>
                  <span style={{ fontFamily: FA, fontSize: isMobile ? "1.1rem" : "1.5rem", color: T3, fontWeight: 300 }}>/100</span>
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.55rem" }}>
                  <span
                    title="Plain-language band over the same score — thresholds documented in the methodology"
                    style={{ fontFamily: FA, fontSize: "0.95rem", fontWeight: 600, color: scoreColor(pct(display.scores.overall)), cursor: "default" }}
                  >
                    {scoreBand(pct(display.scores.overall))}
                  </span>
                  <span style={{ fontFamily: FA, fontSize: "0.78rem", color: T3 }}>·</span>
                  <span title={confLabel} style={{ fontFamily: FA, fontSize: "0.78rem", color: confColor, cursor: "default" }}>
                    {confLabel}
                  </span>
                </div>
              </div>

              {/* Sub-scores */}
              <div>
                {scoreItems.map(s => {
                  // On a gated result only keyword match is revealed; the rest
                  // are locked ("—") behind sign-in.
                  const isLocked  = isGated && s.key !== "keyword_match"
                  const isNeutral = !isLocked && (s.key in neutralDefaults)
                  const hide      = isLocked || isNeutral
                  const p         = isNeutral ? 50 : pct(s.value)
                  return (
                    <div key={s.key} style={{ display: "flex", alignItems: "center", gap: isMobile ? "0.5rem" : "1rem", padding: "0.6rem 0", borderTop: `1px solid ${BD}` }}>
                      <span style={{ fontFamily: FA, fontSize: "0.78rem", color: T2, width: isMobile ? "96px" : "110px", flexShrink: 0 }}>{s.label}</span>
                      <div style={{ flex: 1, height: "2px", background: "rgba(26,25,23,0.07)", borderRadius: "1px", position: "relative" }}>
                        {!hide && <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${p}%`, background: T1, opacity: 0.5, borderRadius: "1px", transition: "width 0.8s ease" }} />}
                      </div>
                      <span style={{ fontFamily: MONO, fontSize: "0.82rem", color: hide ? T3 : T1, width: "30px", textAlign: "right", flexShrink: 0 }}>{hide ? "—" : p}</span>
                      {!isMobile && <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: T3, width: "30px", flexShrink: 0 }}>{s.weight}</span>}
                    </div>
                  )
                })}
              </div>

              {defaultCount > 0 && !isGated && (
                <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "rgba(26,25,23,0.03)", border: `1px solid ${BD}`, borderRadius: "4px", fontFamily: FA, fontSize: "0.75rem", color: T2, lineHeight: 1.65 }}>
                  One or more sub-scores defaulted to neutral — the job description lacked measurable data for that signal. Not penalties.
                </div>
              )}

              {isGated && (
                <div style={{ marginTop: "1rem", padding: "0.75rem 1rem", background: "rgba(26,25,23,0.03)", border: `1px solid ${BD}`, borderRadius: "4px", fontFamily: FA, fontSize: "0.75rem", color: T2, lineHeight: 1.65 }}>
                  {isSignedIn
                    ? "This scan ran before your session was attached — run a new scan to see the full report."
                    : "Sign in to unlock the full score breakdown, every finding, the keyword gap analysis, and the “What ATS sees” preview."}
                </div>
              )}

              <div style={{ marginTop: "1rem" }}>
                <a href="/methodology" target="_blank" style={{ fontFamily: FA, fontSize: "0.72rem", color: T3, borderBottom: `1px solid ${BD}`, paddingBottom: "1px", textDecoration: "none" }}>
                  Scoring methodology →
                </a>
              </div>
            </div>

            {/* Fix this first */}
            {!limited && display.top_fixes.length > 0 && (
              <div style={{ padding: isMobile ? "1.25rem 1rem" : "2rem", borderBottom: `1px solid ${BD}` }}>
                <Eyebrow>Fix this first</Eyebrow>
                <div>
                  {display.top_fixes.map((fix, i) => (
                    <div
                      key={fix.issue_index}
                      onClick={() => { setSelectedIssue(fix.issue_index); track("fix_clicked", { issue_type: fix.issue_type, label: fix.labels[0] ?? "" }) }}
                      style={{ display: "flex", gap: "1.25rem", padding: "1rem 0", borderTop: i === 0 ? "none" : `1px solid ${BD}`, cursor: "pointer" }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: T3, paddingTop: "3px", flexShrink: 0, width: "1.5rem" }}>{String(i + 1).padStart(2, "0")}</span>
                      <div>
                        <div style={{ fontFamily: FA, fontSize: "0.875rem", fontWeight: 600, color: T1, marginBottom: "0.3rem", lineHeight: 1.4 }}>{fix.title}</div>
                        <div style={{ fontFamily: FA, fontSize: "0.78rem", color: T2, lineHeight: 1.55 }}>{fix.suggested_fix}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {limited && <UpgradePrompt label="Fix priority ranking available after sign-in." />}

            {/* Issues list */}
            <div ref={issuesSectionRef}>
              <div style={{ padding: isMobile ? "1rem 1rem 0.5rem" : "1.25rem 2rem 0.75rem", borderBottom: `1px solid ${BD}` }}>
                <Eyebrow>Issues — {totalIssues} found</Eyebrow>
              </div>

              {(limited ? display.issues.slice(0, 3) : display.issues).map((issue, i) => {
                const isSelected = selectedIssue === i
                return (
                  <div
                    key={i}
                    role="button"
                    tabIndex={0}
                    aria-label={`Issue: ${issue.title}`}
                    aria-expanded={isSelected}
                    onClick={() => setSelectedIssue(isSelected ? null : i)}
                    onKeyDown={onKey(() => setSelectedIssue(isSelected ? null : i))}
                    style={{
                      padding: isMobile ? "0.875rem 1rem" : "1.25rem 2rem",
                      borderBottom: `1px solid ${BD}`,
                      background: isSelected ? "rgba(26,25,23,0.015)" : "transparent",
                      cursor: "pointer", transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
                      <SevBadge sev={issue.severity} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: FA, fontSize: "0.9rem", fontWeight: 600, color: T1, marginBottom: "0.3rem", lineHeight: 1.4 }}>
                          {issue.title}
                        </div>
                        <div style={{ fontFamily: FA, fontSize: "0.8rem", color: T2, lineHeight: 1.6 }}>
                          {issue.description}
                        </div>

                        {isSelected && (
                          <div style={{ marginTop: "1.25rem" }} onClick={e => e.stopPropagation()}>
                            {issue.issue_type === "missing_section" ? (
                              <MissingSectionPanel
                                issue={issue}
                                resumeSections={display.resume_sections}
                              />
                            ) : issue.issue_type === "keyword_gap" ? (
                              <>
                                {issue.evidence && (
                                  <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: "4px", padding: "0.875rem 1rem", marginBottom: "0.75rem", fontFamily: MONO, fontSize: "0.72rem", color: T2, lineHeight: 1.9 }}>
                                    {issue.evidence}
                                  </div>
                                )}
                                <KeywordPlacementHint
                                  keyword={issue.title.replace(/^missing keyword:\s*/i, "").trim()}
                                  resumeSections={display.resume_sections ?? undefined}
                                />
                              </>
                            ) : (
                              <>
                                {issue.evidence && (
                                  <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: "4px", padding: "0.875rem 1rem", marginBottom: "0.75rem", fontFamily: MONO, fontSize: "0.72rem", color: T2, lineHeight: 1.9 }}>
                                    {issue.evidence}
                                  </div>
                                )}

                                <div style={{ background: SURF, border: `1px solid ${BD}`, borderRadius: "4px", padding: "0.875rem 1rem", marginBottom: "0.75rem" }}>
                                  <div style={{ fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T3, marginBottom: "0.5rem" }}>Fix pattern</div>
                                  <div style={{ fontFamily: FA, fontSize: "0.82rem", color: T1, lineHeight: 1.7 }}>{issue.fix_pattern || issue.suggested_fix}</div>
                                  {issue.source_excerpt && <pre style={{ marginTop: "0.5rem", fontFamily: MONO, fontSize: "0.72rem", color: T2, whiteSpace: "pre-wrap", lineHeight: 1.65, margin: "0.5rem 0 0" }}>{issue.source_excerpt}</pre>}
                                </div>

                                {issue.rewrite_starter && (
                                  <div style={{ background: "rgba(26,25,23,0.025)", border: `1px solid ${BD}`, borderLeft: `2px solid rgba(26,25,23,0.2)`, borderRadius: "0 4px 4px 0", padding: "0.875rem 1rem", marginBottom: "0.75rem", fontFamily: MONO, fontSize: "0.78rem", color: T1, lineHeight: 1.7 }}>
                                    <div style={{ fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T3, marginBottom: "0.5rem" }}>Rewrite starter</div>
                                    {issue.rewrite_starter}
                                  </div>
                                )}

                                {(issue.issue_type === "weak_phrasing" || issue.issue_type === "low_quantification") && (
                                  <div style={{ marginTop: "0.25rem" }}>
                                    {!rewriteVariants[i] && llmStatus?.available && llmStatus.healthy !== false && (
                                      <button
                                        onClick={() => void onGenerateRewrites(i, issue)}
                                        disabled={rewriteLoading[i]}
                                        style={{ fontFamily: FA, fontSize: "0.75rem", padding: "0.4rem 1rem", background: "transparent", border: `1px solid ${BD2}`, color: T2, borderRadius: "100px", cursor: rewriteLoading[i] ? "default" : "pointer", opacity: rewriteLoading[i] ? 0.6 : 1 }}
                                      >
                                        {rewriteLoading[i] ? "Generating…" : "Generate AI rewrites"}
                                      </button>
                                    )}
                                    {rewriteVariants[i]?.length > 0 && (
                                      <div style={{ marginTop: "0.5rem" }}>
                                        <div style={{ fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: T3, marginBottom: "0.5rem" }}>AI-assisted rewrites</div>
                                        {rewriteVariants[i].map((v, vi) => (
                                          <div key={vi} style={{ padding: "0.65rem 0.875rem", background: SURF, border: `1px solid ${BD}`, borderRadius: "4px", marginBottom: "0.35rem", fontFamily: MONO, fontSize: "0.78rem", color: T1, lineHeight: 1.65 }}>{v}</div>
                                        ))}
                                        <button
                                          onClick={() => setSelectedIssue(null)}
                                          style={{ fontFamily: FA, fontSize: "0.65rem", color: T3, background: "none", border: "none", cursor: "pointer", padding: "0.1rem 0" }}
                                        >clear</button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              {limited && gateRemaining > 0 && <IssueGate remaining={gateRemaining} />}
            </div>

            {/* ── Collapsible secondary sections ─────────────────────────── */}

            {/* Keywords */}
            {!limited ? (
              <div style={{ borderBottom: `1px solid ${BD}` }}>
                <button
                  onClick={() => setShowKeywords(v => !v)}
                  style={{ width: "100%", padding: isMobile ? "0.875rem 1rem" : "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}
                >
                  <span style={{ fontFamily: MONO, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3 }}>Keywords</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: T3 }}>{showKeywords ? "▴" : "▾"}</span>
                </button>
                {showKeywords && (
                  <div style={{ padding: isMobile ? "0 1rem 1rem" : "0 2rem 1.5rem" }}>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
                      {display.matched_keywords.map(k => <span key={k} style={{ fontFamily: MONO, fontSize: "0.68rem", background: "rgba(124,142,92,0.08)", color: "#7c8e5c", padding: "0.15rem 0.45rem", borderRadius: "2px", border: "1px solid rgba(124,142,92,0.2)" }}>{k}</span>)}
                      {display.missing_keywords.map(k => <span key={k} style={{ fontFamily: MONO, fontSize: "0.68rem", background: "rgba(140,47,78,0.06)", color: "#8c2f4e", padding: "0.15rem 0.45rem", borderRadius: "2px", border: "1px solid rgba(140,47,78,0.15)" }}>–{k}</span>)}
                    </div>
                  </div>
                )}
              </div>
            ) : <UpgradePrompt label="Keyword gap analysis available after sign-in." />}

            {/* ATS Simulation */}
            {display.simulation && !limited && (
              <div style={{ borderBottom: `1px solid ${BD}` }}>
                <button
                  onClick={() => setShowSimulation(v => !v)}
                  style={{ width: "100%", padding: isMobile ? "0.875rem 1rem" : "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}
                >
                  <span style={{ fontFamily: MONO, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3 }}>ATS Profile Simulation</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: T3 }}>{showSimulation ? "▴" : "▾"}</span>
                </button>
                {showSimulation && (() => {
                  const sim = display.simulation!
                  return (
                    <div style={{ padding: isMobile ? "0 1rem 1rem" : "0 2rem 1.5rem" }}>
                      <div style={{ fontFamily: FA, fontSize: "0.78rem", color: T2, fontStyle: "italic", marginBottom: "1rem", lineHeight: 1.7 }}>{sim.cross_profile_summary}</div>
                      {sim.profiles.map(p => {
                        const open = expandedProfile === p.id
                        return (
                          <div key={p.id} style={{ border: `1px solid ${BD}`, borderRadius: "4px", marginBottom: "0.5rem" }}>
                            <div onClick={() => setExpandedProfile(open ? null : p.id)} style={{ padding: "0.75rem 1rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                                <span style={{ fontFamily: MONO, fontSize: "1.1rem", fontWeight: 600, color: scoreColor(p.score) }}>{p.score}</span>
                                <span style={{ fontFamily: FA, fontSize: "0.82rem", color: T1 }}>{p.label}</span>
                              </div>
                              <span style={{ fontFamily: MONO, fontSize: "0.58rem", color: T3 }}>{p.risk_level}</span>
                            </div>
                            {open && (
                              <div style={{ padding: "0 1rem 1rem" }}>
                                {p.top_strengths.length > 0 && p.top_strengths.map((s, i) => <div key={i} style={{ fontFamily: FA, fontSize: "0.75rem", color: "#7c8e5c", marginBottom: "0.15rem" }}>✓ {s}</div>)}
                                {p.top_failures.length  > 0 && p.top_failures.map((s, i) => <div key={i} style={{ fontFamily: FA, fontSize: "0.75rem", color: "#8c2f4e", marginBottom: "0.15rem" }}>✗ {s}</div>)}
                                {p.recommended_fixes.length > 0 && <div style={{ marginTop: "0.5rem" }}>{p.recommended_fixes.map((s, i) => <div key={i} style={{ fontFamily: FA, fontSize: "0.75rem", color: T1, marginBottom: "0.15rem" }}>→ {s}</div>)}</div>}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* ATS Preview */}
            {!limited ? (
              <div style={{ borderBottom: `1px solid ${BD}` }}>
                <button
                  onClick={() => setShowAtsPreview(v => !v)}
                  style={{ width: "100%", padding: isMobile ? "0.875rem 1rem" : "1rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", background: "none", border: "none", cursor: "pointer" }}
                >
                  <span style={{ fontFamily: MONO, fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: T3 }}>What ATS sees</span>
                  <span style={{ fontFamily: MONO, fontSize: "0.62rem", color: T3 }}>{showAtsPreview ? "▴" : "▾"}</span>
                </button>
                {showAtsPreview && (
                  <div style={{ padding: isMobile ? "0 1rem 1rem" : "0 2rem 2rem" }}>
                    <pre style={{ fontFamily: MONO, fontSize: "0.75rem", lineHeight: 1.8, color: T2, whiteSpace: "pre-wrap", wordBreak: "break-word", background: SURF, border: `1px solid ${BD}`, borderRadius: "4px", padding: "1.25rem", margin: 0 }}>
                      {display.ats_text_preview}
                    </pre>
                  </div>
                )}
              </div>
            ) : <UpgradePrompt label="ATS text preview available after sign-in." />}

            {/* End-of-scan feedback card */}
            <FeedbackCard
              scanId={display.scan_id}
              viewMode={viewMode}
              isMobile={isMobile}
            />

          </div>
        )}
        </div>
        )}

      </div>

      <ReportProblemModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        scanId={display.scan_id}
        viewMode={viewMode}
      />
    </div>
  )
}
