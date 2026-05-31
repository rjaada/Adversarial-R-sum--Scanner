import { SignUp } from "@clerk/nextjs"
import Link from "next/link"

const fa = "Albert Sans, system-ui, sans-serif"
const fu = "var(--font-unbounded, Unbounded, sans-serif)"

const clerkAppearance = {
  variables: {
    colorBackground:      "#F7F6F3",
    colorInputBackground: "#FFFFFF",
    colorInputText:       "#0D0C0A",
    colorText:            "#0D0C0A",
    colorTextSecondary:   "#8f8d88",
    colorPrimary:         "#0D0C0A",
    colorDanger:          "#8c2f4e",
    borderRadius:         "2px",
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

    socialButtonsRoot: {
      marginBottom: "0",
    },
    socialButtonsBlockButton: {
      backgroundColor: "#EFEDE9",
      border:          "1px solid #DDD9D3",
      borderRadius:    "2px",
      color:           "#0D0C0A",
      fontFamily:      fa,
      height:          "42px",
      fontSize:        "13px",
      fontWeight:      "400",
    },
    socialButtonsBlockButtonText: {
      color:      "#1f1d1a",
      fontFamily: fa,
      fontSize:   "13px",
    },
    socialButtonsProviderIcon: { width: "15px", height: "15px" },

    dividerRow:  { margin: "18px 0" },
    dividerLine: { backgroundColor: "#DDD9D3" },
    dividerText: {
      color:         "#B8B4AE",
      fontFamily:    fa,
      fontSize:      "10px",
      letterSpacing: "0.08em",
      textTransform: "uppercase" as const,
    },

    formFields: { gap: "2px" },
    formFieldRow: { gap: "12px" },
    formFieldLabel: {
      fontFamily:    fa,
      color:         "#5a5754",
      fontSize:      "10px",
      fontWeight:    "600",
      textTransform: "uppercase" as const,
      letterSpacing: "0.12em",
      marginBottom:  "4px",
    },
    formFieldInput: {
      backgroundColor: "#FFFFFF",
      border:          "1px solid #D8D5D0",
      borderRadius:    "2px",
      color:           "#0D0C0A",
      fontFamily:      fa,
      fontSize:        "14px",
      height:          "44px",
      padding:         "0 14px",
    },
    formFieldInputShowPasswordButton: { color: "#9e9b96" },

    formButtonPrimary: {
      backgroundColor: "#0D0C0A",
      color:           "#FFFFFF",
      fontFamily:      fa,
      fontWeight:      "500",
      fontSize:        "13px",
      borderRadius:    "2px",
      height:          "44px",
      letterSpacing:   "0.04em",
      textTransform:   "uppercase" as const,
      border:          "none",
      marginTop:       "6px",
    },

    footerAction: { marginTop: "28px" },
    footerActionText: {
      color:      "#8f8d88",
      fontFamily: fa,
      fontSize:   "12px",
    },
    footerActionLink: {
      color:          "#0D0C0A",
      fontWeight:     "600",
      fontFamily:     fa,
      textDecoration: "none",
      borderBottom:   "1px solid currentColor",
      paddingBottom:  "1px",
    },

    rootBox:                           { width: "100%" },
    identityPreviewText:               { fontFamily: fa, color: "#0D0C0A", fontSize: "14px" },
    identityPreviewEditButton:         { fontFamily: fa, color: "#5a5754" },
    alertText:                         { fontFamily: fa, fontSize: "12px" },
    formFieldInputShowPasswordButton_: { color: "#9e9b96" },
  },
}

export default function SignUpPage() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", fontFamily: fa }}>
      <style>{`
        @media (max-width: 767px) {
          .auth-left  { display: none !important; }
          .auth-right {
            width: 100% !important;
            padding: 56px 28px 80px !important;
            align-items: center !important;
          }
          .auth-mobile-wordmark { display: block !important; }
          .auth-form-rail { margin-left: 0 !important; max-width: 100% !important; }
        }
        @media (min-width: 768px) {
          .auth-mobile-wordmark { display: none !important; }
        }
      `}</style>

      {/* ─── LEFT — editorial brand panel ────────────────────────────── */}
      <div
        className="auth-left"
        style={{
          width:          "52%",
          flexShrink:     0,
          background:     "#0D0C0A",
          minHeight:      "100vh",
          display:        "flex",
          flexDirection:  "column",
          justifyContent: "flex-start",
          alignItems:     "flex-start",
          padding:        "80px 72px 80px 72px",
          position:       "relative",
          overflow:       "hidden",
        }}
      >
        {/* ── Architectural scan line ── */}
        <div aria-hidden style={{
          position:   "absolute",
          top:        "56%",
          left:       0,
          right:      0,
          height:     "1px",
          background: "#171512",
          zIndex:     1,
        }} />

        {/* ── Giant score — structural typographic device ── */}
        <div aria-hidden style={{
          position:      "absolute",
          bottom:        "-24px",
          left:          "50%",
          transform:     "translateX(-50%)",
          fontFamily:    fu,
          fontSize:      "clamp(180px, 26vw, 300px)",
          fontWeight:    700,
          color:         "#131110",
          lineHeight:    1,
          letterSpacing: "-0.04em",
          userSelect:    "none",
          pointerEvents: "none",
          whiteSpace:    "nowrap",
          zIndex:        0,
        }}>
          73
        </div>

        {/* ── Content block ── */}
        <div style={{ position: "relative", zIndex: 2, maxWidth: 420 }}>

          {/* Wordmark / eyebrow */}
          <p style={{
            fontFamily:    fa,
            fontSize:      "10px",
            fontWeight:    600,
            color:         "#7c8e5c",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
            margin:        "0 0 40px",
          }}>
            TraceRank
          </p>

          {/* Statement */}
          <h1 style={{
            fontFamily:    fu,
            fontSize:      "clamp(34px, 3.8vw, 54px)",
            fontWeight:    700,
            color:         "#FFFFFF",
            lineHeight:    1.06,
            letterSpacing: "-0.025em",
            margin:        "0 0 28px",
          }}>
            Know what the machine sees.
          </h1>

          {/* Olive rule */}
          <div style={{
            width:        "28px",
            height:       "1px",
            background:   "#7c8e5c",
            margin:       "0 0 28px",
          }} />

          {/* Subtext */}
          <p style={{
            fontFamily: fa,
            fontSize:   "14px",
            color:      "#5c5955",
            lineHeight: 1.8,
            margin:     "0 0 48px",
            maxWidth:   340,
          }}>
            Score your résumé against any job description in 30 seconds.
          </p>

          {/* Trust items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {[
              "No résumé file stored",
              "Deterministic scoring — same input, same score",
              "Methodology is public",
            ].map((line, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                <span style={{
                  fontFamily:    fa,
                  fontSize:      "9px",
                  fontWeight:    600,
                  color:         "#7c8e5c",
                  letterSpacing: "0.06em",
                  marginTop:     "3px",
                  flexShrink:    0,
                  textTransform: "uppercase" as const,
                }}>
                  ✓
                </span>
                <span style={{
                  fontFamily: fa,
                  fontSize:   "13px",
                  color:      "#3d3b38",
                  lineHeight: 1.65,
                }}>
                  {line}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom anchor — page count style */}
        <div style={{
          position:      "absolute",
          bottom:        44,
          left:          72,
          right:         72,
          display:       "flex",
          alignItems:    "center",
          justifyContent:"space-between",
          zIndex:        2,
        }}>
          <Link href="/" style={{
            fontFamily:    fa,
            fontSize:      "11px",
            fontWeight:    600,
            color:         "#2e2c29",
            textDecoration:"none",
            letterSpacing: "0.04em",
            textTransform: "uppercase" as const,
          }}>
            TraceRank
          </Link>
          <span style={{
            fontFamily:    fa,
            fontSize:      "10px",
            color:         "#252320",
            letterSpacing: "0.06em",
          }}>
            /sign-up
          </span>
        </div>
      </div>

      {/* ─── RIGHT — form surface ────────────────────────────────────── */}
      <div
        className="auth-right"
        style={{
          flex:          1,
          background:    "#F7F6F3",
          minHeight:     "100vh",
          display:       "flex",
          flexDirection: "column",
          alignItems:    "flex-start",
          justifyContent:"flex-start",
          paddingTop:    "18vh",
          paddingBottom: "80px",
          paddingLeft:   "0",
          paddingRight:  "0",
          position:      "relative",
        }}
      >
        {/* Left border */}
        <div style={{
          position:   "absolute",
          top:        0,
          left:       0,
          bottom:     0,
          width:      "1px",
          background: "#DEDAD4",
        }} />

        {/* Mobile wordmark */}
        <Link
          href="/"
          className="auth-mobile-wordmark"
          style={{
            display:        "none",
            fontFamily:     fa,
            fontSize:       "13px",
            fontWeight:     600,
            color:          "#0D0C0A",
            textDecoration: "none",
            letterSpacing:  "0.04em",
            textTransform:  "uppercase",
            marginBottom:   "56px",
            paddingLeft:    "28px",
          }}
        >
          TraceRank
        </Link>

        {/* Form rail — left-anchored */}
        <div
          className="auth-form-rail"
          style={{
            marginLeft: "13%",
            width:      "100%",
            maxWidth:   "340px",
          }}
        >
          {/* Header */}
          <div style={{ marginBottom: "44px" }}>
            <p style={{
              fontFamily:    fa,
              fontSize:      "9px",
              fontWeight:    600,
              color:         "#7c8e5c",
              textTransform: "uppercase",
              letterSpacing: "0.22em",
              margin:        "0 0 16px",
            }}>
              Create account
            </p>
            <h2 style={{
              fontFamily:    fa,
              fontSize:      "22px",
              fontWeight:    600,
              color:         "#0D0C0A",
              margin:        "0 0 10px",
              lineHeight:    1.2,
              letterSpacing: "-0.02em",
            }}>
              Start scanning your résumé
            </h2>
            <p style={{
              fontFamily: fa,
              fontSize:   "13px",
              color:      "#8f8d88",
              margin:     0,
              lineHeight: 1.65,
            }}>
              Free to start. No credit card required.
            </p>
          </div>

          <SignUp appearance={clerkAppearance} />
        </div>
      </div>
    </div>
  )
}
