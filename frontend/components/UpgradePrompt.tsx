import Link from "next/link"

interface Props {
  label: string
}

export function UpgradePrompt({ label }: Props) {
  return (
    <div
      style={{
        padding: "0.875rem 2rem",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.75rem",
          color: "var(--text-dim)",
        }}
      >
        {label}
      </span>
      <Link
        href="/sign-up"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.75rem",
          color: "var(--accent)",
          textDecoration: "none",
          borderBottom: "1px solid currentColor",
          paddingBottom: "1px",
          whiteSpace: "nowrap",
          transition: "color 0.2s ease",
        }}
      >
        Sign in →
      </Link>
    </div>
  )
}
