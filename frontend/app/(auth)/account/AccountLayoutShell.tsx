"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"

const fa = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"

const NAV = [
  { href: "/account",       label: "Account"       },
  { href: "/account/data",  label: "Data & Privacy" },
  { href: "/account/billing", label: "Billing"     },
]

// Light theme CSS variable overrides — identical to workspace
const lightVars = {
  "--bg-base":       "#F4F4F4",
  "--bg-surface":    "#FFFFFF",
  "--bg-elevated":   "#FAFAFA",
  "--bg-muted":      "#F4F4F4",
  "--bg-accent-low": "#F0F4EC",
  "--border-subtle": "#EBEBEB",
  "--border-mid":    "#DCDCDC",
  "--text-primary":  "#0D0C0A",
  "--text-secondary":"#474546",
  "--text-dim":      "#858585",
  "--accent":        "#7c8e5c",
  "--accent-hover":  "#8fa85a",
  "--sev-critical":  "#8c2f4e",
  "--sev-high":      "#9a4d22",
  "--sev-medium":    "#7a6e28",
  "--sev-low":       "#858585",
  "--mineral":       "#4a4640",
  "--font-body":     fa,
  "--font-display":  fa,
  "--font-data":     "var(--font-mono, 'IBM Plex Mono', monospace)",
} as React.CSSProperties

const clerkUserButtonAppearance = {
  variables: {
    colorBackground: "#FFFFFF",
    colorText:       "#0D0C0A",
    colorPrimary:    "#7c8e5c",
    borderRadius:    "4px",
    fontFamily:      fa,
  },
  elements: {
    userButtonPopoverCard: {
      border:     "1px solid #EBEBEB",
      boxShadow:  "0 4px 16px rgba(0,0,0,0.08)",
      background: "#FFFFFF",
    },
    userButtonPopoverFooter: { display: "none" },
  },
}

export default function AccountLayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{
      ...lightVars,
      background:  "#F4F4F4",
      minHeight:   "100vh",
      color:       "#0D0C0A",
      fontFamily:  fa,
    }}>

      {/* Nav — white, matching site style */}
      <nav style={{
        position:     "sticky",
        top:          0,
        zIndex:       50,
        height:       64,
        display:      "flex",
        alignItems:   "center",
        padding:      "0 40px",
        background:   "#FFFFFF",
        borderBottom: "1px solid #EBEBEB",
        gap:          "32px",
      }}>
        {/* Wordmark */}
        <Link href="/" style={{
          fontFamily:     fa,
          fontSize:       "1rem",
          fontWeight:     600,
          color:          "#0D0C0A",
          textDecoration: "none",
          letterSpacing:  "-0.01em",
          flexShrink:     0,
        }}>
          TraceRank
        </Link>

        {/* Sub-nav links */}
        <div style={{ display: "flex", gap: "4px", flex: 1 }}>
          {NAV.map(({ href, label }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                style={{
                  fontFamily:      fa,
                  fontSize:        "0.875rem",
                  fontWeight:      active ? 500 : 400,
                  color:           active ? "#0D0C0A" : "#858585",
                  textDecoration:  "none",
                  padding:         "6px 14px",
                  borderRadius:    "100px",
                  background:      active ? "#F4F4F4" : "transparent",
                  transition:      "background 0.15s, color 0.15s",
                }}
              >
                {label}
              </Link>
            )
          })}
        </div>

        {/* User button */}
        <UserButton
          appearance={clerkUserButtonAppearance}
          userProfileUrl="/account"
          userProfileMode="navigation"
          afterSignOutUrl="/"
        />
      </nav>

      {/* Page content */}
      <main style={{
        maxWidth: 680,
        margin:   "0 auto",
        padding:  "48px 24px 80px",
      }}>
        {children}
      </main>
    </div>
  )
}
