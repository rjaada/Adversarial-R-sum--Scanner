"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from "react"

type Theme = "dark" | "light"

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
})

export function useTheme() {
  return useContext(ThemeContext)
}

function readCookie(): Theme {
  if (typeof document === "undefined") return "dark"
  const m = document.cookie.match(/(?:^|;\s*)tr-theme=(dark|light)/)
  return (m?.[1] as Theme) ?? "dark"
}

function writeCookie(t: Theme) {
  document.cookie = `tr-theme=${t};path=/;max-age=31536000;SameSite=Lax`
}

export function ThemeProvider({ children, initial = "dark" }: { children: ReactNode; initial?: Theme }) {
  const [theme, setThemeState] = useState<Theme>(initial)

  useEffect(() => {
    const cookieTheme = readCookie()
    setThemeState(cookieTheme)
    document.documentElement.setAttribute("data-theme", cookieTheme)
  }, [])

  function setTheme(t: Theme) {
    setThemeState(t)
    writeCookie(t)
    document.documentElement.setAttribute("data-theme", t)
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
