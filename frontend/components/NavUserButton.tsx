"use client"

import Link from "next/link"
import { UserButton, useAuth } from "@clerk/nextjs"
import { ThemeToggle } from "./ThemeToggle"

const clerkUserButtonAppearance = {
  variables: {
    colorBackground: "#1a1916",
    colorText: "#ede8df",
    colorTextSecondary: "#9a9489",
    colorPrimary: "#7c8e5c",
    colorDanger: "#c07080",
    borderRadius: "2px",
    fontFamily: "Figtree, system-ui, sans-serif",
  },
  elements: {
    userButtonPopoverCard: {
      backgroundColor: "#1a1916",
      border: "1px solid #2a2824",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    },
    userButtonPopoverMain: {
      backgroundColor: "#1a1916",
    },
    userButtonPopoverFooter: {
      backgroundColor: "#1a1916",
      borderTop: "1px solid #2a2824",
    },
    userButtonPopoverActionButton: {
      color: "#ede8df",
      backgroundColor: "transparent",
      fontFamily: "Figtree, system-ui, sans-serif",
      fontSize: "0.8rem",
    },
    userButtonPopoverActionButtonText: {
      color: "#ede8df",
    },
    userButtonPopoverActionButtonIcon: {
      color: "#9a9489",
    },
    userButtonPopoverUserPreview: {
      borderBottom: "1px solid #2a2824",
    },
    userPreviewMainIdentifier: {
      color: "#ede8df",
    },
    userPreviewSecondaryIdentifier: {
      color: "#9a9489",
    },
    avatarBox: {
      width: "32px",
      height: "32px",
    },
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
