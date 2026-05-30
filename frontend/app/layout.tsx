import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { Cormorant, Figtree, IBM_Plex_Mono } from "next/font/google"
import "./globals.css"

const cormorant = Cormorant({
  subsets: ["latin"],
  weight: ["300", "400", "600"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
})
const figtree = Figtree({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-figtree",
  display: "swap",
})
const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
  display: "swap",
})

export const metadata: Metadata = {
  title: "TraceRank — Adversarial Résumé Scanner",
  description: "See exactly where ATS systems and LLM screeners will reject your résumé.",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${cormorant.variable} ${figtree.variable} ${ibmPlexMono.variable}`}>
      <body>{children}<Analytics /></body>
    </html>
  )
}
