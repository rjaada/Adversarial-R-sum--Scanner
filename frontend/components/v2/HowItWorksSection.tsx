"use client"

import { useEffect, useRef, useState } from "react"

const steps = [
  {
    number: "I",
    title: "Upload your résumé",
    description:
      "PDF or DOCX, up to 10 MB. We extract every section: contact info, summary, experience, education, skills, and any custom sections you've added.",
    code: `// scan.ts — résumé parsed

{
  sections: [
    "contact", "summary",
    "experience", "education",
    "skills"
  ],
  pages: 1,
  parseScore: 94,
  warnings: [
    "two_column_detected",
    "table_in_skills"
  ]
}`,
  },
  {
    number: "II",
    title: "Paste the job description",
    description:
      "Any job posting — LinkedIn, Lever, Greenhouse, or raw text. We extract 15–40 distinct requirements from a typical JD in under two seconds.",
    code: `// jd.ts — requirements extracted

{
  requiredSkills: [
    "React", "TypeScript", "GraphQL"
  ],
  impliedSkills: [
    "REST APIs", "Agile workflows"
  ],
  senioritySignals: [
    "5+ years", "lead", "own"
  ],
  matchedCount: 6,
  totalRequirements: 14
}`,
  },
  {
    number: "III",
    title: "Get your scored report",
    description:
      "Issues ranked by severity. Each finding shows what failed, why it matters, and a specific rewrite suggestion. Plus your ATS plain-text preview.",
    code: `// report.ts — scan complete

{
  overallScore: 61,
  parseScore:   94,
  jdMatchScore: 43,
  issueCount:   17,
  criticalCount: 2,
  topFixes: [
    "Restructure two-column layout",
    "Add: Kubernetes, incident mgmt",
    "Rephrase 11 passive bullets"
  ]
}`,
  },
]

const styleBlock = `
  @keyframes v2-step-progress {
    from { width: 0% }
    to   { width: 100% }
  }
`

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0)
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setVisible(true) }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    const t = setInterval(() => setActiveStep((p) => (p + 1) % steps.length), 5000)
    return () => clearInterval(t)
  }, [])

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
                          style={{ animation: "v2-step-progress 5s linear forwards" }} />
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Code display */}
          <div className="lg:sticky lg:top-32 self-start">
            <div className="border border-background/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-background/10 flex items-center justify-between">
                <div className="flex gap-2">
                  {[0,1,2].map((i) => <div key={i} className="w-3 h-3 rounded-full bg-background/20" />)}
                </div>
                <span className="text-xs font-mono text-background/40">scan.ts</span>
              </div>

              <div className="p-8 font-mono text-sm min-h-[300px]">
                <pre className="text-background/70">
                  {steps[activeStep].code.split("\n").map((line, li) => (
                    <div
                      key={`${activeStep}-${li}`}
                      className="leading-loose v2-code-line"
                      style={{ animationDelay: `${li * 80}ms` }}
                    >
                      <span className="text-background/20 select-none w-8 inline-block">{li + 1}</span>
                      <span className="inline-flex">
                        {line.split("").map((char, ci) => (
                          <span
                            key={`${activeStep}-${li}-${ci}`}
                            className="v2-code-char"
                            style={{ animationDelay: `${li * 80 + ci * 15}ms` }}
                          >
                            {char === " " ? " " : char}
                          </span>
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              </div>

              <div className="px-6 py-4 border-t border-background/10 flex items-center gap-3">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs font-mono text-background/40">Analysis complete</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
