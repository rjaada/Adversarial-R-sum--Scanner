/**
 * Sign-in page — custom Clerk auth UI.
 * Edit left-panel copy/layout here. Edit Clerk form styles in lib/clerk-appearance.ts.
 */

import { SignIn } from "@clerk/nextjs"
import Link from "next/link"
import { clerkAppearance } from "@/lib/clerk-appearance"

const fa = "Albert Sans, system-ui, sans-serif"
const fu = "var(--font-unbounded, Unbounded, sans-serif)"


export default function SignInPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: fa }}>
      <style>{`
        @media (max-width: 767px) {
          .auth-left  { display: none !important; }
          .auth-right {
            width: 100% !important;
            padding: 48px 28px 80px !important;
            overflow-y: auto !important;
          }
          .auth-mobile-wordmark { display: flex !important; }
          .auth-form-rail {
            max-width: 100% !important;
          }
        }
        @media (min-width: 768px) {
          .auth-mobile-wordmark { display: none !important; }
        }
      `}</style>

      {/* ── LEFT PANEL ─────────────────────────────────────────────── */}
      <div
        className="auth-left"
        style={{
          width:          "55%",
          flexShrink:     0,
          background:     "#0D0C0A",
          minHeight:      "100vh",
          display:        "flex",
          flexDirection:  "column",
          justifyContent: "flex-start",
          alignItems:     "flex-start",
          // P4: top padding to clear absolutely-positioned wordmark
          padding:        "130px 72px 240px",
          position:       "relative",
          overflow:       "hidden",  // P5: clips 73/100 cleanly at panel edge
        }}
      >
        {/* P4: Wordmark — absolute top-left */}
        <Link href="/" style={{
          position:       "absolute",
          top:            "32px",
          left:           "40px",
          fontFamily:     fa,
          fontSize:       "20px",
          fontWeight:     600,
          color:          "#FFFFFF",
          textDecoration: "none",
          letterSpacing:  "0.02em",
          zIndex:         2,
        }}>
          TraceRank
        </Link>

        {/* P5: 73/100 — bottom-right, texture */}
        <div aria-hidden style={{
          position:      "absolute",
          bottom:        "-20px",
          right:         "-20px",
          fontFamily:    fu,
          fontSize:      "clamp(120px, 18vw, 220px)",
          fontWeight:    700,
          color:         "#1c1b18",
          lineHeight:    1,
          letterSpacing: "-0.03em",
          userSelect:    "none",
          pointerEvents: "none",
          whiteSpace:    "nowrap",
          zIndex:        0,
        }}>
          73/100
        </div>

        {/* Content */}
        <div style={{ position: "relative", zIndex: 1, width: "100%" }}>
          {/* Headline */}
          <h1 style={{
            fontFamily:    fu,
            fontSize:      "clamp(42px, 5vw, 68px)",
            fontWeight:    700,
            color:         "#FFFFFF",
            lineHeight:    1.06,
            letterSpacing: "-0.025em",
            margin:        "0 0 24px",
            maxWidth:      520,
          }}>
            Know what the machine sees.
          </h1>

          {/* P3: Subtitle */}
          <p style={{
            fontFamily: fa,
            fontSize:   "18px",
            fontWeight: 400,
            color:      "#9a9489",
            lineHeight: 1.6,
            marginTop:  "24px",
            marginBottom:"0",
            maxWidth:   380,
          }}>
            Score your résumé against any job description in 30 seconds.
          </p>

          {/* P3: Trust items */}
          <div style={{
            display:       "flex",
            flexDirection: "column",
            gap:           16,
            marginTop:     48,
          }}>
            {[
              "No résumé file stored",
              "Deterministic scoring — same input, same score",
              "Methodology is public",
            ].map((line, i) => (
              <div key={i} style={{
                display:    "flex",
                alignItems: "center",
                gap:        12,
              }}>
                <span style={{
                  color:      "#7c8e5c",
                  fontSize:   "16px",
                  flexShrink: 0,
                }}>✓</span>
                <span style={{
                  fontFamily: fa,
                  fontSize:   "16px",
                  fontWeight: 400,
                  color:      "#6b6660",
                  lineHeight: 1.5,
                }}>
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
      {/* P1: overflowY auto, minHeight not height, paddingBottom 60px */}
      <div
        className="auth-right"
        style={{
          flex:           1,
          background:     "#FDFCF9",
          minHeight:      "100vh",
          overflowY:      "auto",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "flex-start",
          // P6: 60px 56px padding
          padding:        "60px 56px",
          position:       "relative",
        }}
      >
        {/* Mobile wordmark */}
        <div
          className="auth-mobile-wordmark"
          style={{
            display:      "none",
            alignItems:   "center",
            marginBottom: "48px",
            width:        "100%",
            maxWidth:     "420px",
          }}
        >
          <Link href="/" style={{
            fontFamily:     fa,
            fontSize:       "18px",
            fontWeight:     600,
            color:          "#0D0C0A",
            textDecoration: "none",
          }}>
            TraceRank
          </Link>
        </div>

        {/* P6: inner wrapper centered, max-width 420px */}
        <div
          className="auth-form-rail"
          style={{
            display:        "flex",
            flexDirection:  "column",
            justifyContent: "center",
            width:          "100%",
            maxWidth:       "420px",
            margin:         "0 auto",
          }}
        >
          {/* Eyebrow */}
          <p style={{
            fontFamily:    fa,
            fontSize:      "11px",
            fontWeight:    500,
            color:         "#a09890",
            textTransform: "uppercase",
            letterSpacing: "0.18em",
            margin:        "0 0 12px",
          }}>
            Sign in
          </p>

          {/* Heading */}
          <h2 style={{
            fontFamily:    fa,
            fontSize:      "36px",
            fontWeight:    700,
            color:         "#0D0C0A",
            margin:        "0 0 10px",
            lineHeight:    1.15,
            letterSpacing: "-0.025em",
          }}>
            Welcome back
          </h2>

          {/* Subtitle */}
          <p style={{
            fontFamily: fa,
            fontSize:   "14px",
            color:      "#8f8d88",
            margin:     "0 0 36px",
            lineHeight: 1.6,
          }}>
            Continue to your résumé analysis.
          </p>

          <SignIn appearance={clerkAppearance} />
        </div>
      </div>
    </div>
  )
}
