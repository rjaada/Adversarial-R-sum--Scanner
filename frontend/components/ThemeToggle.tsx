"use client"

import { useTheme } from "./ThemeProvider"
import { useAuth } from "@clerk/nextjs"

const API_BASE = ""

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const { isSignedIn, getToken } = useAuth()

  async function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)

    if (isSignedIn) {
      try {
        const token = await getToken()
        await fetch(`${API_BASE}/api/account/theme`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ theme_pref: next }),
        })
      } catch {
        // Non-fatal — cookie already updated locally
      }
    }
  }

  return (
    <button
      onClick={toggle}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      title={theme === "dark" ? "Light mode" : "Dark mode"}
      className={className}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: "var(--text-dim)",
        padding: "0.25rem",
        lineHeight: 1,
        transition: "color 0.2s ease",
        fontSize: "0.85rem",
      }}
      onMouseEnter={e => (e.currentTarget.style.color = "var(--text-secondary)")}
      onMouseLeave={e => (e.currentTarget.style.color = "var(--text-dim)")}
    >
      {theme === "dark" ? "☀" : "☾"}
    </button>
  )
}
