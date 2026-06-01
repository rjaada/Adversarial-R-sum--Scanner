import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import { Cormorant, Figtree, IBM_Plex_Mono, Albert_Sans, Unbounded } from "next/font/google"
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
const albertSans = Albert_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-albert",
  display: "swap",
})
const unbounded = Unbounded({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-unbounded",
  display: "swap",
})

export const metadata: Metadata = {
  title: "TraceRank — Adversarial Résumé Scanner",
  description: "See exactly where ATS systems and LLM screeners will reject your résumé.",
}

const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const htmlClass = [
    cormorant.variable,
    figtree.variable,
    ibmPlexMono.variable,
    albertSans.variable,
    unbounded.variable,
  ].join(" ")

  return (
    <ClerkProvider publishableKey={clerkKey ?? ""}>
      <html lang="en" data-theme="dark" suppressHydrationWarning className={htmlClass}>
        <body>
          <ThemeProvider initial="dark">
            {children}
          </ThemeProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
