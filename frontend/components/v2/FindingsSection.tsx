"use client"

import { useEffect, useState } from "react"

const findings = [
  {
    text: "Your résumé header was parsed as unlabeled filler text. 'Senior Product Manager at Stripe' was extracted as an unstructured fragment — ATS systems assigned it zero job-title confidence.",
    category: "Parse Integrity",
    severity: "Critical",
    metric: "Section binding lost",
  },
  {
    text: "Nine of fourteen JD requirements were unmatched. 'Kubernetes', 'incident management', and 'cross-functional roadmap ownership' appear in the JD but not in your résumé.",
    category: "JD Match Score",
    severity: "High",
    metric: "64% match score",
  },
  {
    text: "Eleven bullet points use passive or weak verbs: 'was responsible for', 'helped with', 'participated in'. Impact scoring penalizes these patterns across major ATS platforms.",
    category: "Phrasing Analysis",
    severity: "Medium",
    metric: "11 flagged phrases",
  },
  {
    text: "Two-column layout collapsed into a single stream. Your skills section appeared after your education block — ATS read them out of order and dropped the column boundary entirely.",
    category: "ATS Preview",
    severity: "Critical",
    metric: "Column order lost",
  },
]

const archetypes = [
  "Product Manager", "Software Engineer", "Data Scientist", "UX Designer",
  "Engineering Manager", "Operations Lead", "Marketing Director", "Finance Analyst",
  "Product Designer", "Solutions Architect", "Technical Lead", "Growth Manager",
]

const severityColor: Record<string, string> = {
  Critical: "text-red-600",
  High:     "text-orange-600",
  Medium:   "text-yellow-700",
}

export function FindingsSection() {
  const [activeIdx, setActiveIdx] = useState(0)
  const [animating, setAnimating] = useState(false)

  useEffect(() => {
    const t = setInterval(() => {
      setAnimating(true)
      setTimeout(() => {
        setActiveIdx((p) => (p + 1) % findings.length)
        setAnimating(false)
      }, 300)
    }, 5000)
    return () => clearInterval(t)
  }, [])

  const active = findings[activeIdx]

  return (
    <section className="relative py-32 lg:py-40 border-t border-foreground/10 lg:pb-14">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Section label */}
        <div className="flex items-center gap-4 mb-16">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase">
            What we find
          </span>
          <div className="flex-1 h-px bg-foreground/10" />
          <span className="font-mono text-xs text-muted-foreground">
            {String(activeIdx + 1).padStart(2, "0")} / {String(findings.length).padStart(2, "0")}
          </span>
        </div>

        {/* Main finding */}
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-20">
          <div className="lg:col-span-8">
            <blockquote
              className={`transition-all duration-300 ${animating ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}
            >
              <p className="font-display text-4xl md:text-5xl lg:text-6xl leading-[1.1] tracking-tight text-foreground">
                &ldquo;{active.text}&rdquo;
              </p>
            </blockquote>

            <div
              className={`mt-12 flex items-center gap-6 transition-all duration-300 delay-100 ${animating ? "opacity-0" : "opacity-100"}`}
            >
              <div className="w-16 h-16 border border-foreground/10 flex items-center justify-center">
                <span className="font-mono text-xs text-muted-foreground">{active.severity.slice(0, 3).toUpperCase()}</span>
              </div>
              <div>
                <p className={`text-lg font-medium ${severityColor[active.severity] ?? ""}`}>
                  {active.severity} severity
                </p>
                <p className="text-muted-foreground">{active.category}</p>
              </div>
            </div>
          </div>

          {/* Metric card */}
          <div className="lg:col-span-4 flex flex-col justify-center">
            <div
              className={`p-8 border border-foreground/10 transition-all duration-300 ${animating ? "opacity-0 scale-95" : "opacity-100 scale-100"}`}
            >
              <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase block mb-4">
                Finding
              </span>
              <p className="font-display text-3xl md:text-4xl text-foreground">{active.metric}</p>
            </div>

            {/* Nav dots */}
            <div className="flex gap-2 mt-8">
              {findings.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setAnimating(true)
                    setTimeout(() => { setActiveIdx(i); setAnimating(false) }, 300)
                  }}
                  className={`h-2 transition-all duration-300 ${
                    i === activeIdx ? "w-8 bg-foreground" : "w-2 bg-foreground/20 hover:bg-foreground/40"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Archetypes marquee */}
        <div className="mt-24 pt-12 border-t border-foreground/10">
          <p className="font-mono text-xs tracking-widest text-muted-foreground uppercase mb-8 text-center">
            Common across every job title
          </p>
        </div>
      </div>

      {/* Full-width marquee */}
      <div className="w-full">
        <div className="flex gap-16 items-center v2-marquee">
          {[...Array(2)].map((_, si) => (
            <div key={si} className="flex gap-16 items-center shrink-0">
              {archetypes.map((arch) => (
                <span
                  key={`${si}-${arch}`}
                  className="font-display text-xl md:text-2xl text-foreground/30 whitespace-nowrap hover:text-foreground transition-colors duration-300"
                >
                  {arch}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
