"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"

const fa   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const mono = "var(--font-mono, 'IBM Plex Mono', monospace)"
const API_BASE = ""

// Honest Pro list: the scanner, compare, export, and AI rewrites are already
// free for signed-in users, so Pro is differentiated only by what the backend
// can actually enforce today (longer history retention) plus planned early
// access. Do not list Free features as Pro-only.
const PRO_FEATURES = [
  "Everything in Free",
  "12-month scan history retention (Free keeps 90 days)",
  "Early access to new checks and ATS profiles",
]

export default function BillingPage() {
  const { isLoaded } = useUser()
  const [email, setEmail]         = useState("")
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
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isLoaded) return null

  return (
    <div>
      {/* Page header */}
      <header style={{ marginBottom: "36px" }}>
        <p style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#a09890", margin: "0 0 10px" }}>
          Billing
        </p>
        <h1 style={{ fontFamily: fa, fontSize: "1.75rem", fontWeight: 600, color: "#1a1917", margin: "0 0 8px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
          Pro plan
        </h1>
        <p style={{ fontFamily: fa, fontSize: "0.9rem", color: "#a09890", margin: 0, lineHeight: 1.65 }}>
          Pro is in active development.
        </p>
      </header>

      {/* Current plan */}
      <div style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,23,0.08)", borderRadius: "6px", padding: "20px 24px", marginBottom: "16px" }}>
        <p style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#a09890", margin: "0 0 6px" }}>
          Current plan
        </p>
        <p style={{ fontFamily: fa, fontSize: "1rem", fontWeight: 500, color: "#1a1917", margin: 0 }}>
          Free
        </p>
      </div>

      {/* Pro card */}
      <div style={{ background: "#FFFFFF", border: "2px solid #0D0C0A", borderRadius: "6px", padding: "24px", marginBottom: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
          <div>
            <p style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#a09890", margin: "0 0 8px" }}>Pro</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: "6px" }}>
              <span style={{ fontFamily: fa, fontSize: "2.25rem", fontWeight: 600, color: "#1a1917", lineHeight: 1 }}>$9</span>
              <span style={{ fontFamily: fa, fontSize: "0.9rem", color: "#a09890" }}>/ month</span>
            </div>
          </div>
          <span style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#9a4d22", padding: "4px 10px", border: "1px solid #9a4d22", borderRadius: "100px" }}>
            Coming soon
          </span>
        </div>

        <div style={{ height: 1, background: "#EBEBEB", marginBottom: "20px" }} />

        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "10px" }}>
          {PRO_FEATURES.map(feat => (
            <li key={feat} style={{ fontFamily: fa, fontSize: "0.9rem", color: "#1a1917", display: "flex", alignItems: "baseline", gap: "10px" }}>
              <span style={{ color: "#7c8e5c", fontSize: "0.75rem", flexShrink: 0 }}>✓</span>
              {feat}
            </li>
          ))}
        </ul>
      </div>

      {/* Waitlist */}
      {!submitted ? (
        <div style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,23,0.08)", borderRadius: "6px", padding: "24px" }}>
          <h2 style={{ fontFamily: fa, fontSize: "1rem", fontWeight: 600, color: "#1a1917", margin: "0 0 6px" }}>
            Notify me at launch
          </h2>
          <p style={{ fontFamily: fa, fontSize: "0.875rem", color: "#a09890", margin: "0 0 16px", lineHeight: 1.65 }}>
            We&apos;ll send one email when Pro launches. No marketing. No lists.
          </p>
          <form onSubmit={handleWaitlist} style={{ display: "flex", gap: "10px" }}>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              style={{
                fontFamily: fa, fontSize: "0.875rem",
                color: "#1a1917", background: "#F8F7F5",
                border: "1px solid #DCDCDC", borderRadius: "8px",
                padding: "10px 14px", outline: "none", flex: 1,
              }}
            />
            <button
              type="submit"
              disabled={submitting}
              style={{
                fontFamily: fa, fontSize: "0.875rem", fontWeight: 500,
                color:      submitting ? "#B3B3B3" : "#FFFFFF",
                background: submitting ? "#EBEBEB"  : "#1a1917",
                border: "none", borderRadius: "8px",
                padding: "10px 20px",
                cursor: submitting ? "default" : "pointer",
                whiteSpace: "nowrap",
                transition: "background 0.15s",
              }}
            >
              {submitting ? "Saving…" : "Notify me"}
            </button>
          </form>
        </div>
      ) : (
        <div style={{ background: "rgba(124,142,92,0.08)", border: "1px solid rgba(124,142,92,0.25)", borderRadius: "6px", padding: "16px 20px", fontFamily: fa, fontSize: "0.9rem", color: "#7c8e5c" }}>
          You&apos;re on the list. We&apos;ll email you when Pro launches.
        </div>
      )}
    </div>
  )
}
