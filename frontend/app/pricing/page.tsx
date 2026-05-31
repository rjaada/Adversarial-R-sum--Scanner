import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Pricing — TraceRank",
  description: "Free and Pro plans for TraceRank. No scam pricing. No fake AI features.",
}

const f = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"

const FREE_FEATURES    = ["Unlimited scans", "Full score breakdown", "Issue evidence & fix patterns", "Keyword gap analysis", "ATS text preview", "ATS profile simulation"]
const FREE_EXCLUDED    = ["Scan history", "Compare mode", "PDF export", "AI rewrite suggestions"]
const PRO_FEATURES     = ["Everything in Free", "Unlimited scan history", "Compare mode", "PDF export", "AI rewrite suggestions — per issue"]

const STYLES = `
  .pr-btn-free {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 52px;
    font-family: ${f};
    font-size: 15px; font-weight: 500;
    color: #0D0C0A;
    background: transparent;
    border: 1.5px solid #0D0C0A;
    border-radius: 100px;
    text-decoration: none;
    transition: background 0.2s ease, color 0.2s ease;
    cursor: pointer;
  }
  .pr-btn-free:hover { background: #0D0C0A; color: #FFFFFF; }
  .pr-btn-pro {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 52px;
    font-family: ${f};
    font-size: 15px; font-weight: 500;
    color: #FFFFFF;
    background: #0D0C0A;
    border-radius: 100px;
    text-decoration: none;
    transition: background 0.2s ease;
    cursor: pointer;
  }
  .pr-btn-pro:hover { background: #474546; }
`

export default function PricingPage() {
  return (
    <div style={{ background: "#F4F4F4", minHeight: "100vh", color: "#0D0C0A", fontFamily: f }}>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      {/* Nav */}
      <nav style={{ height: 64, background: "#FFFFFF", borderBottom: "1px solid #EBEBEB", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 80px", position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: f, fontSize: "1rem", fontWeight: 600, color: "#0D0C0A", textDecoration: "none", letterSpacing: "-0.01em" }}>
          TraceRank
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link href="/methodology" style={{ fontFamily: f, fontSize: "0.875rem", color: "#474546", textDecoration: "none" }}>Methodology</Link>
          <Link href="/workspace" style={{ fontFamily: f, fontSize: "0.875rem", fontWeight: 500, color: "#FFFFFF", background: "#0D0C0A", borderRadius: "100px", padding: "8px 18px", textDecoration: "none" }}>
            Scan résumé →
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 960, margin: "0 auto", padding: "80px 24px 100px" }}>

        {/* Section label */}
        <p style={{ fontFamily: f, fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#858585", margin: "0 0 48px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#7c8e5c" }}>«</span> Pricing
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "start" }}>

          {/* Free card */}
          <div style={{ background: "#FFFFFF", border: "1px solid #EBEBEB", borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", gap: 0 }}>
            <p style={{ fontFamily: f, fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#858585", margin: "0 0 12px" }}>Free</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
              <span style={{ fontFamily: f, fontSize: "56px", fontWeight: 600, color: "#0D0C0A", lineHeight: 1 }}>$0</span>
              <span style={{ fontFamily: f, fontSize: "16px", color: "#858585" }}>forever</span>
            </div>
            <div style={{ height: 1, background: "#EBEBEB", marginBottom: 20 }} />
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
              {FREE_FEATURES.map(f_ => (
                <li key={f_} style={{ fontFamily: f, fontSize: "15px", color: "#0D0C0A", display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ color: "#7c8e5c", fontSize: "12px", flexShrink: 0 }}>✓</span>{f_}
                </li>
              ))}
              {FREE_EXCLUDED.map(f_ => (
                <li key={f_} style={{ fontFamily: f, fontSize: "14px", color: "#B3B3B3", display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ flexShrink: 0 }}>–</span>{f_}
                </li>
              ))}
            </ul>
            <Link href="/workspace" className="pr-btn-free">Start scanning</Link>
          </div>

          {/* Pro card */}
          <div style={{ background: "#FFFFFF", border: "2px solid #0D0C0A", borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", gap: 0, position: "relative", marginTop: 20 }}>
            <div style={{ position: "absolute", top: -20, left: "50%", transform: "translateX(-50%)", background: "#0D0C0A", color: "#FFFFFF", fontFamily: f, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "100px", padding: "6px 16px", whiteSpace: "nowrap" }}>
              MOST POPULAR
            </div>
            <p style={{ fontFamily: f, fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#858585", margin: "0 0 12px" }}>Pro</p>
            <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
              <span style={{ fontFamily: f, fontSize: "56px", fontWeight: 600, color: "#0D0C0A", lineHeight: 1 }}>$9</span>
              <span style={{ fontFamily: f, fontSize: "16px", color: "#858585" }}>/ month</span>
            </div>
            <div style={{ height: 1, background: "#EBEBEB", marginBottom: 20 }} />
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 10 }}>
              {PRO_FEATURES.map(f_ => (
                <li key={f_} style={{ fontFamily: f, fontSize: "15px", color: "#0D0C0A", display: "flex", alignItems: "baseline", gap: 10 }}>
                  <span style={{ color: "#7c8e5c", fontSize: "12px", flexShrink: 0 }}>✓</span>{f_}
                </li>
              ))}
            </ul>
            <Link href="/account/billing" className="pr-btn-pro">Get Pro — coming soon →</Link>
          </div>
        </div>

        <p style={{ fontFamily: f, fontSize: "13px", fontStyle: "italic", color: "#B3B3B3", textAlign: "center", marginTop: 28, lineHeight: 1.65 }}>
          TraceRank does not predict hiring outcomes. Scores reflect structural and keyword analysis only.{" "}
          <Link href="/methodology" style={{ color: "#B3B3B3", textDecoration: "underline", textUnderlineOffset: "2px" }}>Read the methodology →</Link>
        </p>

      </main>

      <footer style={{ borderTop: "1px solid #EBEBEB", padding: "24px 80px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#F4F4F4" }}>
        <span style={{ fontFamily: f, fontSize: "13px", color: "#858585" }}>© 2026 TraceRank</span>
        <div style={{ display: "flex", gap: "24px" }}>
          <Link href="/methodology" style={{ fontFamily: f, fontSize: "13px", color: "#474546", textDecoration: "none" }}>Methodology</Link>
          <Link href="/privacy" style={{ fontFamily: f, fontSize: "13px", color: "#474546", textDecoration: "none" }}>Privacy</Link>
        </div>
      </footer>
    </div>
  )
}
