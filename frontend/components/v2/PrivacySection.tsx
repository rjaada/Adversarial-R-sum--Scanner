"use client"

import { useEffect, useRef, useState } from "react"
import { Shield, Lock, Eye, FileCheck } from "lucide-react"

const privacyFeatures = [
  {
    icon: Shield,
    title: "Session-scoped processing",
    description: "Résumé data is held only for the duration of your scan and report generation. Nothing persists beyond your session without your explicit consent.",
  },
  {
    icon: Lock,
    title: "No training on your content",
    description: "Your résumés and job descriptions never feed back into our analysis models or any third-party AI system. Your data is not a training sample.",
  },
  {
    icon: Eye,
    title: "Minimal retention by design",
    description: "Scan history stored only with your opt-in. Delete your account and all associated data in two clicks — no 30-day delays, no hidden copies.",
  },
  {
    icon: FileCheck,
    title: "Open scoring model",
    description: "Every score weight, issue type, and severity calculation is documented and auditable in our methodology. Nothing is hidden in a black box.",
  },
]

const badges = ["No AI training", "Session-scoped", "Delete anytime", "GDPR-aware", "Open model"]

export function PrivacySection() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative py-24 lg:py-32 bg-foreground/[0.02] overflow-hidden">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Left */}
          <div className={`transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"}`}>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              Privacy
            </span>
            <h2 className="text-4xl lg:text-6xl font-display tracking-tight mb-8">
              Your résumé
              <br />
              stays yours.
            </h2>
            <p className="text-xl text-muted-foreground leading-relaxed mb-12">
              TraceRank processes your content only to generate your scan. No indexing, no sharing, no model training — your résumé isn&apos;t a data asset for us.
            </p>
            <div className="flex flex-wrap gap-3">
              {badges.map((badge, i) => (
                <span
                  key={badge}
                  className={`px-4 py-2 border border-foreground/10 text-sm font-mono transition-all duration-500 ${
                    visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                  }`}
                  style={{ transitionDelay: `${i * 50 + 200}ms` }}
                >
                  {badge}
                </span>
              ))}
            </div>
          </div>

          {/* Right */}
          <div className="grid gap-6">
            {privacyFeatures.map((feat, i) => (
              <div
                key={feat.title}
                className={`p-6 border border-foreground/10 hover:border-foreground/20 transition-all duration-500 group ${
                  visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
                }`}
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className="flex items-start gap-4">
                  <div className="shrink-0 w-10 h-10 flex items-center justify-center border border-foreground/10 group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                    <feat.icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium mb-1 group-hover:translate-x-1 transition-transform duration-300">
                      {feat.title}
                    </h3>
                    <p className="text-muted-foreground">{feat.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
