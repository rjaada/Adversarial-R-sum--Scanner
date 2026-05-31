import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Pricing — TraceRank",
  description: "Free and Pro plans for TraceRank. No scam pricing. No fake AI features.",
}

const FREE_FEATURES = [
  "Unlimited scans",
  "Full score breakdown — 5 weighted sub-scores",
  "Issue evidence and fix patterns",
  "Keyword gap analysis",
  "ATS text preview",
  "ATS profile simulation",
]

const FREE_EXCLUDED = [
  "Scan history",
  "Compare mode",
  "PDF export",
  "AI rewrite suggestions",
]

const PRO_FEATURES = [
  "Everything in Free",
  "Scan history — unlimited",
  "Compare mode — track your progress",
  "PDF export — shareable report",
  "AI rewrite suggestions — per issue",
]

export default function PricingPage() {
  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>

      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: 58,
        background: "rgba(13,12,10,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 400, color: "var(--text-primary)", textDecoration: "none" }}>
          TraceRank
        </Link>
        <Link href="/workspace" style={{ fontFamily: "var(--font-body)", fontSize: "0.78rem", color: "var(--accent)", textDecoration: "none" }}>
          Scan résumé →
        </Link>
      </nav>

      <main style={{ maxWidth: 860, margin: "0 auto", padding: "7rem 2rem 8rem" }}>

        <header style={{ textAlign: "center", marginBottom: "4rem" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 1rem" }}>
            Simple pricing
          </p>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "clamp(2rem, 4vw, 3rem)", fontWeight: 400, color: "var(--text-primary)", lineHeight: 1.1, margin: "0 0 1.25rem", letterSpacing: "-0.015em" }}>
            No scam pricing.<br />No fake AI features.
          </h1>
          <p style={{ fontFamily: "var(--font-body)", fontSize: "0.95rem", color: "var(--text-secondary)", fontWeight: 300, lineHeight: 1.75, maxWidth: 500, margin: "0 auto" }}>
            The core scanner is free. Pro adds history, comparison, and export —
            the features that make iteration useful.
          </p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", alignItems: "start" }}>

          {/* Free */}
          <div style={{
            border: "1px solid var(--border-subtle)",
            borderRadius: "3px",
            padding: "2rem",
            background: "var(--bg-elevated)",
          }}>
            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontFamily: "var(--font-data)", fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "0.5rem" }}>
                Free
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                <span style={{ fontFamily: "var(--font-data)", fontSize: "2.5rem", fontWeight: 400, color: "var(--text-primary)", lineHeight: 1 }}>$0</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--text-dim)" }}>forever</span>
              </div>
            </div>

            <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0 0 1.5rem" }} />

            <ul style={{ listStyle: "none", margin: "0 0 1.75rem", padding: 0, display: "grid", gap: "0.6rem" }}>
              {FREE_FEATURES.map(f => (
                <li key={f} style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "baseline", gap: "0.55rem" }}>
                  <span style={{ color: "var(--accent)", fontSize: "0.7rem", flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
              {FREE_EXCLUDED.map(f => (
                <li key={f} style={{ fontFamily: "var(--font-body)", fontSize: "0.82rem", color: "var(--text-dim)", display: "flex", alignItems: "baseline", gap: "0.55rem" }}>
                  <span style={{ fontSize: "0.7rem", flexShrink: 0, opacity: 0.4 }}>–</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/workspace"
              style={{
                display: "block", textAlign: "center",
                fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 500,
                color: "var(--text-primary)",
                border: "1px solid var(--border-mid)",
                borderRadius: "2px", padding: "0.75rem",
                textDecoration: "none",
                transition: "border-color 0.2s ease",
              }}
            >
              Start scanning
            </Link>
          </div>

          {/* Pro */}
          <div style={{
            border: "1px solid #7c8e5c",
            borderRadius: "3px",
            padding: "2rem",
            background: "var(--bg-elevated)",
            position: "relative",
          }}>
            <div style={{
              position: "absolute", top: "-1px", right: "1.5rem",
              fontFamily: "var(--font-data)", fontSize: "0.52rem", letterSpacing: "0.1em",
              textTransform: "uppercase", color: "#0d0c0a",
              background: "#7c8e5c", padding: "0.2rem 0.55rem", borderRadius: "0 0 2px 2px",
            }}>
              Most popular
            </div>

            <div style={{ marginBottom: "1.75rem" }}>
              <div style={{ fontFamily: "var(--font-data)", fontSize: "0.58rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--accent)", marginBottom: "0.5rem" }}>
                Pro
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: "0.35rem" }}>
                <span style={{ fontFamily: "var(--font-data)", fontSize: "2.5rem", fontWeight: 400, color: "var(--text-primary)", lineHeight: 1 }}>$9</span>
                <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--text-dim)" }}>/ month</span>
              </div>
            </div>

            <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0 0 1.5rem" }} />

            <ul style={{ listStyle: "none", margin: "0 0 1.75rem", padding: 0, display: "grid", gap: "0.6rem" }}>
              {PRO_FEATURES.map(f => (
                <li key={f} style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--text-secondary)", display: "flex", alignItems: "baseline", gap: "0.55rem" }}>
                  <span style={{ color: "var(--accent)", fontSize: "0.7rem", flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            <Link
              href="/account/billing"
              style={{
                display: "block", textAlign: "center",
                fontFamily: "var(--font-body)", fontSize: "0.85rem", fontWeight: 500,
                color: "#0d0c0a",
                background: "#7c8e5c",
                borderRadius: "2px", padding: "0.75rem",
                textDecoration: "none",
                transition: "background 0.2s ease",
              }}
            >
              Get Pro — coming soon
            </Link>
          </div>

        </div>

        <p style={{ marginTop: "2.5rem", textAlign: "center", fontFamily: "var(--font-body)", fontSize: "0.72rem", color: "var(--text-dim)", fontStyle: "italic", lineHeight: 1.65 }}>
          Scores reflect structural and keyword analysis only. TraceRank does not predict hiring outcomes
          and does not simulate any real ATS vendor.{" "}
          <Link href="/methodology" style={{ color: "var(--text-dim)", borderBottom: "1px solid var(--border-mid)", paddingBottom: "1px" }}>
            Read the methodology →
          </Link>
        </p>

      </main>

      <footer style={{ borderTop: "1px solid var(--border-subtle)", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--text-dim)" }}>© 2026 TraceRank</span>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <Link href="/privacy" style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--text-dim)", textDecoration: "none" }}>Privacy</Link>
          <Link href="/methodology" style={{ fontFamily: "var(--font-body)", fontSize: "0.7rem", color: "var(--text-dim)", textDecoration: "none" }}>Methodology</Link>
        </div>
      </footer>

    </div>
  )
}
