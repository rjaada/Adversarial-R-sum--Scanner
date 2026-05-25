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
  semantic_fit: number
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
  scoreDelta: number           // integer pts (already *100)
  subDeltas: SubDeltas
  keywordsGained: string[]
  keywordsStillMissing: string[]
  issuesResolved: Issue[]
  issuesRemaining: Issue[]
  newRegressions: Issue[]
  volatilityBefore: number | null
  volatilityAfter: number | null
  volatilityDelta: number | null  // negative = less volatile = good
}

// Pure deterministic compare — no fuzzy matching.
// Issue identity = title string equality.
// Verdict threshold: ±2 pts (i.e. 0.02 on 0–1 scale).
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

  return {
    verdict,
    scoreBefore: pct(before.scores.overall),
    scoreAfter:  pct(after.scores.overall),
    scoreDelta,
    subDeltas,
    keywordsGained,
    keywordsStillMissing,
    issuesResolved,
    issuesRemaining,
    newRegressions,
    volatilityBefore,
    volatilityAfter,
    volatilityDelta,
  }
}

const MOCK_SIMULATION: ProfileSimulation = {
  profiles: [
    {
      id: "exact_match",
      label: "Exact Match",
      description: "Rewards exact keyword overlap; heavily penalises missing must-have terms. Simulates keyword-first screening.",
      score: 52,
      parse_quality: 85,
      keyword_match: 38,
      semantic_fit: 42,
      structure_confidence: 75,
      risk_level: "MEDIUM",
      top_strengths: [
        "Clean parse: résumé structure extracted with high confidence",
        "3 of 8 required terms present",
      ],
      top_failures: [
        "Missing must-have term(s): kubernetes, aws, terraform",
        "Keyword gap: 62% of required terms absent (kubernetes, aws, terraform...)",
      ],
      lost_signals: [
        "'python' detected in experience body only — may be skipped without a skills block",
      ],
      recommended_fixes: [
        "Add must-have keywords to résumé: kubernetes, aws, terraform",
        "Add a dedicated skills section with your full tech stack",
      ],
    },
    {
      id: "structure_sensitive",
      label: "Structure Sensitive",
      description: "Penalises ambiguous or fragmented formatting; rewards clearly parsed sections and dedicated skills blocks.",
      score: 61,
      parse_quality: 85,
      keyword_match: 38,
      semantic_fit: 42,
      structure_confidence: 75,
      risk_level: "MEDIUM",
      top_strengths: [
        "All expected sections found: education, experience, skills, summary",
        "High parse confidence across all extracted sections",
      ],
      top_failures: [
        "Missing must-have term(s): kubernetes, aws, terraform",
        "2 skills only found in prose — may not register in this profile",
      ],
      lost_signals: [
        "'python' detected in experience body only — not in skills block",
        "'docker' detected in experience body only — not in skills block",
      ],
      recommended_fixes: [
        "Move 'python', 'docker' into a dedicated skills block",
        "Add must-have keywords to résumé: kubernetes, aws, terraform",
      ],
    },
    {
      id: "semantic_fit",
      label: "Semantic Fit",
      description: "Broader matching using adjacent skill inference (heuristic). Rewards transferable and contextually relevant experience.",
      score: 67,
      parse_quality: 85,
      keyword_match: 38,
      semantic_fit: 65,
      structure_confidence: 75,
      risk_level: "LOW",
      top_strengths: [
        "Adjacent skill signals cover most missing required terms",
        "Strong evidence density: quantified impact language present",
      ],
      top_failures: [
        "Partial keyword coverage: 38%",
      ],
      lost_signals: [],
      recommended_fixes: [
        "Add explicit kubernetes and aws to skills section",
        "Add 2–3 bullets with quantified impact (%, $, scale, or time saved)",
      ],
    },
  ],
  universal_fixes: [
    "Add must-have keywords to résumé: kubernetes, aws, terraform",
    "Move 'python', 'docker' from prose into a dedicated skills section",
    "Add quantified impact to 2–3 bullets (%, $, scale, or time saved)",
    "Add missing sections: summary",
  ],
  score_spread: { min: 52, max: 67, delta: 15, volatility: "MEDIUM" },
  cross_profile_summary: "Best in Semantic Fit (67), weakest in Exact Match (52). 15-pt spread. Exact-Match score lower due to keyword gap.",
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
  scores: {
    overall: 0.52,
    keyword_match: 0.38,
    experience_alignment: 0.70,
    parse_integrity: 0.85,
    structure: 0.75,
    quantified_impact: 0.15,
  },
  issues: [
    {
      issue_type: "keyword_gap",
      severity: "high",
      title: "Missing keyword: kubernetes",
      description: "The JD requires kubernetes but your resume does not mention it.",
      evidence: '"kubernetes" does not appear anywhere in your résumé text.',
      fix_pattern: 'Add "kubernetes" in your Skills section or work it into a relevant experience bullet.',
      rewrite_starter: "",
      source_excerpt: "",
      suggested_fix: "Add kubernetes in your Skills section.",
      impact_score: 3.2,
    },
    {
      issue_type: "low_quantification",
      severity: "high",
      title: "Most bullets lack measurable impact",
      description: "4 of 4 experience bullets have no numbers or percentages.",
      evidence: "4 of 4 experience bullets contain no numbers, percentages, currency, or scale indicators.",
      fix_pattern: "Rewrite 2–3 bullets: add %, $, users, team size, latency ms, requests/s, cost saved, or delivery time.",
      rewrite_starter: "Migrated monolith to [N] microservices, cutting deployment time by [X%] and rollback time to [Y min].",
      source_excerpt: "- Responsible for migration of monolith to microservices",
      suggested_fix: "Add metrics: e.g. Migrated monolith to 12 microservices, reducing p99 latency by 35%",
      impact_score: 3.2,
    },
    {
      issue_type: "weak_phrasing",
      severity: "medium",
      title: 'Weak verb: "responsible for"',
      description: "Passive phrasing reduces impact score in LLM screeners.",
      evidence: 'Phrase "responsible for" signals passive ownership. Screeners weight active verbs more heavily.',
      fix_pattern: "Start the bullet with: Built / Led / Reduced / Delivered / Scaled + [what] + [measurable result].",
      rewrite_starter: "Migrated monolith to [N] microservices, cutting deployment time by [X%] and rollback time to [Y min].",
      source_excerpt: "...Responsible for migration of monolith...",
      suggested_fix: "Replace with: Led migration of monolith to 12 microservices",
      impact_score: 1.6,
    },
    {
      issue_type: "keyword_gap",
      severity: "high",
      title: "Missing keyword: aws",
      description: "The JD requires aws but your resume does not mention it.",
      evidence: '"aws" does not appear anywhere in your résumé text.',
      fix_pattern: 'Add "aws" in your Skills section or work it into a relevant experience bullet.',
      rewrite_starter: "",
      source_excerpt: "",
      suggested_fix: "Add aws to your Skills section if applicable.",
      impact_score: 3.2,
    },
  ],
  missing_keywords: ["kubernetes", "aws", "terraform", "go"],
  matched_keywords: ["python", "docker", "postgresql"],
  top_fixes: [
    {
      issue_index: 0,
      issue_type: "keyword_gap",
      title: "Missing keyword: kubernetes",
      suggested_fix: "Add kubernetes in your Skills section.",
      fix_pattern: 'Add "kubernetes" in your Skills section or work it into a relevant experience bullet.',
      labels: ["Must-have gap", "Broad impact"],
      affects_profiles: ["exact_match", "structure_sensitive", "semantic_fit"],
      rank_score: 8.7,
    },
    {
      issue_index: 1,
      issue_type: "low_quantification",
      title: "Most bullets lack measurable impact",
      suggested_fix: "Add metrics: e.g. Migrated monolith to 12 microservices, reducing p99 latency by 35%",
      fix_pattern: "Rewrite 2–3 bullets: add %, $, users, team size, latency ms, requests/s, cost saved, or delivery time.",
      labels: ["Fast win", "Quantify"],
      affects_profiles: ["exact_match", "semantic_fit"],
      rank_score: 6.2,
    },
    {
      issue_index: 3,
      issue_type: "keyword_gap",
      title: "Missing keyword: aws",
      suggested_fix: "Add aws to your Skills section if applicable.",
      fix_pattern: 'Add "aws" in your Skills section or work it into a relevant experience bullet.',
      labels: ["Broad impact"],
      affects_profiles: ["exact_match", "structure_sensitive", "semantic_fit"],
      rank_score: 6.7,
    },
    {
      issue_index: 2,
      issue_type: "weak_phrasing",
      title: 'Weak verb: "responsible for"',
      suggested_fix: "Replace with: Led migration of monolith to 12 microservices",
      fix_pattern: "Start the bullet with: Built / Led / Reduced / Delivered / Scaled + [what] + [measurable result].",
      labels: ["Fast win"],
      affects_profiles: ["exact_match", "semantic_fit"],
      rank_score: 3.6,
    },
  ],
  simulation: MOCK_SIMULATION,
}

// Fire-and-forget analytics. Silently discards all errors.
// Property keys that look like PII are blocked server-side; do not send them here.
function track(event: string, properties: Record<string, string | number | boolean | null> = {}): void {
  void fetch("http://localhost:8001/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties }),
  }).catch(() => {})
}

const SEV_COLOR: Record<string, string> = {
  critical: "#8c2f4e",
  high: "#9a4d22",
  medium: "#6f6b64",
  low: "#a0998e",
}

function pct(v: number): number {
  return Math.round(v * 100)
}

function scoreColor(p: number): string {
  if (p >= 70) return "#0f5c52"
  if (p >= 50) return "#9a4d22"
  return "#8c2f4e"
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
  const lastStatusCheckRef = useRef<number>(0)
  const STATUS_TTL_MS = 30_000

  const refreshLlmStatus = useCallback(async (force = false) => {
    const now = Date.now()
    if (!force && now - lastStatusCheckRef.current < STATUS_TTL_MS) return
    lastStatusCheckRef.current = now
    try {
      const r = await fetch("http://localhost:8001/api/rewrite/status")
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
    fetch("http://localhost:8001/api/scans")
      .then((r) => r.json())
      .then((data: unknown) => { if (Array.isArray(data)) setHistory(data) })
      .catch(() => {})
    void refreshLlmStatus(true)
    const onFocus = () => { void refreshLlmStatus() }
    window.addEventListener("focus", onFocus)
    return () => window.removeEventListener("focus", onFocus)
  }, [refreshLlmStatus])

  async function handleScan() {
    if (!file) { setError("Upload a resume first."); return }
    if (!jdText.trim()) { setError("Paste a job description first."); return }
    setScanning(true)
    setError(null)
    try {
      const form = new FormData()
      form.append("file", file)
      form.append("jd_text", jdText)
      const res = await fetch("http://localhost:8001/api/scan", { method: "POST", body: form })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || "HTTP " + String(res.status))
      }
      const data = await res.json() as ScanResult
      setResult(data)
      setSelectedIssue(null)
      track("scan_completed", {
        overall_score: pct(data.scores.overall),
        issue_count: data.issues.length,
        has_simulation: data.simulation != null,
        keyword_match_count: data.matched_keywords.length,
      })
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
      const res = await fetch("http://localhost:8001/api/scans/" + scanId)
      if (res.ok) {
        setResult(await res.json() as ScanResult)
        setSelectedIssue(null)
        setCompareBase(null)
      }
    } catch (_) {}
  }

  async function loadScanForCompare(scanId: string) {
    try {
      const res = await fetch("http://localhost:8001/api/scans/" + scanId)
      if (res.ok) {
        setCompareBase(await res.json() as ScanResult)
        track("compare_started", {})
      }
    } catch (_) {}
  }

  async function handleGenerateRewrites(issueIndex: number, issue: Issue) {
    await refreshLlmStatus()
    track("rewrite_requested", { issue_type: issue.issue_type })
    setRewriteLoading((prev) => ({ ...prev, [issueIndex]: true }))
    try {
      const res = await fetch("http://localhost:8001/api/rewrite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issue_type: issue.issue_type,
          original_text: issue.source_excerpt || issue.rewrite_starter || "",
          evidence: issue.evidence || "",
          fix_pattern: issue.fix_pattern || "",
          rewrite_starter: issue.rewrite_starter || "",
          jd_keywords: display.matched_keywords.slice(0, 8),
          count: 3,
        }),
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
      if (result) {
        // Real scan — GET by scan_id opens directly
        window.open("http://localhost:8001/api/scans/" + result.scan_id + "/report", "_blank")
      } else {
        // Mock / unsaved — POST body
        const res = await fetch("http://localhost:8001/api/export", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(display),
        })
        if (!res.ok) throw new Error("Export failed")
        const htmlBlob = await res.blob()
        const url = URL.createObjectURL(htmlBlob)
        window.open(url, "_blank")
      }
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
    <div style={{ background: "#f6f3ee", minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      <nav style={{ borderBottom: "1px solid #d9d3ca", padding: "0 1.5rem", height: "48px", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fbfaf7", flexShrink: 0 }}>
        <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1rem", fontWeight: 600, color: "#1f1d1a", textDecoration: "none" }}>
          TraceRank
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <span style={{ fontSize: "0.75rem", color: "#6f6b64" }}>
            {isMock ? "Showing sample scan" : "Scanned: " + display.source_id}
          </span>
          <button
            onClick={() => void handleExport()}
            disabled={exporting}
            style={{ fontSize: "0.7rem", padding: "0.25rem 0.65rem", background: "transparent", border: "1px solid #d9d3ca", color: "#6f6b64", borderRadius: "2px", cursor: exporting ? "default" : "pointer", opacity: exporting ? 0.5 : 1, letterSpacing: "0.03em" }}
          >
            {exporting ? "Exporting…" : "Export report"}
          </button>
        </div>
      </nav>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        <div style={{ width: "280px", flexShrink: 0, borderRight: "1px solid #d9d3ca", background: "#fbfaf7", padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1rem", overflowY: "auto" }}>
          <div>
            <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", display: "block", marginBottom: "0.5rem" }}>
              Resume
            </label>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              style={{ border: "1px dashed #d9d3ca", borderRadius: "2px", padding: "1.25rem", textAlign: "center", cursor: "pointer", background: file ? "#f0f7f5" : undefined }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx"
                style={{ display: "none" }}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f) }}
              />
              <span style={{ fontSize: "0.8rem", color: file ? "#0f5c52" : "#6f6b64", fontWeight: file ? 500 : undefined }}>
                {file ? "Selected: " + file.name : "Drop PDF or DOCX, or click to browse"}
              </span>
            </div>
          </div>

          <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            <label style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", display: "block", marginBottom: "0.5rem" }}>
              Job Description
            </label>
            <textarea
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
              placeholder="Paste the full job description here"
              style={{ flex: 1, minHeight: "160px", resize: "vertical", border: "1px solid #d9d3ca", borderRadius: "2px", padding: "0.75rem", fontSize: "0.8rem", fontFamily: "Inter, system-ui, sans-serif", color: "#1f1d1a", background: "#f6f3ee", outline: "none" }}
            />
          </div>

          {error && (
            <div style={{ fontSize: "0.8rem", color: "#8c2f4e", padding: "0.5rem 0.75rem", border: "1px solid #d9d3ca", borderRadius: "2px" }}>
              {error}
            </div>
          )}

          <button
            onClick={handleScan}
            disabled={scanning}
            style={{ background: scanning ? "#6f6b64" : "#0f5c52", color: "#fff", border: "none", borderRadius: "2px", padding: "0.7rem", fontSize: "0.875rem", fontWeight: 500, cursor: scanning ? "not-allowed" : "pointer" }}
          >
            {scanning ? "Scanning..." : "Run Scan"}
          </button>

          <div style={{ borderTop: "1px solid #d9d3ca", paddingTop: "1rem" }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.5rem" }}>
              Scan History
            </div>
            {history.length === 0 ? (
              <div style={{ fontSize: "0.78rem", color: "#a0998e" }}>No saved scans yet.</div>
            ) : (
              history.map((h) => {
                const p = pct(h.overall_score)
                const isCompareBase = compareBase?.scan_id === h.scan_id
                return (
                  <div
                    key={h.scan_id}
                    style={{ padding: "0.5rem 0", borderBottom: "1px solid #d9d3ca" }}
                  >
                    <div
                      onClick={() => void loadScan(h.scan_id)}
                      style={{ cursor: "pointer" }}
                    >
                      <div style={{ fontSize: "0.78rem", color: "#1f1d1a", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {h.source_id}
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", marginTop: "0.2rem" }}>
                        <span style={{ fontSize: "0.7rem", color: "#6f6b64" }}>
                          {new Date(h.scanned_at).toLocaleDateString()}
                        </span>
                        <span style={{ fontFamily: "monospace", fontSize: "0.7rem", fontWeight: 600, color: scoreColor(p) }}>
                          {p}
                        </span>
                      </div>
                    </div>
                    {result !== null && (
                      <button
                        onClick={() => {
                          if (isCompareBase) setCompareBase(null)
                          else void loadScanForCompare(h.scan_id)
                        }}
                        style={{ marginTop: "0.25rem", fontSize: "0.65rem", padding: "0.1rem 0.4rem", background: isCompareBase ? "#0f5c52" : "transparent", color: isCompareBase ? "#fff" : "#6f6b64", border: "1px solid " + (isCompareBase ? "#0f5c52" : "#d9d3ca"), borderRadius: "2px", cursor: "pointer", letterSpacing: "0.03em" }}
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

        <div style={{ flex: 1, padding: "1.5rem", overflowY: "auto", borderRight: "1px solid #d9d3ca" }}>
          <div style={{ maxWidth: "640px" }}>
            <div style={{ marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64" }}>
                What ATS sees
              </span>
              {isMock && (
                <span style={{ fontSize: "0.65rem", color: "#9a4d22", padding: "0.15rem 0.5rem", border: "1px solid #d9d3ca", borderRadius: "1px" }}>
                  sample
                </span>
              )}
            </div>
            <pre style={{ fontFamily: "monospace", fontSize: "0.78rem", lineHeight: 1.7, color: "#1f1d1a", whiteSpace: "pre-wrap", wordBreak: "break-word", background: "#fbfaf7", border: "1px solid #d9d3ca", borderRadius: "2px", padding: "1.25rem", margin: 0 }}>
              {display.ats_text_preview}
            </pre>
          </div>
        </div>

        <div style={{ width: "340px", flexShrink: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>

          {/* Compare panel — replaces normal right pane when compareBase is set */}
          {compareBase !== null && result !== null && (() => {
            const cmp = compareScans(compareBase, result)
            const VERDICT_STYLE: Record<string, { color: string; bg: string; label: string }> = {
              improved:  { color: "#0f5c52", bg: "rgba(15,92,82,0.07)",  label: "Improved" },
              neutral:   { color: "#6f6b64", bg: "rgba(0,0,0,0.04)",     label: "Neutral"  },
              regressed: { color: "#8c2f4e", bg: "rgba(140,47,78,0.07)", label: "Regressed" },
            }
            const vs = VERDICT_STYLE[cmp.verdict]

            function deltaLabel(n: number): JSX.Element {
              if (n > 0)  return <span style={{ color: "#0f5c52", fontFamily: "monospace", fontSize: "0.7rem", fontWeight: 600 }}>+{n}</span>
              if (n < 0)  return <span style={{ color: "#8c2f4e", fontFamily: "monospace", fontSize: "0.7rem", fontWeight: 600 }}>−{Math.abs(n)}</span>
              return <span style={{ color: "#a0998e", fontFamily: "monospace", fontSize: "0.7rem" }}>±0</span>
            }

            const SUB_LABELS: [keyof SubDeltas, string][] = [
              ["keyword_match",        "Keywords"],
              ["experience_alignment", "Experience"],
              ["parse_integrity",      "Parse"],
              ["structure",            "Structure"],
              ["quantified_impact",    "Impact"],
            ]

            return (
              <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>

                {/* Compare header */}
                <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #d9d3ca", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64" }}>
                    Compare
                  </span>
                  <button
                    onClick={() => setCompareBase(null)}
                    style={{ fontSize: "0.65rem", padding: "0.15rem 0.5rem", background: "transparent", border: "1px solid #d9d3ca", color: "#6f6b64", borderRadius: "2px", cursor: "pointer" }}
                  >
                    Exit compare
                  </button>
                </div>

                <div style={{ padding: "1rem 1.25rem", overflowY: "auto", flex: 1 }}>

                  {/* File labels */}
                  <div style={{ marginBottom: "0.75rem", fontSize: "0.72rem", color: "#6f6b64", lineHeight: 1.6 }}>
                    <div><span style={{ color: "#a0998e", marginRight: "0.4rem" }}>Before</span>{compareBase.source_id}</div>
                    <div><span style={{ color: "#a0998e", marginRight: "0.5rem" }}>After</span>{result.source_id}</div>
                  </div>

                  {/* Verdict */}
                  <div style={{ padding: "0.5rem 0.75rem", background: vs.bg, borderRadius: "2px", marginBottom: "1rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 700, color: vs.color, letterSpacing: "0.06em", textTransform: "uppercase" }}>{vs.label}</span>
                    <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: "#6f6b64" }}>
                      {cmp.scoreBefore} → {cmp.scoreAfter} &nbsp;({deltaLabel(cmp.scoreDelta)})
                    </span>
                  </div>

                  {/* Sub-score deltas */}
                  <div style={{ marginBottom: "1rem" }}>
                    <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.4rem" }}>Score breakdown</div>
                    {SUB_LABELS.map(([key, label]) => (
                      <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.2rem 0", borderBottom: "1px solid #ece7e0" }}>
                        <span style={{ fontSize: "0.72rem", color: "#6f6b64" }}>{label}</span>
                        {deltaLabel(cmp.subDeltas[key])}
                      </div>
                    ))}
                  </div>

                  {/* ATS volatility */}
                  {cmp.volatilityDelta !== null && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.4rem" }}>ATS profile spread</div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.72rem", color: "#1f1d1a" }}>
                        <span>{cmp.volatilityBefore} → {cmp.volatilityAfter} pts</span>
                        <span style={{ fontFamily: "monospace", fontSize: "0.7rem", color: (cmp.volatilityDelta ?? 0) < 0 ? "#0f5c52" : (cmp.volatilityDelta ?? 0) > 0 ? "#8c2f4e" : "#a0998e" }}>
                          {(cmp.volatilityDelta ?? 0) < 0 ? "↓ less volatile" : (cmp.volatilityDelta ?? 0) > 0 ? "↑ more volatile" : "unchanged"}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Keywords gained */}
                  {cmp.keywordsGained.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.4rem" }}>Keywords gained ({cmp.keywordsGained.length})</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {cmp.keywordsGained.map(k => (
                          <span key={k} style={{ fontSize: "0.7rem", fontFamily: "monospace", background: "rgba(15,92,82,0.08)", color: "#0f5c52", padding: "0.1rem 0.4rem", borderRadius: "1px" }}>{k}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Still missing */}
                  {cmp.keywordsStillMissing.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.4rem" }}>Still missing ({cmp.keywordsStillMissing.length})</div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
                        {cmp.keywordsStillMissing.map(k => (
                          <span key={k} style={{ fontSize: "0.7rem", fontFamily: "monospace", background: "rgba(140,47,78,0.06)", color: "#8c2f4e", padding: "0.1rem 0.4rem", borderRadius: "1px" }}>–{k}</span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Issues resolved */}
                  {cmp.issuesResolved.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#0f5c52", marginBottom: "0.4rem" }}>Resolved ({cmp.issuesResolved.length})</div>
                      {cmp.issuesResolved.map((iss, i) => (
                        <div key={i} style={{ fontSize: "0.72rem", color: "#0f5c52", marginBottom: "0.2rem" }}>✓ {iss.title}</div>
                      ))}
                    </div>
                  )}

                  {/* Issues remaining */}
                  {cmp.issuesRemaining.length > 0 && (
                    <div style={{ marginBottom: "1rem" }}>
                      <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.4rem" }}>Still present ({cmp.issuesRemaining.length})</div>
                      {cmp.issuesRemaining.map((iss, i) => (
                        <div key={i} style={{ fontSize: "0.72rem", color: "#6f6b64", marginBottom: "0.2rem" }}>· {iss.title}</div>
                      ))}
                    </div>
                  )}

                  {/* Regressions */}
                  <div style={{ marginBottom: "0.5rem" }}>
                    <div style={{ fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: cmp.newRegressions.length > 0 ? "#8c2f4e" : "#6f6b64", marginBottom: "0.4rem" }}>
                      New issues ({cmp.newRegressions.length})
                    </div>
                    {cmp.newRegressions.length === 0
                      ? <div style={{ fontSize: "0.72rem", color: "#a0998e" }}>None</div>
                      : cmp.newRegressions.map((iss, i) => (
                          <div key={i} style={{ fontSize: "0.72rem", color: "#8c2f4e", marginBottom: "0.2rem" }}>✗ {iss.title}</div>
                        ))
                    }
                  </div>

                </div>
              </div>
            )
          })()}

          {/* Normal right pane — hidden when compare is active */}
          {compareBase === null && <>

          <div style={{ padding: "1.25rem", borderBottom: "1px solid #d9d3ca" }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.75rem" }}>
              Scores
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
              {[
                { label: "Overall", value: display.scores.overall, span: true },
                { label: "Keywords", value: display.scores.keyword_match, span: false },
                { label: "Experience", value: display.scores.experience_alignment, span: false },
                { label: "Parse", value: display.scores.parse_integrity, span: false },
                { label: "Structure", value: display.scores.structure, span: false },
                { label: "Impact", value: display.scores.quantified_impact, span: false },
              ].map((s) => {
                const p = pct(s.value)
                const c = scoreColor(p)
                return (
                  <div key={s.label} style={s.span ? { gridColumn: "span 2" } : undefined}>
                    <div style={{ fontSize: "0.65rem", color: "#6f6b64", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "0.2rem" }}>{s.label}</div>
                    <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: s.span ? "1.8rem" : "1.1rem", fontWeight: 600, color: c }}>{p}</span>
                      <span style={{ fontSize: "0.7rem", color: "#6f6b64" }}>/100</span>
                    </div>
                    <div style={{ height: "2px", background: "#d9d3ca", borderRadius: "1px", marginTop: "0.3rem" }}>
                      <div style={{ height: "2px", width: p + "%", background: c, borderRadius: "1px" }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {display.top_fixes.length > 0 && (() => {
            const LABEL_COLOR: Record<string, { bg: string; color: string }> = {
              "Must-have gap": { bg: "rgba(140,47,78,0.07)", color: "#8c2f4e" },
              "Critical section": { bg: "rgba(140,47,78,0.07)", color: "#8c2f4e" },
              "Broad impact": { bg: "rgba(15,92,82,0.07)", color: "#0f5c52" },
              "Fast win": { bg: "rgba(15,92,82,0.07)", color: "#0f5c52" },
              "Quantify": { bg: "rgba(154,77,34,0.07)", color: "#9a4d22" },
            }
            const PROFILE_SHORT: Record<string, string> = {
              exact_match: "Exact",
              structure_sensitive: "Structure",
              semantic_fit: "Semantic",
            }
            return (
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #d9d3ca" }}>
                <div style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.65rem" }}>
                  Fix this first
                </div>
                {display.top_fixes.map((fix, i) => (
                  <div
                    key={fix.issue_index}
                    onClick={() => {
                      setSelectedIssue(fix.issue_index)
                      track("fix_clicked", { issue_type: fix.issue_type, label: fix.labels[0] ?? "" })
                    }}
                    style={{ marginBottom: i < display.top_fixes.length - 1 ? "0.75rem" : 0, paddingBottom: i < display.top_fixes.length - 1 ? "0.75rem" : 0, borderBottom: i < display.top_fixes.length - 1 ? "1px solid #ece7e0" : "none", cursor: "pointer" }}
                  >
                    <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.25rem" }}>
                      <span style={{ fontFamily: "monospace", fontSize: "0.6rem", color: "#a0998e", paddingTop: "1px", flexShrink: 0 }}>
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#1f1d1a", lineHeight: 1.4 }}>
                        {fix.title}
                      </span>
                    </div>
                    <div style={{ marginLeft: "1.25rem" }}>
                      <div style={{ fontSize: "0.72rem", color: "#6f6b64", marginBottom: "0.3rem", lineHeight: 1.4 }}>
                        {fix.suggested_fix}
                      </div>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem", alignItems: "center" }}>
                        {fix.labels.map((label) => {
                          const style = LABEL_COLOR[label] ?? { bg: "rgba(0,0,0,0.04)", color: "#6f6b64" }
                          return (
                            <span key={label} style={{ fontSize: "0.6rem", padding: "0.1rem 0.35rem", borderRadius: "1px", background: style.bg, color: style.color, fontWeight: 500, letterSpacing: "0.04em" }}>
                              {label}
                            </span>
                          )
                        })}
                        <span style={{ marginLeft: "auto", fontSize: "0.6rem", color: "#a0998e", fontFamily: "monospace" }}>
                          {fix.affects_profiles.map(p => PROFILE_SHORT[p] ?? p).join(" · ")}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          })()}

          {display.simulation && (() => {
            const sim = display.simulation!
            const VOL_COLOR: Record<string, string> = { LOW: "#0f5c52", MEDIUM: "#9a4d22", HIGH: "#8c2f4e" }
            const volColor = VOL_COLOR[sim.score_spread.volatility]
            return (
              <div style={{ borderBottom: "1px solid #d9d3ca" }}>
                {/* Header strip — always visible */}
                <div
                  onClick={() => setSimExpanded(v => !v)}
                  style={{ padding: "0.75rem 1.25rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}
                >
                  <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64" }}>
                    ATS Profile Simulation
                  </span>
                  <span style={{ fontSize: "0.65rem", color: volColor, fontFamily: "monospace", fontWeight: 600 }}>
                    {simExpanded ? "▴" : "▾"}
                  </span>
                </div>

                {/* Score chips — always visible */}
                <div style={{ padding: "0 1.25rem 0.75rem", display: "flex", gap: "0.4rem", flexWrap: "wrap", alignItems: "center" }}>
                  {sim.profiles.map(p => {
                    const c = scoreColor(p.score)
                    return (
                      <span key={p.id} style={{ fontFamily: "monospace", fontSize: "0.68rem", fontWeight: 600, color: c, padding: "0.15rem 0.45rem", border: `1px solid ${c}`, borderRadius: "1px", opacity: 0.9 }}>
                        {p.label.split(" ")[0]} {p.score}
                      </span>
                    )
                  })}
                  <span style={{ fontSize: "0.65rem", color: volColor, fontFamily: "monospace", marginLeft: "auto" }}>
                    Δ{sim.score_spread.delta} {sim.score_spread.volatility}
                  </span>
                </div>

                {/* Expanded content */}
                {simExpanded && (
                  <div style={{ padding: "0 1.25rem 1rem" }}>
                    {/* Cross-profile summary */}
                    <div style={{ fontSize: "0.72rem", color: "#6f6b64", fontStyle: "italic", marginBottom: "0.75rem", lineHeight: 1.5 }}>
                      {sim.cross_profile_summary}
                    </div>

                    {/* Profile cards */}
                    {sim.profiles.map(p => {
                      const open = expandedProfile === p.id
                      const c = scoreColor(p.score)
                      const riskColor = VOL_COLOR[p.risk_level]
                      return (
                        <div
                          key={p.id}
                          style={{ border: "1px solid #d9d3ca", borderRadius: "2px", marginBottom: "0.5rem", background: open ? "#fbfaf7" : undefined }}
                        >
                          {/* Card header */}
                          <div
                            onClick={() => setExpandedProfile(open ? null : p.id)}
                            style={{ padding: "0.55rem 0.75rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between" }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                              <span style={{ fontFamily: "monospace", fontSize: "1rem", fontWeight: 700, color: c }}>{p.score}</span>
                              <span style={{ fontSize: "0.72rem", fontWeight: 500, color: "#1f1d1a" }}>{p.label}</span>
                            </div>
                            <span style={{ fontSize: "0.6rem", fontFamily: "monospace", color: riskColor, fontWeight: 600 }}>{p.risk_level}</span>
                          </div>

                          {/* Sub-score bar */}
                          {open && (
                            <div style={{ padding: "0 0.75rem 0.75rem" }}>
                              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.3rem 0.75rem", marginBottom: "0.6rem" }}>
                                {[
                                  { label: "Keywords", v: p.keyword_match },
                                  { label: "Structure", v: p.structure_confidence },
                                  { label: "Parse", v: p.parse_quality },
                                  { label: "Adj. Skills†", v: p.semantic_fit },
                                ].map(s => (
                                  <div key={s.label}>
                                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.62rem", color: "#6f6b64" }}>
                                      <span>{s.label}</span>
                                      <span style={{ fontFamily: "monospace" }}>{s.v}</span>
                                    </div>
                                    <div style={{ height: "2px", background: "#d9d3ca", borderRadius: "1px" }}>
                                      <div style={{ height: "2px", width: s.v + "%", background: scoreColor(s.v), borderRadius: "1px" }} />
                                    </div>
                                  </div>
                                ))}
                              </div>

                              {p.top_strengths.length > 0 && (
                                <div style={{ marginBottom: "0.4rem" }}>
                                  {p.top_strengths.map((s, i) => (
                                    <div key={i} style={{ fontSize: "0.7rem", color: "#0f5c52", marginBottom: "0.15rem" }}>✓ {s}</div>
                                  ))}
                                </div>
                              )}
                              {p.top_failures.length > 0 && (
                                <div style={{ marginBottom: "0.4rem" }}>
                                  {p.top_failures.map((s, i) => (
                                    <div key={i} style={{ fontSize: "0.7rem", color: "#8c2f4e", marginBottom: "0.15rem" }}>✗ {s}</div>
                                  ))}
                                </div>
                              )}
                              {p.lost_signals.length > 0 && (
                                <div style={{ marginBottom: "0.4rem" }}>
                                  <div style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#9a4d22", fontWeight: 600, marginBottom: "0.2rem" }}>Lost signals</div>
                                  {p.lost_signals.map((s, i) => (
                                    <div key={i} style={{ fontSize: "0.69rem", color: "#9a4d22", marginBottom: "0.15rem", fontFamily: "monospace" }}>{s}</div>
                                  ))}
                                </div>
                              )}
                              {p.recommended_fixes.length > 0 && (
                                <div>
                                  <div style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6f6b64", fontWeight: 600, marginBottom: "0.2rem" }}>Fixes</div>
                                  {p.recommended_fixes.map((s, i) => (
                                    <div key={i} style={{ fontSize: "0.69rem", color: "#1f1d1a", marginBottom: "0.15rem" }}>→ {s}</div>
                                  ))}
                                </div>
                              )}

                              <div style={{ marginTop: "0.5rem", fontSize: "0.6rem", color: "#a0998e", fontStyle: "italic" }}>
                                † Adj. Skills = adjacent skill inference (heuristic). Not exact ATS behavior.
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Universal fixes */}
                    {sim.universal_fixes.length > 0 && (
                      <div style={{ marginTop: "0.5rem", padding: "0.65rem 0.75rem", background: "rgba(15,92,82,0.04)", border: "1px solid #c5dbd7", borderRadius: "2px" }}>
                        <div style={{ fontSize: "0.62rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f5c52", fontWeight: 600, marginBottom: "0.4rem" }}>
                          Universal-safe edits
                        </div>
                        {sim.universal_fixes.map((f, i) => (
                          <div key={i} style={{ fontSize: "0.7rem", color: "#1f1d1a", marginBottom: "0.25rem" }}>• {f}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })()}

          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #d9d3ca" }}>
            <div style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.5rem" }}>
              Keywords
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem" }}>
              {display.matched_keywords.map((k) => (
                <span key={k} style={{ fontSize: "0.7rem", fontFamily: "monospace", background: "rgba(15,92,82,0.08)", color: "#0f5c52", padding: "0.15rem 0.4rem", borderRadius: "1px" }}>{k}</span>
              ))}
              {display.missing_keywords.map((k) => (
                <span key={k} style={{ fontSize: "0.7rem", fontFamily: "monospace", background: "rgba(140,47,78,0.06)", color: "#8c2f4e", padding: "0.15rem 0.4rem", borderRadius: "1px" }}>{"miss: " + k}</span>
              ))}
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto" }}>
            <div style={{ padding: "0.75rem 1.25rem", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", borderBottom: "1px solid #d9d3ca" }}>
              Issues — {display.issues.length} found
            </div>
            {display.issues.map((issue, i) => (
              <div
                key={i}
                onClick={() => { setSelectedIssue(selectedIssue === i ? null : i); if (selectedIssue !== i) void refreshLlmStatus() }}
                style={{ padding: "0.875rem 1.25rem", borderBottom: "1px solid #d9d3ca", cursor: "pointer", background: selectedIssue === i ? "#f0f7f5" : undefined }}
              >
                <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.6rem", letterSpacing: "0.08em", textTransform: "uppercase", color: SEV_COLOR[issue.severity], fontWeight: 600, minWidth: "52px", paddingTop: "2px", flexShrink: 0 }}>
                    {issue.severity}
                  </span>
                  <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 500, color: "#1f1d1a", marginBottom: "0.2rem" }}>{issue.title}</div>
                    <div style={{ fontSize: "0.76rem", color: "#6f6b64" }}>{issue.description}</div>
                    {selectedIssue === i && (
                      <div style={{ marginTop: "0.75rem", fontSize: "0.76rem", color: "#1f1d1a" }}>
                        {issue.evidence && (
                          <div style={{ padding: "0.45rem 0.65rem", background: "rgba(0,0,0,0.03)", border: "1px solid #e8e3dc", borderRadius: "2px", marginBottom: "0.5rem", fontSize: "0.72rem", color: "#6f6b64", fontStyle: "italic" }}>
                            {issue.evidence}
                          </div>
                        )}
                        <div style={{ padding: "0.6rem 0.75rem", background: "#fbfaf7", border: "1px solid #d9d3ca", borderRadius: "2px" }}>
                          <div style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f5c52", fontWeight: 600, marginBottom: "0.3rem" }}>Fix pattern</div>
                          <div>{issue.fix_pattern || issue.suggested_fix}</div>
                          {issue.source_excerpt && (
                            <pre style={{ marginTop: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "#6f6b64", whiteSpace: "pre-wrap", margin: "0.5rem 0 0" }}>
                              {issue.source_excerpt}
                            </pre>
                          )}
                        </div>
                        {issue.rewrite_starter && (
                          <div style={{ marginTop: "0.5rem", padding: "0.6rem 0.75rem", background: "#f0f7f5", border: "1px solid #c5dbd7", borderRadius: "2px" }}>
                            <div style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f5c52", fontWeight: 600, marginBottom: "0.3rem" }}>Rewrite starter</div>
                            <div style={{ fontFamily: "monospace", fontSize: "0.75rem", color: "#1f1d1a", lineHeight: 1.6 }}>{issue.rewrite_starter}</div>
                          </div>
                        )}
                        {(issue.issue_type === "weak_phrasing" || issue.issue_type === "low_quantification") && (
                          <div style={{ marginTop: "0.6rem" }}>
                            {!rewriteVariants[i] && llmStatus?.available && llmStatus.healthy !== false && (
                              <button
                                onClick={(e) => { e.stopPropagation(); void handleGenerateRewrites(i, issue) }}
                                disabled={rewriteLoading[i]}
                                style={{ fontSize: "0.7rem", padding: "0.3rem 0.75rem", background: "transparent", border: "1px solid #0f5c52", color: "#0f5c52", borderRadius: "2px", cursor: rewriteLoading[i] ? "default" : "pointer", opacity: rewriteLoading[i] ? 0.6 : 1 }}
                              >
                                {rewriteLoading[i] ? "Generating…" : "Generate AI rewrites"}
                              </button>
                            )}
                            {!rewriteVariants[i] && llmStatus?.available && llmStatus.healthy === false && (
                              <div style={{ fontSize: "0.65rem", color: "#9a4d22", marginTop: "0.2rem" }}>
                                LLM endpoint unreachable — check {llmStatus.model || "LLM_ENDPOINT"} is running
                              </div>
                            )}
                            {rewriteVariants[i] && rewriteVariants[i].length > 0 && (
                              <div style={{ marginTop: "0.4rem" }}>
                                <div style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6f6b64", fontWeight: 600, marginBottom: "0.4rem" }}>
                                  AI-assisted rewrites
                                </div>
                                {rewriteVariants[i].map((v, vi) => (
                                  <div key={vi} style={{ padding: "0.45rem 0.65rem", background: "#fbfaf7", border: "1px solid #d9d3ca", borderRadius: "2px", marginBottom: "0.3rem", fontFamily: "monospace", fontSize: "0.74rem", color: "#1f1d1a", lineHeight: 1.6 }}>
                                    {v}
                                  </div>
                                ))}
                                <button
                                  onClick={(e) => { e.stopPropagation(); setRewriteVariants((prev) => { const n = {...prev}; delete n[i]; return n }) }}
                                  style={{ fontSize: "0.65rem", color: "#a0998e", background: "none", border: "none", cursor: "pointer", padding: "0.1rem 0" }}
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
            ))}
          </div>

          </>}

        </div>
      </div>
    </div>
  )
}
