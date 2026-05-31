import Link from "next/link"

interface Props {
  label: string
}

export function UpgradePrompt({ label }: Props) {
  return (
    <div
      style={{
        padding: "14px 20px",
        borderBottom: "1px solid #EBEBEB",
        background: "#FAFAFA",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-albert, 'Albert Sans', system-ui, sans-serif)",
          fontSize: "0.8rem",
          color: "#858585",
        }}
      >
        {label}
      </span>
      <Link
        href="/sign-up"
        style={{
          fontFamily: "var(--font-albert, 'Albert Sans', system-ui, sans-serif)",
          fontSize: "0.8rem",
          fontWeight: 500,
          color: "#0D0C0A",
          textDecoration: "underline",
          textUnderlineOffset: "2px",
          whiteSpace: "nowrap",
          transition: "opacity 0.2s ease",
        }}
      >
        Sign in →
      </Link>
    </div>
  )
}
