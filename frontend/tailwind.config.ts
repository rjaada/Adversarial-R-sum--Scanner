import type { Config } from "tailwindcss"

// Tailwind mirrors the CSS custom-property design system in globals.css.
// Dark-first. CSS variables are the source of truth — these are for Tailwind utility class access.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "bg-base":       "var(--bg-base)",
        "bg-surface":    "var(--bg-surface)",
        "bg-elevated":   "var(--bg-elevated)",
        "bg-muted":      "var(--bg-muted)",
        "border-subtle": "var(--border-subtle)",
        "border-mid":    "var(--border-mid)",
        "text-primary":  "var(--text-primary)",
        "text-secondary":"var(--text-secondary)",
        "text-dim":      "var(--text-dim)",
        accent:          "var(--accent)",
        "accent-hover":  "var(--accent-hover)",
        "sev-critical":  "var(--sev-critical)",
        "sev-high":      "var(--sev-high)",
        "sev-medium":    "var(--sev-medium)",
      },
      fontFamily: {
        display: ["var(--font-cormorant)", "Georgia", "serif"],
        sans:    ["var(--font-figtree)",   "system-ui", "sans-serif"],
        mono:    ["var(--font-mono)",      "'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
}
export default config
