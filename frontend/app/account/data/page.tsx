"use client"

import { useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import Link from "next/link"

const API_BASE = ""

export default function DataPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const [deleteScansConfirm, setDeleteScansConfirm] = useState("")
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("")
  const [deletingScans, setDeletingScans] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!isLoaded || !isSignedIn) return null

  async function authHeaders() {
    const token = await getToken()
    return { Authorization: `Bearer ${token}` }
  }

  async function handleDownload() {
    setDownloading(true)
    try {
      const res = await fetch(`${API_BASE}/api/account/export`, { headers: await authHeaders() })
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url; a.download = "tracerank-export.json"; a.click()
      URL.revokeObjectURL(url)
    } catch {
      setFeedback("Export failed. Please try again.")
    } finally {
      setDownloading(false)
    }
  }


  async function handleDeleteScans() {
    if (deleteScansConfirm !== "delete scans") return
    setDeletingScans(true)
    try {
      const res = await fetch(`${API_BASE}/api/account/scans`, { method: "DELETE", headers: await authHeaders() })
      if (!res.ok) throw new Error()
      setFeedback("All scans deleted.")
      setDeleteScansConfirm("")
    } catch {
      setFeedback("Failed to delete scans.")
    } finally {
      setDeletingScans(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteAccountConfirm !== "DELETE") return
    setDeletingAccount(true)
    try {
      const res = await fetch(`${API_BASE}/api/account`, { method: "DELETE", headers: await authHeaders() })
      if (!res.ok) throw new Error()
      await user?.delete()
      window.location.href = "/"
    } catch {
      setFeedback("Account deletion failed. Please try again.")
      setDeletingAccount(false)
    }
  }

  return (
    <div>
      <header style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 0.6rem" }}>
          Data & Privacy
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text-primary)", margin: "0 0 0.6rem", lineHeight: 1.2 }}>
          Your data.
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.65, fontWeight: 300 }}>
          Download, delete, or leave. Full details in{" "}
          <Link href="/privacy" target="_blank" style={{ color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}>
            our privacy policy
          </Link>.
        </p>
      </header>

      {feedback && (
        <div style={{ marginBottom: "1.5rem", padding: "0.75rem 1rem", border: "1px solid var(--border-mid)", borderRadius: "2px", fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--text-secondary)", background: "var(--bg-surface)" }}>
          {feedback}
        </div>
      )}

      {/* What is stored */}
      <InfoCard title="What we store">
        <ul style={listStyle}>
          <li>Scores and sub-scores from each scan</li>
          <li>Issue list: type, severity, title, description, and suggested fix</li>
          <li>Keyword coverage: matched and missing keywords</li>
          <li>ATS text preview — the parsed plain-text of your résumé, with contact information removed by pattern matching</li>
          <li>Résumé filename (not the file itself)</li>
        </ul>
      </InfoCard>

      <InfoCard title="What we do not store">
        <ul style={listStyle}>
          <li>Your résumé file (PDF or DOCX)</li>
          <li>The job description text you paste</li>
          <li>Personally identifiable fields extracted from your résumé</li>
        </ul>
      </InfoCard>

      {/* Download */}
      <ActionCard title="Download your data">
        <p style={bodyStyle}>Export all your scan results as JSON. Includes scores, issues, and keyword data. Does not include résumé content (we don&apos;t have it).</p>
        <button onClick={handleDownload} disabled={downloading} style={btnStyle(downloading, false)}>
          {downloading ? "Downloading…" : "Download JSON export"}
        </button>
      </ActionCard>

      {/* Delete scans */}
      <ActionCard title="Delete all scans">
        <p style={bodyStyle}>Permanently delete your entire scan history. This cannot be undone.</p>
        <p style={{ ...bodyStyle, marginBottom: "0.75rem" }}>
          Type <code style={codeStyle}>delete scans</code> to confirm:
        </p>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="text"
            value={deleteScansConfirm}
            onChange={e => setDeleteScansConfirm(e.target.value)}
            placeholder="delete scans"
            style={inputStyle}
          />
          <button
            onClick={handleDeleteScans}
            disabled={deletingScans || deleteScansConfirm !== "delete scans"}
            style={btnStyle(deletingScans || deleteScansConfirm !== "delete scans", true)}
          >
            {deletingScans ? "Deleting…" : "Delete all scans"}
          </button>
        </div>
      </ActionCard>

      {/* Delete account */}
      <ActionCard title="Delete account" danger>
        <p style={bodyStyle}>Permanently delete your account and all associated data. All scans are purged within 24 hours. This cannot be undone.</p>
        <p style={{ ...bodyStyle, marginBottom: "0.75rem" }}>
          Type <code style={codeStyle}>DELETE</code> to confirm:
        </p>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <input
            type="text"
            value={deleteAccountConfirm}
            onChange={e => setDeleteAccountConfirm(e.target.value)}
            placeholder="DELETE"
            style={inputStyle}
          />
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount || deleteAccountConfirm !== "DELETE"}
            style={{
              ...btnStyle(deletingAccount || deleteAccountConfirm !== "DELETE", true),
              background: deletingAccount || deleteAccountConfirm !== "DELETE" ? "var(--border-mid)" : "rgba(140,47,78,0.15)",
              color: deletingAccount || deleteAccountConfirm !== "DELETE" ? "var(--text-dim)" : "var(--sev-critical)",
              border: "1px solid rgba(140,47,78,0.3)",
            }}
          >
            {deletingAccount ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </ActionCard>

    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "3px", padding: "1.25rem 1.5rem", marginBottom: "1rem", background: "var(--bg-elevated)" }}>
      <h2 style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 0.875rem" }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function ActionCard({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      border: `1px solid ${danger ? "rgba(140,47,78,0.25)" : "var(--border-subtle)"}`,
      borderRadius: "3px", padding: "1.25rem 1.5rem", marginBottom: "1rem",
      background: danger ? "rgba(140,47,78,0.04)" : "var(--bg-elevated)",
    }}>
      <h2 style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", color: danger ? "var(--sev-critical)" : "var(--text-dim)", margin: "0 0 0.875rem" }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

const listStyle: React.CSSProperties = {
  margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.35rem",
  fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.6,
}

const bodyStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--text-secondary)",
  margin: "0 0 0.875rem", lineHeight: 1.65,
}

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "0.82rem",
  color: "var(--text-primary)", background: "var(--bg-base)",
  border: "1px solid var(--border-mid)", borderRadius: "2px",
  padding: "0.4rem 0.7rem", outline: "none",
}

const codeStyle: React.CSSProperties = {
  fontFamily: "var(--font-data)", fontSize: "0.78rem",
  color: "var(--text-primary)", background: "var(--bg-muted)",
  padding: "0.1rem 0.35rem", borderRadius: "2px",
}

function btnStyle(disabled: boolean, _destructive?: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-body)", fontSize: "0.78rem", fontWeight: 500,
    color: disabled ? "var(--text-dim)" : "#0d0c0a",
    background: disabled ? "var(--border-mid)" : "var(--accent)",
    border: "none", borderRadius: "2px", padding: "0.4rem 1rem",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 0.2s ease", whiteSpace: "nowrap",
  }
}
