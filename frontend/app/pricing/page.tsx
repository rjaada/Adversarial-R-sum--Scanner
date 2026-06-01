import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Pricing — TraceRank",
  description: "Free and Pro plans for TraceRank. No scam pricing. No fake AI features.",
}

const fa = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const BD = "rgba(26,25,23,0.08)"
const T1 = "#1a1917"
const T2 = "#6e6b66"
const T3 = "#a09890"

const FREE_FEATURES = ["3 scans per month", "Overall score /100", "Score breakdown (5 signals)", "Issue evidence & fix patterns", "Keyword gap analysis"]
const FREE_EXCLUDED = ["Scan history", "Compare mode", "PDF export", "AI rewrite suggestions"]
const PRO_FEATURES  = ["Everything in Free", "Unlimited scans", "Unlimited scan history", "Compare mode", "PDF export", "AI rewrite suggestions — per issue"]

const STYLES = `
  .pr-btn-free { display:flex;align-items:center;justify-content:center;width:100%;height:52px;font-family:${fa};font-size:15px;font-weight:500;color:${T1};background:transparent;border:1.5px solid ${T1};border-radius:100px;text-decoration:none;transition:background 0.2s,color 0.2s;cursor:pointer;margin-top:auto; }
  .pr-btn-free:hover { background:${T1};color:#FDFCF9; }
  .pr-btn-pro  { display:flex;align-items:center;justify-content:center;width:100%;height:52px;font-family:${fa};font-size:15px;font-weight:500;color:#FDFCF9;background:${T1};border:none;border-radius:100px;text-decoration:none;transition:background 0.2s;cursor:pointer;margin-top:auto; }
  .pr-btn-pro:hover { background:${T2}; }
`

export default function PricingPage() {
  return (
    <div style={{ background: "#FDFCF9", minHeight: "100vh", color: T1, fontFamily: fa }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <nav style={{ height: 64, background: "#FFFFFF", borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 80px", position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: fa, fontSize: "1rem", fontWeight: 600, color: T1, textDecoration: "none", letterSpacing: "-0.01em" }}>TraceRank</Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link href="/methodology" style={{ fontFamily: fa, fontSize: "0.875rem", color: T2, textDecoration: "none" }}>Methodology</Link>
          <Link href="/workspace" style={{ fontFamily: fa, fontSize: "0.875rem", fontWeight: 500, color: "#FDFCF9", background: T1, borderRadius: "100px", padding: "8px 18px", textDecoration: "none" }}>
            Scan résumé →
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "60px 24px 72px" }}>

        <p style={{ fontFamily: fa, fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: T3, margin: "0 0 16px" }}>
          Pricing
        </p>

        <div style={{ display: "flex", alignItems: "stretch", gap: "24px", marginTop: "32px", flexWrap: "wrap" }}>

          {/* Free */}
          <div style={{ flex: "1 1 340px", maxWidth: "420px", paddingTop: "20px" }}>
            <div style={{ background: "#FFFFFF", border: `1px solid ${BD}`, borderRadius: "8px", padding: 32, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
              <p style={{ fontFamily: fa, fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: T3, margin: "0 0 12px" }}>Free</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <span style={{ fontFamily: fa, fontSize: "56px", fontWeight: 600, color: T1, lineHeight: 1 }}>$0</span>
                <span style={{ fontFamily: fa, fontSize: "16px", color: T3 }}>forever</span>
              </div>
              <div style={{ height: 1, background: BD, marginBottom: 20 }} />
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {FREE_FEATURES.map(f => (
                  <li key={f} style={{ fontFamily: fa, fontSize: "15px", color: T1, display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ color: T1, fontSize: "12px", flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
                {FREE_EXCLUDED.map(f => (
                  <li key={f} style={{ fontFamily: fa, fontSize: "15px", color: T3, display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ flexShrink: 0, color: T3 }}>–</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/workspace" className="pr-btn-free">Start scanning</Link>
            </div>
          </div>

          {/* Pro */}
          <div style={{ flex: "1 1 340px", maxWidth: "420px", position: "relative", paddingTop: "20px" }}>
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", background: T1, color: "#FDFCF9", fontFamily: fa, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "100px", padding: "6px 16px", whiteSpace: "nowrap" }}>
              MOST POPULAR
            </div>
            <div style={{ background: "#FFFFFF", border: `2px solid ${T1}`, borderRadius: "8px", padding: 32, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
              <p style={{ fontFamily: fa, fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: T3, margin: "0 0 12px" }}>Pro</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <span style={{ fontFamily: fa, fontSize: "56px", fontWeight: 600, color: T1, lineHeight: 1 }}>$9</span>
                <span style={{ fontFamily: fa, fontSize: "16px", color: T3 }}>/ month</span>
              </div>
              <div style={{ height: 1, background: BD, marginBottom: 20 }} />
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {PRO_FEATURES.map(f => (
                  <li key={f} style={{ fontFamily: fa, fontSize: "15px", color: T1, display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ color: T1, fontSize: "12px", flexShrink: 0 }}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/account/billing" className="pr-btn-pro">Get Pro — coming soon →</Link>
            </div>
          </div>

        </div>

        <p style={{ fontFamily: fa, fontSize: "13px", fontStyle: "italic", color: T3, textAlign: "center", marginTop: 28, lineHeight: 1.65 }}>
          TraceRank does not predict hiring outcomes. Scores reflect structural and keyword analysis only.{" "}
          <Link href="/methodology" style={{ color: T3, textDecoration: "underline", textUnderlineOffset: "2px" }}>Read the methodology →</Link>
        </p>

      </main>

      <footer style={{ borderTop: `1px solid ${BD}`, padding: "24px 80px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FDFCF9" }}>
        <span style={{ fontFamily: fa, fontSize: "13px", color: T3 }}>© 2026 TraceRank</span>
        <div style={{ display: "flex", gap: "24px" }}>
          <Link href="/methodology" style={{ fontFamily: fa, fontSize: "13px", color: T2, textDecoration: "none" }}>Methodology</Link>
          <Link href="/privacy"     style={{ fontFamily: fa, fontSize: "13px", color: T2, textDecoration: "none" }}>Privacy</Link>
        </div>
      </footer>
    </div>
  )
}
