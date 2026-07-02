/**
 * Placeholder shown in place of Clerk's <SignIn>/<SignUp> when Clerk is not
 * configured (keyless localhost preview). Keeps the auth routes navigable
 * without a ClerkProvider instead of throwing a runtime error.
 */
const fa = "Albert Sans, system-ui, sans-serif"

export function PreviewAuthNotice({ mode }: { mode: "sign-in" | "sign-up" }) {
  const label = mode === "sign-in" ? "Sign-in" : "Sign-up"
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        border: "1px solid rgba(26,25,23,0.12)",
        borderRadius: 8,
        background: "#FFFFFF",
        padding: "28px 24px",
        fontFamily: fa,
      }}
    >
      <p
        style={{
          fontFamily: fa,
          fontSize: "11px",
          fontWeight: 500,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "#9a4d22",
          margin: "0 0 10px",
        }}
      >
        Preview mode
      </p>
      <h3 style={{ fontFamily: fa, fontSize: "1.05rem", fontWeight: 600, color: "#1a1917", margin: "0 0 8px" }}>
        {label} is unavailable in this preview
      </h3>
      <p style={{ fontFamily: fa, fontSize: "0.875rem", color: "#6e6b66", lineHeight: 1.65, margin: 0 }}>
        Authentication is disabled because no Clerk key is configured for this
        local preview. Set <code style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.8rem", background: "#F4F3F0", padding: "1px 5px", borderRadius: 4 }}>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</code> (and remove
        <code style={{ fontFamily: "var(--font-mono, monospace)", fontSize: "0.8rem", background: "#F4F3F0", padding: "1px 5px", borderRadius: 4 }}> frontend/.env.development.local</code>) to enable it. Auth works normally in
        production.
      </p>
    </div>
  )
}
