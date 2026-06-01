"use client"

import { useEffect, useRef, useState } from "react"

// ── Step panel data ─────────────────────────────────────────────────────────

type ParseItem  = { label: string; ok: boolean; note?: string }
type MatchItem  = { label: string; matched: boolean }
type FindingItem = { sev: "Critical" | "High" | "Medium"; title: string; detail: string }

const panelData = {
  parse: {
    label: "Résumé parsed",
    score: { value: 94, label: "Parse score" },
    sections: [
      { label: "Contact info",        ok: true  },
      { label: "Summary",             ok: true  },
      { label: "Experience · 4 roles",ok: true  },
      { label: "Education",           ok: true  },
      { label: "Skills",              ok: true  },
    ] as ParseItem[],
    warnings: [
      "Two-column layout detected — may collapse in ATS",
      "Table found in skills section — likely to be dropped",
    ],
  },
  jd: {
    label: "14 requirements extracted",
    matched: [
      "React", "TypeScript", "Node.js", "REST APIs", "Agile", "Cross-functional",
    ] as MatchItem["label"][],
    unmatched: [
      "Kubernetes", "GraphQL", "Incident management", "System design",
      "5+ years ownership", "On-call rotation", "Infrastructure-as-code", "Go",
    ] as MatchItem["label"][],
  },
  report: {
    label: "17 issues · score 61 / 100",
    overall: 61,
    findings: [
      { sev: "Critical", title: "Two-column layout collapsed", detail: "ATS reads résumé sections out of sequence" },
      { sev: "Critical", title: "Header parsed as filler text",  detail: "Job title stripped of context by parser" },
      { sev: "High",     title: "8 of 14 JD requirements missing", detail: "Kubernetes, GraphQL, incident mgmt absent" },
      { sev: "Medium",   title: "11 passive-voice bullets",        detail: "\"was responsible for\" penalised by screeners" },
    ] as FindingItem[],
  },
}

const sevStyle: Record<FindingItem["sev"], string> = {
  Critical: "bg-background/15 text-background/80",
  High:     "bg-background/10 text-background/60",
  Medium:   "bg-background/[0.06] text-background/40",
}

// ── Sub-panels ───────────────────────────────────────────────────────────────

function ParsePanel({ active }: { active: boolean }) {
  const d = panelData.parse
  return (
    <div className="p-6 min-h-[300px] flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-background/40 uppercase tracking-widest">Sections extracted</span>
        <span className="text-xs font-mono text-background/40">{d.score.value}% parse score</span>
      </div>

      <div className="space-y-1">
        {d.sections.map((s, i) => (
          <div
            key={s.label}
            className={`flex items-center gap-3 py-2 border-b border-background/5 transition-all duration-500 ${
              active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
            }`}
            style={{ transitionDelay: active ? `${i * 80}ms` : "0ms" }}
          >
            <span className="text-background/50 text-xs">✓</span>
            <span className="text-sm text-background/80">{s.label}</span>
          </div>
        ))}
      </div>

      <div className="mt-2 space-y-2">
        {d.warnings.map((w, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 px-3 py-2 bg-background/[0.06] border border-background/10 transition-all duration-500 ${
              active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
            }`}
            style={{ transitionDelay: active ? `${(d.sections.length + i) * 80}ms` : "0ms" }}
          >
            <span className="text-background/40 text-xs mt-0.5 shrink-0">⚠</span>
            <span className="text-xs text-background/40">{w}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function JDPanel({ active }: { active: boolean }) {
  const d = panelData.jd
  return (
    <div className="p-6 min-h-[300px] flex flex-col gap-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono text-background/40 uppercase tracking-widest">Match analysis</span>
        <span className="text-xs font-mono text-background/40">{d.matched.length} / {d.matched.length + d.unmatched.length} matched</span>
      </div>

      <div>
        <p className="text-xs text-background/30 font-mono mb-2 uppercase tracking-widest">Present</p>
        <div className="flex flex-wrap gap-2">
          {d.matched.map((m, i) => (
            <span
              key={m}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-background/10 border border-background/20 text-xs text-background/70 transition-all duration-500 ${
                active ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              style={{ transitionDelay: active ? `${i * 60}ms` : "0ms" }}
            >
              <span>✓</span>{m}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs text-background/30 font-mono mb-2 uppercase tracking-widest">Missing</p>
        <div className="flex flex-wrap gap-2">
          {d.unmatched.map((u, i) => (
            <span
              key={u}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-background/[0.04] border border-background/10 text-xs text-background/35 transition-all duration-500 ${
                active ? "opacity-100 scale-100" : "opacity-0 scale-95"
              }`}
              style={{ transitionDelay: active ? `${(d.matched.length + i) * 60}ms` : "0ms" }}
            >
              <span>✗</span>{u}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}

function ReportPanel({ active }: { active: boolean }) {
  const d = panelData.report
  const filled = Math.round(d.overall / 10)
  return (
    <div className="p-6 min-h-[300px] flex flex-col gap-4">
      {/* Score bar */}
      <div
        className={`flex items-center justify-between px-4 py-3 border border-background/10 transition-all duration-500 ${
          active ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"
        }`}
      >
        <span className="text-xs font-mono text-background/40">Overall score</span>
        <div className="flex items-center gap-3">
          <div className="flex gap-0.5">
            {[...Array(10)].map((_, i) => (
              <span key={i} className={`block w-2 h-2 rounded-sm ${i < filled ? "bg-background/70" : "bg-background/15"}`} />
            ))}
          </div>
          <span className="font-mono text-sm text-background/80">{d.overall}<span className="text-background/30">/100</span></span>
        </div>
      </div>

      {/* Findings */}
      <div className="space-y-2">
        {d.findings.map((f, i) => (
          <div
            key={i}
            className={`px-4 py-3 border border-background/10 hover:border-background/20 transition-all duration-500 ${
              active ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-4"
            }`}
            style={{ transitionDelay: active ? `${(i + 1) * 100}ms` : "0ms" }}
          >
            <div className="flex items-start gap-3">
              <span className={`shrink-0 px-1.5 py-0.5 text-[10px] font-mono rounded-sm ${sevStyle[f.sev]}`}>
                {f.sev}
              </span>
              <div>
                <p className="text-sm text-background/80">{f.title}</p>
                <p className="text-xs text-background/40 mt-0.5">{f.detail}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Steps config ─────────────────────────────────────────────────────────────

const steps = [
  {
    number: "I",
    title: "Upload your résumé",
    description: "PDF or DOCX, up to 10 MB. We extract every section: contact info, summary, experience, education, skills, and any custom sections you've added.",
    panelLabel: "Résumé parsed",
    panel: (active: boolean) => <ParsePanel active={active} />,
  },
  {
    number: "II",
    title: "Paste the job description",
    description: "Any job posting — LinkedIn, Lever, Greenhouse, or raw text. We extract 15–40 distinct requirements from a typical JD in under two seconds.",
    panelLabel: "14 requirements extracted",
    panel: (active: boolean) => <JDPanel active={active} />,
  },
  {
    number: "III",
    title: "Get your scored report",
    description: "Issues ranked by severity. Each finding shows what failed, why it matters, and a specific rewrite suggestion. Plus your ATS plain-text preview.",
    panelLabel: "17 issues · score 61/100",
    panel: (active: boolean) => <ReportPanel active={active} />,
  },
]

const styleBlock = `
  @keyframes v2-step-progress {
    from { width: 0% }
    to   { width: 100% }
  }
`

// ── Section ──────────────────────────────────────────────────────────────────

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0)
  const [displayedStep, setDisplayedStep] = useState(0)
  const [panelVisible, setPanelVisible] = useState(true)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActiveStep((p) => (p + 1) % steps.length), 6000)
    return () => clearInterval(t)
  }, [])

  // Fade out → swap content → fade in
  useEffect(() => {
    if (activeStep === displayedStep) return
    setPanelVisible(false)
    const t = setTimeout(() => {
      setDisplayedStep(activeStep)
      setPanelVisible(true)
    }, 220)
    return () => clearTimeout(t)
  }, [activeStep, displayedStep])

  return (
    <section
      id="how-it-works"
      ref={ref}
      className="relative py-24 lg:py-32 bg-foreground text-background overflow-hidden"
    >
      <style dangerouslySetInnerHTML={{ __html: styleBlock }} />

      {/* Diagonal pattern */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: "repeating-linear-gradient(-45deg, transparent, transparent 40px, currentColor 40px, currentColor 41px)" }} />

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12">
        <div className="mb-16 lg:mb-24">
          <span className="inline-flex items-center gap-3 text-sm font-mono text-background/50 mb-6">
            <span className="w-8 h-px bg-background/30" />
            Process
          </span>
          <h2
            className={`text-4xl lg:text-6xl font-display tracking-tight transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Three steps.
            <br />
            <span className="text-background/50">Full clarity.</span>
          </h2>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24">
          {/* Steps list */}
          <div className="space-y-0">
            {steps.map((step, index) => (
              <button
                key={step.number}
                type="button"
                onClick={() => setActiveStep(index)}
                className={`w-full text-left py-8 border-b border-background/10 transition-all duration-500 group ${
                  activeStep === index ? "opacity-100" : "opacity-40 hover:opacity-70"
                }`}
              >
                <div className="flex items-start gap-6">
                  <span className="font-display text-3xl text-background/30">{step.number}</span>
                  <div className="flex-1">
                    <h3 className="text-2xl lg:text-3xl font-display mb-3 group-hover:translate-x-2 transition-transform duration-300">
                      {step.title}
                    </h3>
                    <p className="text-background/60 leading-relaxed">{step.description}</p>
                    {activeStep === index && (
                      <div className="mt-4 h-px bg-background/20 overflow-hidden">
                        <div className="h-full bg-background w-0"
                          style={{ animation: "v2-step-progress 6s linear forwards" }} />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Findings panel */}
          <div className="lg:sticky lg:top-32 self-start">
            <div className="border border-background/10 overflow-hidden">
              {/* Panel header */}
              <div className="px-6 py-4 border-b border-background/10 flex items-center justify-between">
                <div className="flex gap-2">
                  {[0,1,2].map((i) => <div key={i} className="w-3 h-3 rounded-full bg-background/20" />)}
                </div>
                <span className={`text-xs font-mono text-background/40 transition-opacity duration-200 ${panelVisible ? "opacity-100" : "opacity-0"}`}>{steps[displayedStep].panelLabel}</span>
              </div>

              {/* Panel content — fades out, swaps, fades in on step change */}
              <div
                key={displayedStep}
                className={`transition-all duration-200 ${panelVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
              >
                {steps[displayedStep].panel(true)}
              </div>

              {/* Status bar */}
              <div className="px-6 py-4 border-t border-background/10 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-background/40 animate-pulse" />
                <span className={`text-xs font-mono text-background/40 transition-opacity duration-200 ${panelVisible ? "opacity-100" : "opacity-0"}`}>
                  {displayedStep === 0 ? "Parsing complete" : displayedStep === 1 ? "Requirements extracted" : "Report ready"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
