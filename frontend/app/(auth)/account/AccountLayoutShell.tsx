"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { OptionalUserButton } from "@/components/OptionalUserButton"

const fa = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const BD = "rgba(26,25,23,0.08)"

const NAV = [
  { href: "/account",         label: "Account"       },
  { href: "/account/data",    label: "Data & Privacy" },
  { href: "/account/billing", label: "Billing"       },
]

const lightVars = {
  "--bg-base":       "#FDFCF9",
  "--bg-surface":    "#FFFFFF",
  "--bg-elevated":   "#F8F7F5",
  "--bg-muted":      "#F4F3F0",
  "--bg-accent-low": "#F0F4EC",
  "--border-subtle": BD,
  "--border-mid":    "rgba(26,25,23,0.14)",
  "--text-primary":  "#1a1917",
  "--text-secondary":"#6e6b66",
  "--text-dim":      "#a09890",
  "--accent":        "#7c8e5c",
  "--accent-hover":  "#8fa85a",
  "--sev-critical":  "#8c2f4e",
  "--sev-high":      "#9a4d22",
  "--sev-medium":    "#7a6e28",
  "--sev-low":       "#a09890",
  "--font-body":     fa,
  "--font-display":  fa,
  "--font-data":     "var(--font-mono, 'IBM Plex Mono', monospace)",
} as React.CSSProperties

const clerkAppearance = {
  variables: { colorBackground: "#FFFFFF", colorText: "#1a1917", colorPrimary: "#7c8e5c", borderRadius: "4px", fontFamily: fa },
  elements: {
    userButtonPopoverCard:   { border: `1px solid ${BD}`, boxShadow: "0 4px 16px rgba(0,0,0,0.06)", background: "#FFFFFF" },
    userButtonPopoverFooter: { display: "none" },
  },
}

export default function AccountLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ ...lightVars, background: "#FDFCF9", minHeight: "100vh", color: "#1a1917", fontFamily: fa }}>

      <nav style={{ position: "sticky", top: 0, zIndex: 50, height: 64, display: "flex", alignItems: "center", padding: "0 40px", background: "#FFFFFF", borderBottom: `1px solid ${BD}`, gap: "32px" }}>
        <Link href="/" style={{ fontFamily: fa, fontSize: "1rem", fontWeight: 600, color: "#1a1917", textDecoration: "none", letterSpacing: "-0.01em", flexShrink: 0 }}>
          TraceRank
        </Link>

        <div style={{ display: "flex", gap: "4px", flex: 1 }}>
          {NAV.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link key={href} href={href} style={{ fontFamily: fa, fontSize: "0.875rem", fontWeight: active ? 500 : 400, color: active ? "#1a1917" : "#a09890", textDecoration: "none", padding: "6px 14px", borderRadius: "100px", background: active ? "rgba(26,25,23,0.06)" : "transparent", transition: "background 0.15s, color 0.15s" }}>
                {label}
              </Link>
            )
          })}
        </div>

        <OptionalUserButton appearance={clerkAppearance} userProfileUrl="/account" userProfileMode="navigation" afterSignOutUrl="/" />
      </nav>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px 80px" }}>
        {children}
      </main>
    </div>
  )
}
