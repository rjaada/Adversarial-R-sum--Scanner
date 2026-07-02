"use client"

import { useState, useEffect, useCallback } from "react"
import { useOptionalAuth } from "@/lib/use-optional-clerk"

const FA   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)"
const BG   = "#FDFCF9"
const SURF = "#FFFFFF"
const BD   = "rgba(26,25,23,0.08)"
const BD2  = "rgba(26,25,23,0.14)"
const T1   = "#1a1917"
const T2   = "#6e6b66"
const T3   = "#a09890"

interface Props {
  open: boolean
  onClose: () => void
  scanId?: string
  viewMode: "report" | "review"
}

const TYPES = [
  { value: "bug",              label: "Bug"              },
  { value: "confusing_result", label: "Confusing result" },
  { value: "feature_request",  label: "Feature request"  },
  { value: "general",          label: "General"          },
]

function Pill({
  label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        fontFamily: FA, fontSize: "0.78rem",
        padding: "0.35rem 0.75rem",
        border: `1px solid ${selected ? T1 : BD}`,
        borderRadius: "100px",
        background: selected ? T1 : "transparent",
        color: selected ? SURF : T2,
        cursor: "pointer",
        transition: "background 0.12s, border-color 0.12s, color 0.12s",
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  )
}

export function ReportProblemModal({ open, onClose, scanId, viewMode }: Props) {
  const { getToken } = useOptionalAuth()
  const [reportType, setReportType] = useState("bug")
  const [text, setText]             = useState("")
  const [email, setEmail]           = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]             = useState(false)

  const handleClose = useCallback(() => {
    setReportType("bug")
    setText("")
    setEmail("")
    setSubmitting(false)
    setDone(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose()
    }
    if (open) document.addEventListener("keydown", onKey)
    return () => { document.removeEventListener("keydown", onKey) }
  }, [open, handleClose])

  async function submit() {
    setSubmitting(true)
    try {
      const token = await getToken()
      await fetch("/api/feedback", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          surface:      "report_problem",
          scan_id:      scanId,
          report_type:  reportType,
          report_text:  text.trim() || undefined,
          contact_email: email.trim() || undefined,
          view_mode:    viewMode,
          route:        typeof window !== "undefined" ? window.location.pathname : undefined,
          user_agent:   typeof navigator !== "undefined" ? navigator.userAgent : undefined,
        }),
      })
    } catch { /* swallow */ }
    setSubmitting(false)
    setDone(true)
  }

  if (!open) return null

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) handleClose() }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(26,25,23,0.35)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Report a problem"
        style={{
          background: SURF,
          border: `1px solid ${BD2}`,
          borderRadius: "8px",
          width: "100%", maxWidth: "440px",
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(26,25,23,0.12)",
        }}
      >
        {/* Header */}
        <div style={{
          padding: "0.875rem 1.25rem",
          borderBottom: `1px solid ${BD}`,
          background: BG,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <span style={{
            fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.14em",
            textTransform: "uppercase", color: T3,
          }}>
            Report a problem
          </span>
          <button
            onClick={handleClose}
            aria-label="Close"
            style={{
              fontFamily: MONO, fontSize: "0.8rem", color: T3,
              background: "none", border: "none", cursor: "pointer",
              padding: "0.1rem 0.3rem", lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {done ? (
          <div style={{ padding: "2rem 1.5rem", textAlign: "center" }}>
            <div style={{ fontFamily: FA, fontSize: "0.92rem", color: T1, marginBottom: "0.5rem" }}>
              Report received.
            </div>
            <div style={{ fontFamily: FA, fontSize: "0.82rem", color: T2 }}>
              Thanks for taking the time to flag this.
            </div>
            <button
              onClick={handleClose}
              style={{
                marginTop: "1.5rem",
                fontFamily: FA, fontSize: "0.82rem",
                padding: "0.45rem 1.25rem",
                background: T1, color: SURF,
                border: "none", borderRadius: "4px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        ) : (
          <div style={{ padding: "1.25rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>

            {/* Type selector */}
            <div>
              <div style={{ fontFamily: FA, fontSize: "0.82rem", color: T2, marginBottom: "0.6rem" }}>
                Type
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {TYPES.map(t => (
                  <Pill key={t.value} label={t.label} selected={reportType === t.value}
                    onClick={() => setReportType(t.value)} />
                ))}
              </div>
            </div>

            {/* Report text */}
            <div>
              <div style={{ fontFamily: FA, fontSize: "0.82rem", color: T2, marginBottom: "0.5rem" }}>
                What happened?
              </div>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Describe the issue…"
                rows={4}
                style={{
                  width: "100%", fontFamily: FA, fontSize: "0.82rem", color: T1,
                  border: `1px solid ${BD}`, borderRadius: "4px",
                  padding: "0.5rem 0.625rem", resize: "vertical",
                  background: BG, outline: "none", lineHeight: 1.6,
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Email */}
            <div>
              <div style={{ fontFamily: FA, fontSize: "0.82rem", color: T2, marginBottom: "0.5rem" }}>
                Email{" "}
                <span style={{ color: T3, fontSize: "0.75rem" }}>(optional)</span>
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="your@email.com"
                style={{
                  width: "100%", fontFamily: FA, fontSize: "0.82rem", color: T1,
                  border: `1px solid ${BD}`, borderRadius: "4px",
                  padding: "0.45rem 0.625rem", background: BG,
                  outline: "none", boxSizing: "border-box",
                }}
              />
            </div>

            {/* Actions */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
              <button
                onClick={handleClose}
                style={{
                  fontFamily: FA, fontSize: "0.78rem", color: T3,
                  background: "none", border: "none", cursor: "pointer", padding: "0.4rem 0",
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => void submit()}
                disabled={submitting}
                style={{
                  fontFamily: FA, fontSize: "0.82rem", fontWeight: 500,
                  padding: "0.45rem 1.25rem",
                  background: T1, color: SURF,
                  border: "none", borderRadius: "4px",
                  cursor: submitting ? "default" : "pointer",
                  opacity: submitting ? 0.6 : 1,
                  transition: "opacity 0.15s",
                }}
              >
                {submitting ? "Sending…" : "Send report"}
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  )
}
