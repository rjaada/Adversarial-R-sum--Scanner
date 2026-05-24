"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"

interface Issue {
  issue_type: string
  severity: "critical" | "high" | "medium" | "low"
  title: string
  description: string
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

interface ScanResult {
  scan_id: string
  source_id: string
  ats_text_preview: string
  scores: Scores
  issues: Issue[]
  missing_keywords: string[]
  matched_keywords: string[]
}

interface ScanSummary {
  scan_id: string
  source_id: string
  scanned_at: string
  overall_score: number
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
      source_excerpt: "",
      suggested_fix: "Add kubernetes in your Skills section.",
      impact_score: 3.2,
    },
    {
      issue_type: "low_quantification",
      severity: "high",
      title: "Most bullets lack measurable impact",
      description: "4 of 4 experience bullets have no numbers or percentages.",
      source_excerpt: "- Responsible for migration of monolith to microservices",
      suggested_fix: "Add metrics: e.g. Migrated monolith to 12 microservices, reducing p99 latency by 35%",
      impact_score: 3.2,
    },
    {
      issue_type: "weak_phrasing",
      severity: "medium",
      title: "Weak verb: responsible for",
      description: "Passive phrasing reduces impact score in LLM screeners.",
      source_excerpt: "...Responsible for migration of monolith...",
      suggested_fix: "Replace with: Led migration of monolith to 12 microservices",
      impact_score: 1.6,
    },
    {
      issue_type: "keyword_gap",
      severity: "high",
      title: "Missing keyword: aws",
      description: "The JD requires aws but your resume does not mention it.",
      source_excerpt: "",
      suggested_fix: "Add aws to your Skills section if applicable.",
      impact_score: 3.2,
    },
  ],
  missing_keywords: ["kubernetes", "aws", "terraform", "go"],
  matched_keywords: ["python", "docker", "postgresql"],
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
  const fileInputRef = useRef<HTMLInputElement>(null)

  const display = result ?? MOCK
  const isMock = result === null

  useEffect(() => {
    fetch("http://localhost:8001/api/scans")
      .then((r) => r.json())
      .then((data: unknown) => { if (Array.isArray(data)) setHistory(data) })
      .catch(() => {})
  }, [])

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
      }
    } catch (_) {}
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
        <span style={{ fontSize: "0.75rem", color: "#6f6b64" }}>
          {isMock ? "Showing sample scan" : "Scanned: " + display.source_id}
        </span>
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
                return (
                  <div
                    key={h.scan_id}
                    onClick={() => loadScan(h.scan_id)}
                    style={{ padding: "0.5rem 0", borderBottom: "1px solid #d9d3ca", cursor: "pointer" }}
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
                onClick={() => setSelectedIssue(selectedIssue === i ? null : i)}
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
                      <div style={{ marginTop: "0.75rem", padding: "0.6rem 0.75rem", background: "#fbfaf7", border: "1px solid #d9d3ca", borderRadius: "2px", fontSize: "0.76rem", color: "#1f1d1a" }}>
                        <div style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#0f5c52", fontWeight: 600, marginBottom: "0.3rem" }}>Suggested fix</div>
                        <div>{issue.suggested_fix}</div>
                        {issue.source_excerpt && (
                          <pre style={{ marginTop: "0.5rem", fontSize: "0.7rem", fontFamily: "monospace", color: "#6f6b64", whiteSpace: "pre-wrap", margin: "0.5rem 0 0" }}>
                            {issue.source_excerpt}
                          </pre>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  )
}
