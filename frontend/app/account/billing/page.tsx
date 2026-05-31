"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"

const API_BASE = ""

const PRO_FEATURES = [
  "Unlimited scan history",
  "Compare mode — track changes between scans",
  "PDF export — shareable scan report",
  "AI rewrite suggestions — per-issue, on demand",
]

export default function BillingPage() {
  const { isLoaded } = useUser()
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !email.includes("@")) return
    setSubmitting(true)
    try {
      await fetch(`${API_BASE}/api/waitlist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      })
      setSubmitted(true)
    } catch {
      // Non-fatal
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isLoaded) return null

  return (
    <div>
      <header style={{ marginBottom: "2.5rem" }}>
        <p style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 0.6rem" }}>
          Billing
        </p>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text-primary)", margin: "0 0 0.6rem", lineHeight: 1.2 }}>
          Pro plan
        </h1>
        <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.65, fontWeight: 300 }}>
          Pro is in active development.
        </p>
      </header>

      {/* Current plan */}
      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "3px", padding: "1.25rem 1.5rem", marginBottom: "1.5rem", background: "var(--bg-elevated)" }}>
        <div style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.5rem" }}>
          Current plan
        </div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: "0.9rem", color: "var(--text-primary)", fontWeight: 500 }}>
          Free
        </div>
      </div>

      {/* Pro features */}
      <div style={{ border: "1px solid #7c8e5c", borderRadius: "3px", padding: "1.5rem", marginBottom: "1.5rem", background: "var(--bg-elevated)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "1.25rem" }}>
          <div>
            <div style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.35rem" }}>
              Pro
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
              <span style={{ fontFamily: "var(--font-data)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text-primary)", lineHeight: 1 }}>$9</span>
              <span style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--text-dim)" }}>/ month</span>
            </div>
          </div>
          <span style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--sev-medium)", padding: "0.2rem 0.55rem", border: "1px solid currentColor", borderRadius: "2px" }}>
            coming soon
          </span>
        </div>
        <ul style={{ listStyle: "none", margin: "0 0 0", padding: 0, display: "grid", gap: "0.5rem" }}>
          {PRO_FEATURES.map(f => (
            <li key={f} style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--text-secondary)", display: "flex", alignItems: "baseline", gap: "0.5rem" }}>
              <span style={{ color: "var(--accent)", fontSize: "0.68rem", flexShrink: 0 }}>✓</span>
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Waitlist */}
      {!submitted ? (
        <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "3px", padding: "1.5rem", background: "var(--bg-surface)" }}>
          <h2 style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 0.75rem" }}>
            Notify me at launch
          </h2>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--text-secondary)", margin: "0 0 1rem", lineHeight: 1.6 }}>
            We&apos;ll send one email when Pro launches. No marketing. No lists.
          </p>
          <form onSubmit={handleWaitlist} style={{ display: "flex", gap: "0.75rem" }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                fontFamily: "var(--font-body)", fontSize: "0.82rem",
                color: "var(--text-primary)", background: "var(--bg-elevated)",
                border: "1px solid var(--border-mid)", borderRadius: "2px",
                padding: "0.45rem 0.75rem", outline: "none", flex: 1,
              }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{
                fontFamily: "var(--font-body)", fontSize: "0.78rem", fontWeight: 500,
                color: submitting ? "var(--text-dim)" : "#0d0c0a",
                background: submitting ? "var(--border-mid)" : "var(--accent)",
                border: "none", borderRadius: "2px", padding: "0.45rem 1rem",
                cursor: submitting ? "default" : "pointer", whiteSpace: "nowrap",
              }}
            >
              {submitting ? "Saving…" : "Notify me"}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ border: "1px solid rgba(124,142,92,0.3)", borderRadius: "3px", padding: "1rem 1.25rem", background: "rgba(124,142,92,0.06)", fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--accent)" }}>
          You&apos;re on the list. We&apos;ll email you when Pro launches.
        </div>
      )}
    </div>
  )
}
