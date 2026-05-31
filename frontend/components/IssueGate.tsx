import Link from "next/link"

interface Props {
  remaining: number
}

export function IssueGate({ remaining }: Props) {
  return (
    <div
      style={{
        margin: "0 1.5rem",
        padding: "1rem 1.25rem",
        border: "1px solid var(--border-subtle)",
        borderRadius: "2px",
        background: "var(--bg-surface)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "0.5rem",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.8rem",
          color: "var(--text-secondary)",
          lineHeight: 1.5,
        }}
      >
        {remaining} more {remaining === 1 ? "issue" : "issues"} found.
        Sign in to see all findings, keyword analysis, and fix priorities.
      </span>
      <Link
        href="/sign-up"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.78rem",
          fontWeight: 500,
          color: "var(--accent)",
          textDecoration: "none",
          whiteSpace: "nowrap",
          borderBottom: "1px solid currentColor",
          paddingBottom: "1px",
          transition: "color 0.2s ease",
        }}
      >
        Sign in to see all findings →
      </Link>
    </div>
  )
}
