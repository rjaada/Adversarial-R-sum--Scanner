import "./v2/v2.css"
import { Navigation }       from "@/components/v2/Navigation"
import { HeroSection }      from "@/components/v2/HeroSection"
import { FeaturesSection }  from "@/components/v2/FeaturesSection"
import { HowItWorksSection } from "@/components/v2/HowItWorksSection"
import { ScoringSection }   from "@/components/v2/ScoringSection"
import { PrivacySection }   from "@/components/v2/PrivacySection"
import { FindingsSection }  from "@/components/v2/FindingsSection"
import { PricingSection }   from "@/components/v2/PricingSection"
import { CtaSection }       from "@/components/v2/CtaSection"
import { FooterSection }    from "@/components/v2/FooterSection"

export const metadata = {
  title: "TraceRank — Adversarial Résumé Scanner",
  description:
    "Upload your résumé and a job description. In seconds, know exactly where automated screening will underrate you — and what to fix before you apply.",
}

export default function HomePage() {
  return (
    <div className="v2-page">
      <main className="relative min-h-screen overflow-x-hidden">
        <Navigation />
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <ScoringSection />
        <PrivacySection />
        <FindingsSection />
        <PricingSection />
        <CtaSection />
        <FooterSection />
      </main>
    </div>
  )
}
