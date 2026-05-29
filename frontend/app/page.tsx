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
        position: "sticky",
        top: 0,
        zIndex: 10,
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
          textDecoration: "none",
        }}>
          Open Scanner →
        </Link>
      </nav>

      {/* Hero */}
      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "6rem 2rem 5rem" }}>
        <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "1.25rem" }}>
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
        <p style={{ fontSize: "1.05rem", color: "#6f6b64", marginBottom: "0.85rem", maxWidth: "540px", lineHeight: 1.75 }}>
          ATS parsers fail on columns, tables, and non-standard formatting. Keyword screeners penalize gaps you didn't know existed.
          The same résumé can score 20 points differently depending on which system reads it.
        </p>
        <p style={{ fontSize: "1.05rem", color: "#6f6b64", marginBottom: "2.5rem", maxWidth: "540px", lineHeight: 1.75 }}>
          TraceRank exposes those failures — before you apply.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
          <Link href="/workspace" style={{
            display: "inline-block",
            background: "#0f5c52",
            color: "#fff",
            padding: "0.75rem 1.75rem",
            fontSize: "0.9rem",
            fontWeight: 500,
            letterSpacing: "0.01em",
            borderRadius: "2px",
            textDecoration: "none",
          }}>
            Scan your résumé
          </Link>
          <a href="#sample" style={{ fontSize: "0.85rem", color: "#6f6b64", textDecoration: "none", borderBottom: "1px solid #d9d3ca" }}>
            See sample output ↓
          </a>
        </div>
      </section>

      {/* How it works */}
      <section style={{ background: "#fbfaf7", borderTop: "1px solid #d9d3ca", borderBottom: "1px solid #d9d3ca" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "4rem 2rem" }}>
          <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "2.5rem" }}>
            How it works
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {[
              {
                n: "01",
                title: "Upload your résumé",
                body: "PDF or DOCX. TraceRank extracts what an ATS parser would actually see — not what you intended to show.",
              },
              {
                n: "02",
                title: "Paste the job description",
                body: "Required keywords, experience signals, and role requirements are extracted automatically.",
              },
              {
                n: "03",
                title: "Receive the failure report",
                body: "Parse integrity score, keyword gaps, weak phrasing, structural issues, and ATS profile simulation — all in one scan.",
              },
            ].map((step, i) => (
              <div key={step.n} style={{
                display: "grid",
                gridTemplateColumns: "3rem 1fr",
                gap: "0 1.5rem",
                padding: "1.75rem 0",
                borderTop: i > 0 ? "1px solid #e8e3dc" : undefined,
                alignItems: "start",
              }}>
                <span style={{
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  color: "#a0998e",
                  fontWeight: 500,
                  paddingTop: "0.2rem",
                  letterSpacing: "0.05em",
                }}>
                  {step.n}
                </span>
                <div>
                  <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "#1f1d1a", marginBottom: "0.4rem" }}>{step.title}</div>
                  <div style={{ fontSize: "0.875rem", color: "#6f6b64", lineHeight: 1.65 }}>{step.body}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Why scores differ */}
      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "4.5rem 2rem" }}>
        <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "1rem" }}>
          Why scores differ
        </p>
        <h2 style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
          fontWeight: 600,
          color: "#1f1d1a",
          letterSpacing: "-0.015em",
          lineHeight: 1.2,
          marginBottom: "1rem",
          maxWidth: "520px",
        }}>
          The same résumé. Three different verdicts.
        </h2>
        <p style={{ fontSize: "0.9rem", color: "#6f6b64", lineHeight: 1.7, marginBottom: "2rem", maxWidth: "520px" }}>
          Different ATS systems weight keywords, structure, and semantic relevance differently.
          A résumé that passes one pipeline may be ranked low by another.
          TraceRank simulates multiple scoring profiles and shows you where the gaps are.
        </p>

        {/* Profile comparison strip */}
        <div style={{
          border: "1px solid #d9d3ca",
          borderRadius: "2px",
          overflow: "hidden",
          background: "#fbfaf7",
        }}>
          <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #d9d3ca", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.7rem", color: "#6f6b64", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              ATS profile simulation — same résumé
            </span>
            <span style={{ fontFamily: "monospace", fontSize: "0.68rem", color: "#9a4d22", fontWeight: 600 }}>
              Δ15 pts  MEDIUM VOLATILITY
            </span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr" }}>
            {[
              { label: "Exact Match", score: 52, color: "#9a4d22", note: "Strict keyword overlap; penalises missing must-haves" },
              { label: "Structure Sensitive", score: 61, color: "#9a4d22", note: "Skills buried in prose may not register" },
              { label: "Semantic Fit", score: 67, color: "#0f5c52", note: "Adjacent skill inference; broader matching" },
            ].map((p, i) => (
              <div key={p.label} style={{
                padding: "1.25rem",
                borderLeft: i > 0 ? "1px solid #d9d3ca" : undefined,
              }}>
                <div style={{ fontFamily: "monospace", fontSize: "1.5rem", fontWeight: 700, color: p.color, marginBottom: "0.25rem" }}>{p.score}</div>
                <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#1f1d1a", marginBottom: "0.3rem" }}>{p.label}</div>
                <div style={{ fontSize: "0.7rem", color: "#6f6b64", lineHeight: 1.5 }}>{p.note}</div>
              </div>
            ))}
          </div>
          <div style={{ padding: "0.6rem 1.25rem", borderTop: "1px solid #d9d3ca", background: "#f6f3ee" }}>
            <span style={{ fontSize: "0.65rem", color: "#a0998e", fontStyle: "italic" }}>
              Profile simulations inspired by common ATS behavior patterns. Adjacent skill inference is a heuristic, not a replica of any specific system.
            </span>
          </div>
        </div>
      </section>

      {/* Sample scan — expanded proof block */}
      <section id="sample" style={{ background: "#fbfaf7", borderTop: "1px solid #d9d3ca", borderBottom: "1px solid #d9d3ca" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "4.5rem 2rem" }}>
          <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "1rem" }}>
            Inside the scan
          </p>
          <h2 style={{
            fontFamily: "Georgia, serif",
            fontSize: "clamp(1.4rem, 3vw, 1.9rem)",
            fontWeight: 600,
            color: "#1f1d1a",
            letterSpacing: "-0.015em",
            lineHeight: 1.2,
            marginBottom: "2rem",
            maxWidth: "520px",
          }}>
            One résumé. Every failure surface exposed.
          </h2>

          <div style={{ border: "1px solid #d9d3ca", borderRadius: "3px", overflow: "hidden" }}>

            {/* Score cluster */}
            <div style={{
              padding: "1.25rem 1.5rem",
              borderBottom: "1px solid #d9d3ca",
              display: "flex",
              gap: "2rem",
              flexWrap: "wrap",
              background: "#f6f3ee",
            }}>
              {[
                { label: "Overall", value: "62", color: "#9a4d22" },
                { label: "Keyword Match", value: "48", color: "#8c2f4e" },
                { label: "Parse Integrity", value: "80", color: "#0f5c52" },
                { label: "Experience Align", value: "70", color: "#0f5c52" },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: "0.65rem", color: "#6f6b64", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.2rem" }}>{s.label}</div>
                  <div style={{ fontFamily: "monospace", fontSize: "1.4rem", fontWeight: 700, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            {/* Issues */}
            {[
              { sev: "CRITICAL", sevColor: "#8c2f4e", title: "Missing Summary section", desc: "ATS systems weight the summary for role-fit classification. No summary found in extracted text." },
              { sev: "HIGH", sevColor: "#9a4d22", title: 'Missing keyword: "kubernetes"', desc: "The JD requires kubernetes. Your résumé does not contain it or any adjacent signal." },
            ].map((issue, i) => (
              <div key={i} style={{
                padding: "0.875rem 1.5rem",
                borderBottom: "1px solid #d9d3ca",
                display: "flex",
                gap: "1rem",
                alignItems: "flex-start",
              }}>
                <span style={{
                  fontFamily: "monospace",
                  fontSize: "0.62rem",
                  letterSpacing: "0.08em",
                  color: issue.sevColor,
                  textTransform: "uppercase",
                  minWidth: "60px",
                  paddingTop: "2px",
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  {issue.sev}
                </span>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1f1d1a", marginBottom: "0.2rem" }}>{issue.title}</div>
                  <div style={{ fontSize: "0.78rem", color: "#6f6b64", lineHeight: 1.55 }}>{issue.desc}</div>
                </div>
              </div>
            ))}

            {/* Weak phrasing with rewrite */}
            <div style={{ padding: "0.875rem 1.5rem", borderBottom: "1px solid #d9d3ca" }}>
              <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start", marginBottom: "0.75rem" }}>
                <span style={{
                  fontFamily: "monospace",
                  fontSize: "0.62rem",
                  letterSpacing: "0.08em",
                  color: "#6f6b64",
                  textTransform: "uppercase",
                  minWidth: "60px",
                  paddingTop: "2px",
                  fontWeight: 600,
                  flexShrink: 0,
                }}>
                  MEDIUM
                </span>
                <div>
                  <div style={{ fontSize: "0.875rem", fontWeight: 500, color: "#1f1d1a", marginBottom: "0.2rem" }}>Weak verb: "responsible for"</div>
                  <div style={{ fontSize: "0.78rem", color: "#6f6b64", lineHeight: 1.55 }}>Passive phrasing reduces impact score in LLM screeners. Active verbs carry more weight.</div>
                </div>
              </div>

              {/* Rewrite suggestion block */}
              <div style={{ marginLeft: "calc(60px + 1rem)", padding: "0.75rem", background: "#f0f7f5", border: "1px solid #c5dbd7", borderRadius: "2px" }}>
                <div style={{ fontSize: "0.6rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "#0f5c52", fontWeight: 600, marginBottom: "0.4rem" }}>
                  AI-assisted rewrite
                </div>
                {[
                  "Delivered CI/CD pipeline migration across [N] services, reducing deployment cycle by [X%].",
                  "Owned backend reliability for platform serving [N] customers with [X%] uptime.",
                  "Led infrastructure modernisation effort, cutting mean time to recovery by [Y min].",
                ].map((v, i) => (
                  <div key={i} style={{ fontFamily: "monospace", fontSize: "0.74rem", color: "#1f1d1a", padding: "0.35rem 0.5rem", background: "#fbfaf7", border: "1px solid #d9d3ca", borderRadius: "1px", marginBottom: i < 2 ? "0.3rem" : 0, lineHeight: 1.6 }}>
                    {v}
                  </div>
                ))}
                <div style={{ fontSize: "0.62rem", color: "#a0998e", fontStyle: "italic", marginTop: "0.4rem" }}>
                  [X%], [N], [Y min] are placeholders — fill with your actual metrics.
                </div>
              </div>
            </div>

            {/* ATS profile simulation mini-row */}
            <div style={{ padding: "0.875rem 1.5rem" }}>
              <div style={{ fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "0.65rem" }}>
                ATS profile simulation
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                {[
                  { label: "Exact Match", score: 52, color: "#9a4d22" },
                  { label: "Structure Sensitive", score: 61, color: "#9a4d22" },
                  { label: "Semantic Fit", score: 67, color: "#0f5c52" },
                ].map((p) => (
                  <span key={p.label} style={{ fontFamily: "monospace", fontSize: "0.72rem", color: p.color, padding: "0.2rem 0.5rem", border: `1px solid ${p.color}`, borderRadius: "1px", opacity: 0.85 }}>
                    {p.label} {p.score}
                  </span>
                ))}
                <span style={{ fontSize: "0.68rem", color: "#9a4d22", fontFamily: "monospace", marginLeft: "0.25rem" }}>
                  Δ15 pts — résumé is ATS-fragile
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What TraceRank checks */}
      <section style={{ maxWidth: "720px", margin: "0 auto", padding: "4.5rem 2rem" }}>
        <p style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f6b64", marginBottom: "2rem" }}>
          What TraceRank checks
        </p>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {[
            {
              label: "Parse integrity",
              detail: "What an ATS parser actually extracts from your file — not what you see in a PDF viewer. Catches columns, text boxes, and encoding failures.",
            },
            {
              label: "Keyword coverage",
              detail: "Exact-match and adjacent-skill analysis against the job description. Shows which required terms are present, missing, or buried in prose.",
            },
            {
              label: "Section structure",
              detail: "Whether expected sections — summary, experience, skills, education — are found, clearly delimited, and machine-readable.",
            },
            {
              label: "Quantified impact",
              detail: "Evidence density across experience bullets. Weak verbs, passive phrasing, and bullets without measurable outcomes are flagged individually.",
            },
            {
              label: "ATS profile volatility",
              detail: "How much your score shifts across different parser/scoring profiles. High volatility means your résumé is fragile — one system pass, another reject.",
            },
          ].map((item, i) => (
            <div key={item.label} style={{
              display: "grid",
              gridTemplateColumns: "200px 1fr",
              gap: "0 2rem",
              padding: "1.25rem 0",
              borderTop: i === 0 ? "1px solid #d9d3ca" : "1px solid #e8e3dc",
              borderBottom: i === 4 ? "1px solid #d9d3ca" : undefined,
            }}>
              <div style={{
                fontSize: "0.82rem",
                fontWeight: 600,
                color: "#1f1d1a",
                paddingLeft: "0.75rem",
                borderLeft: "2px solid #0f5c52",
                display: "flex",
                alignItems: "center",
              }}>
                {item.label}
              </div>
              <div style={{ fontSize: "0.82rem", color: "#6f6b64", lineHeight: 1.65 }}>
                {item.detail}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section style={{ background: "#fbfaf7", borderTop: "1px solid #d9d3ca", borderBottom: "1px solid #d9d3ca" }}>
        <div style={{ maxWidth: "720px", margin: "0 auto", padding: "5rem 2rem", textAlign: "center" }}>
          <p style={{ fontFamily: "Georgia, serif", fontSize: "clamp(1.3rem, 3vw, 1.75rem)", fontWeight: 600, color: "#1f1d1a", letterSpacing: "-0.015em", lineHeight: 1.3, marginBottom: "1rem" }}>
            Screening happens in seconds.<br />The fixes take minutes.
          </p>
          <p style={{ fontSize: "0.9rem", color: "#6f6b64", lineHeight: 1.7, marginBottom: "2rem", maxWidth: "400px", margin: "0 auto 2rem" }}>
            Upload once. See parse failures, keyword gaps, and profile simulation in a single report.
          </p>
          <Link href="/workspace" style={{
            display: "inline-block",
            background: "#0f5c52",
            color: "#fff",
            padding: "0.8rem 2rem",
            fontSize: "0.9rem",
            fontWeight: 500,
            letterSpacing: "0.01em",
            borderRadius: "2px",
            textDecoration: "none",
          }}>
            Scan your résumé →
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #d9d3ca", padding: "1.5rem 2rem", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
        <span style={{ fontFamily: "Georgia, serif", fontSize: "0.85rem", color: "#1f1d1a", fontWeight: 600 }}>TraceRank</span>
        <Link href="/methodology" style={{ fontSize: "0.75rem", color: "#0f5c52", textDecoration: "none" }}>How scoring works</Link>
        <span style={{ fontSize: "0.72rem", color: "#a0998e" }}>Adversarial Résumé Scanner — profile simulations are heuristic, not exact ATS replicas</span>
      </footer>

    </main>
  )
}
