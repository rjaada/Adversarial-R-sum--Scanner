import Link from "next/link"

export default function LandingPage() {
  return (
    <main style={{ background: "#f6f3ee", minHeight: "100vh", fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Nav */}
      <nav style={{
        borderBottom: "1px solid #d9d3ca",
        padding: "0 2rem",
        height: "52px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#fbfaf7",
      }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "1.1rem", fontWeight: 600, color: "#1f1d1a", letterSpacing: "-0.01em" }}>
          TraceRank
        </span>
        <Link href="/workspace" style={{
          color: "#0f5c52",
          fontSize: "0.875rem",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: "0.25rem",
        }}>
          Open Scanner →
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "6rem 2rem 4rem" }}>
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "1.25rem" }}>
          Adversarial Résumé Scanner
        </p>
        <h1 style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(2rem, 5vw, 3.25rem)",
          lineHeight: 1.1,
          fontWeight: 600,
          color: "#1f1d1a",
          letterSpacing: "-0.02em",
          marginBottom: "1.5rem",
          maxWidth: "600px",
        }}>
          See exactly where automated screening will reject your résumé.
        </h1>
        <p style={{ fontSize: "1.05rem", color: "#6f6b64", marginBottom: "2.5rem", maxWidth: "520px", lineHeight: 1.7 }}>
          ATS parsers misread columns, tables, and text boxes. LLM screeners penalize weak phrasing and keyword gaps.
          TraceRank makes that visible — before you apply.
        </p>
        <Link href="/workspace" style={{
          display: "inline-block",
          background: "#0f5c52",
          color: "#fff",
          padding: "0.75rem 1.75rem",
          fontSize: "0.9rem",
          fontWeight: 500,
          letterSpacing: "0.01em",
          borderRadius: "2px",
        }}>
          Scan your résumé
        </Link>
      </section>

      {/* Sample report preview */}
      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "0 2rem 6rem" }}>
        <p style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "1rem" }}>
          Sample scan output
        </p>
        <div style={{
          background: "#fbfaf7",
          border: "1px solid #d9d3ca",
          borderRadius: "3px",
          overflow: "hidden",
        }}>
          {/* Score bar */}
          <div style={{
            padding: "1.25rem 1.5rem",
            borderBottom: "1px solid #d9d3ca",
            display: "flex",
            gap: "2rem",
            flexWrap: "wrap",
          }}>
            {[
              { label: "Overall", value: "62", color: "#9a4d22" },
              { label: "Keyword Match", value: "48", color: "#8c2f4e" },
              { label: "Parse Integrity", value: "80", color: "#0f5c52" },
              { label: "Experience Align", value: "70", color: "#0f5c52" },
            ].map((s) => (
              <div key={s.label}>
                <div style={{ fontSize: "0.7rem", color: "#6f6b64", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.2rem" }}>{s.label}</div>
                <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: "1.4rem", fontWeight: 600, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          {/* Issues */}
          <div style={{ padding: "0.5rem 0" }}>
            {[
              { sev: "CRITICAL", sevColor: "#8c2f4e", title: "Missing Summary section", desc: "ATS systems weight the summary for role-fit classification. No summary found." },
              { sev: "HIGH", sevColor: "#9a4d22", title: 'Missing keyword: "kubernetes"', desc: "The JD requires kubernetes but your résumé does not mention it." },
              { sev: "MEDIUM", sevColor: "#6f6b64", title: 'Weak verb: "responsible for"', desc: 'Replace with an active verb like "Led", "Built", or "Delivered".' },
            ].map((issue, i) => (
              <div key={i} style={{
                padding: "0.875rem 1.5rem",
                borderBottom: i < 2 ? "1px solid #d9d3ca" : undefined,
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
              }}>
                <span style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: "0.65rem",
                  letterSpacing: "0.08em",
                  color: issue.sevColor,
                  textTransform: "uppercase",
                  minWidth: "60px",
                  paddingTop: "2px",
                  fontWeight: 600,
                }}>
                  {issue.sev}
                </span>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1f1d1a", marginBottom: "0.2rem" }}>{issue.title}</div>
                  <div style={{ fontSize: "0.8rem", color: "#6f6b64" }}>{issue.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #d9d3ca", padding: "1.5rem 2rem", textAlign: "center" }}>
        <span style={{ fontSize: "0.75rem", color: "#6f6b64" }}>TraceRank — Adversarial Résumé Scanner</span>
      </footer>
    </main>
  )
}
