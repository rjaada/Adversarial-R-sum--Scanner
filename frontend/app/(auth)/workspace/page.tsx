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
import { useOptionalAuth } from "@/lib/use-optional-clerk"
import { OptionalUserButton } from "@/components/OptionalUserButton"
import { IssueGate } from "@/components/IssueGate"
import { UpgradePrompt } from "@/components/UpgradePrompt"
import { UploadPhase } from "./UploadPhase"
import { ScanningPhase } from "./ScanningPhase"
import { WorkspaceResults } from "./WorkspaceResults"
import {
  pct, scoreColor, compareScans, track,
  SEV_COLOR, SECTION_HEADER_VARIANTS,
} from "@/lib/scan-utils"
import { MOCK_SCAN } from "@/lib/mock-scan"
import type {
  ScanResult, ScanSummary, Issue, LLMStatus, RewriteResponse, SubDeltas,
  RescanResult,
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
  "--bg-base":       "#FDFCF9",
  "--bg-surface":    "#FFFFFF",
  "--bg-elevated":   "#F8F7F5",
  "--bg-muted":      "#F4F3F0",
  "--bg-accent-low": "#F4F3F0",
  "--border-subtle": "rgba(26,25,23,0.08)",
  "--border-mid":    "#DCDCDC",
  "--text-primary":  "#0D0C0A",
  "--text-secondary":"#474546",
  "--text-dim":      "#858585",
  "--accent":        "#1a1917",
  "--accent-hover":  "#3a3733",
  "--sev-critical":  "#1a1917",
  "--sev-high":      "#3a3733",
  "--sev-medium":    "#6e6b66",
  "--sev-low":       "#858585",
  "--mineral":       "#4a4640",
  "--font-body":     FA,
  "--font-display":  FA,
  "--font-data":     "var(--font-mono, 'IBM Plex Mono', monospace)",
} as React.CSSProperties

// ── Page component ───────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { isLoaded, isSignedIn, getToken } = useOptionalAuth()

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
      // Signed-in scans must carry the session token — without it the backend
      // gates the result (truncated issues, stripped preview) as anonymous.
      const token = await getToken()
      const headers: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
      const res = await fetch(`${API_BASE}/api/scan`, { method: "POST", body: form, headers })
      if (!res.ok) { const msg = await res.text(); throw new Error(msg || "HTTP " + String(res.status)) }
      const data = await res.json() as ScanResult
      setResult(prev => { setPreviousResult(prev); return data })
      setSelectedIssue(null)
      // Anonymous scans are stashed locally so they can be claimed after
      // sign-in. Signed-in scans persist server-side — no stash needed.
      // Strip the ATS text preview before persisting to localStorage — it can
      // contain unscrubbed PII (name, email, phone). The server scrubs PII
      // before DB storage; the client must do the same before localStorage.
      if (!token) {
        try {
          const safeForStorage: ScanResult = { ...data, ats_text_preview: "" }
          localStorage.setItem(PENDING_SCAN_KEY, JSON.stringify({ result: safeForStorage, scanned_at: new Date().toISOString() }))
        } catch {}
      }
      track("scan_completed", {
        overall_score:       pct(data.scores.overall),
        issue_count:         data.total_issues ?? data.issues.length,
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

  // Live edit-and-rescore (gap #5): re-score edited text, ephemeral, no save.
  async function rescanText(text: string, parseIntegrity: number, mode: string = "resume"): Promise<RescanResult> {
    const token = await getToken()
    const res = await fetch(`${API_BASE}/api/rescan`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ text, jd_text: jdText, parse_integrity: parseIntegrity, mode }),
    })
    if (!res.ok) throw new Error("Rescan failed")
    return res.json() as Promise<RescanResult>
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
      // /api/rewrite is signed-in only (paid LLM path) — carry the token.
      const token = await getToken()
      const res = await fetch(`${API_BASE}/api/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
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
          {isLoaded && !isSignedIn && (
            <Link
              href="/sign-in"
              style={{ fontFamily: FA, fontSize: "0.875rem", fontWeight: 500, color: "#FDFCF9", background: "#0D0C0A", borderRadius: "100px", padding: "8px 18px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              Sign in
            </Link>
          )}
          <OptionalUserButton
                appearance={{
                  variables: { colorBackground: "#FFFFFF", colorText: "#0D0C0A", colorPrimary: "#1a1917", borderRadius: "4px", fontFamily: FA },
                  elements: {
                    userButtonPopoverCard:   { border: "1px solid #EBEBEB", boxShadow: "0 4px 16px rgba(0,0,0,0.06)", background: "#FFFFFF" },
                    userButtonPopoverFooter: { display: "none" },
                  },
                }}
                userProfileUrl="/account"
                userProfileMode="navigation"
                afterSignOutUrl="/"
              />
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
        <WorkspaceResults
          display={display}
          isMock={isMock}
          isSignedIn={!!isSignedIn}
          result={result!}
          selectedIssue={selectedIssue}
          setSelectedIssue={setSelectedIssue}
          onNewScan={handleNewScan}
          onExport={() => void handleExport()}
          exporting={exporting}
          history={history}
          rewriteVariants={rewriteVariants}
          rewriteLoading={rewriteLoading}
          onGenerateRewrites={(i, issue) => void handleGenerateRewrites(i, issue)}
          llmStatus={llmStatus}
          compareBase={compareBase}
          setCompareBase={setCompareBase}
          previousResult={previousResult}
          issuesSectionRef={issuesSectionRef}
          fileInputRef={fileInputRef}
          file={file}
          setFile={setFile}
          jdText={jdText}
          setJdText={setJdText}
          onScan={() => void handleScan()}
          scanning={scanning}
          error={error}
          onLoadScan={(id) => void loadScan(id)}
          onLoadScanForCompare={(id) => void loadScanForCompare(id)}
          onRescan={rescanText}
        />
      )}
    </div>
  )
}
