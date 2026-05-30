"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"

interface Issue {
  issue_type: string
  severity: "critical" | "high" | "medium" | "low"
  title: string
  description: string
  evidence?: string
  fix_pattern?: string
  rewrite_starter?: string
  source_excerpt: string
  suggested_fix: string
  impact_score: number
}

interface Scores {
  overall: number
  keyword_match: number
  experience_alignment: number
  parse_integrity: number
  structure: number
  quantified_impact: number
}

interface ProfileResult {
  id: string
  label: string
  description: string
  score: number
  parse_quality: number
  keyword_match: number
  adjacent_skills: number
  structure_confidence: number
  risk_level: "LOW" | "MEDIUM" | "HIGH"
  top_strengths: string[]
  top_failures: string[]
  lost_signals: string[]
  recommended_fixes: string[]
}

interface ScoreSpread {
  min: number
  max: number
  delta: number
  volatility: "LOW" | "MEDIUM" | "HIGH"
}

interface ProfileSimulation {
  profiles: ProfileResult[]
  universal_fixes: string[]
  score_spread: ScoreSpread
  cross_profile_summary: string
}

interface RankedFix {
  issue_index: number
  issue_type: string
  title: string
  suggested_fix: string
  fix_pattern: string
  labels: string[]
  affects_profiles: string[]
  rank_score: number
}

interface ScanResult {
  scan_id: string
  source_id: string
  ats_text_preview: string
  resume_sections?: Record<string, string>
  jd_requirements?: Record<string, unknown>
  scores: Scores
  issues: Issue[]
  missing_keywords: string[]
  matched_keywords: string[]
  top_fixes: RankedFix[]
  simulation?: ProfileSimulation
}

interface ScanSummary {
  scan_id: string
  source_id: string
  scanned_at: string
  overall_score: number
}

interface RewriteResponse {
  variants: string[]
  available: boolean
  model: string
  error: string
}

interface LLMStatus {
  available: boolean
  model: string
  healthy: boolean | null
}

interface SubDeltas {
  keyword_match: number
  experience_alignment: number
  parse_integrity: number
  structure: number
  quantified_impact: number
}

interface CompareResult {
  verdict: "improved" | "neutral" | "regressed"
  scoreBefore: number
  scoreAfter: number
  scoreDelta: number
  subDeltas: SubDeltas
  keywordsGained: string[]
  keywordsStillMissing: string[]
  issuesResolved: Issue[]
  issuesRemaining: Issue[]
  newRegressions: Issue[]
  volatilityBefore: number | null
  volatilityAfter: number | null
  volatilityDelta: number | null
}

function compareScans(before: ScanResult, after: ScanResult): CompareResult {
  const rawDelta = after.scores.overall - before.scores.overall
  const scoreDelta = Math.round(rawDelta * 100)

  const subDeltas: SubDeltas = {
    keyword_match:        Math.round((after.scores.keyword_match        - before.scores.keyword_match)        * 100),
    experience_alignment: Math.round((after.scores.experience_alignment - before.scores.experience_alignment) * 100),
    parse_integrity:      Math.round((after.scores.parse_integrity      - before.scores.parse_integrity)      * 100),
    structure:            Math.round((after.scores.structure            - before.scores.structure)            * 100),
    quantified_impact:    Math.round((after.scores.quantified_impact    - before.scores.quantified_impact)    * 100),
  }

  const beforeMatchedSet = new Set(before.matched_keywords)
  const keywordsGained = after.matched_keywords.filter(k => !beforeMatchedSet.has(k))
  const keywordsStillMissing = after.missing_keywords

  const afterTitleSet  = new Set(after.issues.map(i => i.title))
  const beforeTitleSet = new Set(before.issues.map(i => i.title))
  const issuesResolved   = before.issues.filter(i => !afterTitleSet.has(i.title))
  const issuesRemaining  = after.issues.filter(i =>  beforeTitleSet.has(i.title))
  const newRegressions   = after.issues.filter(i => !beforeTitleSet.has(i.title))

  const verdict: "improved" | "neutral" | "regressed" =
    scoreDelta > 2 ? "improved" : scoreDelta < -2 ? "regressed" : "neutral"

  const volatilityBefore = before.simulation?.score_spread.delta ?? null
  const volatilityAfter  = after.simulation?.score_spread.delta ?? null
  const volatilityDelta  =
    volatilityBefore !== null && volatilityAfter !== null
      ? volatilityAfter - volatilityBefore
      : null

  return { verdict, scoreBefore: pct(before.scores.overall), scoreAfter: pct(after.scores.overall), scoreDelta, subDeltas, keywordsGained, keywordsStillMissing, issuesResolved, issuesRemaining, newRegressions, volatilityBefore, volatilityAfter, volatilityDelta }
}

const MOCK_SIMULATION: ProfileSimulation = {
  profiles: [
    {
      id: "exact_match", label: "Exact Match",
      description: "Rewards exact keyword overlap; heavily penalises missing must-have terms.",
      score: 52, parse_quality: 85, keyword_match: 38, adjacent_skills: 42, structure_confidence: 75,
      risk_level: "MEDIUM",
      top_strengths: ["Clean parse: résumé structure extracted with high confidence", "3 of 8 required terms present"],
      top_failures: ["Missing must-have term(s): kubernetes, aws, terraform", "Keyword gap: 62% of required terms absent"],
      lost_signals: ["'python' detected in experience body only — may be skipped without a skills block"],
      recommended_fixes: ["Add must-have keywords to résumé: kubernetes, aws, terraform", "Add a dedicated skills section"],
    },
    {
      id: "structure_sensitive", label: "Structure Sensitive",
      description: "Penalises ambiguous or fragmented formatting; rewards clearly parsed sections.",
      score: 61, parse_quality: 85, keyword_match: 38, adjacent_skills: 42, structure_confidence: 75,
      risk_level: "MEDIUM",
      top_strengths: ["All expected sections found: education, experience, skills, summary", "High parse confidence"],
      top_failures: ["Missing must-have term(s): kubernetes, aws, terraform", "2 skills only found in prose"],
      lost_signals: ["'python' detected in experience body only", "'docker' detected in experience body only"],
      recommended_fixes: ["Move 'python', 'docker' into a dedicated skills block", "Add must-have keywords"],
    },
    {
      id: "adjacent_coverage", label: "Transferable Skills",
      description: "Broader matching using adjacent skill inference (heuristic). Rewards transferable experience.",
      score: 67, parse_quality: 85, keyword_match: 38, adjacent_skills: 65, structure_confidence: 75,
      risk_level: "LOW",
      top_strengths: ["Adjacent skill signals cover most missing required terms", "Strong evidence density"],
      top_failures: ["Partial keyword coverage: 38%"],
      lost_signals: [],
      recommended_fixes: ["Add explicit kubernetes and aws to skills section", "Add 2–3 bullets with quantified impact"],
    },
  ],
  universal_fixes: [
    "Add must-have keywords to résumé: kubernetes, aws, terraform",
    "Move 'python', 'docker' from prose into a dedicated skills section",
    "Add quantified impact to 2–3 bullets (%, $, scale, or time saved)",
    "Add missing sections: summary",
  ],
  score_spread: { min: 52, max: 67, delta: 15, volatility: "MEDIUM" },
  cross_profile_summary: "Best in Transferable Skills (67), weakest in Exact Match (52). 15-pt spread. Exact-Match score lower due to keyword gap.",
}

const MOCK_ATS = [
  "Jane Smith",
  "jane@email.com | linkedin.com/in/janesmith",
  "",
  "Software Engineer with 5 years of experience building distributed systems.",
  "",
  "EXPERIENCE",
  "Senior Software Engineer - Acme Corp (2021-2024)",
  "- Responsible for migration of monolith to microservices",
  "- Helped reduce infrastructure costs",
  "- Worked on CI/CD improvements",
  "",
  "SKILLS",
  "Python, JavaScript, Docker, PostgreSQL",
  "",
  "EDUCATION",
  "B.S. Computer Science - State University, 2019",
].join("\n")

const MOCK: ScanResult = {
  scan_id: "mock-001",
  source_id: "sample_resume.pdf",
  ats_text_preview: MOCK_ATS,
  scores: { overall: 0.52, keyword_match: 0.38, experience_alignment: 0.70, parse_integrity: 0.85, structure: 0.75, quantified_impact: 0.15 },
  issues: [
    { issue_type: "keyword_gap", severity: "high", title: "Missing keyword: kubernetes", description: "The JD requires kubernetes but your resume does not mention it.", evidence: '"kubernetes" does not appear anywhere in your résumé text.', fix_pattern: 'Add "kubernetes" in your Skills section or work it into a relevant experience bullet.', rewrite_starter: "", source_excerpt: "", suggested_fix: "Add kubernetes in your Skills section.", impact_score: 3.2 },
    { issue_type: "low_quantification", severity: "high", title: "Most bullets lack measurable impact", description: "4 of 4 experience bullets have no numbers or percentages.", evidence: "4 of 4 experience bullets contain no numbers, percentages, currency, or scale indicators.", fix_pattern: "Rewrite 2–3 bullets: add %, $, users, team size, latency ms, requests/s, cost saved, or delivery time.", rewrite_starter: "Migrated monolith to [N] microservices, cutting deployment time by [X%] and rollback time to [Y min].", source_excerpt: "- Responsible for migration of monolith to microservices", suggested_fix: 'Add metrics: e.g. Migrated monolith to 12 microservices, reducing p99 latency by 35%', impact_score: 3.2 },
    { issue_type: "weak_phrasing", severity: "medium", title: 'Weak verb: "responsible for"', description: "Passive phrasing reduces impact score in LLM screeners.", evidence: 'Phrase "responsible for" signals passive ownership. Screeners weight active verbs more heavily.', fix_pattern: "Start the bullet with: Built / Led / Reduced / Delivered / Scaled + [what] + [measurable result].", rewrite_starter: "Migrated monolith to [N] microservices, cutting deployment time by [X%] and rollback time to [Y min].", source_excerpt: "...Responsible for migration of monolith...", suggested_fix: "Replace with: Led migration of monolith to 12 microservices", impact_score: 1.6 },
    { issue_type: "keyword_gap", severity: "high", title: "Missing keyword: aws", description: "The JD requires aws but your resume does not mention it.", evidence: '"aws" does not appear anywhere in your résumé text.', fix_pattern: 'Add "aws" in your Skills section or work it into a relevant experience bullet.', rewrite_starter: "", source_excerpt: "", suggested_fix: "Add aws to your Skills section if applicable.", impact_score: 3.2 },
  ],
  missing_keywords: ["kubernetes", "aws", "terraform", "go"],
  matched_keywords: ["python", "docker", "postgresql"],
  top_fixes: [
    { issue_index: 0, issue_type: "keyword_gap", title: "Missing keyword: kubernetes", suggested_fix: "Add kubernetes in your Skills section.", fix_pattern: 'Add "kubernetes" in your Skills section.', labels: ["Must-have gap", "Broad impact"], affects_profiles: ["exact_match", "structure_sensitive", "adjacent_coverage"], rank_score: 8.7 },
    { issue_index: 1, issue_type: "low_quantification", title: "Most bullets lack measurable impact", suggested_fix: "Add metrics: e.g. Migrated monolith to 12 microservices, reducing p99 latency by 35%", fix_pattern: "Rewrite 2–3 bullets: add %, $, users, team size, latency ms, requests/s.", labels: ["Fast win", "Quantify"], affects_profiles: ["exact_match", "adjacent_coverage"], rank_score: 6.2 },
    { issue_index: 3, issue_type: "keyword_gap", title: "Missing keyword: aws", suggested_fix: "Add aws to your Skills section if applicable.", fix_pattern: 'Add "aws" in your Skills section.', labels: ["Broad impact"], affects_profiles: ["exact_match", "structure_sensitive", "adjacent_coverage"], rank_score: 6.7 },
    { issue_index: 2, issue_type: "weak_phrasing", title: 'Weak verb: "responsible for"', suggested_fix: "Replace with: Led migration of monolith to 12 microservices", fix_pattern: "Start the bullet with: Built / Led / Reduced.", labels: ["Fast win"], affects_profiles: ["exact_match", "adjacent_coverage"], rank_score: 3.6 },
  ],
  simulation: MOCK_SIMULATION,
}

const API_BASE = ""

const SECTION_HEADER_VARIANTS: Record<string, string[]> = {
  summary: ["summary", "professional summary", "career summary", "objective", "career objective", "profile", "professional profile", "about", "overview"],
  skills: ["skills", "technical skills", "key skills", "core skills", "core competencies", "competencies", "areas of expertise", "technical expertise", "technical background", "technologies", "technology stack", "tech stack", "tools", "tools & technologies", "programming languages", "languages & frameworks", "proficiencies"],
  experience: ["experience", "work experience", "professional experience", "work history", "employment", "employment history", "career", "relevant experience", "professional background", "career history"],
  education: ["education", "academic background", "academic history", "academic", "degree", "university", "college", "educational", "schooling"],
}

function track(event: string, properties: Record<string, string | number | boolean | null> = {}): void {
  void fetch(`${API_BASE}/api/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties }),
  }).catch(() => {})
}

const SEV_COLOR: Record<string, string> = {
  critical: "var(--sev-critical)",
  high:     "var(--sev-high)",
  medium:   "var(--sev-medium)",
  low:      "var(--sev-low)",
}

function pct(v: number): number {
  return Math.round(v * 100)
}

function scoreColor(p: number): string {
  if (p >= 75) return "var(--accent)"
  if (p >= 55) return "var(--mineral)"
  return "var(--sev-critical)"
}

export default function WorkspacePage() {
  const [result, setResult] = useState<ScanResult | null>(null)
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jdText, setJdText] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [selectedIssue, setSelectedIssue] = useState<number | null>(null)
  const [history, setHistory] = useState<ScanSummary[]>([])
  const [rewriteVariants, setRewriteVariants] = useState<Record<number, string[]>>({})
  const [rewriteLoading, setRewriteLoading] = useState<Record<number, boolean>>({})
  const [llmStatus, setLlmStatus] = useState<LLMStatus | null>(null)
  const [simExpanded, setSimExpanded] = useState(false)
  const [expandedProfile, setExpandedProfile] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [compareBase, setCompareBase] = useState<ScanResult | null>(null)
  const [previousResult, setPreviousResult] = useState<ScanResult | null>(null)
  const lastStatusCheckRef = useRef<number>(0)
  const issuesSectionRef = useRef<HTMLDivElement>(null)
  const STATUS_TTL_MS = 30_000

  const refreshLlmStatus = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && now - lastStatusCheckRef.current < STATUS_TTL_MS) return
    lastStatusCheckRef.current = now
    try {
      const r = await fetch(`${API_BASE}/api/rewrite/status`)
      const s = await r.json() as LLMStatus
      setLlmStatus(s)
    } catch {
      setLlmStatus({ available: false, model: "", healthy: null })
    }
  }, [])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const display = result ?? MOCK
  const isMock = result === null

  useEffect(() => {
    fetch(`${API_BASE}/api/scans`)
      .then((r) => r.json())
      .then((data: unknown) => { if (Array.isArray(data)) setHistory(data) })
      .catch(() => {})
    void refreshLlmStatus(true)
    const onFocus = () => { void refreshLlmStatus() }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshLlmStatus])

  useEffect(() => {
    if (selectedIssue !== null) {
      issuesSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }
  }, [selectedIssue])

  async function handleScan() {
    if (!file) { setError("Upload a resume first."); return }
    if (!jdText.trim()) { setError("Paste a job description first."); return }
    setScanning(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("jd_text", jdText)
      const res = await fetch(`${API_BASE}/api/scan`, { method: "POST", body: form })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || "HTTP " + String(res.status))
      }
      const data = await res.json() as ScanResult
      setResult((prev) => { setPreviousResult(prev); return data })
      setSelectedIssue(null)
      track("scan_completed", { overall_score: pct(data.scores.overall), issue_count: data.issues.length, has_simulation: data.simulation != null, keyword_match_count: data.matched_keywords.length })
      setHistory((prev) => [
        { scan_id: data.scan_id, source_id: data.source_id, scanned_at: new Date().toISOString(), overall_score: data.scores.overall },
        ...prev.filter((h) => h.scan_id !== data.scan_id),
      ])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Scan failed")
    } finally {
      setScanning(false)
    }
  }

  async function loadScan(scanId: string) {
    try {
      const res = await fetch(`${API_BASE}/api/scans/${scanId}`)
      if (res.ok) { setResult(await res.json() as ScanResult); setSelectedIssue(null); setCompareBase(null) }
    } catch (_) {}
  }

  async function loadScanForCompare(scanId: string) {
    try {
      const res = await fetch(`${API_BASE}/api/scans/${scanId}`)
      if (res.ok) { setCompareBase(await res.json() as ScanResult); track("compare_started", {}) }
    } catch (_) {}
  }

  async function handleGenerateRewrites(issueIndex: number, issue: Issue) {
    await refreshLlmStatus()
    track("rewrite_requested", { issue_type: issue.issue_type })
    setRewriteLoading((prev) => ({ ...prev, [issueIndex]: true }))
    try {
      const res = await fetch(`${API_BASE}/api/rewrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issue_type: issue.issue_type, original_text: issue.source_excerpt || issue.rewrite_starter || "", evidence: issue.evidence || "", fix_pattern: issue.fix_pattern || "", rewrite_starter: issue.rewrite_starter || "", jd_keywords: display.matched_keywords.slice(0, 8), count: 3 }),
      })
      const data = await res.json() as RewriteResponse
      if (!data.available) {
        setRewriteVariants((prev) => ({ ...prev, [issueIndex]: ["LLM not configured — set LLM_ENDPOINT in backend .env"] }))
      } else if (data.variants.length > 0) {
        setRewriteVariants((prev) => ({ ...prev, [issueIndex]: data.variants }))
      } else {
        setRewriteVariants((prev) => ({ ...prev, [issueIndex]: [data.error || "Generation returned no output."] }))
      }
    } catch {
      setRewriteVariants((prev) => ({ ...prev, [issueIndex]: ["Could not reach backend."] }))
    } finally {
      setRewriteLoading((prev) => ({ ...prev, [issueIndex]: false }))
    }
  }

  async function handleExport() {
    setExporting(true)
    track("export_triggered", { has_real_scan: result !== null })
    try {
      const res = await fetch(`${API_BASE}/api/export`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(display) })
      if (!res.ok) throw new Error("Export failed")
      const htmlBlob = await res.blob()
      const url = URL.createObjectURL(htmlBlob)
      window.open(url, "_blank")
    } catch {
      // silent — export is best-effort
    } finally {
      setExporting(false)
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files[0]
    if (f) setFile(f)
  }

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", display: "flex", flexDirection: "column", fontFamily: "var(--font-body)" }}>

      {/* Nav */}
      <nav className="ws-nav">
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 400, color: "var(--text-primary)", letterSpacing: "0.01em" }}>
          TraceRank
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          {result && (
            <span style={{ fontFamily: "var(--font-data)", fontSize: "0.65rem", color: "var(--text-dim)", letterSpacing: "0.06em", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {display.source_id}
            </span>
          )}
          {isMock && (
            <span style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", color: "var(--sev-medium)", letterSpacing: "0.1em", textTransform: "uppercase", padding: "0.12rem 0.4rem", border: "1px solid var(--border-mid)", borderRadius: "2px" }}>
              sample
            </span>
          )}
          <Link href="/methodology" target="_blank" style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-dim)", letterSpacing: "0.02em" }}>
            Methodology
          </Link>
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", padding: "0.2rem 0.6rem", background: "transparent", border: "1px solid var(--border-mid)", color: "var(--text-dim)", borderRadius: "2px", cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.5 : 1 }}
          >
            {exporting ? "Exporting…" : "Export"}
          </button>
        </div>
      </nav>

      <div className="ws-main">

        {/* Control rail */}
        <div className="ws-sidebar">

          <div>
            <label style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", display: "block", marginBottom: "0.45rem" }}>
              Résumé
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: `1px ${file ? "solid" : "dashed"} ${file ? "var(--accent)" : "var(--border-mid)"}`, borderRadius: "3px", padding: "1.125rem 1rem", textAlign: "center", cursor: "pointer", background: file ? "var(--bg-accent-low)" : "transparent", transition: "border-color 0.2s, background 0.2s" }}
            >
              <input ref={fileInputRef} type="file" accept=".pdf,.docx" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f) }} />
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
              onChange={(e) => setJdText(e.target.value)}
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
            onClick={handleScan}
            disabled={scanning}
            style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 500, background: scanning ? "var(--border-mid)" : "var(--accent)", color: scanning ? "var(--text-dim)" : "#0d0c0a", border: "none", borderRadius: "2px", padding: "0.75rem", cursor: scanning ? "not-allowed" : "pointer", transition: "background 0.2s", letterSpacing: "0.01em" }}
          >
            {scanning ? "Analyzing…" : "Analyze résumé"}
          </button>

          {previousResult !== null && result !== null && (
            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
              <div style={{ fontFamily: "var(--font-data)", fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.45rem" }}>
                Compare
              </div>
              <button
                onClick={() => {
                  if (compareBase?.scan_id === previousResult.scan_id) {
                    setCompareBase(null)
                  } else {
                    setCompareBase(previousResult)
                    track("compare_started", {})
                  }
                }}
                style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", padding: "0.25rem 0.5rem", background: compareBase?.scan_id === previousResult.scan_id ? "var(--accent)" : "transparent", color: compareBase?.scan_id === previousResult.scan_id ? "#0d0c0a" : "var(--text-secondary)", border: `1px solid ${compareBase?.scan_id === previousResult.scan_id ? "var(--accent)" : "var(--border-mid)"}`, borderRadius: "2px", cursor: "pointer", width: "100%", transition: "background 0.2s" }}
              >
                ↔ Compare with previous
              </button>
            </div>
          )}

          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "1rem" }}>
            <div style={{ fontFamily: "var(--font-data)", fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.65rem" }}>
              History
            </div>
            {history.length === 0 ? (
              <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-dim)", fontStyle: "italic" }}>No saved scans.</div>
            ) : (
              history.map((h) => {
                const p = pct(h.overall_score)
                const isCompareBase = compareBase?.scan_id === h.scan_id
                return (
                  <div key={h.scan_id} style={{ padding: "0.5rem 0", borderBottom: "1px solid var(--border-subtle)" }}>
                    <div onClick={() => void loadScan(h.scan_id)} style={{ cursor: "pointer" }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.source_id}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
                        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.65rem", color: "var(--text-dim)" }}>
                          {new Date(h.scanned_at).toLocaleDateString()}
                        </span>
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
              })
            )}
          </div>

        </div>

        {/* Report area */}
        <div className="ws-report">

          {/* Compare panel */}
          {compareBase !== null && result !== null && (() => {
            const cmp = compareScans(compareBase, result)
            const VERDICT_STYLE: Record<string, { color: string; bg: string; label: string }> = {
              improved:  { color: "var(--accent)",          bg: "rgba(124,142,92,0.08)", label: "Improved"  },
              neutral:   { color: "var(--text-dim)",        bg: "rgba(0,0,0,0.06)",     label: "Neutral"   },
              regressed: { color: "var(--sev-critical)",    bg: "rgba(140,47,78,0.08)", label: "Regressed" },
            }
            const vs = VERDICT_STYLE[cmp.verdict]

            function deltaLabel(n: number): JSX.Element {
              if (n > 0) return <span style={{ color: "var(--accent)",       fontFamily: "var(--font-data)", fontSize: "0.72rem", fontWeight: 500 }}>+{n}</span>
              if (n < 0) return <span style={{ color: "var(--sev-critical)", fontFamily: "var(--font-data)", fontSize: "0.72rem", fontWeight: 500 }}>−{Math.abs(n)}</span>
              return <span style={{ color: "var(--text-dim)", fontFamily: "var(--font-data)", fontSize: "0.72rem" }}>±0</span>
            }

            const SUB_LABELS: [keyof SubDeltas, string][] = [
              ["keyword_match",        "Keywords"],
              ["experience_alignment", "Experience"],
              ["parse_integrity",      "Parse"],
              ["structure",            "Structure"],
              ["quantified_impact",    "Impact"],
            ]

            return (
              <div style={{ padding: "1.5rem 2rem", maxWidth: "640px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                  <span style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)" }}>Compare mode</span>
                  <button onClick={() => setCompareBase(null)} style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", padding: "0.18rem 0.55rem", background: "transparent", border: "1px solid var(--border-mid)", color: "var(--text-dim)", borderRadius: "2px", cursor: "pointer" }}>
                    Exit compare
                  </button>
                </div>
                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-dim)", lineHeight: 1.7, marginBottom: "1rem" }}>
                  <div><span style={{ color: "var(--text-secondary)", marginRight: "0.4rem" }}>Before</span>{compareBase.source_id}</div>
                  <div><span style={{ color: "var(--text-secondary)", marginRight: "0.5rem" }}>After</span>{result.source_id}</div>
                </div>
                <div style={{ padding: "0.65rem 0.875rem", background: vs.bg, borderRadius: "2px", marginBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between", border: "1px solid var(--border-subtle)" }}>
                  <span style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", fontWeight: 500, color: vs.color, letterSpacing: "0.04em", textTransform: "uppercase" }}>{vs.label}</span>
                  <span style={{ fontFamily: "var(--font-data)", fontSize: "0.72rem", color: "var(--text-secondary)" }}>
                    {cmp.scoreBefore} → {cmp.scoreAfter} &nbsp;({deltaLabel(cmp.scoreDelta)})
                  </span>
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
                      {cmp.keywordsGained.map(k => (
                        <span key={k} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", color: "var(--accent)", padding: "0.12rem 0.35rem", border: "1px solid rgba(124,142,92,0.3)", borderRadius: "2px" }}>{k}</span>
                      ))}
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

          {/* Normal report */}
          {compareBase === null && <>

          {/* Score section — P0 logic intact, specification-row rendering */}
          {(() => {
            const jdReqs = (display.jd_requirements ?? {}) as {
              required_keywords?: string[]
              min_years_experience?: number | null
            }
            const jdHasKeywords = (jdReqs.required_keywords?.length ?? 0) > 0
            const jdHasYearsReq = jdReqs.min_years_experience != null && jdReqs.min_years_experience > 0

            const neutralDefaults: Record<string, string> = {}
            if (!jdHasKeywords) neutralDefaults.keyword_match = "Defaulted to neutral — JD vocabulary not recognized — keyword analysis unavailable"
            if (!jdHasYearsReq) neutralDefaults.experience_alignment = "Defaulted to neutral — JD specifies no years requirement"
            const defaultCount = Object.keys(neutralDefaults).length

            const parseScore = pct(display.scores.parse_integrity)
            const confidence: "high" | "moderate" | "low" =
              !jdHasKeywords || parseScore < 40 ? "low" : defaultCount > 0 ? "moderate" : "high"

            const confStyle = {
              high:     { color: "var(--accent)",         label: "High confidence",     tip: "Score is based on recognized JD vocabulary, parsed résumé sections, and measurable signals." },
              moderate: { color: "var(--mineral)",        label: "Moderate confidence", tip: "One or more signals defaulted to neutral. Review sub-score breakdown for details."            },
              low:      { color: "var(--text-secondary)", label: "Low confidence",       tip: "Most signals defaulted to neutral. Score has limited diagnostic value for this pair."          },
            }[confidence]

            const scoreItems = [
              { label: "Overall",    key: "overall",              value: display.scores.overall,              span: true,  weight: null  },
              { label: "Keywords",   key: "keyword_match",        value: display.scores.keyword_match,        span: false, weight: "35%" },
              { label: "Experience", key: "experience_alignment", value: display.scores.experience_alignment, span: false, weight: "25%" },
              { label: "Parse",      key: "parse_integrity",      value: display.scores.parse_integrity,      span: false, weight: "20%" },
              { label: "Structure",  key: "structure",            value: display.scores.structure,            span: false, weight: "10%" },
              { label: "Impact",     key: "quantified_impact",    value: display.scores.quantified_impact,    span: false, weight: "10%" },
            ]

            const sourceLines: Record<string, string> = {}
            const totalJdKeywords = display.matched_keywords.length + display.missing_keywords.length
            if (totalJdKeywords > 0) { sourceLines.keyword_match = `${display.matched_keywords.length} of ${totalJdKeywords} recognized JD keywords found` }
            if (jdHasYearsReq) {
              const mn = jdReqs.min_years_experience as number
              const expPct = pct(display.scores.experience_alignment)
              sourceLines.experience_alignment = expPct >= 90 ? `Meets or exceeds ${mn}-year JD requirement` : expPct >= 60 ? `Partial alignment with ${mn}-year JD requirement` : `Below ${mn}-year JD minimum — alignment score ${expPct}/100`
            }
            const parsePct = pct(display.scores.parse_integrity)
            sourceLines.parse_integrity = parsePct >= 90 ? "No significant parse issues detected" : parsePct >= 70 ? "Minor formatting concerns detected" : `Parse penalty applied — formatting score ${parsePct}/100`
            const sectionKeys = display.resume_sections ?? {}
            const structFound = ["summary", "experience", "education", "skills"].filter(sec => sec in sectionKeys).length
            sourceLines.structure = `${structFound} of 4 expected sections found`
            const lowQIssue = display.issues.find(i => i.issue_type === "low_quantification")
            const qMatch = lowQIssue?.evidence?.match(/^(\d+) of (\d+) experience bullets/)
            if (qMatch) {
              sourceLines.quantified_impact = `${parseInt(qMatch[2]) - parseInt(qMatch[1])} of ${qMatch[2]} bullets include measurable impact`
            } else {
              const qPct = pct(display.scores.quantified_impact)
              sourceLines.quantified_impact = qPct >= 70 ? "Most bullets include measurable impact" : qPct >= 40 ? "Some bullets include measurable impact" : "Few bullets include measurable impact"
            }

            return (
              <>
                <div style={{ padding: "1.5rem 2rem", borderBottom: "1px solid var(--border-subtle)" }}>
                  <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1.25rem" }}>
                    Score breakdown
                  </div>
                  {/* Overall */}
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", paddingBottom: "1rem", borderBottom: "1px solid var(--border-subtle)", marginBottom: "0.25rem" }}>
                    <span style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--text-secondary)" }}>Overall</span>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
                      <span style={{ fontFamily: "var(--font-data)", fontSize: "2.5rem", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1 }}>
                        {pct(display.scores.overall)}
                      </span>
                      <span style={{ fontFamily: "var(--font-data)", fontSize: "1rem", color: "var(--text-dim)" }}>/100</span>
                      <span
                        title={confStyle.tip}
                        style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: confStyle.color, cursor: "help", letterSpacing: "0.01em" }}
                      >
                        {confStyle.label}
                      </span>
                    </div>
                  </div>
                  {/* Sub-score rows */}
                  {scoreItems.filter(s => !s.span).map((s) => {
                    const isNeutral = s.key in neutralDefaults
                    const reason = neutralDefaults[s.key]
                    const p = pct(s.value)
                    return (
                      <div key={s.key} className="ws-score-row" style={isNeutral ? { borderLeft: "2px solid var(--border-mid)", paddingLeft: "0.75rem" } : undefined}>
                        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.3rem" }}>
                          <div>
                            <span style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)" }}>{s.label}</span>
                            {s.weight && <span style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", color: "var(--text-dim)", marginLeft: "0.5rem", opacity: 0.65 }}>· {s.weight}</span>}
                          </div>
                          {isNeutral ? (
                            <span title={`Not computable for this input. Contributed 0.50 × ${s.weight} to overall.`} style={{ fontFamily: "var(--font-data)", fontSize: "1.25rem", color: "var(--text-dim)", cursor: "help" }}>—</span>
                          ) : (
                            <span style={{ fontFamily: "var(--font-data)", fontSize: "1.25rem", fontWeight: 500, color: "var(--text-primary)" }}>{p}</span>
                          )}
                        </div>
                        <div style={{ height: "2px", background: "var(--border-subtle)", borderRadius: "1px", overflow: "hidden", marginBottom: "0.35rem" }}>
                          {!isNeutral && <div style={{ height: "100%", width: `${p}%`, background: "var(--accent)", opacity: 0.65, borderRadius: "1px" }} />}
                        </div>
                        {isNeutral && reason ? (
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--text-dim)", fontStyle: "italic", lineHeight: 1.5 }}>{reason}</div>
                        ) : !isNeutral && sourceLines[s.key] ? (
                          <div style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-secondary)", lineHeight: 1.4 }}>{sourceLines[s.key]}</div>
                        ) : null}
                      </div>
                    )
                  })}
                  {defaultCount > 0 && (
                    <div style={{ marginTop: "1rem", padding: "0.65rem 0.875rem", background: "rgba(97,93,87,0.08)", border: "1px solid var(--border-subtle)", borderRadius: "2px", fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-secondary)", lineHeight: 1.65 }}>
                      One or more sub-scores defaulted to neutral — the job description lacked measurable data for that signal. Not penalties.
                    </div>
                  )}
                  <div style={{ marginTop: "1rem" }}>
                    <a href="/methodology" target="_blank" style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--text-dim)", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "1px" }}>
                      Scoring weights and methodology →
                    </a>
                  </div>
                </div>
              </>
            )
          })()}

          {/* Fix priorities */}
          {display.top_fixes.length > 0 && (() => {
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
                <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "1rem" }}>
                  Fix this first
                </div>
                {display.top_fixes.map((fix, i) => (
                  <div
                    key={fix.issue_index}
                    onClick={() => { setSelectedIssue(fix.issue_index); track("fix_clicked", { issue_type: fix.issue_type, label: fix.labels[0] ?? "" }) }}
                    style={{ marginBottom: i < display.top_fixes.length - 1 ? "0.875rem" : 0, paddingBottom: i < display.top_fixes.length - 1 ? "0.875rem" : 0, borderBottom: i < display.top_fixes.length - 1 ? "1px solid var(--border-subtle)" : "none", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.65rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontFamily: "var(--font-data)", fontSize: "0.6rem", color: "var(--text-dim)", paddingTop: "2px", flexShrink: 0, minWidth: "1.25rem" }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", fontWeight: 500, color: "var(--text-primary)", lineHeight: 1.4 }}>
                        {fix.title}
                      </span>
                    </div>
                    <div style={{ marginLeft: "1.9rem" }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-secondary)", marginBottom: "0.35rem", lineHeight: 1.5 }}>
                        {fix.suggested_fix}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.2rem", alignItems: "center" }}>
                        {fix.labels.map((label) => {
                          const ls = LABEL_COLOR[label] ?? { bg: "rgba(0,0,0,0.06)", color: "var(--text-dim)" }
                          return <span key={label} style={{ fontFamily: "var(--font-body)", fontSize: "0.6rem", padding: "0.1rem 0.35rem", borderRadius: "2px", background: ls.bg, color: ls.color, fontWeight: 500, letterSpacing: "0.04em" }}>{label}</span>
                        })}
                        <span style={{ marginLeft: "auto", fontFamily: "var(--font-data)", fontSize: "0.58rem", color: "var(--text-dim)" }}>
                          {fix.affects_profiles.map(p => PROFILE_SHORT[p] ?? p).join(" · ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {/* ATS profile simulation */}
          {display.simulation && (() => {
            const sim = display.simulation!
            const VOL_COLOR: Record<string, string> = { LOW: "var(--accent)", MEDIUM: "var(--sev-high)", HIGH: "var(--sev-critical)" }
            const volColor = VOL_COLOR[sim.score_spread.volatility]
            return (
              <div style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div onClick={() => setSimExpanded(v => !v)} style={{ padding: "0.875rem 2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
                  <span style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                    ATS Profile Simulation
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div style={{ display: "flex", gap: "0.35rem" }}>
                      {sim.profiles.map(p => (
                        <span key={p.id} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", fontWeight: 500, color: scoreColor(p.score), padding: "0.12rem 0.4rem", border: `1px solid ${scoreColor(p.score)}`, borderRadius: "2px" }}>
                          {p.label.split(" ")[0]} {p.score}
                        </span>
                      ))}
                    </div>
                    <span style={{ fontFamily: "var(--font-data)", fontSize: "0.62rem", color: volColor }}>Δ{sim.score_spread.delta} {simExpanded ? "▴" : "▾"}</span>
                  </div>
                </div>
                {simExpanded && (
                  <div style={{ padding: "0 2rem 1.25rem" }}>
                    <div style={{ fontFamily: "var(--font-body)", fontSize: "0.75rem", color: "var(--text-secondary)", fontStyle: "italic", marginBottom: "1rem", lineHeight: 1.6 }}>
                      {sim.cross_profile_summary}
                    </div>
                    {sim.profiles.map(p => {
                      const open = expandedProfile === p.id
                      const c = scoreColor(p.score)
                      const riskColor = VOL_COLOR[p.risk_level]
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
                                    <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-body)", fontSize: "0.65rem", color: "var(--text-secondary)", marginBottom: "0.2rem" }}>
                                      <span>{s.label}</span><span style={{ fontFamily: "var(--font-data)" }}>{s.v}</span>
                                    </div>
                                    <div style={{ height: "2px", background: "var(--border-subtle)", borderRadius: "1px" }}>
                                      <div style={{ height: "2px", width: s.v + "%", background: scoreColor(s.v), borderRadius: "1px" }} />
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {p.top_strengths.length > 0 && <div style={{ marginBottom: "0.5rem" }}>{p.top_strengths.map((s, i) => <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--accent)", marginBottom: "0.15rem" }}>✓ {s}</div>)}</div>}
                              {p.top_failures.length > 0 && <div style={{ marginBottom: "0.5rem" }}>{p.top_failures.map((s, i) => <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--sev-critical)", marginBottom: "0.15rem" }}>✗ {s}</div>)}</div>}
                              {p.lost_signals.length > 0 && (
                                <div style={{ marginBottom: "0.5rem" }}>
                                  <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--sev-high)", marginBottom: "0.25rem" }}>Lost signals</div>
                                  {p.lost_signals.map((s, i) => <div key={i} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", color: "var(--sev-high)", marginBottom: "0.15rem" }}>{s}</div>)}
                                </div>
                              )}
                              {p.recommended_fixes.length > 0 && (
                                <div>
                                  <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.25rem" }}>Fixes</div>
                                  {p.recommended_fixes.map((s, i) => <div key={i} style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-primary)", marginBottom: "0.2rem" }}>→ {s}</div>)}
                                </div>
                              )}
                              <div style={{ marginTop: "0.5rem", fontFamily: "var(--font-body)", fontSize: "0.62rem", color: "var(--text-dim)", fontStyle: "italic" }}>
                                † Adj. Skills = adjacent skill inference (heuristic). Not exact ATS behavior.
                              </div>
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

          {/* Keywords */}
          <div style={{ padding: "1rem 2rem", borderBottom: "1px solid var(--border-subtle)" }}>
            <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.65rem" }}>Keywords</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {display.matched_keywords.map((k) => (
                <span key={k} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", background: "rgba(124,142,92,0.1)", color: "var(--accent)", padding: "0.12rem 0.4rem", borderRadius: "2px", border: "1px solid rgba(124,142,92,0.2)" }}>{k}</span>
              ))}
              {display.missing_keywords.map((k) => (
                <span key={k} style={{ fontFamily: "var(--font-data)", fontSize: "0.68rem", background: "rgba(140,47,78,0.08)", color: "var(--sev-critical)", padding: "0.12rem 0.4rem", borderRadius: "2px", border: "1px solid rgba(192,112,128,0.2)" }}>{"miss: " + k}</span>
              ))}
            </div>
          </div>

          {/* Issues */}
          <div ref={issuesSectionRef}>
            <div style={{ padding: "0.75rem 2rem", fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", borderBottom: "1px solid var(--border-subtle)" }}>
              Issues — {display.issues.length} found
            </div>
            {display.issues.map((issue, i) => {
              const isSelected = selectedIssue === i
              return (
                <div
                  key={i}
                  className={`ws-issue-row${isSelected ? " active" : ""}`}
                  onClick={() => { setSelectedIssue(isSelected ? null : i); if (!isSelected) void refreshLlmStatus() }}
                >
                  <div style={{ display: "flex", gap: "0.875rem", alignItems: "flex-start" }}>
                    <div style={{ flexShrink: 0, paddingTop: "2px", minWidth: "4.5rem" }}>
                      <span style={{ fontFamily: "var(--font-data)", fontSize: "0.58rem", letterSpacing: "0.1em", textTransform: "uppercase", color: SEV_COLOR[issue.severity], display: "block", marginBottom: "0.12rem" }}>
                        {issue.severity}
                      </span>
                      <span style={{ fontFamily: "var(--font-data)", fontSize: "0.52rem", letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                        {issue.issue_type.replace("_", " ")}
                      </span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", fontWeight: 500, color: "var(--text-primary)", marginBottom: "0.2rem", lineHeight: 1.4 }}>
                        {issue.title}
                      </div>
                      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-secondary)", lineHeight: 1.5 }}>
                        {issue.description}
                      </div>

                      {isSelected && (
                        <div style={{ marginTop: "0.875rem" }}>
                          {issue.issue_type === "missing_section" ? (() => {
                            const secKey = issue.title.toLowerCase().replace(/^missing\s+/, "").replace(/\s+section$/, "").trim()
                            const sects = display.resume_sections ?? {}
                            const foundSects = Object.keys(sects).filter(k => k !== "_unparsed")
                            const variants = SECTION_HEADER_VARIANTS[secKey] ?? []
                            const shown = variants.slice(0, 6)
                            const extra = variants.length - shown.length
                            const hasUnparsed = "_unparsed" in sects && (sects as Record<string, string>)["_unparsed"]?.length > 0
                            return (
                              <div className="ws-evidence-block" style={{ marginBottom: "0.75rem", lineHeight: 1.9 }}>
                                <div><span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Sections found:</span> {foundSects.length > 0 ? foundSects.join(", ") : "none"}</div>
                                <div><span style={{ color: "var(--text-primary)", fontWeight: 500 }}>Searched for <em>{secKey}</em> using:</span> {shown.join(", ")}{extra > 0 ? `, and ${extra} others` : ""}</div>
                                <div style={{ color: "var(--sev-critical)", fontWeight: 500 }}>Result: none matched.</div>
                                {hasUnparsed && <div style={{ marginTop: "0.3rem", color: "var(--sev-high)" }}>Some résumé content couldn&apos;t be assigned to a section — an unrecognized header may be present.</div>}
                              </div>
                            )
                          })() : issue.evidence ? (
                            <div className="ws-evidence-block" style={{ marginBottom: "0.75rem" }}>{issue.evidence}</div>
                          ) : null}

                          <div style={{ padding: "0.65rem 0.875rem", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "2px", marginBottom: "0.5rem" }}>
                            <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.35rem" }}>Fix pattern</div>
                            <div style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-primary)", lineHeight: 1.65 }}>
                              {issue.fix_pattern || issue.suggested_fix}
                            </div>
                            {issue.source_excerpt && (
                              <pre style={{ marginTop: "0.5rem", fontFamily: "var(--font-data)", fontSize: "0.7rem", color: "var(--text-secondary)", whiteSpace: "pre-wrap", margin: "0.5rem 0 0", lineHeight: 1.6 }}>
                                {issue.source_excerpt}
                              </pre>
                            )}
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
                                <button
                                  onClick={(e) => { e.stopPropagation(); void handleGenerateRewrites(i, issue) }}
                                  disabled={rewriteLoading[i]}
                                  style={{ fontFamily: "var(--font-body)", fontSize: "0.72rem", padding: "0.3rem 0.75rem", background: "transparent", border: "1px solid var(--accent)", color: "var(--accent)", borderRadius: "2px", cursor: rewriteLoading[i] ? "default" : "pointer", opacity: rewriteLoading[i] ? 0.6 : 1 }}
                                >
                                  {rewriteLoading[i] ? "Generating…" : "Generate AI rewrites"}
                                </button>
                              )}
                              {!rewriteVariants[i] && llmStatus?.available && llmStatus.healthy === false && (
                                <div style={{ fontFamily: "var(--font-body)", fontSize: "0.68rem", color: "var(--sev-high)", marginTop: "0.2rem" }}>
                                  LLM endpoint unreachable — check {llmStatus.model || "LLM_ENDPOINT"} is running
                                </div>
                              )}
                              {rewriteVariants[i]?.length > 0 && (
                                <div style={{ marginTop: "0.4rem" }}>
                                  <div style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.45rem" }}>AI-assisted rewrites</div>
                                  {rewriteVariants[i].map((v, vi) => (
                                    <div key={vi} style={{ padding: "0.55rem 0.75rem", background: "var(--bg-elevated)", border: "1px solid var(--border-subtle)", borderRadius: "2px", marginBottom: "0.3rem", fontFamily: "var(--font-data)", fontSize: "0.75rem", color: "var(--text-primary)", lineHeight: 1.65 }}>
                                      {v}
                                    </div>
                                  ))}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setRewriteVariants((prev) => { const n = {...prev}; delete n[i]; return n }) }}
                                    style={{ fontFamily: "var(--font-body)", fontSize: "0.65rem", color: "var(--text-dim)", background: "none", border: "none", cursor: "pointer", padding: "0.1rem 0" }}
                                  >
                                    clear
                                  </button>
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
          </div>

          {/* ATS text preview */}
          <div style={{ padding: "1.25rem 2rem 2rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.875rem" }}>
              <span style={{ fontFamily: "var(--font-data)", fontSize: "0.54rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)" }}>
                What ATS sees
              </span>
              {isMock && (
                <span style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--sev-medium)", padding: "0.12rem 0.4rem", border: "1px solid var(--border-mid)", borderRadius: "2px" }}>
                  sample
                </span>
              )}
            </div>
            <pre style={{ fontFamily: "var(--font-data)", fontSize: "0.75rem", lineHeight: 1.75, color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "var(--bg-surface)", border: "1px solid var(--border-subtle)", borderRadius: "2px", padding: "1.25rem", margin: 0 }}>
              {display.ats_text_preview}
            </pre>
          </div>

          </>}

        </div>
      </div>
    </div>
  )
}
