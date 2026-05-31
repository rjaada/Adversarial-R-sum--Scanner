import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import { Cormorant, Figtree, IBM_Plex_Mono } from "next/font/google"
import { ThemeProvider } from "@/components/ThemeProvider"
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

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const htmlClass = `${cormorant.variable} ${figtree.variable} ${ibmPlexMono.variable}`

  const inner = (
    <html lang="en" data-theme="dark" suppressHydrationWarning className={htmlClass}>
      <body>
        <ThemeProvider initial="dark">
          {children}
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  )

  // ClerkProvider throws at build time if the publishable key is missing.
  // When NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set (e.g. during a build
  // before env vars are configured), skip ClerkProvider so the build succeeds.
  // Auth hooks will be no-ops until the key is present at runtime.
  if (!clerkKey) return inner

  return <ClerkProvider publishableKey={clerkKey}>{inner}</ClerkProvider>
}
