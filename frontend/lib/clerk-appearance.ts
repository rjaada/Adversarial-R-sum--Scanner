/**
 * Shared Clerk component appearance configuration.
 * Used by both sign-in and sign-up pages to keep auth UI styling consistent.
 * Edit here to change colors, fonts, or element styles across all auth forms.
 *
 * Docs: https://clerk.com/docs/components/customization/overview
 */

const FA = "Albert Sans, system-ui, sans-serif"

export const clerkAppearance = {
  variables: {
    colorBackground:      "#F6F4F0",
    colorInputBackground: "#FFFFFF",
    colorInputText:       "#0D0C0A",
    colorText:            "#0D0C0A",
    colorTextSecondary:   "#8f8d88",
    colorPrimary:         "#0D0C0A",
    colorDanger:          "#8c2f4e",
    borderRadius:         "4px",
    fontFamily:           FA,
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

    // overflow: visible keeps the "Last used" badge from being clipped
    socialButtonsBlockButton: {
      backgroundColor: "#FFFFFF",
      border:          "1px solid #DDD9D3",
      borderRadius:    "6px",
      color:           "#0D0C0A",
      fontFamily:      FA,
      height:          "52px",
      fontSize:        "14px",
      fontWeight:      "400",
      overflow:        "visible",
      position:        "relative",
    },
    socialButtonsBlockButtonText: {
      color:      "#1f1d1a",
      fontFamily: FA,
      fontSize:   "14px",
    },
    socialButtonsProviderIcon: { width: "16px", height: "16px" },
    badge: {
      backgroundColor: "#0D0C0A",
      color:           "#FFFFFF",
      fontSize:        "10px",
      borderRadius:    "100px",
      padding:         "2px 8px",
    },

    dividerRow:  { margin: "20px 0" },
    dividerLine: { backgroundColor: "#D8D5D0" },
    dividerText: {
      color:         "#B8B4AE",
      fontFamily:    FA,
      fontSize:      "11px",
      letterSpacing: "0.06em",
      textTransform: "uppercase" as const,
    },

    formFields:   { gap: "4px" },
    formFieldRow: { gap: "12px" },
    formFieldLabel: {
      fontFamily:    FA,
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
      fontFamily:      FA,
      fontSize:        "14px",
      height:          "46px",
      padding:         "0 14px",
    },
    formFieldInputShowPasswordButton: { color: "#9e9b96" },

    formButtonPrimary: {
      backgroundColor: "#0D0C0A",
      color:           "#FFFFFF",
      fontFamily:      FA,
      fontWeight:      "500",
      fontSize:        "13px",
      borderRadius:    "6px",
      height:          "52px",
      letterSpacing:   "0.06em",
      textTransform:   "uppercase" as const,
      border:          "none",
      marginTop:       "8px",
    },

    footerAction:     { marginTop: "24px", textAlign: "center" as const },
    footerActionText: { color: "#8f8d88", fontFamily: FA, fontSize: "13px" },
    footerActionLink: { color: "#0D0C0A", fontWeight: "600", fontFamily: FA, textDecoration: "underline" },

    rootBox:                   { width: "100%", maxWidth: "420px" },
    identityPreviewText:       { fontFamily: FA, color: "#0D0C0A", fontSize: "14px" },
    identityPreviewEditButton: { fontFamily: FA, color: "#5a5754" },
    alertText:                 { fontFamily: FA, fontSize: "13px" },
  },
}
