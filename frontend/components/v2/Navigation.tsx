"use client"

import { useState, useEffect } from "react"
import { useAuth, UserButton } from "@clerk/nextjs"
import { Button } from "./Button"
import { Menu, X } from "lucide-react"

// Clerk is only initialized when a publishable key is present (see layout.tsx).
// The Clerk-hook components below are rendered only when this is true; otherwise
// the static signed-out fallbacks render, so the landing page works on a
// localhost preview that can't reach Clerk's external domain.
const hasClerk = !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY

// Clerk UserButton appearance tuned for the v2 light nav
const userButtonAppearance = {
  variables: {
    colorBackground: "#FDFCF9",
    colorText: "#1a1917",
    colorTextSecondary: "#6e6b66",
    colorPrimary: "#1a1917",
    colorDanger: "#1a1917",
    borderRadius: "6px",
    fontFamily: "inherit",
  },
  elements: {
    userButtonPopoverCard: {
      backgroundColor: "#FDFCF9",
      border: "1px solid rgba(26,25,23,0.12)",
      boxShadow: "0 8px 32px rgba(26,25,23,0.10)",
    },
    userButtonPopoverMain: { backgroundColor: "#FDFCF9" },
    userButtonPopoverFooter: {
      backgroundColor: "#FDFCF9",
      borderTop: "1px solid rgba(26,25,23,0.08)",
    },
    userButtonPopoverActionButton: {
      color: "#1a1917",
      backgroundColor: "transparent",
      fontSize: "0.8rem",
    },
    userButtonPopoverActionButtonText: { color: "#1a1917" },
    userButtonPopoverActionButtonIcon: { color: "#6e6b66" },
    userButtonPopoverUserPreview: { borderBottom: "1px solid rgba(26,25,23,0.08)" },
    userPreviewMainIdentifier: { color: "#1a1917" },
    userPreviewSecondaryIdentifier: { color: "#6e6b66" },
    avatarBox: { width: "30px", height: "30px" },
  },
}

const navLinks = [
  { name: "Features",      href: "#features" },
  { name: "How it works",  href: "#how-it-works" },
  { name: "Pricing",       href: "#pricing" },
  { name: "Methodology",   href: "/methodology" },
]

// ── Desktop CTA clusters ──────────────────────────────────────────────────────

function DesktopSignedOut({ isScrolled }: { isScrolled: boolean }) {
  return (
    <>
      <a
        href="/sign-in"
        className={`text-foreground/70 hover:text-foreground transition-all duration-500 ${isScrolled ? "text-xs" : "text-sm"}`}
      >
        Sign in
      </a>
      <Button
        size="sm"
        className={`rounded-full transition-all duration-500 ${isScrolled ? "px-4 h-8 text-xs" : "px-6"}`}
        onClick={() => { window.location.href = "/sign-up" }}
      >
        Scan free
      </Button>
    </>
  )
}

function DesktopAuthClerk({ isScrolled }: { isScrolled: boolean }) {
  const { isLoaded, isSignedIn } = useAuth()
  if (isLoaded && isSignedIn) {
    return (
      <>
        <a
          href="/workspace"
          className={`text-foreground/70 hover:text-foreground transition-all duration-500 ${isScrolled ? "text-xs" : "text-sm"}`}
        >
          Workspace
        </a>
        <UserButton
          appearance={userButtonAppearance}
          userProfileUrl="/account"
          userProfileMode="navigation"
          afterSignOutUrl="/"
        />
      </>
    )
  }
  if (isLoaded && !isSignedIn) {
    return <DesktopSignedOut isScrolled={isScrolled} />
  }
  // Skeleton placeholder while Clerk loads — prevents layout shift
  return <div className={`transition-all duration-500 ${isScrolled ? "w-28 h-7" : "w-36 h-9"}`} />
}

// ── Mobile CTA clusters ───────────────────────────────────────────────────────

function MobileSignedOut({ onNavigate }: { onNavigate: () => void }) {
  return (
    <>
      <Button
        variant="outline"
        className="flex-1 rounded-full h-14 text-base"
        onClick={() => { onNavigate(); window.location.href = "/sign-in" }}
      >
        Sign in
      </Button>
      <Button
        className="flex-1 rounded-full h-14 text-base"
        onClick={() => { onNavigate(); window.location.href = "/sign-up" }}
      >
        Scan free
      </Button>
    </>
  )
}

function MobileAuthClerk({ onNavigate }: { onNavigate: () => void }) {
  const { isLoaded, isSignedIn } = useAuth()
  if (isLoaded && isSignedIn) {
    return (
      <a
        href="/workspace"
        className="flex-1 inline-flex items-center justify-center rounded-full h-14 text-base font-medium bg-foreground text-primary-foreground hover:bg-foreground/90 transition-all duration-300"
        onClick={onNavigate}
      >
        Go to Workspace
      </a>
    )
  }
  return <MobileSignedOut onNavigate={onNavigate} />
}

// ── Navigation ────────────────────────────────────────────────────────────────

export function Navigation() {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handle = () => setIsScrolled(window.scrollY > 20)
    window.addEventListener("scroll", handle)
    return () => window.removeEventListener("scroll", handle)
  }, [])

  return (
    <header
      className={`fixed z-50 transition-all duration-500 ${
        isScrolled ? "top-4 left-4 right-4" : "top-0 left-0 right-0"
      }`}
    >
      <nav
        className={`mx-auto transition-all duration-500 ${
          isScrolled || mobileOpen
            ? "bg-background/80 backdrop-blur-xl border border-foreground/10 rounded-2xl shadow-lg max-w-[1200px]"
            : "bg-transparent max-w-[1400px]"
        }`}
      >
        <div
          className={`flex items-center justify-between px-6 lg:px-8 transition-all duration-500 ${
            isScrolled ? "h-14" : "h-20"
          }`}
        >
          {/* Logo */}
          <a href="/" className="flex items-center gap-2">
            <span className={`font-display tracking-tight transition-all duration-500 ${isScrolled ? "text-xl" : "text-2xl"}`}>
              TraceRank
            </span>
            <span className={`text-muted-foreground font-mono transition-all duration-500 ${isScrolled ? "text-[9px] mt-0.5" : "text-[10px] mt-1"}`}>
              TM
            </span>
          </a>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                className="text-sm text-foreground/70 hover:text-foreground transition-colors duration-300 relative group"
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-foreground transition-all duration-300 group-hover:w-full" />
              </a>
            ))}
          </div>

          {/* Desktop CTAs */}
          <div className="hidden md:flex items-center gap-4">
            {hasClerk ? <DesktopAuthClerk isScrolled={isScrolled} /> : <DesktopSignedOut isScrolled={isScrolled} />}
          </div>

          {/* Mobile toggle */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </nav>

      {/* Mobile full-screen overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-background z-40 transition-all duration-500 ${
          mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <div className="flex flex-col h-full px-8 pt-28 pb-8">
          <div className="flex-1 flex flex-col justify-center gap-8">
            {navLinks.map((link, i) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`text-5xl font-display text-foreground hover:text-muted-foreground transition-all duration-500 ${
                  mobileOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{ transitionDelay: mobileOpen ? `${i * 75}ms` : "0ms" }}
              >
                {link.name}
              </a>
            ))}
          </div>

          <div
            className={`flex gap-4 pt-8 border-t border-foreground/10 transition-all duration-500 ${
              mobileOpen ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
            style={{ transitionDelay: mobileOpen ? "300ms" : "0ms" }}
          >
            {hasClerk
              ? <MobileAuthClerk onNavigate={() => setMobileOpen(false)} />
              : <MobileSignedOut onNavigate={() => setMobileOpen(false)} />}
          </div>
        </div>
      </div>
    </header>
  )
}
