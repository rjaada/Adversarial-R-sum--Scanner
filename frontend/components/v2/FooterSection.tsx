"use client"

import { ArrowUpRight } from "lucide-react"
import { AnimatedWave } from "./AnimatedWave"

const footerLinks = {
  Product: [
    { name: "Features",     href: "#features" },
    { name: "How it works", href: "#how-it-works" },
    { name: "Pricing",      href: "#pricing" },
    { name: "Methodology",  href: "/methodology" },
    { name: "Workspace",    href: "/workspace" },
  ],
  Company: [
    { name: "Privacy",  href: "/privacy" },
    { name: "Terms",    href: "/terms" },
    { name: "Contact",  href: "mailto:hello@tracerank.com" },
  ],
  Support: [
    { name: "Documentation", href: "#" },
    { name: "Status",        href: "#" },
    { name: "GitHub",        href: "#", badge: "Open" },
  ],
}

export function FooterSection() {
  return (
    <footer className="relative border-t border-foreground/10">
      <div className="absolute inset-0 h-64 opacity-15 pointer-events-none overflow-hidden">
        <AnimatedWave />
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="py-16 lg:py-24">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-12 lg:gap-8">
            {/* Brand */}
            <div className="col-span-2">
              <a href="/" className="inline-flex items-center gap-2 mb-6">
                <span className="text-2xl font-display">TraceRank</span>
                <span className="text-xs text-muted-foreground font-mono">TM</span>
              </a>
              <p className="text-muted-foreground leading-relaxed mb-8 max-w-xs">
                See what machines see. Know before you apply. Built for job seekers who want to stop guessing.
              </p>
            </div>

            {/* Link columns */}
            {Object.entries(footerLinks).map(([title, links]) => (
              <div key={title}>
                <h3 className="text-sm font-medium mb-6">{title}</h3>
                <ul className="space-y-4">
                  {links.map((link) => (
                    <li key={link.name}>
                      <a
                        href={link.href}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-2"
                      >
                        {link.name}
                        {"badge" in link && link.badge && (
                          <span className="text-xs px-2 py-0.5 bg-foreground text-primary-foreground rounded-full">
                            {link.badge}
                          </span>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="py-8 border-t border-foreground/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            2025 TraceRank. All rights reserved.
          </p>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              All systems operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
