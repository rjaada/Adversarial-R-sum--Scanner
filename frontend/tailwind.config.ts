import type { Config } from "tailwindcss"

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "#f6f3ee",
        surface: "#fbfaf7",
        ink: "#1f1d1a",
        muted: "#6f6b64",
        divider: "#d9d3ca",
        accent: "#0f5c52",
        warning: "#9a4d22",
        error: "#8c2f4e",
      },
      fontFamily: {
        display: ["Georgia", "Cambria", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["'IBM Plex Mono'", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
}
export default config
