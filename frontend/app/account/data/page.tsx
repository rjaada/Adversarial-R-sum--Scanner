"use client"

import { useState } from "react"
import { useAuth, useUser } from "@clerk/nextjs"
import Link from "next/link"

const fa   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const mono = "var(--font-mono, 'IBM Plex Mono', monospace)"
const API_BASE = ""

export default function DataPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth()
  const { user } = useUser()
  const [deleteScansConfirm,   setDeleteScansConfirm]   = useState("")
  const [deleteAccountConfirm, setDeleteAccountConfirm] = useState("")
  const [deletingScans,    setDeletingScans]    = useState(false)
  const [deletingAccount,  setDeletingAccount]  = useState(false)
  const [downloading,      setDownloading]      = useState(false)
  const [feedback,         setFeedback]         = useState<string | null>(null)

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
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement("a")
      a.href = url; a.download = "tracerank-export.json"; a.click()
      URL.revokeObjectURL(url)
    } catch {
      setFeedback("Export failed. Please try again.")
    } finally { setDownloading(false) }
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
    } finally { setDeletingScans(false) }
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
      {/* Page header */}
      <header style={{ marginBottom: "36px" }}>
        <p style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#858585", margin: "0 0 10px" }}>
          Data & Privacy
        </p>
        <h1 style={{ fontFamily: fa, fontSize: "1.75rem", fontWeight: 600, color: "#0D0C0A", margin: "0 0 8px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          Your data.
        </h1>
        <p style={{ fontFamily: fa, fontSize: "0.9rem", color: "#858585", margin: 0, lineHeight: 1.65 }}>
          Download, delete, or leave. Full details in{" "}
          <Link href="/privacy" target="_blank" style={{ color: "#7c8e5c", textDecoration: "none", borderBottom: "1px solid #7c8e5c", paddingBottom: "1px" }}>
            our privacy policy
          </Link>.
        </p>
      </header>

      {/* Feedback */}
      {feedback && (
        <div style={{ marginBottom: "16px", padding: "12px 16px", border: "1px solid #DCDCDC", borderRadius: "8px", fontFamily: fa, fontSize: "0.875rem", color: "#474546", background: "#FFFFFF" }}>
          {feedback}
        </div>
      )}

      {/* What we store */}
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
        <button onClick={handleDownload} disabled={downloading} style={primaryBtnStyle(downloading)}>
          {downloading ? "Downloading…" : "Download JSON export"}
        </button>
      </ActionCard>

      {/* Delete scans */}
      <ActionCard title="Delete all scans">
        <p style={bodyStyle}>Permanently delete your entire scan history. This cannot be undone.</p>
        <p style={{ ...bodyStyle, marginBottom: "10px" }}>
          Type <code style={codeStyle}>delete scans</code> to confirm:
        </p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input type="text" value={deleteScansConfirm} onChange={e => setDeleteScansConfirm(e.target.value)} placeholder="delete scans" style={inputStyle} />
          <button onClick={handleDeleteScans} disabled={deletingScans || deleteScansConfirm !== "delete scans"} style={primaryBtnStyle(deletingScans || deleteScansConfirm !== "delete scans")}>
            {deletingScans ? "Deleting…" : "Delete all scans"}
          </button>
        </div>
      </ActionCard>

      {/* Delete account */}
      <ActionCard title="Delete account" danger>
        <p style={bodyStyle}>Permanently delete your account and all associated data. All scans are purged within 24 hours. This cannot be undone.</p>
        <p style={{ ...bodyStyle, marginBottom: "10px" }}>
          Type <code style={codeStyle}>DELETE</code> to confirm:
        </p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <input type="text" value={deleteAccountConfirm} onChange={e => setDeleteAccountConfirm(e.target.value)} placeholder="DELETE" style={inputStyle} />
          <button
            onClick={handleDeleteAccount}
            disabled={deletingAccount || deleteAccountConfirm !== "DELETE"}
            style={{
              fontFamily: fa, fontSize: "0.875rem", fontWeight: 500,
              color:      (deletingAccount || deleteAccountConfirm !== "DELETE") ? "#B3B3B3" : "#8c2f4e",
              background: (deletingAccount || deleteAccountConfirm !== "DELETE") ? "#EBEBEB" : "rgba(140,47,78,0.1)",
              border:     "1px solid rgba(140,47,78,0.3)",
              borderRadius: "8px", padding: "10px 16px",
              cursor:    (deletingAccount || deleteAccountConfirm !== "DELETE") ? "not-allowed" : "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {deletingAccount ? "Deleting…" : "Delete account"}
          </button>
        </div>
      </ActionCard>
    </div>
  )
}

// ── Sub-components ─────────────────────────────────────────────────

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: "#FFFFFF", border: "1px solid #EBEBEB", borderRadius: "12px", padding: "20px 24px", marginBottom: "12px" }}>
      <h2 style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#858585", margin: "0 0 12px" }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

function ActionCard({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div style={{
      background:   danger ? "rgba(140,47,78,0.04)" : "#FFFFFF",
      border:       `1px solid ${danger ? "rgba(140,47,78,0.2)" : "#EBEBEB"}`,
      borderRadius: "12px", padding: "20px 24px", marginBottom: "12px",
    }}>
      <h2 style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: danger ? "#8c2f4e" : "#858585", margin: "0 0 12px" }}>
        {title}
      </h2>
      {children}
    </div>
  )
}

const listStyle: React.CSSProperties = {
  margin: 0, paddingLeft: "20px", display: "grid", gap: "6px",
  fontFamily: fa, fontSize: "0.875rem", color: "#474546", lineHeight: 1.65,
}

const bodyStyle: React.CSSProperties = {
  fontFamily: fa, fontSize: "0.875rem", color: "#858585",
  margin: "0 0 12px", lineHeight: 1.65,
}

const inputStyle: React.CSSProperties = {
  fontFamily: fa, fontSize: "0.875rem",
  color: "#0D0C0A", background: "#F4F4F4",
  border: "1px solid #DCDCDC", borderRadius: "8px",
  padding: "10px 14px", outline: "none",
}

const codeStyle: React.CSSProperties = {
  fontFamily: mono, fontSize: "0.8rem",
  color: "#0D0C0A", background: "#F4F4F4",
  padding: "2px 6px", borderRadius: "4px",
}

function primaryBtnStyle(disabled: boolean): React.CSSProperties {
  return {
    fontFamily: fa, fontSize: "0.875rem", fontWeight: 500,
    color:      disabled ? "#B3B3B3" : "#FFFFFF",
    background: disabled ? "#EBEBEB"  : "#0D0C0A",
    border:     "none", borderRadius: "8px",
    padding:    "10px 16px",
    cursor:     disabled ? "not-allowed" : "pointer",
    transition: "background 0.15s", whiteSpace: "nowrap",
  }
}
