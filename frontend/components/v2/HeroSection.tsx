"use client"

import { useEffect, useState } from "react"
import { Button } from "./Button"
import { ArrowRight } from "lucide-react"
import { AnimatedSphere } from "./AnimatedSphere"

const words = ["rank", "sort", "score", "filter"]

const marqueeStats = [
  { value: "35%",  label: "weight on keyword match",  tag: "JD SCORING"  },
  { value: "4",    label: "stages in the scan pipeline", tag: "PIPELINE"  },
  { value: "23+",  label: "issue categories flagged",   tag: "ANALYSIS"   },
  { value: "5",    label: "scoring dimensions",          tag: "MODEL"      },
]

export function HeroSection() {
  const [visible, setVisible] = useState(false)
  const [wordIdx, setWordIdx] = useState(0)

  useEffect(() => { setVisible(true) }, [])

  useEffect(() => {
    const t = setInterval(() => setWordIdx((p) => (p + 1) % words.length), 2500)
    return () => clearInterval(t)
  }, [])

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden v2-noise-overlay">
      {/* Animated sphere */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[600px] h-[600px] lg:w-[800px] lg:h-[800px] opacity-30 pointer-events-none">
        <AnimatedSphere />
      </div>

      {/* Subtle grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-25">
        {[...Array(8)].map((_, i) => (
          <div key={`h-${i}`} className="absolute h-px bg-foreground/10"
            style={{ top: `${12.5*(i+1)}%`, left: 0, right: 0 }} />
        ))}
        {[...Array(12)].map((_, i) => (
          <div key={`v-${i}`} className="absolute w-px bg-foreground/10"
            style={{ left: `${8.33*(i+1)}%`, top: 0, bottom: 0 }} />
        ))}
      </div>

      <div className="relative z-10 max-w-[1400px] mx-auto px-6 lg:px-12 pt-16 pb-8">
        {/* Eyebrow */}
        <div className={`mb-8 transition-all duration-700 ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}>
          <span className="inline-flex items-center gap-3 text-sm font-mono text-muted-foreground">
            <span className="w-8 h-px bg-foreground/30" />
            Adversarial résumé intelligence
          </span>
        </div>

        {/* Headline */}
        <div className="mb-12">
          <h1
            className={`text-[clamp(3rem,6.5vw,8rem)] font-display leading-[1.05] tracking-tight transition-all duration-1000 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            <span className="block">Reveal how</span>
            <span className="block whitespace-nowrap">
              screeners{" "}
              <span className="relative inline-block">
                <span key={wordIdx} className="inline-flex">
                  {words[wordIdx].split("").map((char, i) => (
                    <span
                      key={`${wordIdx}-${i}`}
                      className="inline-block v2-char-in"
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      {char}
                    </span>
                  ))}
                </span>
                {/* visible underline under the animated word */}
                <span className="absolute -bottom-1 left-0 right-0 h-2 bg-foreground/10" />
              </span>{" "}
              you.
            </span>
          </h1>
        </div>

        {/* Description + CTAs */}
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-24 items-end">
          <p
            className={`text-xl lg:text-2xl text-muted-foreground leading-relaxed max-w-xl transition-all duration-700 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            Upload your résumé and paste the job description. TraceRank parses, scores, and surfaces every place automated hiring systems will underrate you — with specific fixes attached.
          </p>

          <div
            className={`flex flex-col sm:flex-row items-start gap-4 transition-all duration-700 delay-300 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Button size="lg" className="rounded-full group" onClick={() => window.location.href="/workspace"}>
              Start scanning free
              <ArrowRight className="w-4 h-4 ml-2 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button size="lg" variant="outline" className="rounded-full border-foreground/20 hover:bg-foreground/5" onClick={() => window.location.href="/methodology"}>
              See the methodology
            </Button>
          </div>
        </div>
      </div>

      {/* Stats marquee */}
      <div className={`absolute bottom-6 left-0 right-0 transition-all duration-700 delay-500 ${visible ? "opacity-100" : "opacity-0"}`}>
        <div className="flex gap-16 v2-marquee whitespace-nowrap">
          {[...Array(2)].map((_, setIdx) => (
            <div key={setIdx} className="flex gap-16">
              {marqueeStats.map((stat) => (
                <div key={`${stat.tag}-${setIdx}`} className="flex items-baseline gap-4">
                  <span className="text-4xl lg:text-5xl font-display">{stat.value}</span>
                  <span className="text-sm text-muted-foreground">
                    {stat.label}
                    <span className="block font-mono text-xs mt-1">{stat.tag}</span>
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
