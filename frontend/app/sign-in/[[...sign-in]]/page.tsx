import { SignIn } from "@clerk/nextjs"
import Link from "next/link"

const f = "Albert Sans, system-ui, sans-serif"

const clerkAppearance = {
  variables: {
    colorBackground:    "#FFFFFF",
    colorInputBackground: "#F4F4F4",
    colorInputText:     "#0D0C0A",
    colorText:          "#0D0C0A",
    colorTextSecondary: "#858585",
    colorPrimary:       "#0D0C0A",
    colorDanger:        "#8c2f4e",
    borderRadius:       "100px",
    fontFamily:         f,
    fontSize:           "15px",
  },
  elements: {
    card: {
      backgroundColor: "#FFFFFF",
      border:          "1px solid #EBEBEB",
      boxShadow:       "0 4px 24px rgba(0,0,0,0.06)",
      borderRadius:    "16px",
      padding:         "40px",
    },
    headerTitle: {
      fontFamily: f,
      fontWeight: "600",
      fontSize:   "22px",
      color:      "#0D0C0A",
    },
    headerSubtitle: {
      fontFamily: f,
      color:      "#858585",
      fontSize:   "14px",
    },
    formFieldLabel: {
      fontFamily: f,
      color:      "#0D0C0A",
      fontSize:   "14px",
      fontWeight: "500",
    },
    formFieldInput: {
      backgroundColor: "#F4F4F4",
      border:          "1px solid #EBEBEB",
      borderRadius:    "8px",
      color:           "#0D0C0A",
      fontFamily:      f,
      fontSize:        "15px",
    },
    formButtonPrimary: {
      backgroundColor: "#0D0C0A",
      color:           "#FFFFFF",
      fontFamily:      f,
      fontWeight:      "500",
      fontSize:        "15px",
      borderRadius:    "100px",
      height:          "48px",
    },
    socialButtonsBlockButton: {
      backgroundColor: "#FFFFFF",
      border:          "1px solid #EBEBEB",
      borderRadius:    "8px",
      color:           "#0D0C0A",
      fontFamily:      f,
    },
    socialButtonsBlockButtonText: {
      color:      "#0D0C0A",
      fontFamily: f,
    },
    dividerLine: { backgroundColor: "#EBEBEB" },
    dividerText: { color: "#B3B3B3", fontFamily: f },
    footerActionLink: {
      color:          "#0D0C0A",
      fontFamily:     f,
      fontWeight:     "500",
      textDecoration: "underline",
    },
    footerActionText: {
      color:      "#858585",
      fontFamily: f,
    },
    identityPreviewText:       { color: "#0D0C0A" },
    identityPreviewEditButton: { color: "#0D0C0A" },
    alertText:                 { fontFamily: f },
    formFieldInputShowPasswordButton: { color: "#858585" },
  },
}

export default function SignInPage() {
  return (
    <div style={{ background: "#F4F4F4", minHeight: "100vh", fontFamily: `var(--font-albert, ${f})` }}>

      {/* Nav */}
      <nav style={{ height: 64, background: "#FFFFFF", borderBottom: "1px solid #EBEBEB", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 80px", position: "sticky", top: 0, zIndex: 100 }}>
        <Link href="/" style={{ fontFamily: `var(--font-albert, ${f})`, fontSize: "1rem", fontWeight: 600, color: "#0D0C0A", textDecoration: "none", letterSpacing: "-0.01em" }}>
          TraceRank
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link href="/methodology" style={{ fontFamily: `var(--font-albert, ${f})`, fontSize: "0.875rem", color: "#474546", textDecoration: "none" }}>Methodology</Link>
          <Link href="/pricing"     style={{ fontFamily: `var(--font-albert, ${f})`, fontSize: "0.875rem", color: "#474546", textDecoration: "none" }}>Pricing</Link>
        </div>
      </nav>

      {/* Card area */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "calc(100vh - 64px)", padding: "40px 24px" }}>
        <SignIn appearance={clerkAppearance} />
      </div>

    </div>
  )
}
