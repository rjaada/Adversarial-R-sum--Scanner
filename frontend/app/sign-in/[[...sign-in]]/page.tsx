import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

const fa = "Albert Sans, system-ui, sans-serif"
const fu = "var(--font-unbounded, Unbounded, sans-serif)"

const clerkAppearance = {
  variables: {
    colorBackground:      "#F6F4F0",
    colorInputBackground: "#FFFFFF",
    colorInputText:       "#0D0C0A",
    colorText:            "#0D0C0A",
    colorTextSecondary:   "#8f8d88",
    colorPrimary:         "#0D0C0A",
    colorDanger:          "#8c2f4e",
    borderRadius:         "4px",
    fontFamily:           fa,
    fontSize:             "14px",
  },
  elements: {
    cardBox: {
      backgroundColor: "transparent",
      boxShadow:       "none",
      border:          "none",
      borderRadius:    "0",
      width:           "100%",
    },
    card: {
      backgroundColor: "transparent",
      border:          "none",
      boxShadow:       "none",
      borderRadius:    "0",
      padding:         "0",
      width:           "100%",
    },
    header:         { display: "none" },
    headerTitle:    { display: "none" },
    headerSubtitle: { display: "none" },

    socialButtonsBlockButton: {
      backgroundColor: "#FFFFFF",
      border:          "1px solid #DDD9D3",
      borderRadius:    "6px",
      color:           "#0D0C0A",
      fontFamily:      fa,
      height:          "52px",
      fontSize:        "14px",
      fontWeight:      "400",
    },
    socialButtonsBlockButtonText: {
      color:      "#1f1d1a",
      fontFamily: fa,
      fontSize:   "14px",
    },
    socialButtonsProviderIcon: { width: "16px", height: "16px" },

    dividerRow:  { margin: "20px 0" },
    dividerLine: { backgroundColor: "#D8D5D0" },
    dividerText: {
      color:         "#B8B4AE",
      fontFamily:    fa,
      fontSize:      "11px",
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
    },

    formFields:   { gap: "4px" },
    formFieldRow: { gap: "12px" },
    formFieldLabel: {
      fontFamily:    fa,
      color:         "#5a5754",
      fontSize:      "11px",
      fontWeight:    "600",
      textTransform: "uppercase" as const,
      letterSpacing: "0.1em",
      marginBottom:  "5px",
    },
    formFieldInput: {
      backgroundColor: "#FFFFFF",
      border:          "1px solid #D8D5D0",
      borderRadius:    "4px",
      color:           "#0D0C0A",
      fontFamily:      fa,
      fontSize:        "14px",
      height:          "46px",
      padding:         "0 14px",
    },
    formFieldInputShowPasswordButton: { color: "#9e9b96" },

    formButtonPrimary: {
      backgroundColor: "#0D0C0A",
      color:           "#FFFFFF",
      fontFamily:      fa,
      fontWeight:      "500",
      fontSize:        "13px",
      borderRadius:    "6px",
      height:          "52px",
      letterSpacing:   "0.06em",
      textTransform:   "uppercase" as const,
      border:          "none",
      marginTop:       "8px",
    },

    footerAction: { marginTop: "24px", textAlign: "center" as const },
    footerActionText: {
      color:      "#8f8d88",
      fontFamily: fa,
      fontSize:   "13px",
    },
    footerActionLink: {
      color:          "#0D0C0A",
      fontWeight:     "600",
      fontFamily:     fa,
      textDecoration: "underline",
    },

    rootBox:                   { width: "100%" },
    identityPreviewText:       { fontFamily: fa, color: "#0D0C0A", fontSize: "14px" },
    identityPreviewEditButton: { fontFamily: fa, color: "#5a5754" },
    alertText:                 { fontFamily: fa, fontSize: "13px" },
  },
}

export default function SignInPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: fa }}>
      <style>{`
        @media (max-width: 767px) {
          .auth-left  { display: none !important; }
          .auth-right {
            width: 100% !important;
            padding: 48px 28px 80px !important;
          }
          .auth-mobile-wordmark { display: flex !important; }
          .auth-form-rail {
            margin-left: 0 !important;
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
          padding:        "48px 72px 260px",
          position:       "relative",
          overflow:       "hidden",
        }}
      >
        {/* "73/100" — primary compositional anchor */}
        <div aria-hidden style={{
          position:      "absolute",
          bottom:        "-10px",
          left:          "-8px",
          fontFamily:    fu,
          fontSize:      "clamp(160px, 22vw, 280px)",
          fontWeight:    700,
          color:         "#545250",
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

          {/* Wordmark */}
          <Link href="/" style={{
            display:        "block",
            fontFamily:     fa,
            fontSize:       "15px",
            fontWeight:     500,
            color:          "#787572",
            textDecoration: "none",
            marginBottom:   "72px",
          }}>
            TraceRank
          </Link>

          {/* Headline */}
          <h1 style={{
            fontFamily:    fu,
            fontSize:      "clamp(42px, 5vw, 68px)",
            fontWeight:    700,
            color:         "#FFFFFF",
            lineHeight:    1.06,
            letterSpacing: "-0.025em",
            margin:        "0 0 20px",
            maxWidth:      520,
          }}>
            Know what the machine sees.
          </h1>

          {/* Subtext */}
          <p style={{
            fontFamily: fa,
            fontSize:   "16px",
            color:      "#5a5754",
            lineHeight: 1.7,
            margin:     "0 0 40px",
            maxWidth:   420,
          }}>
            Score your résumé against any job description in 30 seconds.
          </p>

          {/* Trust items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {[
              "No résumé file stored",
              "Deterministic scoring — same input, same score",
              "Methodology is public",
            ].map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <span style={{
                  color:      "#6b7a50",
                  fontSize:   "13px",
                  marginTop:  "2px",
                  flexShrink: 0,
                }}>✓</span>
                <span style={{
                  fontFamily: fa,
                  fontSize:   "14px",
                  color:      "#4a4845",
                  lineHeight: 1.6,
                }}>
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── RIGHT PANEL ────────────────────────────────────────────── */}
      <div
        className="auth-right"
        style={{
          flex:           1,
          background:     "#F6F4F0",
          minHeight:      "100vh",
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "flex-start",
          paddingTop:     "72px",
          paddingBottom:  "80px",
          paddingLeft:    "40px",
          paddingRight:   "40px",
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
            paddingLeft:  "28px",
          }}
        >
          <Link href="/" style={{
            fontFamily:     fa,
            fontSize:       "15px",
            fontWeight:     500,
            color:          "#0D0C0A",
            textDecoration: "none",
          }}>
            TraceRank
          </Link>
        </div>

        {/* Form column */}
        <div
          className="auth-form-rail"
          style={{
            width:    "100%",
            maxWidth: "380px",
          }}
        >
          {/* Eyebrow */}
          <p style={{
            fontFamily:    fa,
            fontSize:      "11px",
            fontWeight:    500,
            color:         "#7c8e5c",
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
