"use client"

import Link from "next/link"
import { UserButton, useAuth } from "@clerk/nextjs"
import { ThemeToggle } from "./ThemeToggle"

const clerkUserButtonAppearance = {
  variables: {
    colorBackground: "#131210",
    colorText: "#ede8df",
    colorTextSecondary: "#9a9489",
    colorPrimary: "#7c8e5c",
    borderRadius: "2px",
    fontFamily: "var(--font-figtree, Figtree, system-ui, sans-serif)",
  },
  elements: {
    userButtonPopoverCard: {
      border: "1px solid #2a2824",
      boxShadow: "none",
      background: "#131210",
    },
    userButtonPopoverActionButton: {
      fontFamily: "var(--font-figtree, Figtree, system-ui, sans-serif)",
      fontSize: "0.8rem",
    },
    userButtonPopoverFooter: { display: "none" },
  },
}

export function NavUserButton() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return null

  if (isSignedIn) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
        <ThemeToggle />
        <UserButton appearance={clerkUserButtonAppearance} />
      </div>
    )
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
      <Link
        href="/sign-in"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.78rem",
          color: "var(--text-secondary)",
          textDecoration: "none",
          transition: "color 0.2s ease",
        }}
      >
        Sign in
      </Link>
      <Link
        href="/sign-up"
        style={{
          fontFamily: "var(--font-body)",
          fontSize: "0.78rem",
          fontWeight: 500,
          color: "var(--accent)",
          textDecoration: "none",
          transition: "color 0.2s ease",
        }}
      >
        Sign up
      </Link>
    </div>
  )
}
