"use client"

import { ArrowRight, Check } from "lucide-react"

const plans = [
  {
    name: "Free",
    description: "The full scanner, no commitment",
    price: "$0",
    period: "forever",
    features: [
      "Unlimited scans",
      "Overall score /100",
      "Score breakdown (5 signals)",
      "Issue evidence & fix patterns",
      "Keyword gap analysis",
      "90-day scan history",
    ],
    cta: "Start scanning free",
    href: "/workspace",
    comingSoon: false,
  },
  {
    name: "Pro",
    description: "In development",
    price: "$9",
    period: "/month",
    features: [
      "Everything in Free",
      "12-month scan history",
      "Compare mode",
      "PDF export",
      "AI rewrite suggestions — per issue",
    ],
    cta: "Coming soon",
    href: null,
    comingSoon: true,
  },
]

export function PricingSection() {
  return (
    <section id="pricing" className="relative py-32 lg:py-40 border-t border-foreground/10">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        {/* Header */}
        <div className="max-w-3xl mb-20">
          <span className="font-mono text-xs tracking-widest text-muted-foreground uppercase block mb-6">
            Pricing
          </span>
          <h2 className="font-display text-5xl md:text-6xl lg:text-7xl tracking-tight text-foreground mb-6">
            Everything works
            <br />
            <span className="v2-text-stroke">on Free</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl">
            The full scanner is free — unlimited scans, every finding. Pro is in
            development and will add longer history retention.
          </p>
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-px bg-foreground/10 max-w-4xl">
          {plans.map((plan, idx) => (
            <div
              key={plan.name}
              className={`relative p-8 lg:p-12 bg-background ${
                plan.comingSoon ? "" : "border-2 border-foreground"
              }`}
            >
              {plan.comingSoon && (
                <span className="absolute -top-3 left-8 px-3 py-1 bg-background border border-foreground/30 text-foreground/70 text-xs font-mono uppercase tracking-widest">
                  Coming soon
                </span>
              )}

              <div className="mb-8">
                <span className="font-mono text-xs text-muted-foreground">
                  {String(idx + 1).padStart(2, "0")}
                </span>
                <h3 className="font-display text-3xl text-foreground mt-2">{plan.name}</h3>
                <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
              </div>

              <div className="mb-8 pb-8 border-b border-foreground/10">
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-5xl lg:text-6xl text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </div>

              <ul className="space-y-4 mb-10">
                {plan.features.map((feat) => (
                  <li key={feat} className="flex items-start gap-3">
                    <Check className="w-4 h-4 text-foreground mt-0.5 shrink-0" />
                    <span className="text-sm text-muted-foreground">{feat}</span>
                  </li>
                ))}
              </ul>

              {plan.comingSoon ? (
                <button
                  disabled
                  className="w-full py-4 flex items-center justify-center gap-2 text-sm font-medium border border-foreground/15 text-muted-foreground cursor-not-allowed"
                >
                  {plan.cta}
                </button>
              ) : (
                <button
                  className="w-full py-4 flex items-center justify-center gap-2 text-sm font-medium transition-all group bg-foreground text-primary-foreground hover:bg-foreground/90"
                  onClick={() => (window.location.href = plan.href!)}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                </button>
              )}
            </div>
          ))}
        </div>

        <p className="mt-12 text-sm text-muted-foreground">
          PDF and DOCX support, GDPR-aware storage, and your right to delete your data — on every plan.{" "}
          <a href="/pricing" className="underline underline-offset-4 hover:text-foreground transition-colors">
            Full pricing details
          </a>
        </p>
      </div>
    </section>
  )
}
