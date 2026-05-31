import { SignUp } from "@clerk/nextjs"

const appearance = {
  variables: {
    colorBackground: "#131210",
    colorInputBackground: "#1a1916",
    colorInputText: "#ede8df",
    colorText: "#ede8df",
    colorTextSecondary: "#9a9489",
    colorPrimary: "#7c8e5c",
    colorDanger: "#c07080",
    borderRadius: "2px",
    fontFamily: "var(--font-figtree, Figtree, system-ui, sans-serif)",
  },
  elements: {
    card: { border: "1px solid #2a2824", boxShadow: "none", background: "#131210" },
    formButtonPrimary: {
      fontFamily: "var(--font-figtree, Figtree, system-ui, sans-serif)",
      fontWeight: 500,
    },
    footerActionLink: { color: "#7c8e5c" },
    headerTitle: {
      fontFamily: "var(--font-cormorant, Georgia, serif)",
      fontWeight: 400,
      fontSize: "1.5rem",
    },
  },
}

export default function SignUpPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-base)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 1rem",
      }}
    >
      <SignUp appearance={appearance} />
    </div>
  )
}
