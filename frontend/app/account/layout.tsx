"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { UserButton } from "@clerk/nextjs"

const NAV = [
  { href: "/account", label: "Account" },
  { href: "/account/data", label: "Data & Privacy" },
  { href: "/account/billing", label: "Billing" },
]

const clerkUserButtonAppearance = {
  variables: {
    colorBackground: "var(--bg-elevated)",
    colorText: "var(--text-primary)",
    colorPrimary: "var(--accent)",
    borderRadius: "2px",
    fontFamily: "var(--font-body)",
  },
  elements: {
    userButtonPopoverCard: {
      border: "1px solid var(--border-subtle)",
      boxShadow: "none",
      background: "var(--bg-elevated)",
    },
    userButtonPopoverFooter: { display: "none" },
  },
}

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", color: "var(--text-primary)", fontFamily: "var(--font-body)" }}>

      <nav style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: 58,
        background: "rgba(13,12,10,0.96)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link href="/" style={{ fontFamily: "var(--font-display)", fontSize: "1.05rem", fontWeight: 400, color: "var(--text-primary)", textDecoration: "none" }}>
            TraceRank
          </Link>
          <div style={{ display: "flex", gap: "1.5rem" }}>
            {NAV.map(({ href, label }) => {
              const active = pathname === href
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    fontFamily: "var(--font-body)", fontSize: "0.78rem",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                    textDecoration: "none",
                    borderBottom: active ? "1px solid var(--accent)" : "1px solid transparent",
                    paddingBottom: "2px",
                    transition: "color 0.2s ease",
                  }}
                >
                  {label}
                </Link>
              )
            })}
          </div>
        </div>
        <UserButton appearance={clerkUserButtonAppearance} />
      </nav>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "3.5rem 2rem 6rem" }}>
        {children}
      </main>

    </div>
  )
}
