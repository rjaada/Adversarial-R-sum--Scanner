import type { Metadata } from "next"
import { Analytics } from "@vercel/analytics/next"
import { ClerkProvider } from "@clerk/nextjs"
import { Cormorant, Figtree, IBM_Plex_Mono, Albert_Sans, Unbounded } from "next/font/google"
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
  // TraceRank renders a single warm-paper light palette across every page.
  // The previous dark/light theme switcher (ThemeProvider/ThemeToggle,
  // data-theme attribute, dual CSS-variable blocks) was dead code — no page
  // consumed it — and has been removed.
  const htmlClass = [
    cormorant.variable,
    figtree.variable,
    ibmPlexMono.variable,
    albertSans.variable,
    unbounded.variable,
  ].join(" ")

  const tree = (
    <html lang="en" className={htmlClass}>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )

  // Initialize Clerk only when a publishable key is present. Without one
  // (e.g. a localhost preview that cannot reach Clerk's external domain),
  // render the app without Clerk so public pages preview cleanly. Production
  // always has a key, so this path is dev/preview-only.
  return clerkKey
    ? <ClerkProvider publishableKey={clerkKey}>{tree}</ClerkProvider>
    : tree
}
