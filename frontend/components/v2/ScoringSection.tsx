"use client"

import { useEffect, useRef, useState } from "react"

function AnimatedCounter({ end, suffix = "" }: { end: number; suffix?: string }) {
  const [count, setCount] = useState(0)
  const [animated, setAnimated] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting && !animated) {
          setAnimated(true)
          const start = performance.now()
          const duration = 1800
          const animate = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * end))
            if (progress < 1) requestAnimationFrame(animate)
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.5 }
    )
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [end, animated])

  return (
    <div ref={ref} className="text-6xl lg:text-8xl font-display tracking-tight">
      {count}{suffix}
    </div>
  )
}

const dimensions = [
  { value: 35, suffix: "%", label: "Keyword & concept match", detail: "Extracted JD requirements vs résumé content across direct, inferred, and contextual matches." },
  { value: 25, suffix: "%", label: "Experience alignment",    detail: "Seniority, scope, and domain relevance scored against stated and inferred JD requirements." },
  { value: 20, suffix: "%", label: "Parse integrity",         detail: "How much of your résumé survives ATS extraction without corruption, reordering, or loss." },
  { value: 10, suffix: "%", label: "Structure",               detail: "Expected sections found and recognizable — summary, experience, education, skills." },
  { value: 10, suffix: "%", label: "Quantified impact",       detail: "Strength of phrasing, quantification of achievements, and active-voice framing throughout." },
]

export function ScoringSection() {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  return (
    <section ref={ref} className="relative py-24 lg:py-32 border-y border-foreground/10">
      <div className="max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 mb-16 lg:mb-24">
          <div>
            <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground mb-6">
              <span className="w-8 h-px bg-foreground/30" />
              Scoring model
            </span>
            <h2
              className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
              }`}
            >
              Built to be
              <br />
              audited.
            </h2>
          </div>
          <p className="text-muted-foreground font-mono text-sm max-w-xs">
            Five dimensions. Explicit weights. No black box — every score is traceable to specific findings in your résumé.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-foreground/10">
          {dimensions.map((dim, i) => (
            <div
              key={dim.label}
              className={`bg-background p-8 lg:p-12 transition-all duration-700 ${
                visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              } ${i === dimensions.length - 1 ? "md:col-span-2" : ""}`}
              style={{ transitionDelay: `${i * 100}ms` }}
            >
              <AnimatedCounter end={dim.value} suffix={dim.suffix} />
              <div className="mt-4 text-lg font-medium">{dim.label}</div>
              <div className="mt-2 text-sm text-muted-foreground leading-relaxed">{dim.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
