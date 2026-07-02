"use client"

import { useState, useEffect, useRef } from "react"
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

const DELAY_MS = 45_000

interface Props {
  scanId: string
  viewMode: "report" | "review"
  isMobile: boolean
}

type Step = "survey" | "thanks" | "hidden"

function storageKey(id: string) { return `tracerank_fb_${id}` }

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

export function FeedbackCard({ scanId, viewMode, isMobile }: Props) {
  const { getToken } = useOptionalAuth()
  const [step, setStep]                 = useState<Step>("hidden")
  const [usefulness, setUsefulness]     = useState("")
  const [trust, setTrust]               = useState("")
  const [helpful, setHelpful]           = useState("")
  const [confusing, setConfusing]       = useState("")
  const [broken, setBroken]             = useState<boolean | null>(null)
  const [brokenText, setBrokenText]     = useState("")
  const [email, setEmail]               = useState("")
  const [submitting, setSubmitting]     = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof window === "undefined") return
    if (sessionStorage.getItem(storageKey(scanId))) return

    timerRef.current = setTimeout(() => setStep("survey"), DELAY_MS)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [scanId])

  function dismiss() {
    sessionStorage.setItem(storageKey(scanId), "dismissed")
    setStep("hidden")
  }

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
          surface:         "end_of_scan",
          scan_id:         scanId,
          usefulness:      usefulness || undefined,
          trustworthiness: trust || undefined,
          most_helpful:    helpful || undefined,
          confusing_text:  confusing.trim() || undefined,
          broken:          broken ?? undefined,
          broken_text:     broken && brokenText.trim() ? brokenText.trim() : undefined,
          contact_email:   email.trim() || undefined,
          view_mode:       viewMode,
          route:           window.location.pathname,
          user_agent:      navigator.userAgent,
        }),
      })
    } catch { /* swallow — feedback loss is acceptable */ }

    sessionStorage.setItem(storageKey(scanId), "submitted")
    setSubmitting(false)
    setStep("thanks")
    setTimeout(() => setStep("hidden"), 3000)
  }

  if (step === "hidden") return null

  if (step === "thanks") {
    return (
      <div style={{
        margin: isMobile ? "1rem" : "1.5rem 2rem",
        padding: "1.25rem 1.5rem",
        border: `1px solid ${BD}`,
        borderRadius: "6px",
        background: SURF,
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <span style={{ fontFamily: FA, fontSize: "0.88rem", color: T1 }}>
          Thanks for the feedback.
        </span>
      </div>
    )
  }

  const pad = isMobile ? "1rem" : "2rem"

  return (
    <div style={{
      margin: isMobile ? "1rem" : "1.5rem 2rem",
      border: `1px solid ${BD2}`,
      borderRadius: "6px",
      background: SURF,
      overflow: "hidden",
    }}>
      {/* Header */}
      <div style={{
        padding: `0.75rem ${pad}`,
        borderBottom: `1px solid ${BD}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: BG,
      }}>
        <span style={{
          fontFamily: MONO, fontSize: "0.54rem", letterSpacing: "0.14em",
          textTransform: "uppercase", color: T3,
        }}>
          Beta feedback
        </span>
        <button
          onClick={dismiss}
          aria-label="Dismiss feedback"
          style={{
            fontFamily: MONO, fontSize: "0.7rem", color: T3,
            background: "none", border: "none", cursor: "pointer",
            padding: "0.1rem 0.3rem", lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: `1.25rem ${pad}`, display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* Q1: usefulness */}
        <div>
          <div style={{ fontFamily: FA, fontSize: "0.88rem", color: T1, marginBottom: "0.6rem" }}>
            Was this scan useful?
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {[
              { value: "very_useful",     label: "Very useful"      },
              { value: "somewhat_useful", label: "Somewhat useful"   },
              { value: "not_useful",      label: "Not useful"        },
            ].map(o => (
              <Pill key={o.value} label={o.label} selected={usefulness === o.value}
                onClick={() => setUsefulness(v => v === o.value ? "" : o.value)} />
            ))}
          </div>
        </div>

        {/* Q2: trust */}
        <div>
          <div style={{ fontFamily: FA, fontSize: "0.88rem", color: T1, marginBottom: "0.6rem" }}>
            How trustworthy did the results feel?
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {[
              { value: "very_trustworthy",     label: "Very trustworthy"     },
              { value: "somewhat_trustworthy", label: "Somewhat trustworthy" },
              { value: "not_trustworthy",      label: "Not trustworthy"      },
            ].map(o => (
              <Pill key={o.value} label={o.label} selected={trust === o.value}
                onClick={() => setTrust(v => v === o.value ? "" : o.value)} />
            ))}
          </div>
        </div>

        {/* Q3: most helpful */}
        <div>
          <div style={{ fontFamily: FA, fontSize: "0.88rem", color: T1, marginBottom: "0.6rem" }}>
            What was most helpful?
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
            {[
              { value: "keyword_gaps",     label: "Keyword gaps"        },
              { value: "missing_sections", label: "Missing sections"     },
              { value: "rewrites",         label: "Rewrite suggestions"  },
              { value: "review_view",      label: "Review view / ATS"   },
              { value: "score",            label: "Score / overview"     },
              { value: "other",            label: "Something else"       },
            ].map(o => (
              <Pill key={o.value} label={o.label} selected={helpful === o.value}
                onClick={() => setHelpful(v => v === o.value ? "" : o.value)} />
            ))}
          </div>
        </div>

        {/* Q4: confusing */}
        <div>
          <div style={{ fontFamily: FA, fontSize: "0.88rem", color: T1, marginBottom: "0.5rem" }}>
            What felt confusing, wrong, or unconvincing?{" "}
            <span style={{ color: T3, fontSize: "0.78rem" }}>(optional)</span>
          </div>
          <textarea
            value={confusing}
            onChange={e => setConfusing(e.target.value)}
            placeholder="Anything that seemed off…"
            rows={2}
            style={{
              width: "100%", fontFamily: FA, fontSize: "0.82rem", color: T1,
              border: `1px solid ${BD}`, borderRadius: "4px",
              padding: "0.5rem 0.625rem", resize: "vertical",
              background: BG, outline: "none", lineHeight: 1.6,
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Q5: broken */}
        <div>
          <div style={{ fontFamily: FA, fontSize: "0.88rem", color: T1, marginBottom: "0.6rem" }}>
            Did anything break?
          </div>
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: broken ? "0.75rem" : 0 }}>
            <Pill label="No"  selected={broken === false} onClick={() => setBroken(v => v === false ? null : false)} />
            <Pill label="Yes" selected={broken === true}  onClick={() => setBroken(v => v === true  ? null : true )} />
          </div>
          {broken && (
            <textarea
              value={brokenText}
              onChange={e => setBrokenText(e.target.value)}
              placeholder="What happened?"
              rows={2}
              style={{
                width: "100%", fontFamily: FA, fontSize: "0.82rem", color: T1,
                border: `1px solid ${BD}`, borderRadius: "4px",
                padding: "0.5rem 0.625rem", resize: "vertical",
                background: BG, outline: "none", lineHeight: 1.6,
                boxSizing: "border-box",
              }}
            />
          )}
        </div>

        {/* Optional email */}
        <div>
          <div style={{ fontFamily: FA, fontSize: "0.88rem", color: T1, marginBottom: "0.5rem" }}>
            Can we contact you about this?{" "}
            <span style={{ color: T3, fontSize: "0.78rem" }}>(optional)</span>
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
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", paddingTop: "0.25rem" }}>
          <button
            onClick={dismiss}
            style={{
              fontFamily: FA, fontSize: "0.78rem", color: T3,
              background: "none", border: "none", cursor: "pointer", padding: "0.4rem 0",
            }}
          >
            Skip
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
            {submitting ? "Sending…" : "Send feedback"}
          </button>
        </div>

      </div>
    </div>
  )
}
