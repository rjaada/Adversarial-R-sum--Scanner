/**
 * Workspace — the core résumé scanner UI.
 *
 * Three phases:
 *   1. Upload  — user provides résumé file + job description (UploadPhase)
 *   2. Scanning — progress animation while API processes (ScanningPhase)
 *   3. Results  — scored report with sidebar controls + report panels (inline below)
 *
 * Shared types:  @/types/workspace
 * Shared utils:  @/lib/scan-utils  (pct, scoreColor, compareScans, track, SEV_COLOR, SECTION_HEADER_VARIANTS)
 * Demo data:     @/lib/mock-scan   (MOCK_SCAN — shown before any real scan is run)
 */

"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { useAuth } from "@clerk/nextjs"
import { NavUserButton } from "@/components/NavUserButton"
import { IssueGate } from "@/components/IssueGate"
import { UpgradePrompt } from "@/components/UpgradePrompt"
import { UploadPhase } from "./UploadPhase"
import { ScanningPhase } from "./ScanningPhase"
import {
  pct, scoreColor, compareScans, track,
  SEV_COLOR, SECTION_HEADER_VARIANTS,
} from "@/lib/scan-utils"
import { MOCK_SCAN } from "@/lib/mock-scan"
import type {
  ScanResult, ScanSummary, Issue, LLMStatus, RewriteResponse, SubDeltas,
} from "@/types/workspace"

// ── Constants ────────────────────────────────────────────────────────────────

const FA = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const API_BASE = ""
const PENDING_SCAN_KEY    = "tracerank_pending_scan"
const PENDING_SCAN_TTL_MS = 30 * 60 * 1000
const STATUS_TTL_MS       = 30_000

// ── CSS variables injected at the workspace root ─────────────────────────────
// Edit color tokens here; they cascade to all workspace child elements.

const LIGHT_VARS = {
  "--bg-base":       "#F4F4F4",
  "--bg-surface":    "#FFFFFF",
  "--bg-elevated":   "#FAFAFA",
  "--bg-muted":      "#F4F4F4",
  "--bg-accent-low": "#F0F4EC",
  "--border-subtle": "#EBEBEB",
  "--border-mid":    "#DCDCDC",
  "--text-primary":  "#0D0C0A",
  "--text-secondary":"#474546",
  "--text-dim":      "#858585",
  "--accent":        "#7c8e5c",
  "--accent-hover":  "#8fa85a",
  "--sev-critical":  "#8c2f4e",
  "--sev-high":      "#9a4d22",
  "--sev-medium":    "#7a6e28",
  "--sev-low":       "#858585",
  "--mineral":       "#4a4640",
  "--font-body":     FA,
  "--font-display":  FA,
  "--font-data":     "var(--font-mono, 'IBM Plex Mono', monospace)",
} as React.CSSProperties

// ── Page component ───────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()

  // ── State ──────────────────────────────────────────────────────────
  const [result, setResult]                   = useState<ScanResult | null>(null)
  const [scanning, setScanning]               = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [jdText, setJdText]                   = useState("")
  const [file, setFile]                       = useState<File | null>(null)
  const [dragOver, setDragOver]               = useState(false)
  const [jdFocused, setJdFocused]             = useState(false)
  const [selectedIssue, setSelectedIssue]     = useState<number | null>(null)
  const [history, setHistory]                 = useState<ScanSummary[]>([])
  const [rewriteVariants, setRewriteVariants] = useState<Record<number, string[]>>({})
  const [rewriteLoading, setRewriteLoading]   = useState<Record<number, boolean>>({})
  const [llmStatus, setLlmStatus]             = useState<LLMStatus | null>(null)
  const [simExpanded, setSimExpanded]         = useState(false)
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null)
  const [exporting, setExporting]             = useState(false)
  const [compareBase, setCompareBase]         = useState<ScanResult | null>(null)
  const [previousResult, setPreviousResult]   = useState<ScanResult | null>(null)

  const lastStatusCheckRef = useRef<number>(0)
  const issuesSectionRef   = useRef<HTMLDivElement>(null)
  const fileInputRef       = useRef<HTMLInputElement>(null)

  // display is either the real scan result or the demo placeholder
  const display = result ?? MOCK_SCAN
  const isMock  = result === null

  // Which of the three phases is active
  const showUpload   = result === null && !scanning
  const showScanning = scanning
  const showResults  = result !== null && !scanning

  const canScan = !!file && jdText.trim().length > 0

  // ── LLM status helper ──────────────────────────────────────────────
  const refreshLlmStatus = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && now - lastStatusCheckRef.current < STATUS_TTL_MS) return
    lastStatusCheckRef.current = now
    try {
      const r = await fetch(`${API_BASE}/api/rewrite/status`)
      setLlmStatus(await r.json() as LLMStatus)
    } catch {
      setLlmStatus({ available: false, model: "", healthy: null })
    }
  }, [])

  // ── Effects ────────────────────────────────────────────────────────
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = "#F4F4F4"
    return () => { document.body.style.background = prev }
  }, [])

  // Claim any pending scan stored before sign-in
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    const raw = localStorage.getItem(PENDING_SCAN_KEY)
    if (!raw) return
    try {
      const pending = JSON.parse(raw) as { result: ScanResult; scanned_at: string }
      const age = Date.now() - new Date(pending.scanned_at).getTime()
      if (age > PENDING_SCAN_TTL_MS) { localStorage.removeItem(PENDING_SCAN_KEY); return }
      getToken().then(token => {
        if (!token) return
        fetch(`${API_BASE}/api/scans/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ result: pending.result, scanned_at: pending.scanned_at }),
        })
          .then(() => localStorage.removeItem(PENDING_SCAN_KEY))
          .catch(() => localStorage.removeItem(PENDING_SCAN_KEY))
      })
    } catch { localStorage.removeItem(PENDING_SCAN_KEY) }
  }, [isLoaded, isSignedIn, getToken])

  // Load scan history for signed-in users
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return
    getToken().then(token => {
      if (!token) return
      fetch(`${API_BASE}/api/scans`, { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then((data: unknown) => { if (Array.isArray(data)) setHistory(data) })
        .catch(() => {})
    })
  }, [isLoaded, isSignedIn, getToken])

  useEffect(() => {
    void refreshLlmStatus(true)
    const onFocus = () => { void refreshLlmStatus() }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshLlmStatus])

  useEffect(() => {
    if (selectedIssue !== null)
      issuesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [selectedIssue])

  // ── Actions ────────────────────────────────────────────────────────
  async function handleScan() {
    if (!file)          { setError("Upload a resume first."); return }
    if (!jdText.trim()) { setError("Paste a job description first."); return }
    setScanning(true); setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("jd_text", jdText)
      const res = await fetch(`${API_BASE}/api/scan`, { method: "POST", body: form })
      if (!res.ok) { const msg = await res.text(); throw new Error(msg || "HTTP " + String(res.status)) }
      const data = await res.json() as ScanResult
      setResult(prev => { setPreviousResult(prev); return data })
      setSelectedIssue(null)
      try { localStorage.setItem(PENDING_SCAN_KEY, JSON.stringify({ result: data, scanned_at: new Date().toISOString() })) } catch {}
      track("scan_completed", {
        overall_score:       pct(data.scores.overall),
        issue_count:         data.issues.length,
        has_simulation:      data.simulation != null,
        keyword_match_count: data.matched_keywords.length,
      })
      setHistory(prev => [
        { scan_id: data.scan_id, source_id: data.source_id, scanned_at: new Date().toISOString(), overall_score: data.scores.overall },
        ...prev.filter(h => h.scan_id !== data.scan_id),
      ])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed")
    } finally {
      setScanning(false)
    }
  }

  async function loadScan(scanId: string) {
    try {
      const token = await getToken()
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`${API_BASE}/api/scans/${scanId}`, { headers })
      if (res.ok) { setResult(await res.json() as ScanResult); setSelectedIssue(null); setCompareBase(null) }
    } catch {}
  }

  async function loadScanForCompare(scanId: string) {
    try {
      const token = await getToken()
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`${API_BASE}/api/scans/${scanId}`, { headers })
      if (res.ok) { setCompareBase(await res.json() as ScanResult); track("compare_started", {}) }
    } catch {}
  }

  async function handleGenerateRewrites(issueIndex: number, issue: Issue) {
    await refreshLlmStatus()
    track("rewrite_requested", { issue_type: issue.issue_type })
    setRewriteLoading(prev => ({ ...prev, [issueIndex]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_type:      issue.issue_type,
          original_text:   issue.source_excerpt || issue.rewrite_starter || "",
          evidence:        issue.evidence || "",
          fix_pattern:     issue.fix_pattern || "",
          rewrite_starter: issue.rewrite_starter || "",
          jd_keywords:     display.matched_keywords.slice(0, 8),
          count:           3,
        }),
      })
      const data = await res.json() as RewriteResponse
      if (!data.available) {
        setRewriteVariants(prev => ({ ...prev, [issueIndex]: ["LLM not configured — set LLM_ENDPOINT in backend .env"] }))
      } else if (data.variants.length > 0) {
        setRewriteVariants(prev => ({ ...prev, [issueIndex]: data.variants }))
      } else {
        setRewriteVariants(prev => ({ ...prev, [issueIndex]: [data.error || "Generation returned no output."] }))
      }
    } catch {
      setRewriteVariants(prev => ({ ...prev, [issueIndex]: ["Could not reach backend."] }))
    } finally {
      setRewriteLoading(prev => ({ ...prev, [issueIndex]: false }))
    }
  }

  async function handleExport() {
    setExporting(true)
    track("export_triggered", { has_real_scan: result !== null })
    try {
      const res = await fetch(`${API_BASE}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(display),
      })
      if (!res.ok) throw new Error("Export failed")
      window.open(URL.createObjectURL(await res.blob()), "_blank")
    } catch {} finally { setExporting(false) }
  }

  function handleDropUpload(e: React.DragEvent) {
    e.preventDefault(); setDragOver(false)
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  function handleNewScan() {
    setResult(null); setFile(null); setJdText(""); setError(null)
    setCompareBase(null); setSelectedIssue(null)
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div style={{ ...LIGHT_VARS, background: "#F4F4F4", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: FA }}>
      <style>{`
        @keyframes tr-scan-bar {
          0%   { width: 0%;  opacity: 1; }
          70%  { width: 82%; opacity: 1; }
          90%  { width: 90%; opacity: 1; }
          100% { width: 90%; opacity: 0.7; }
        }
        .tr-scan-bar { animation: tr-scan-bar 3s cubic-bezier(0.4,0,0.2,1) forwards; }
        .upload-card-hover:hover { border-color: #0D0C0A !important; }
        .new-scan-btn:hover { color: #0D0C0A !important; }
      `}</style>

      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <nav className="ws-nav" style={{ background: "#FFFFFF", borderBottom: "1px solid #EBEBEB" }}>
        <Link href="/" style={{ fontFamily: FA, fontSize: "1rem", fontWeight: 600, color: "#0D0C0A", letterSpacing: "-0.01em", textDecoration: "none", marginRight: "32px" }}>
          TraceRank
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/methodology" style={{ fontFamily: FA, fontSize: "0.875rem", color: "#474546", textDecoration: "none" }}>Methodology</Link>
          <Link href="/pricing"     style={{ fontFamily: FA, fontSize: "0.875rem", color: "#474546", textDecoration: "none" }}>Pricing</Link>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginLeft: "auto" }}>
          {showResults && (
            <>
              <span style={{ fontFamily: "var(--font-data, monospace)", fontSize: "0.65rem", color: "#858585", letterSpacing: "0.06em", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {display.source_id}
              </span>
              <button
                onClick={() => void handleExport()}
                disabled={exporting}
                style={{ fontFamily: FA, fontSize: "0.78rem", padding: "6px 14px", background: "transparent", border: "1px solid #DCDCDC", color: "#474546", borderRadius: "100px", cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.5 : 1 }}
              >
                {exporting ? "Exporting…" : "Export"}
              </button>
            </>
          )}
          <NavUserButton />
        </div>
      </nav>

      {/* ── Phase 1: Upload ─────────────────────────────────────────── */}
      {showUpload && (
        <UploadPhase
          file={file}
          jdText={jdText}
          dragOver={dragOver}
          jdFocused={jdFocused}
          error={error}
          canScan={canScan}
          fileInputRef={fileInputRef}
          onFileChange={setFile}
          onFileClear={() => setFile(null)}
          onJdChange={setJdText}
          onJdFocus={() => setJdFocused(true)}
          onJdBlur={() => setJdFocused(false)}
          onDrop={handleDropUpload}
          onDragOver={e => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onScan={() => void handleScan()}
        />
      )}

      {/* ── Phase 2: Scanning ───────────────────────────────────────── */}
      {showScanning && <ScanningPhase />}

      {/* ── Phase 3: Results ────────────────────────────────────────── */}
      {showResults && (
        <div className="ws-main">

          {/* Sidebar — résumé re-upload, JD input, compare, history */}
          <div className="ws-sidebar">
            <div>
              <label style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", display: "block", marginBottom: "0.45rem" }}>
                Résumé
              </label>
              <div
                onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f) }}
                onDragOver={e => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                style={{ border: `1.5px ${file ? "solid" : "dashed"} ${file ? "#7c8e5c" : "#B3B3B3"}`, borderRadius: "8px", padding: "1.25rem 1rem", textAlign: "center", cursor: "pointer", background: file ? "#F0F4EC" : "#FAFAFA", transition: "border-color 0.2s, background 0.2s" }}
              >
                <input ref={fileInputRef} type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
                <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: file ? "var(--accent)" : "var(--text-dim)", fontWeight: file ? 500 : undefined, lineHeight: 1.4, display: "block" }}>
                  {file ? file.name : "PDF or DOCX"}
                </span>
              </div>
            </div>

            <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
              <label style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", display: "block", marginBottom: "0.45rem" }}>
                Job description
              </label>
              <textarea
                value={jdText}
                onChange={e => setJdText(e.target.value)}
                placeholder="Paste the full job description here"
                style={{ flex: 1, minHeight: "160px", resize: "vertical", border: "1px solid var(--border-mid)", borderRadius: "2px", padding: "0.75rem", fontSize: "0.78rem", fontFamily: "var(--font-body)", color: "var(--text-primary)", background: "var(--bg-elevated)", outline: "none", lineHeight: 1.65 }}
              />
            </div>

            {error && (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--sev-critical)", padding: "0.45rem 0.65rem", border: "1px solid rgba(192,112,128,0.3)", borderRadius: "2px", background: "rgba(140,47,78,0.08)", lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <button
              onClick={() => void handleScan()}
              disabled={scanning}
              style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 500, background: scanning ? "var(--border-mid)" : "var(--accent)", color: scanning ? "var(--text-dim)" : "#0d0c0a", border: "none", borderRadius: "2px", padding: "0.75rem", cursor: scanning ? "not-allowed" : "pointer", transition: "background 0.2s" }}
            >
              {scanning ? "Analyzing…" : "Analyze résumé"}
            </button>

            {previousResult !== null && result !== null && (
              <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
                <div style={{ fontFamily: "var(--font-data)", fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.45rem" }}>Compare</div>
                <button
                  onClick={() => { if (compareBase?.scan_id === previousResult.scan_id) setCompareBase(null); else { setCompareBase(previousResult); track("compare_started", {}) } }}
                  style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", padding: "0.25rem 0.5rem", background: compareBase?.scan_id === previousResult.scan_id ? "var(--accent)" : "transparent", color: compareBase?.scan_id === previousResult.scan_id ? "#0d0c0a" : "var(--text-secondary)", border: `1px solid ${compareBase?.scan_id === previousResult.scan_id ? "var(--accent)" : "var(--border-mid)"}`, borderRadius: "2px", cursor: "pointer", width: "100%", transition: "background 0.2s" }}
                >
                  ↔ Compare with previous
                </button>
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <div style={{ fontFamily: "var(--font-data)", fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.65rem" }}>History</div>
              {history.length === 0 ? (
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic" }}>No saved scans.</div>
              ) : history.map(h => {
                const p = pct(h.overall_score)
                const isCompareBase = compareBase?.scan_id === h.scan_id
                return (
                  <div key={h.scan_id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div onClick={() => void loadScan(h.scan_id)} style={{ cursor: "pointer" }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.source_id}</div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.65rem", color: "var(--text-dim)" }}>{new Date(h.scanned_at).toLocaleDateString()}</span>
                        <span style={{ fontFamily: "var(--font-data)", fontSize: "0.7rem", color: scoreColor(p) }}>{p}</span>
                      </div>
                    </div>
                    {result !== null && (
                      <button
                        onClick={() => { if (isCompareBase) setCompareBase(null); else void loadScanForCompare(h.scan_id) }}
                        style={{ marginTop: "0.22rem", fontFamily: "var(--font-body)", fontSize: "0.62rem", padding: "0.1rem 0.4rem", background: isCompareBase ? "var(--accent)" : "transparent", color: isCompareBase ? "#0d0c0a" : "var(--text-dim)", border: `1px solid ${isCompareBase ? "var(--accent)" : "var(--border-subtle)"}`, borderRadius: "2px", cursor: "pointer" }}
                      >
                        {isCompareBase ? "comparing" : "↔ compare"}
                      </button>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Report area */}
          <div className="ws-report">

            <div style={{ padding: "1rem 2rem 0" }}>
              <button
                className="new-scan-btn"
                onClick={handleNewScan}
                style={{ background: "none", border: "none", cursor: "pointer", fontFamily: FA, fontSize: "14px", color: "#858585", padding: 0, transition: "color 0.15s" }}
              >
                ← New scan
              </button>
            </div>

            {/* ── Compare panel ─────────────────────────────────────── */}
            {compareBase !== null && (() => {
              const cmp = compareScans(compareBase, result!)
              const VERDICT_STYLE: Record<string, { color: string; bg: string; label: string }> = {
                improved:  { color: "var(--accent)",       bg: "rgba(124,142,92,0.08)", label: "Improved"  },
                neutral:   { color: "var(--text-dim)",     bg: "rgba(0,0,0,0.06)",     label: "Neutral"   },
                regressed: { color: "var(--sev-critical)", bg: "rgba(140,47,78,0.08)", label: "Regressed" },
              }
              const vs = VERDICT_STYLE[cmp.verdict]

              function deltaLabel(n: number): JSX.Element {
                if (n > 0) return <span style={{ color: "var(--accent)",       fontFamily: "var(--font-data)", fontSize: "0.72rem", fontWeight: 500 }}>+{n}</span>
                if (n < 0) return <span style={{ color: "var(--sev-critical)", fontFamily: "var(--font-data)", fontSize: "0.72rem", fontWeight: 500 }}>−{Math.abs(n)}</span>
                return <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-data)", fontSize: "0.72rem" }}>±0</span>
              }

              const SUB_LABELS: [keyof SubDeltas, string][] = [
                ["keyword_match", "Keywords"], ["experience_alignment", "Experience"],
                ["parse_integrity", "Parse"], ["structure", "Structure"], ["quantified_impact", "Impact"],
              ]

              return (
                <div style={{ padding: "1.5rem 2rem", maxWidth: "640px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                    <span style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)" }}>Compare mode</span>
                    <button onClick={() => setCompareBase(null)} style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", padding: "0.18rem 0.55rem", background: "transparent", border: "1px solid var(--border-mid)", color: "var(--text-dim)", borderRadius: "2px", cursor: "pointer" }}>Exit compare</button>
                  </div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.7, marginBottom: "1rem" }}>
                    <div><span style={{ color: "var(--text-secondary)", marginRight: "0.4rem" }}>Before</span>{compareBase.source_id}</div>
                    <div><span style={{ color: "var(--text-secondary)", marginRight: "0.5rem" }}>After</span>{result!.source_id}</div>
                  </div>
                  <div style={{ padding: "0.65rem 0.875rem", background: vs.bg, borderRadius: "2px", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border-subtle)" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 500, color: vs.color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{vs.label}</span>
                    <span style={{ fontFamily: "var(--font-data)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>{cmp.scoreBefore} → {cmp.scoreAfter} &nbsp;({deltaLabel(cmp.scoreDelta)})</span>
                  </div>
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.65rem" }}>Score breakdown</div>
                    {SUB_LABELS.map(([key, label]) => (
                      <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.35rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>{label}</span>
                        {deltaLabel(cmp.subDeltas[key])}
                      </div>
                    ))}
                  </div>
                  {cmp.volatilityDelta !== null && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.5rem" }}>ATS profile spread</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-secondary)" }}>
                        <span>{cmp.volatilityBefore} → {cmp.volatilityAfter} pts</span>
                        <span style={{ fontFamily: "var(--font-data)", fontSize: "0.72rem", color: (cmp.volatilityDelta ?? 0) < 0 ? "var(--accent)" : (cmp.volatilityDelta ?? 0) > 0 ? "var(--sev-critical)" : "var(--text-dim)" }}>
                          {(cmp.volatilityDelta ?? 0) < 0 ? "↓ less volatile" : (cmp.volatilityDelta ?? 0) > 0 ? "↑ more volatile" : "unchanged"}
                        </span>
                      </div>
                    </div>
                  )}
                  {cmp.keywordsGained.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.5rem" }}>Keywords gained</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {cmp.keywordsGained.map(k => <span key={k} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", color: "var(--accent)", padding: "0.12rem 0.35rem", border: "1px solid rgba(124,142,92,0.3)", borderRadius: "2px" }}>{k}</span>)}
                      </div>
                    </div>
                  )}
                  {cmp.issuesResolved.length > 0 && (
                    <div style={{ marginBottom: "0.75rem" }}>
                      <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.4rem" }}>Issues resolved</div>
                      {cmp.issuesResolved.map((iss, i) => <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--accent)", marginBottom: "0.2rem" }}>✓ {iss.title}</div>)}
                    </div>
                  )}
                  {cmp.newRegressions.length > 0 && (
                    <div>
                      <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.4rem" }}>New issues</div>
                      {cmp.newRegressions.map((iss, i) => <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--sev-critical)", marginBottom: "0.2rem" }}>✗ {iss.title}</div>)}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* ── Normal report (score + fixes + simulation + keywords + issues + ATS) */}
            {compareBase === null && <>

              {/* Score breakdown */}
              {(() => {
                const jdReqs = (display.jd_requirements ?? {}) as { required_keywords?: string[]; min_years_experience?: number | null }
                const jdHasKeywords = (jdReqs.required_keywords?.length ?? 0) > 0
                const jdHasYearsReq = jdReqs.min_years_experience != null && jdReqs.min_years_experience > 0
                const neutralDefaults: Record<string, string> = {}
                if (!jdHasKeywords) neutralDefaults.keyword_match = "Defaulted to neutral — JD vocabulary not recognized — keyword analysis unavailable"
                if (!jdHasYearsReq)  neutralDefaults.experience_alignment = "Defaulted to neutral — JD specifies no years requirement"
                const defaultCount = Object.keys(neutralDefaults).length
                const parseScore   = pct(display.scores.parse_integrity)
                const confidence: "high" | "moderate" | "low" = !jdHasKeywords || parseScore < 40 ? "low" : defaultCount > 0 ? "moderate" : "high"
                const confStyle = {
                  high:     { color: "var(--accent)",         label: "High confidence",     tip: "Score is based on recognized JD vocabulary, parsed résumé sections, and measurable signals." },
                  moderate: { color: "var(--mineral)",        label: "Moderate confidence", tip: "One or more signals defaulted to neutral. Review sub-score breakdown for details." },
                  low:      { color: "var(--text-secondary)", label: "Low confidence",       tip: "Most signals defaulted to neutral. Score has limited diagnostic value for this pair." },
                }[confidence]
                const scoreItems = [
                  { label: "Keywords",   key: "keyword_match",        value: display.scores.keyword_match,        weight: "35%" },
                  { label: "Experience", key: "experience_alignment", value: display.scores.experience_alignment, weight: "25%" },
                  { label: "Parse",      key: "parse_integrity",      value: display.scores.parse_integrity,      weight: "20%" },
                  { label: "Structure",  key: "structure",            value: display.scores.structure,            weight: "10%" },
                  { label: "Impact",     key: "quantified_impact",    value: display.scores.quantified_impact,    weight: "10%" },
                ]
                const sourceLines: Record<string, string> = {}
                const totalJdKeywords = display.matched_keywords.length + display.missing_keywords.length
                if (totalJdKeywords > 0) sourceLines.keyword_match = `${display.matched_keywords.length} of ${totalJdKeywords} recognized JD keywords found`
                if (jdHasYearsReq) {
                  const mn = jdReqs.min_years_experience as number
                  const expPct = pct(display.scores.experience_alignment)
                  sourceLines.experience_alignment = expPct >= 90 ? `Meets or exceeds ${mn}-year JD requirement` : expPct >= 60 ? `Partial alignment with ${mn}-year JD requirement` : `Below ${mn}-year JD minimum — alignment score ${expPct}/100`
                }
                const parsePct = pct(display.scores.parse_integrity)
                sourceLines.parse_integrity = parsePct >= 90 ? "No significant parse issues detected" : parsePct >= 70 ? "Minor formatting concerns detected" : `Parse penalty applied — formatting score ${parsePct}/100`
                const sectionKeys = display.resume_sections ?? {}
                sourceLines.structure = `${["summary","experience","education","skills"].filter(s => s in sectionKeys).length} of 4 expected sections found`
                const lowQIssue = display.issues.find(i => i.issue_type === "low_quantification")
                const qMatch    = lowQIssue?.evidence?.match(/^(\d+) of (\d+) experience bullets/)
                if (qMatch) sourceLines.quantified_impact = `${parseInt(qMatch[2]) - parseInt(qMatch[1])} of ${qMatch[2]} bullets include measurable impact`
                else { const qPct = pct(display.scores.quantified_impact); sourceLines.quantified_impact = qPct >= 70 ? "Most bullets include measurable impact" : qPct >= 40 ? "Some bullets include measurable impact" : "Few bullets include measurable impact" }

                return (
                  <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1.25rem" }}>Score breakdown</div>
                    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "0.25rem" }}>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Overall</span>
                      <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                        <span style={{ fontFamily: "var(--font-data)", fontSize: "2.5rem", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1 }}>{pct(display.scores.overall)}</span>
                        <span style={{ fontFamily: "var(--font-data)", fontSize: "1rem", color: "var(--text-dim)" }}>/100</span>
                        <span title={confStyle.tip} style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: confStyle.color, cursor: "help", letterSpacing: "0.01em" }}>{confStyle.label}</span>
                      </div>
                    </div>
                    {scoreItems.map(s => {
                      const isNeutral = s.key in neutralDefaults
                      const reason    = neutralDefaults[s.key]
                      const p         = pct(s.value)
                      return (
                        <div key={s.key} className="ws-score-row" style={isNeutral ? { borderLeft: "2px solid var(--border-mid)", paddingLeft: "0.75rem" } : undefined}>
                          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                            <div>
                              <span style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>{s.label}</span>
                              {s.weight && <span style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", color: "var(--text-dim)", marginLeft: "0.5rem", opacity: 0.65 }}>· {s.weight}</span>}
                            </div>
                            {isNeutral
                              ? <span title={`Not computable for this input. Contributed 0.50 × ${s.weight} to overall.`} style={{ fontFamily: "var(--font-data)", fontSize: "1.25rem", color: "var(--text-dim)", cursor: "help" }}>—</span>
                              : <span style={{ fontFamily: "var(--font-data)", fontSize: "1.25rem", fontWeight: 500, color: "var(--text-primary)" }}>{p}</span>}
                          </div>
                          <div style={{ height: "2px", background: "var(--border-subtle)", borderRadius: "1px", overflow: "hidden", marginBottom: "0.35rem" }}>
                            {!isNeutral && <div style={{ height: "100%", width: `${p}%`, background: "var(--accent)", opacity: 0.65, borderRadius: "1px" }} />}
                          </div>
                          {isNeutral && reason
                            ? <div style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--text-dim)", fontStyle: "italic", lineHeight: 1.5 }}>{reason}</div>
                            : !isNeutral && sourceLines[s.key]
                              ? <div style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{sourceLines[s.key]}</div>
                              : null}
                        </div>
                      )
                    })}
                    {defaultCount > 0 && <div style={{ marginTop: "1rem", padding: "0.65rem 0.875rem", background: "rgba(97,93,87,0.08)", border: "1px solid var(--border-subtle)", borderRadius: "2px", fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>One or more sub-scores defaulted to neutral — the job description lacked measurable data for that signal. Not penalties.</div>}
                    <div style={{ marginTop: "1rem" }}>
                      <a href="/methodology" target="_blank" style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--text-dim)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1px" }}>Scoring weights and methodology →</a>
                    </div>
                  </div>
                )
              })()}

              {/* Fix priority */}
              {!isSignedIn ? <UpgradePrompt label="Fix priority ranking available after sign-in." /> : display.top_fixes.length > 0 && (() => {
                const LABEL_COLOR: Record<string, { bg: string; color: string }> = {
                  "Must-have gap":    { bg: "rgba(140,47,78,0.1)",  color: "var(--sev-critical)" },
                  "Critical section": { bg: "rgba(140,47,78,0.1)",  color: "var(--sev-critical)" },
                  "Broad impact":     { bg: "rgba(124,142,92,0.1)", color: "var(--accent)"       },
                  "Fast win":         { bg: "rgba(124,142,92,0.1)", color: "var(--accent)"       },
                  "Quantify":         { bg: "rgba(184,135,78,0.1)", color: "var(--sev-high)"     },
                }
                const PROFILE_SHORT: Record<string, string> = { exact_match: "Exact", structure_sensitive: "Structure", adjacent_coverage: "Adjacent" }
                return (
                  <div style={{ padding: "1.25rem 2rem", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>Fix this first</div>
                    {display.top_fixes.map((fix, i) => (
                      <div key={fix.issue_index} onClick={() => { setSelectedIssue(fix.issue_index); track("fix_clicked", { issue_type: fix.issue_type, label: fix.labels[0] ?? "" }) }} style={{ marginBottom: i < display.top_fixes.length - 1 ? "0.875rem" : 0, paddingBottom: i < display.top_fixes.length - 1 ? "0.875rem" : 0, borderBottom: i < display.top_fixes.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer" }}>
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", marginBottom: "0.25rem" }}>
                          <span style={{ fontFamily: "var(--font-data)", fontSize: "0.6rem", color: "var(--text-dim)", paddingTop: "2px", flexShrink: 0, minWidth: "1.25rem" }}>{String(i + 1).padStart(2, "0")}</span>
                          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4 }}>{fix.title}</span>
                        </div>
                        <div style={{ marginLeft: "1.9rem" }}>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.35rem", lineHeight: 1.5 }}>{fix.suggested_fix}</div>
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem", alignItems: "center" }}>
                            {fix.labels.map(label => { const ls = LABEL_COLOR[label] ?? { bg: "rgba(0,0,0,0.06)", color: "var(--text-dim)" }; return <span key={label} style={{ fontFamily: "var(--font-body)", fontSize: "0.6rem", padding: "0.1rem 0.35rem", borderRadius: "2px", background: ls.bg, color: ls.color, fontWeight: 500, letterSpacing: "0.04em" }}>{label}</span> })}
                            <span style={{ marginLeft: "auto", fontFamily: "var(--font-data)", fontSize: "0.58rem", color: "var(--text-dim)" }}>{fix.affects_profiles.map(p => PROFILE_SHORT[p] ?? p).join(" · ")}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })()}

              {/* ATS profile simulation */}
              {display.simulation && isSignedIn && (() => {
                const sim = display.simulation!
                const VOL_COLOR: Record<string, string> = { LOW: "var(--accent)", MEDIUM: "var(--sev-high)", HIGH: "var(--sev-critical)" }
                const volColor = VOL_COLOR[sim.score_spread.volatility]
                return (
                  <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <div onClick={() => setSimExpanded(v => !v)} style={{ padding: "0.875rem 2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
                      <span style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)" }}>ATS Profile Simulation</span>
                      <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                        <div style={{ display: "flex", gap: "0.35rem" }}>
                          {sim.profiles.map(p => <span key={p.id} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", fontWeight: 500, color: scoreColor(p.score), padding: "0.12rem 0.4rem", border: `1px solid ${scoreColor(p.score)}`, borderRadius: "2px" }}>{p.label.split(" ")[0]} {p.score}</span>)}
                        </div>
                        <span style={{ fontFamily: "var(--font-data)", fontSize: "0.62rem", color: volColor }}>Δ{sim.score_spread.delta} {simExpanded ? "▴" : "▾"}</span>
                      </div>
                    </div>
                    {simExpanded && (
                      <div style={{ padding: "0 2rem 1.25rem" }}>
                        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", marginBottom: "1rem", lineHeight: 1.6 }}>{sim.cross_profile_summary}</div>
                        {sim.profiles.map(p => {
                          const open = expandedProfile === p.id; const c = scoreColor(p.score); const riskColor = VOL_COLOR[p.risk_level]
                          return (
                            <div key={p.id} style={{ border: "1px solid var(--border-subtle)", borderRadius: "3px", marginBottom: "0.5rem", background: open ? "var(--bg-elevated)" : "transparent" }}>
                              <div onClick={() => setExpandedProfile(open ? null : p.id)} style={{ padding: "0.6rem 0.875rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                                  <span style={{ fontFamily: "var(--font-data)", fontSize: "1.1rem", fontWeight: 500, color: c }}>{p.score}</span>
                                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", fontWeight: 500, color: "var(--text-primary)" }}>{p.label}</span>
                                </div>
                                <span style={{ fontFamily: "var(--font-data)", fontSize: "0.6rem", color: riskColor, letterSpacing: "0.08em" }}>{p.risk_level}</span>
                              </div>
                              {open && (
                                <div style={{ padding: "0 0.875rem 0.875rem" }}>
                                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", marginBottom: "0.75rem" }}>
                                    {[{ label: "Keywords", v: p.keyword_match }, { label: "Structure", v: p.structure_confidence }, { label: "Parse", v: p.parse_quality }, { label: "Adj. Skills†", v: p.adjacent_skills }].map(s => (
                                      <div key={s.label}>
                                        <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}><span>{s.label}</span><span style={{ fontFamily: "var(--font-data)" }}>{s.v}</span></div>
                                        <div style={{ height: "2px", background: "var(--border-subtle)", borderRadius: "1px" }}><div style={{ height: "2px", width: s.v + "%", background: scoreColor(s.v), borderRadius: "1px" }} /></div>
                                      </div>
                                    ))}
                                  </div>
                                  {p.top_strengths.length > 0 && <div style={{ marginBottom: "0.5rem" }}>{p.top_strengths.map((s, i) => <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--accent)", marginBottom: "0.15rem" }}>✓ {s}</div>)}</div>}
                                  {p.top_failures.length  > 0 && <div style={{ marginBottom: "0.5rem" }}>{p.top_failures.map((s, i)  => <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--sev-critical)", marginBottom: "0.15rem" }}>✗ {s}</div>)}</div>}
                                  {p.lost_signals.length  > 0 && <div style={{ marginBottom: "0.5rem" }}><div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--sev-high)", marginBottom: "0.25rem" }}>Lost signals</div>{p.lost_signals.map((s, i) => <div key={i} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", color: "var(--sev-high)", marginBottom: "0.15rem" }}>{s}</div>)}</div>}
                                  {p.recommended_fixes.length > 0 && <div><div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.25rem" }}>Fixes</div>{p.recommended_fixes.map((s, i) => <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-primary)", marginBottom: "0.2rem" }}>→ {s}</div>)}</div>}
                                  <div style={{ marginTop: "0.5rem", fontFamily: "var(--font-body)", fontSize: "0.62rem", color: "var(--text-dim)", fontStyle: "italic" }}>† Adj. Skills = adjacent skill inference (heuristic). Not exact ATS behavior.</div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                        {sim.universal_fixes.length > 0 && (
                          <div style={{ marginTop: "0.75rem", padding: "0.75rem 0.875rem", background: "var(--bg-accent-low)", border: "1px solid rgba(124,142,92,0.2)", borderRadius: "2px" }}>
                            <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.5rem" }}>Universal-safe edits</div>
                            {sim.universal_fixes.map((f, i) => <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.25rem" }}>• {f}</div>)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })()}

              {/* Keyword coverage */}
              {isSignedIn ? (
                <div style={{ padding: "1rem 2rem", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.65rem" }}>Keywords</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                    {display.matched_keywords.map(k => <span key={k} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", background: "rgba(124,142,92,0.1)", color: "var(--accent)", padding: "0.12rem 0.4rem", borderRadius: "2px", border: "1px solid rgba(124,142,92,0.2)" }}>{k}</span>)}
                    {display.missing_keywords.map(k => <span key={k} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", background: "rgba(140,47,78,0.08)", color: "var(--sev-critical)", padding: "0.12rem 0.4rem", borderRadius: "2px", border: "1px solid rgba(192,112,128,0.2)" }}>{"miss: " + k}</span>)}
                  </div>
                </div>
              ) : <UpgradePrompt label="Keyword gap analysis available after sign-in." />}

              {/* Issues list */}
              <div ref={issuesSectionRef}>
                <div style={{ padding: "0.75rem 2rem", fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", borderBottom: "1px solid var(--border-subtle)" }}>
                  Issues — {display.issues.length} found
                </div>
                {(isSignedIn ? display.issues : display.issues.slice(0, 3)).map((issue, i) => {
                  const isSelected = selectedIssue === i
                  return (
                    <div key={i} className={`ws-issue-row${isSelected ? " active" : ""}`} onClick={() => { setSelectedIssue(isSelected ? null : i); if (!isSelected) void refreshLlmStatus() }}>
                      <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
                        <div style={{ flexShrink: 0, paddingTop: "2px", minWidth: "4.5rem" }}>
                          <span style={{ fontFamily: "var(--font-data)", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: SEV_COLOR[issue.severity], display: "block", marginBottom: "0.12rem" }}>{issue.severity}</span>
                          <span style={{ fontFamily: "var(--font-data)", fontSize: "0.52rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-dim)" }}>{issue.issue_type.replace("_", " ")}</span>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.2rem", lineHeight: 1.4 }}>{issue.title}</div>
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>{issue.description}</div>
                          {isSelected && (
                            <div style={{ marginTop: "0.875rem" }}>
                              {issue.issue_type === "missing_section" ? (() => {
                                const secKey = issue.title.toLowerCase().replace(/^missing\s+/, "").replace(/\s+section$/, "").trim()
                                const sects  = display.resume_sections ?? {}
                                const foundSects = Object.keys(sects).filter(k => k !== "_unparsed")
                                const variants   = SECTION_HEADER_VARIANTS[secKey] ?? []
                                const shown      = variants.slice(0, 6); const extra = variants.length - shown.length
                                const hasUnparsed = "_unparsed" in sects && (sects as Record<string, string>)["_unparsed"]?.length > 0
                                return (
                                  <div className="ws-evidence-block" style={{ marginBottom: "0.75rem", lineHeight: 1.9 }}>
                                    <div><span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Sections found:</span> {foundSects.length > 0 ? foundSects.join(", ") : "none"}</div>
                                    <div><span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Searched for <em>{secKey}</em> using:</span> {shown.join(", ")}{extra > 0 ? `, and ${extra} others` : ""}</div>
                                    <div style={{ color: "var(--sev-critical)", fontWeight: 500 }}>Result: none matched.</div>
                                    {hasUnparsed && <div style={{ marginTop: "0.3rem", color: "var(--sev-high)" }}>Some résumé content couldn&apos;t be assigned to a section — an unrecognized header may be present.</div>}
                                  </div>
                                )
                              })() : issue.evidence ? <div className="ws-evidence-block" style={{ marginBottom: "0.75rem" }}>{issue.evidence}</div> : null}
                              <div style={{ padding: "0.65rem 0.875rem", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "2px", marginBottom: "0.5rem" }}>
                                <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.35rem" }}>Fix pattern</div>
                                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-primary)", lineHeight: 1.65 }}>{issue.fix_pattern || issue.suggested_fix}</div>
                                {issue.source_excerpt && <pre style={{ marginTop: "0.5rem", fontFamily: "var(--font-data)", fontSize: "0.7rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", margin: "0.5rem 0 0", lineHeight: 1.6 }}>{issue.source_excerpt}</pre>}
                              </div>
                              {issue.rewrite_starter && (
                                <div className="ws-rewrite-block" style={{ marginBottom: "0.5rem" }}>
                                  <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.35rem" }}>Rewrite starter</div>
                                  <div>{issue.rewrite_starter}</div>
                                </div>
                              )}
                              {(issue.issue_type === "weak_phrasing" || issue.issue_type === "low_quantification") && (
                                <div style={{ marginTop: "0.5rem" }}>
                                  {!rewriteVariants[i] && llmStatus?.available && llmStatus.healthy !== false && (
                                    <button onClick={e => { e.stopPropagation(); void handleGenerateRewrites(i, issue) }} disabled={rewriteLoading[i]} style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", padding: "0.3rem 0.75rem", background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "2px", cursor: rewriteLoading[i] ? "default" : "pointer", opacity: rewriteLoading[i] ? 0.6 : 1 }}>
                                      {rewriteLoading[i] ? "Generating…" : "Generate AI rewrites"}
                                    </button>
                                  )}
                                  {!rewriteVariants[i] && llmStatus?.available && llmStatus.healthy === false && (
                                    <div style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--sev-high)", marginTop: "0.2rem" }}>LLM endpoint unreachable — check {llmStatus.model || "LLM_ENDPOINT"} is running</div>
                                  )}
                                  {rewriteVariants[i]?.length > 0 && (
                                    <div style={{ marginTop: "0.4rem" }}>
                                      <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.45rem" }}>AI-assisted rewrites</div>
                                      {rewriteVariants[i].map((v, vi) => <div key={vi} style={{ padding: "0.55rem 0.75rem", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "2px", marginBottom: "0.3rem", fontFamily: "var(--font-data)", fontSize: "0.75rem", color: "var(--text-primary)", lineHeight: 1.65 }}>{v}</div>)}
                                      <button onClick={e => { e.stopPropagation(); setRewriteVariants(prev => { const n = {...prev}; delete n[i]; return n }) }} style={{ fontFamily: "var(--font-body)", fontSize: "0.65rem", color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", padding: "0.1rem 0" }}>clear</button>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
                {!isSignedIn && display.issues.length > 3 && <IssueGate remaining={display.issues.length - 3} />}
              </div>

              {/* ATS plain-text preview */}
              {isSignedIn ? (
                <div style={{ padding: "1.25rem 2rem 2rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
                    <span style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)" }}>What ATS sees</span>
                    {isMock && <span style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--sev-medium)", padding: "0.12rem 0.4rem", border: "1px solid var(--border-mid)", borderRadius: "2px" }}>sample</span>}
                  </div>
                  <pre style={{ fontFamily: "var(--font-data)", fontSize: "0.75rem", lineHeight: 1.75, color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "2px", padding: "1.25rem", margin: 0 }}>{display.ats_text_preview}</pre>
                </div>
              ) : <UpgradePrompt label="ATS text preview available after sign-in." />}

            </>}
          </div>
        </div>
      )}
    </div>
  )
}
