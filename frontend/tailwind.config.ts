import type { Config } from "tailwindcss"

// The only Tailwind color utilities used in the codebase are the v2 landing
// tokens (foreground / background / muted / primary-foreground), whose RGB
// channel values are defined, scoped, in app/v2/v2.css under `.v2-page`.
// The former bg-base / text-primary / sev-* utilities mapped to globals.css
// theme variables that no longer exist (dark theme removed) and were unused —
// they have been dropped.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        foreground:           "rgb(var(--v2-fg) / <alpha-value>)",
        background:           "rgb(var(--v2-bg) / <alpha-value>)",
        "muted-foreground":   "rgb(var(--v2-muted-fg) / <alpha-value>)",
        muted:                "rgb(var(--v2-muted) / <alpha-value>)",
        "primary-foreground": "rgb(var(--v2-bg) / <alpha-value>)",
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
