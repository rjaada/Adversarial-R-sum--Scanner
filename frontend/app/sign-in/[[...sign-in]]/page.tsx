import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

const fa = "Albert Sans, system-ui, sans-serif"
const fu = "var(--font-unbounded, Unbounded, sans-serif)"

const clerkAppearance = {
  variables: {
    colorBackground:      "transparent",
    colorInputBackground: "#FFFFFF",
    colorInputText:       "#0D0C0A",
    colorText:            "#0D0C0A",
    colorTextSecondary:   "#858585",
    colorPrimary:         "#0D0C0A",
    colorDanger:          "#8c2f4e",
    borderRadius:         "8px",
    fontFamily:           fa,
    fontSize:             "15px",
  },
  elements: {
    card: {
      backgroundColor: "transparent",
      border:          "none",
      boxShadow:       "none",
      borderRadius:    "0",
      padding:         "0",
      width:           "100%",
      maxWidth:        "400px",
    },
    headerTitle: {
      fontFamily: fa,
      fontWeight: "600",
      fontSize:   "24px",
      color:      "#0D0C0A",
    },
    headerSubtitle: {
      fontFamily: fa,
      color:      "#858585",
      fontSize:   "14px",
    },
    formFieldLabel: {
      fontFamily:    fa,
      color:         "#0D0C0A",
      fontSize:      "13px",
      fontWeight:    "500",
      textTransform: "uppercase" as const,
      letterSpacing: "0.06em",
    },
    formFieldInput: {
      backgroundColor: "#FFFFFF",
      border:          "1px solid #EBEBEB",
      borderRadius:    "8px",
      color:           "#0D0C0A",
      fontFamily:      fa,
      fontSize:        "15px",
      height:          "48px",
    },
    formButtonPrimary: {
      backgroundColor: "#0D0C0A",
      color:           "#FFFFFF",
      fontFamily:      fa,
      fontWeight:      "500",
      fontSize:        "15px",
      borderRadius:    "100px",
      height:          "52px",
    },
    socialButtonsBlockButton: {
      backgroundColor: "#FFFFFF",
      border:          "1px solid #EBEBEB",
      borderRadius:    "8px",
      color:           "#0D0C0A",
      fontFamily:      fa,
      height:          "44px",
    },
    socialButtonsBlockButtonText: {
      color:      "#0D0C0A",
      fontFamily: fa,
      fontSize:   "14px",
    },
    dividerLine: { backgroundColor: "#EBEBEB" },
    dividerText: { color: "#B3B3B3", fontFamily: fa, fontSize: "12px" },
    footerActionLink: {
      color:          "#0D0C0A",
      fontWeight:     "600",
      textDecoration: "underline",
    },
    footerActionText: { color: "#858585", fontFamily: fa },
    rootBox: { width: "100%" },
  },
}

export default function SignInPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: fa }}>
      <style>{`
        @media (max-width: 767px) {
          .auth-left  { display: none !important; }
          .auth-right { width: 100% !important; padding: 40px 24px !important; }
          .auth-mobile-wordmark { display: block !important; }
        }
      `}</style>

      {/* ── Left — dark brand panel ──────────────────────────────────────── */}
      <div
        className="auth-left"
        style={{
          width: "55%",
          flexShrink: 0,
          background: "#0D0C0A",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          padding: "80px 72px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Faint background texture */}
        <div
          aria-hidden
          style={{
            position: "absolute",
            bottom: "-40px",
            right: "-20px",
            fontFamily: fu,
            fontSize: "220px",
            fontWeight: 700,
            color: "#161512",
            lineHeight: 1,
            userSelect: "none",
            pointerEvents: "none",
            letterSpacing: "-0.03em",
          }}
        >
          73/100
        </div>

        {/* Main content */}
        <div style={{ position: "relative", zIndex: 1, maxWidth: 480 }}>
          <h1
            style={{
              fontFamily: fu,
              fontSize: "clamp(36px, 4.5vw, 64px)",
              fontWeight: 700,
              color: "#FFFFFF",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              margin: "0 0 20px",
            }}
          >
            Know what the machine sees.
          </h1>

          <p
            style={{
              fontFamily: fa,
              fontSize: "16px",
              color: "#858585",
              lineHeight: 1.65,
              margin: "0 0 36px",
            }}
          >
            Score your résumé against any job description in 30 seconds.
          </p>

          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 12 }}>
            {[
              "No résumé file stored",
              "Deterministic scoring — same input, same score",
              "Methodology is public",
            ].map(line => (
              <li key={line} style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                <span style={{ color: "#7c8e5c", fontSize: "14px", flexShrink: 0 }}>✓</span>
                <span style={{ fontFamily: fa, fontSize: "14px", color: "#474546", lineHeight: 1.5 }}>{line}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom-left wordmark */}
        <Link
          href="/"
          style={{
            position: "absolute",
            bottom: 40,
            left: 72,
            fontFamily: fa,
            fontSize: "16px",
            fontWeight: 600,
            color: "#FFFFFF",
            textDecoration: "none",
            letterSpacing: "-0.01em",
          }}
        >
          TraceRank
        </Link>
      </div>

      {/* ── Right — auth panel ───────────────────────────────────────────── */}
      <div
        className="auth-right"
        style={{
          flex: 1,
          background: "#F4F4F4",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "60px 48px",
        }}
      >
        {/* Mobile-only wordmark */}
        <Link
          href="/"
          className="auth-mobile-wordmark"
          style={{
            display: "none",
            fontFamily: fa,
            fontSize: "16px",
            fontWeight: 600,
            color: "#0D0C0A",
            textDecoration: "none",
            marginBottom: "40px",
            alignSelf: "flex-start",
          }}
        >
          TraceRank
        </Link>

        <div style={{ width: "100%", maxWidth: 400 }}>
          <SignIn appearance={clerkAppearance} />
        </div>
      </div>
    </div>
  )
}
