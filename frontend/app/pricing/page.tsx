import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Pricing — TraceRank",
  description: "Free and Pro plans for TraceRank. No scam pricing. No fake AI features.",
}

const f = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"

// Fix 3 & 4: Corrected feature lists
const FREE_FEATURES: string[] = [
  "3 scans per month",
  "Overall score /100",
  "Score breakdown (5 signals)",
  "Issue evidence & fix patterns",
  "Keyword gap analysis",
]
const FREE_EXCLUDED: string[] = [
  "Scan history",
  "Compare mode",
  "PDF export",
  "AI rewrite suggestions",
]
const PRO_FEATURES: string[] = [
  "Everything in Free",
  "Unlimited scans",
  "Unlimited scan history",
  "Compare mode",
  "PDF export",
  "AI rewrite suggestions — per issue",
]

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
    margin-top: auto;
  }
  .pr-btn-free:hover { background: #0D0C0A; color: #FFFFFF; }
  .pr-btn-pro {
    display: flex; align-items: center; justify-content: center;
    width: 100%; height: 52px;
    font-family: ${f};
    font-size: 15px; font-weight: 500;
    color: #FFFFFF;
    background: #0D0C0A;
    border: none;
    border-radius: 100px;
    text-decoration: none;
    transition: background 0.2s ease;
    cursor: pointer;
    margin-top: auto;
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
        <p style={{ fontFamily: f, fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#858585", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ color: "#7c8e5c" }}>«</span> Pricing
        </p>

        {/* Fix 1 & 2: flex layout, both cards same baseline, badge above card */}
        <div style={{ display: "flex", alignItems: "stretch", gap: "24px", marginTop: "48px", flexWrap: "wrap" }}>

          {/* Free card */}
          <div style={{ flex: "1 1 340px", maxWidth: "420px", paddingTop: "20px" }}>
            {/* Fix 5: Free card — lighter border */}
            <div style={{ background: "#FFFFFF", border: "1px solid #E0DDD9", borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
              <p style={{ fontFamily: f, fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#858585", margin: "0 0 12px" }}>Free</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <span style={{ fontFamily: f, fontSize: "56px", fontWeight: 600, color: "#0D0C0A", lineHeight: 1 }}>$0</span>
                <span style={{ fontFamily: f, fontSize: "16px", color: "#858585" }}>forever</span>
              </div>
              <div style={{ height: 1, background: "#F0EDE8", marginBottom: 20 }} />
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {FREE_FEATURES.map(feat => (
                  <li key={feat} style={{ fontFamily: f, fontSize: "15px", color: "#0D0C0A", display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ color: "#0D0C0A", fontSize: "12px", flexShrink: 0 }}>✓</span>{feat}
                  </li>
                ))}
                {FREE_EXCLUDED.map(feat => (
                  <li key={feat} style={{ fontFamily: f, fontSize: "15px", color: "#B3B3B3", display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ flexShrink: 0, color: "#B3B3B3" }}>–</span>{feat}
                  </li>
                ))}
              </ul>
              <Link href="/workspace" className="pr-btn-free">Start scanning</Link>
            </div>
          </div>

          {/* Fix 1 & 2: Pro card wrapper — badge floats above, card stays in flex baseline */}
          <div style={{ flex: "1 1 340px", maxWidth: "420px", position: "relative", paddingTop: "20px" }}>
            {/* Badge sits above the card without affecting card position */}
            <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", background: "#0D0C0A", color: "#FFFFFF", fontFamily: f, fontSize: "11px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", borderRadius: "100px", padding: "6px 16px", whiteSpace: "nowrap" }}>
              MOST POPULAR
            </div>
            {/* Fix 5: Pro card — strong border */}
            <div style={{ background: "#FFFFFF", border: "2px solid #0D0C0A", borderRadius: 16, padding: 32, display: "flex", flexDirection: "column", height: "100%", boxSizing: "border-box" }}>
              <p style={{ fontFamily: f, fontSize: "12px", fontWeight: 500, letterSpacing: "0.1em", textTransform: "uppercase", color: "#858585", margin: "0 0 12px" }}>Pro</p>
              <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                <span style={{ fontFamily: f, fontSize: "56px", fontWeight: 600, color: "#0D0C0A", lineHeight: 1 }}>$9</span>
                <span style={{ fontFamily: f, fontSize: "16px", color: "#858585" }}>/ month</span>
              </div>
              <div style={{ height: 1, background: "#F0EDE8", marginBottom: 20 }} />
              <ul style={{ listStyle: "none", padding: 0, margin: "0 0 28px", display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
                {PRO_FEATURES.map(feat => (
                  <li key={feat} style={{ fontFamily: f, fontSize: "15px", color: "#0D0C0A", display: "flex", alignItems: "baseline", gap: 10 }}>
                    <span style={{ color: "#0D0C0A", fontSize: "12px", flexShrink: 0 }}>✓</span>{feat}
                  </li>
                ))}
              </ul>
              <Link href="/account/billing" className="pr-btn-pro">Get Pro — coming soon →</Link>
            </div>
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
          <Link href="/privacy"     style={{ fontFamily: f, fontSize: "13px", color: "#474546", textDecoration: "none" }}>Privacy</Link>
        </div>
      </footer>
    </div>
  )
}
