'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import styles from './landing.module.css'

// ── Hooks ────────────────────────────────────────────────────────────────────

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold: 0.07 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

// ── Score bar (light theme) ──────────────────────────────────────────────────

function ScoreBar({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  return (
    <div className={styles.scoreBarRow}>
      <div className={styles.scoreBarHeader}>
        <span className={styles.scoreBarLabel}>{label}</span>
        <span className={styles.scoreBarValue}>{value}</span>
      </div>
      <div className={styles.scoreBarTrack}>
        <div
          className={styles.scoreBarFill}
          style={{ width: `${value}%`, transition: `width 1.3s cubic-bezier(0.25,0,0.1,1) ${delay}ms` }}
        />
      </div>
    </div>
  )
}

// ── Hero score artifact (light theme) ────────────────────────────────────────

function ScoreArtifact({ loaded }: { loaded: boolean }) {
  return (
    <div className={styles.scoreArtifact}>
      <div className={styles.scoreArtifactLabel}>Overall Score</div>
      <div className={styles.scoreArtifactNumber}>
        <span className={styles.scoreArtifactNum}>73</span>
        <span className={styles.scoreArtifactDenom}>/100</span>
      </div>
      <div className={styles.scoreArtifactDivider} />
      <ScoreBar label="Keyword Match"   value={loaded ? 38 : 0} delay={0}   />
      <ScoreBar label="Experience"      value={loaded ? 82 : 0} delay={130} />
      <ScoreBar label="Parse Integrity" value={loaded ? 91 : 0} delay={260} />
      <div className={styles.scoreArtifactDivider} />
      <div className={styles.scoreArtifactFooter}>
        Based on 5 signals · Full breakdown in workspace
      </div>
    </div>
  )
}

// ── Issue card ───────────────────────────────────────────────────────────────

function IssueCard({ severity, title, description, fix }: {
  severity: 'high' | 'medium'
  title: string
  description: string
  fix: string
}) {
  return (
    <div className={styles.issueCard}>
      <div className={styles.issueBadge} data-severity={severity}>
        {severity.toUpperCase()} SEVERITY
      </div>
      <div className={styles.issueTitle}>{title}</div>
      <div className={styles.issueDesc}>{description}</div>
      <div className={styles.issueFix}>
        <span className={styles.issueFixLabel}>Fix pattern</span>
        {fix}
      </div>
    </div>
  )
}

// ── Score anatomy rows ───────────────────────────────────────────────────────

const ANATOMY_ROWS = [
  { label: 'Overall Score',        value: 64, weight: null  },
  { label: 'Keyword Match',        value: 38, weight: '35%' },
  { label: 'Experience Alignment', value: 82, weight: '25%' },
  { label: 'Parse Integrity',      value: 91, weight: '20%' },
  { label: 'Structure',            value: 75, weight: '10%' },
  { label: 'Quantified Impact',    value: 37, weight: '10%' },
]

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  const [loaded, setLoaded]               = useState(false)
  const [navScrolled, setNavScrolled]     = useState(false)
  const [mobileOpen, setMobileOpen]       = useState(false)

  // light body bg while on landing page
  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#FCFDFB'
    return () => { document.body.style.background = prev }
  }, [])

  // score bar animation trigger
  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 400)
    return () => clearTimeout(t)
  }, [])

  // nav shadow on scroll
  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 8)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // fade-in observers
  const orient    = useFadeIn()
  const howItWorks = useFadeIn()
  const editorial = useFadeIn()
  const problem   = useFadeIn()
  const anatomy   = useFadeIn()
  const evidence  = useFadeIn()
  const pricingSec = useFadeIn()
  const cta       = useFadeIn()

  return (
    <div className={styles.page}>

      {/* ── Navbar ───────────────────────────────────────────────────────── */}
      <nav className={`${styles.nav} ${navScrolled ? styles.navScrolled : ''}`}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navWordmark}>TraceRank</Link>

          <div className={styles.navLinks}>
            <Link href="/methodology" className={styles.navLink}>Methodology</Link>
            <a href="#how-it-works" className={styles.navLink}>How it works</a>
            <Link href="/pricing" className={styles.navLink}>Pricing</Link>
          </div>

          <div className={styles.navRight}>
            <Link href="/sign-in" className={styles.navSignIn}>Sign in</Link>
            <Link href="/sign-up" className={styles.navCta}>Get started →</Link>
          </div>

          <button
            className={styles.hamburger}
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
          >
            <span /><span /><span />
          </button>
        </div>

        {mobileOpen && (
          <div className={styles.mobileMenu}>
            <Link href="/methodology" className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Methodology</Link>
            <a href="#how-it-works"  className={styles.mobileLink} onClick={() => setMobileOpen(false)}>How it works</a>
            <Link href="/pricing"    className={styles.mobileLink} onClick={() => setMobileOpen(false)}>Pricing</Link>
            <Link href="/sign-up" className={styles.mobileCta}>Get started →</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>

          <div className={styles.heroLeft}>
            <p className={styles.heroEyebrow}>Adversarial Résumé Scanner</p>
            <h1 className={styles.heroHeadline}>
              See exactly where automated screening will reject your résumé.
            </h1>
            <p className={styles.heroSub}>
              TraceRank parses your résumé, extracts JD requirements, and returns a scored
              breakdown with specific evidence — not vague suggestions. The methodology is public.
            </p>
            <div className={styles.heroCtas}>
              <Link href="/workspace" className={styles.btnPrimary}>Scan your résumé →</Link>
              <Link href="/methodology" className={styles.btnGhost}>How scoring works →</Link>
            </div>
          </div>

          <div className={styles.heroRight}>
            <ScoreArtifact loaded={loaded} />
            <div className={styles.statCards}>
              <div className={styles.statCard}>
                <div className={styles.statNum}>30 SEC</div>
                <div className={styles.statLabel}>Average scan time</div>
              </div>
              <div className={styles.statCard}>
                <div className={styles.statNum}>6</div>
                <div className={styles.statLabel}>Scoring dimensions</div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ── What TraceRank is ─────────────────────────────────────────────── */}
      <section className={styles.sectionWhite} id="how-it-works">
        <div
          ref={orient.ref}
          className={`${styles.sectionInner} ${styles.fadeUp} ${orient.visible ? styles.fadeUpVisible : ''}`}
        >
          <div className={styles.sectionLabel}>
            <span className={styles.labelPrefix}>«</span> What TraceRank is
          </div>
          <div className={styles.threeCol}>
            <div className={styles.threeColItem}>
              <p className={styles.threeColTitle}>What it measures.</p>
              <p className={styles.threeColBody}>
                ATS parse integrity, keyword alignment, and experience signal — scored against
                the structure and vocabulary of a real job description.
              </p>
            </div>
            <div className={styles.threeColItem}>
              <p className={styles.threeColTitle}>What it does not claim.</p>
              <p className={styles.threeColBody}>
                TraceRank does not simulate any specific ATS vendor. Scores reflect lexical
                and structural analysis only.
              </p>
            </div>
            <div className={styles.threeColItem}>
              <p className={styles.threeColTitle}>Why that matters.</p>
              <p className={styles.threeColBody}>
                Automated screeners are deterministic. Understanding how they process
                your résumé should not require guesswork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className={styles.sectionWhite}>
        <div
          ref={howItWorks.ref}
          className={`${styles.sectionInner} ${styles.fadeUp} ${howItWorks.visible ? styles.fadeUpVisible : ''}`}
        >
          <div className={styles.sectionLabel}>
            <span className={styles.labelPrefix}>«</span> How it works
          </div>
          <div className={styles.howSteps}>
            <div className={styles.howStep}>
              <div className={styles.howStepNum}>01</div>
              <div className={styles.howStepTitle}>Upload your résumé</div>
              <div className={styles.howStepDesc}>
                PDF or DOCX. Parsed as plain text — exactly how an ATS reads it.
              </div>
            </div>
            <div className={styles.howArrow}>→</div>
            <div className={styles.howStep}>
              <div className={styles.howStepNum}>02</div>
              <div className={styles.howStepTitle}>Paste the job description</div>
              <div className={styles.howStepDesc}>
                The JD vocabulary becomes the scoring target. Keywords, requirements, experience thresholds.
              </div>
            </div>
            <div className={styles.howArrow}>→</div>
            <div className={styles.howStep}>
              <div className={styles.howStepNum}>03</div>
              <div className={styles.howStepTitle}>Get your score</div>
              <div className={styles.howStepDesc}>
                Overall score plus 5 sub-scores with specific evidence. Not a rating — a diagnostic.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Editorial break ───────────────────────────────────────────────── */}
      <section
        className={styles.editorial}
        ref={editorial.ref}
      >
        <div className={styles.editorialAnnotLeft}>DETERMINISTIC</div>
        <div className={styles.editorialText}>
          <div className={styles.editorialLine}>BUILT FOR</div>
          <div className={styles.editorialLine}>
            PRECISION&nbsp;
            <span className={styles.editorialInline}>
              <span className={styles.editorialMiniCard}>73/100</span>
            </span>
          </div>
          <div className={styles.editorialLine}>AND TRUST.</div>
        </div>
        <div className={styles.editorialAnnotRight}>TRANSPARENT</div>
      </section>

      {/* ── The problem ───────────────────────────────────────────────────── */}
      <section className={styles.sectionWhite}>
        <div
          ref={problem.ref}
          className={`${styles.sectionInner} ${styles.fadeUp} ${problem.visible ? styles.fadeUpVisible : ''}`}
        >
          <div className={styles.sectionLabel}>
            <span className={styles.labelPrefix}>«</span> The problem
          </div>
          <div className={styles.problemGrid}>
            <blockquote className={styles.problemQuote}>
              &ldquo;The résumé isn&apos;t the problem.<br />The reader is.&rdquo;
            </blockquote>
            <p className={styles.problemBody}>
              Automated screening systems parse your document as a structured data object — not as a
              narrative. They tokenize your experience, match it against a keyword vocabulary, and
              score it without reading a single sentence in context. By the time a human sees your
              application, the algorithm has already ranked you.
            </p>
          </div>
        </div>
      </section>

      {/* ── Score anatomy ─────────────────────────────────────────────────── */}
      <section className={styles.sectionAlt}>
        <div
          ref={anatomy.ref}
          className={`${styles.sectionInner} ${styles.fadeUp} ${anatomy.visible ? styles.fadeUpVisible : ''}`}
        >
          <div className={styles.sectionLabel}>
            <span className={styles.labelPrefix}>«</span> Score anatomy
          </div>
          <div className={styles.anatomyCard}>
            <div className={styles.anatomyMeta}>scan · sample_resume.pdf · backend-engineer-jd.txt</div>
            <div className={styles.anatomyDivider} />
            {ANATOMY_ROWS.map(({ label, value, weight }) => (
              <div key={label} className={styles.anatomyRow}>
                <div className={styles.anatomyRowLeft}>
                  <span className={styles.anatomyLabel}>{label}</span>
                  {weight && <span className={styles.anatomyWeight}>· {weight}</span>}
                </div>
                <div className={styles.anatomyRowRight}>
                  <span className={styles.anatomyValue}>{value}</span>
                </div>
                <div className={styles.anatomyBar}>
                  <div
                    className={styles.anatomyBarFill}
                    style={{
                      width: `${value}%`,
                      background: value >= 70 ? '#0D0C0A' : value >= 40 ? '#858585' : '#B3B3B3',
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Issue evidence ────────────────────────────────────────────────── */}
      <section className={styles.sectionWhite}>
        <div
          ref={evidence.ref}
          className={`${styles.sectionInner} ${styles.fadeUp} ${evidence.visible ? styles.fadeUpVisible : ''}`}
        >
          <div className={styles.sectionLabel}>
            <span className={styles.labelPrefix}>«</span> Issue evidence
          </div>
          <div className={styles.issueGrid}>
            <IssueCard
              severity="high"
              title="Missing keyword: kubernetes"
              description='"kubernetes" does not appear anywhere in your résumé. The JD lists it as required under infrastructure qualifications.'
              fix='Add "kubernetes" in your Skills section or reference it in a relevant experience bullet.'
            />
            <IssueCard
              severity="high"
              title="Most bullets lack measurable impact"
              description="4 of 4 experience bullets have no numbers, percentages, currency, or scale indicators."
              fix="Rewrite 2–3 bullets with %, $, users, team size, latency ms, or cost saved."
            />
            <IssueCard
              severity="medium"
              title='Weak verb: "responsible for"'
              description="Passive phrasing reduces impact score. Screeners weight active verbs more heavily."
              fix="Start the bullet: Built / Led / Reduced / Delivered + [what] + [measurable result]."
            />
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────────────────── */}
      <section className={styles.sectionAlt}>
        <div
          ref={pricingSec.ref}
          className={`${styles.sectionInner} ${styles.fadeUp} ${pricingSec.visible ? styles.fadeUpVisible : ''}`}
        >
          <div className={styles.sectionLabel}>
            <span className={styles.labelPrefix}>«</span> Pricing
          </div>
          <div className={styles.pricingGrid}>

            {/* Free */}
            <div className={styles.pricingCard}>
              <div className={styles.pricingTier}>Free</div>
              <div className={styles.pricingPrice}>
                <span className={styles.pricingNum}>$0</span>
                <span className={styles.pricingPer}>forever</span>
              </div>
              <div className={styles.pricingDivider} />
              <ul className={styles.pricingFeatures}>
                {['3 scans per month', 'Overall score /100', 'Score breakdown (5 signals)', 'Issue evidence & fix patterns', 'Keyword gap analysis'].map(f => (
                  <li key={f} className={styles.pricingFeature}>
                    <span className={styles.pricingCheck}>✓</span>{f}
                  </li>
                ))}
                {['Scan history', 'Compare mode', 'PDF export', 'AI rewrite suggestions'].map(f => (
                  <li key={f} className={styles.pricingFeatureOff}>
                    <span>–</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/workspace" className={styles.btnOutlineDark}>Start scanning</Link>
            </div>

            {/* Pro */}
            <div className={`${styles.pricingCard} ${styles.pricingCardPro}`}>
              <div className={styles.pricingPopularBadge}>MOST POPULAR</div>
              <div className={styles.pricingTier}>Pro</div>
              <div className={styles.pricingPrice}>
                <span className={styles.pricingNum}>$9</span>
                <span className={styles.pricingPer}>/ month</span>
              </div>
              <div className={styles.pricingDivider} />
              <ul className={styles.pricingFeatures}>
                {['Everything in Free', 'Unlimited scans', 'Unlimited scan history', 'Compare mode', 'PDF export', 'AI rewrite suggestions — per issue'].map(f => (
                  <li key={f} className={styles.pricingFeature}>
                    <span className={styles.pricingCheck}>✓</span>{f}
                  </li>
                ))}
              </ul>
              <Link href="/account/billing" className={styles.btnDark}>Get Pro — coming soon →</Link>
            </div>

          </div>
          <p className={styles.pricingDisclaimer}>
            TraceRank does not predict hiring outcomes. Scores reflect structural and keyword analysis only.{' '}
            <Link href="/methodology" className={styles.pricingMethodLink}>Read the methodology →</Link>
          </p>
        </div>
      </section>

      {/* ── Final CTA (dark) ──────────────────────────────────────────────── */}
      <section className={styles.ctaDark}>
        <div
          ref={cta.ref}
          className={`${styles.ctaInner} ${styles.fadeUp} ${cta.visible ? styles.fadeUpVisible : ''}`}
        >
          <h2 className={styles.ctaHeadline}>
            Know what the machine sees<br />before you apply.
          </h2>
          <div className={styles.ctaBtns}>
            <Link href="/workspace" className={styles.btnWhite}>Scan your résumé →</Link>
            <Link href="/methodology" className={styles.btnWhiteOutline}>How scoring works</Link>
          </div>
          <p className={styles.ctaDisclaimer}>
            TraceRank does not predict hiring outcomes. Scores reflect structural and keyword criteria only.
          </p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerLeft}>
            <span className={styles.footerWordmark}>TraceRank</span>
            <span className={styles.footerCopy}>© 2026 TraceRank</span>
          </div>
          <div className={styles.footerLinks}>
            <Link href="/methodology" className={styles.footerLink}>Methodology</Link>
            <Link href="/privacy"     className={styles.footerLink}>Privacy</Link>
            <Link href="/pricing"     className={styles.footerLink}>Pricing</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
