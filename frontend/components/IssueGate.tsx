import Link from "next/link"

interface Props {
  remaining: number
}

export function IssueGate({ remaining }: Props) {
  return (
    <div
      style={{
        margin: "12px 16px",
        padding: "16px 20px",
        border: "1px solid #EBEBEB",
        borderRadius: "8px",
        background: "#FFFFFF",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-albert, 'Albert Sans', system-ui, sans-serif)",
          fontSize: "0.825rem",
          color: "#858585",
          lineHeight: 1.5,
        }}
      >
        {remaining} more {remaining === 1 ? "issue" : "issues"} found.
        Sign in to see all findings, keyword analysis, and fix priorities.
      </span>
      <Link
        href="/sign-up"
        style={{
          fontFamily: "var(--font-albert, 'Albert Sans', system-ui, sans-serif)",
          fontSize: "0.825rem",
          fontWeight: 500,
          color: "#0D0C0A",
          textDecoration: "underline",
          textUnderlineOffset: "2px",
          whiteSpace: "nowrap",
          transition: "opacity 0.2s ease",
        }}
      >
        Sign in to see all findings →
      </Link>
    </div>
  )
}
