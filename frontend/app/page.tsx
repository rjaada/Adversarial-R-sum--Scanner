'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { ThemeToggle } from '@/components/ThemeToggle'
// --- Hooks ---
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

function useCountUp(target: number, duration = 1600, trigger = false): number {
  const [val, setVal] = useState(0)
  useEffect(() => {
    if (!trigger) return
    const start = Date.now()
    let raf: number
    const tick = () => {
      const p = Math.min((Date.now() - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(eased * target))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [trigger, target, duration])
  return val
}

// --- Sub-score bar ---
function ScoreBar({ label, value, delay = 0 }: { label: string; value: number; delay?: number }) {
  return (
    <div style={{ marginBottom: '0.9rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.32rem' }}>
        <span style={{ fontFamily: 'var(--font-body)', fontSize: '0.58rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-dim)', fontWeight: 500 }}>
          {label}
        </span>
        <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
          {value}
        </span>
      </div>
      <div style={{ height: '2px', background: 'var(--border-mid)', borderRadius: '1px', overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${value}%`,
          background: 'var(--accent)',
          borderRadius: '1px',
          transition: `width 1.3s cubic-bezier(0.25, 0, 0.1, 1) ${delay}ms`,
        }} />
      </div>
    </div>
  )
}

// --- Hero score artifact ---
function ScoreArtifact({ loaded }: { loaded: boolean }) {
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-subtle)',
      borderRadius: '3px',
      padding: '1.75rem',
      maxWidth: '300px',
      width: '100%',
    }}>
      <div style={{ marginBottom: '1.4rem' }}>
        <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.56rem', letterSpacing: '0.14em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 500, marginBottom: '0.5rem' }}>
          Overall Score
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.25rem' }}>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: '3.25rem', fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1 }}>73</span>
          <span style={{ fontFamily: 'var(--font-data)', fontSize: '1.1rem', color: 'var(--text-dim)', lineHeight: 1 }}>/100</span>
        </div>
      </div>
      <div style={{ height: '1px', background: 'var(--border-subtle)', marginBottom: '1.25rem' }} />
      <ScoreBar label="Keyword Match" value={loaded ? 38 : 0} delay={0} />
      <ScoreBar label="Experience" value={loaded ? 82 : 0} delay={130} />
      <ScoreBar label="Parse Integrity" value={loaded ? 91 : 0} delay={260} />
      <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '1.2rem 0 1rem' }} />
      <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.62rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
        Based on 5 signals · Full breakdown in workspace
      </div>
    </div>
  )
}

// --- Page ---
export default function LandingPage() {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setLoaded(true), 500)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    const prev = document.body.style.background
    document.body.style.background = '#0d0c0a'
    document.body.style.margin = '0'
    return () => {
      document.body.style.background = prev
      document.body.style.margin = ''
    }
  }, [])

  const orient     = useFadeIn()
  const problem    = useFadeIn()
  const anatomy    = useFadeIn()
  const evidence   = useFadeIn()
  const methodology = useFadeIn()
  const benchmark  = useFadeIn()
  const cta        = useFadeIn()

  const benchCount1 = useCountUp(50,   1200, benchmark.visible)
  const benchCount3 = useCountUp(44,   1500, benchmark.visible)

  return (
    <div className="lp">

      <style>{`
        .lp {
          --font-display: var(--font-cormorant), Georgia, 'Times New Roman', serif;
          --font-body:    var(--font-figtree), system-ui, -apple-system, sans-serif;
          --font-data:    var(--font-mono), 'Courier New', monospace;
          background: var(--bg-base);
          color: var(--text-primary);
          min-height: 100vh;
        }
        .lp *, .lp *::before, .lp *::after { box-sizing: border-box; margin: 0; padding: 0; }

        /* ---- Nav ---- */
        .lp-nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 2.5rem;
          height: 58px;
          background: rgba(13,12,10,0.94);
          backdrop-filter: blur(14px);
          -webkit-backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border-subtle);
        }
        .nav-wordmark {
          font-family: var(--font-display);
          font-size: 1.1rem; font-weight: 400;
          color: var(--text-primary);
          text-decoration: none; letter-spacing: 0.01em;
        }
        .nav-links { display: flex; align-items: center; gap: 2rem; }
        .nav-link {
          font-family: var(--font-body);
          font-size: 0.78rem; font-weight: 400; letter-spacing: 0.02em;
          color: var(--text-secondary); text-decoration: none;
          transition: color 0.2s ease;
        }
        .nav-link:hover { color: var(--text-primary); }
        .nav-cta {
          font-family: var(--font-body);
          font-size: 0.78rem; font-weight: 500; letter-spacing: 0.02em;
          color: var(--accent); text-decoration: none;
          transition: color 0.2s ease;
        }
        .nav-cta:hover { color: var(--accent-hover); }

        /* ---- Hero ---- */
        .lp-hero { padding: 9vh 2.5rem 8rem; max-width: 1200px; margin: 0 auto; }
        .hero-grid {
          display: grid; grid-template-columns: 7fr 5fr;
          gap: 4.5rem; align-items: center;
        }
        .hero-eyebrow {
          font-family: var(--font-body);
          font-size: 0.62rem; letter-spacing: 0.15em;
          text-transform: uppercase; color: var(--accent);
          font-weight: 500; margin-bottom: 1.5rem;
        }
        .hero-headline {
          font-family: var(--font-display);
          font-size: clamp(2.6rem, 4.8vw, 5rem);
          font-weight: 400; line-height: 1.07;
          color: var(--text-primary);
          letter-spacing: -0.015em;
          margin-bottom: 1.75rem;
        }
        .hero-sub {
          font-family: var(--font-body);
          font-size: 1rem; font-weight: 300;
          color: var(--text-secondary);
          line-height: 1.8; margin-bottom: 2.5rem;
          max-width: 500px;
        }
        .hero-cta-row { display: flex; align-items: center; gap: 1.75rem; flex-wrap: wrap; }
        .artifact-col { display: flex; justify-content: flex-end; align-items: center; }

        /* ---- Buttons & links ---- */
        .btn-primary {
          font-family: var(--font-body);
          font-size: 0.85rem; font-weight: 500; letter-spacing: 0.01em;
          color: #0d0c0a; background: var(--accent);
          border: none; border-radius: 2px;
          padding: 0.8rem 1.875rem;
          text-decoration: none; display: inline-block; cursor: pointer;
          transition: background 0.25s ease, box-shadow 0.3s ease;
        }
        .btn-primary:hover {
          background: var(--accent-hover);
          box-shadow: 0 0 28px rgba(124,142,92,0.22);
        }
        .link-secondary {
          font-family: var(--font-body);
          font-size: 0.83rem; font-weight: 400;
          color: var(--text-secondary); text-decoration: none;
          border-bottom: 1px solid var(--border-mid);
          padding-bottom: 2px;
          transition: color 0.2s ease, border-color 0.2s ease;
        }
        .link-secondary:hover { color: var(--text-primary); border-color: var(--text-secondary); }
        .link-accent {
          font-family: var(--font-body);
          font-size: 0.83rem; font-weight: 400;
          color: var(--accent); text-decoration: none;
          border-bottom: 1px solid currentColor;
          padding-bottom: 2px;
          transition: color 0.2s ease;
        }
        .link-accent:hover { color: var(--accent-hover); }

        /* ---- Sections ---- */
        .lp-section      { padding: 8rem 2.5rem;      max-width: 1200px; margin: 0 auto; }
        .lp-section-sm   { padding: 5.5rem 2.5rem;    max-width: 1200px; margin: 0 auto; }
        .lp-section-alt  { background: var(--bg-surface); padding: 8rem 0; }
        .lp-section-alt-inner { padding: 0 2.5rem; max-width: 1200px; margin: 0 auto; }
        .section-label {
          font-family: var(--font-body);
          font-size: 0.6rem; letter-spacing: 0.16em;
          text-transform: uppercase; color: var(--text-dim);
          font-weight: 500; margin-bottom: 2.25rem;
        }

        /* ---- Orientation strip ---- */
        .orient-grid { display: grid; grid-template-columns: repeat(3,1fr); }
        .orient-item { padding: 0 3rem 0 0; border-right: 1px solid var(--border-subtle); }
        .orient-item:first-child { padding-left: 0; }
        .orient-item:last-child  { border-right: none; padding-right: 0; padding-left: 3rem; }
        .orient-item:nth-child(2) { padding-left: 3rem; }
        .orient-label {
          font-family: var(--font-body);
          font-size: 0.78rem; font-weight: 500;
          color: var(--text-primary); margin-bottom: 0.65rem;
        }
        .orient-body {
          font-family: var(--font-body);
          font-size: 0.85rem; font-weight: 300;
          color: var(--text-secondary); line-height: 1.75;
        }

        /* ---- Problem panel ---- */
        .problem-pullquote {
          font-family: var(--font-display);
          font-size: clamp(1.75rem, 3vw, 2.8rem);
          font-weight: 300; font-style: italic;
          color: var(--text-primary); line-height: 1.2;
          margin-bottom: 2.25rem; max-width: 640px;
        }
        .problem-body {
          font-family: var(--font-body);
          font-size: 0.95rem; font-weight: 300;
          color: var(--text-secondary); line-height: 1.9;
          max-width: 580px;
        }

        /* ---- Cards ---- */
        .lp-card {
          background: var(--bg-elevated);
          border: 1px solid var(--border-subtle);
          border-radius: 3px; padding: 2rem;
        }
        .card-mono-label {
          font-family: var(--font-data);
          font-size: 0.6rem; letter-spacing: 0.12em;
          text-transform: uppercase; color: var(--text-dim);
          margin-bottom: 1.25rem;
        }
        .card-divider { height: 1px; background: var(--border-subtle); margin: 1.25rem 0; }
        .severity-chip {
          display: inline-block;
          font-family: var(--font-data);
          font-size: 0.58rem; letter-spacing: 0.1em; text-transform: uppercase;
          padding: 0.18rem 0.45rem; border-radius: 2px;
          background: rgba(140,47,78,0.12); color: #c07080;
          border: 1px solid rgba(140,47,78,0.22); margin-bottom: 0.9rem;
        }
        .card-title {
          font-family: var(--font-body);
          font-size: 1rem; font-weight: 500;
          color: var(--text-primary); margin-bottom: 1rem; line-height: 1.4;
        }
        .card-evidence {
          font-family: var(--font-body);
          font-size: 0.875rem; font-weight: 300;
          color: var(--text-secondary); line-height: 1.75;
          padding: 1rem;
          background: var(--bg-muted); border-radius: 2px;
          border-left: 2px solid var(--border-mid);
          margin-bottom: 1rem;
        }

        /* ---- Score anatomy rows ---- */
        .score-row {
          display: flex; align-items: flex-start;
          justify-content: space-between;
          padding: 0.9rem 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .score-row:last-child { border-bottom: none; }
        .score-row-label {
          font-family: var(--font-body);
          font-size: 0.875rem; font-weight: 400;
          color: var(--text-secondary);
        }
        .score-row-note {
          font-family: var(--font-body);
          font-size: 0.68rem; color: var(--text-dim);
          margin-top: 0.2rem; line-height: 1.4;
        }
        .score-row-value {
          font-family: var(--font-data);
          font-size: 1rem; font-weight: 500;
          color: var(--text-primary);
          text-align: right;
        }
        .score-row-weight {
          font-family: var(--font-body);
          font-size: 0.58rem; color: var(--text-dim);
          letter-spacing: 0.04em; margin-top: 0.2rem;
          text-align: right;
        }

        /* ---- Methodology ---- */
        .method-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 5rem; align-items: start; }
        .accent-rule { width: 2px; height: 2.75rem; background: var(--accent); margin-bottom: 1.75rem; }
        .method-heading {
          font-family: var(--font-display);
          font-size: clamp(1.4rem, 2.4vw, 2.1rem);
          font-weight: 400; line-height: 1.2;
          color: var(--text-primary); margin-bottom: 1.25rem;
        }
        .method-body {
          font-family: var(--font-body);
          font-size: 0.875rem; font-weight: 300;
          color: var(--text-secondary); line-height: 1.85;
          margin-bottom: 1.25rem;
        }
        .weight-row {
          display: grid; grid-template-columns: 1fr auto;
          align-items: center; gap: 1rem;
          padding: 0.7rem 0;
          border-bottom: 1px solid var(--border-subtle);
        }
        .weight-row:last-child { border-bottom: none; }
        .weight-label {
          font-family: var(--font-body);
          font-size: 0.8rem; font-weight: 400;
          color: var(--text-secondary);
        }
        .weight-value {
          font-family: var(--font-data);
          font-size: 0.85rem; font-weight: 500; color: var(--accent);
        }
        .weight-bar-track {
          grid-column: 1 / -1; height: 2px;
          background: var(--border-subtle);
          border-radius: 1px; margin-top: -0.45rem;
          overflow: hidden;
        }

        /* ---- Benchmark ---- */
        .bench-grid { display: grid; grid-template-columns: repeat(3,1fr); }
        .bench-item { padding: 0 3rem 0 0; border-right: 1px solid var(--border-subtle); }
        .bench-item:last-child { border-right: none; padding-right: 0; }
        .bench-item:nth-child(2) { padding-left: 3rem; }
        .bench-item:nth-child(3) { padding-left: 3rem; }
        .bench-number {
          font-family: var(--font-data);
          font-size: clamp(2rem, 4vw, 3rem);
          font-weight: 400; color: var(--text-primary);
          line-height: 1; margin-bottom: 0.5rem;
        }
        .bench-label {
          font-family: var(--font-body);
          font-size: 0.78rem; font-weight: 300;
          color: var(--text-secondary); line-height: 1.55;
        }
        .bench-note {
          font-family: var(--font-body);
          font-size: 0.62rem; color: var(--text-dim);
          margin-top: 0.35rem; font-style: italic;
        }

        /* ---- CTA ---- */
        .cta-section { padding: 10rem 2.5rem; max-width: 800px; margin: 0 auto; text-align: center; }
        .cta-heading {
          font-family: var(--font-display);
          font-size: clamp(2rem, 4vw, 3.4rem);
          font-weight: 400; line-height: 1.15;
          color: var(--text-primary);
          letter-spacing: -0.015em; margin-bottom: 2.5rem;
        }
        .cta-btn-row {
          display: flex; align-items: center; justify-content: center;
          gap: 1.75rem; margin-bottom: 2.25rem; flex-wrap: wrap;
        }
        .cta-disclaimer {
          font-family: var(--font-body);
          font-size: 0.7rem; font-style: italic;
          color: var(--text-dim); line-height: 1.65;
          max-width: 500px; margin: 0 auto;
        }

        /* ---- Footer ---- */
        .lp-footer {
          border-top: 1px solid var(--border-subtle);
          padding: 1.75rem 2.5rem;
          display: flex; align-items: center; justify-content: space-between;
        }
        .footer-copy { font-family: var(--font-body); font-size: 0.7rem; color: var(--text-dim); }
        .footer-links { display: flex; gap: 1.5rem; }
        .footer-link {
          font-family: var(--font-body); font-size: 0.7rem;
          color: var(--text-dim); text-decoration: none;
          transition: color 0.2s ease;
        }
        .footer-link:hover { color: var(--text-secondary); }

        /* ---- Fade-up animation ---- */
        .fade-up { opacity: 0; transform: translateY(18px); transition: opacity 0.75s ease, transform 0.75s ease; }
        .fade-up.visible { opacity: 1; transform: translateY(0); }

        /* ---- Grain overlay ---- */
        .grain {
          position: fixed; inset: 0; pointer-events: none; z-index: 9999;
          opacity: 0.028;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E");
        }

        /* ---- Responsive ---- */
        @media (max-width: 960px) {
          .hero-grid { grid-template-columns: 1fr; gap: 3.5rem; }
          .artifact-col { justify-content: flex-start; }
          .orient-grid { grid-template-columns: 1fr; }
          .orient-item { border-right: none; border-bottom: 1px solid var(--border-subtle); padding: 0 0 2rem; }
          .orient-item:last-child { border-bottom: none; padding-left: 0; }
          .orient-item:nth-child(2) { padding-left: 0; }
          .method-grid { grid-template-columns: 1fr; gap: 3rem; }
          .bench-grid { grid-template-columns: 1fr; }
          .bench-item { border-right: none; border-bottom: 1px solid var(--border-subtle); padding: 0 0 1.75rem; margin-bottom: 1.75rem; }
          .bench-item:last-child { border-bottom: none; margin-bottom: 0; }
          .bench-item:nth-child(2), .bench-item:nth-child(3) { padding-left: 0; }
          .lp-nav { padding: 0 1.5rem; }
          .lp-hero, .lp-section, .lp-section-sm, .lp-section-alt-inner { padding-left: 1.5rem; padding-right: 1.5rem; }
          .cta-section { padding: 7rem 1.5rem; }
          .lp-footer { flex-direction: column; gap: 1rem; text-align: center; }
        }
        @media (max-width: 600px) {
          .nav-link.hide-sm { display: none; }
          .lp-hero { padding-top: 6vh; padding-bottom: 5rem; }
          .hero-headline { font-size: clamp(2.1rem, 8.5vw, 2.8rem); }
          .hero-cta-row { flex-direction: column; align-items: flex-start; gap: 1rem; }
          .cta-btn-row { flex-direction: column; }
          .lp-section, .lp-section-sm { padding-top: 5rem; padding-bottom: 5rem; }
          .lp-section-alt { padding-top: 5rem; padding-bottom: 5rem; }
        }
      `}</style>

      {/* Grain */}
      <div className="grain" aria-hidden="true" />

      {/* Nav */}
      <nav className="lp-nav">
        <span className="nav-wordmark">TraceRank</span>
        <div className="nav-links">
          <Link href="/methodology" className="nav-link hide-sm">Methodology</Link>
          <a href="#how-it-works" className="nav-link hide-sm">How it works</a>
          <Link href="/workspace" className="nav-cta">Scan résumé →</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="lp-hero">
        <div className="hero-grid">
          <div>
            <p className="hero-eyebrow">Adversarial Résumé Scanner</p>
            <h1 className="hero-headline">
              See exactly where automated screening will reject your résumé.
            </h1>
            <p className="hero-sub">
              TraceRank parses your résumé, extracts JD requirements, and returns a scored
              breakdown with specific evidence — not vague suggestions. The methodology is public.
            </p>
            <div className="hero-cta-row">
              <Link href="/workspace" className="btn-primary">Scan your résumé</Link>
              <Link href="/methodology" className="link-secondary">How scoring works →</Link>
            </div>
          </div>
          <div className="artifact-col">
            <ScoreArtifact loaded={loaded} />
          </div>
        </div>
      </section>

      {/* Orientation strip */}
      <section className="lp-section-alt" id="how-it-works">
        <div
          ref={orient.ref}
          className={`lp-section-alt-inner fade-up${orient.visible ? ' visible' : ''}`}
        >
          <div className="section-label">What TraceRank is</div>
          <div className="orient-grid">
            <div className="orient-item">
              <p className="orient-label">What it measures.</p>
              <p className="orient-body">
                ATS parse integrity, keyword alignment, and experience signal — scored against
                the structure and vocabulary of a real job description.
              </p>
            </div>
            <div className="orient-item">
              <p className="orient-label">What it does not claim.</p>
              <p className="orient-body">
                TraceRank does not simulate any specific ATS vendor. Scores reflect lexical
                and structural analysis only.
              </p>
            </div>
            <div className="orient-item">
              <p className="orient-label">Why that matters.</p>
              <p className="orient-body">
                Automated screeners are deterministic. Understanding how they process
                your résumé should not require guesswork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Problem panel */}
      <section className="lp-section">
        <div
          ref={problem.ref}
          className={`fade-up${problem.visible ? ' visible' : ''}`}
        >
          <div className="section-label">The problem</div>
          <p className="problem-pullquote">
            &ldquo;The résumé isn&apos;t the problem.<br />The reader is.&rdquo;
          </p>
          <p className="problem-body">
            Automated screening systems parse your document as a structured data object — not as a
            narrative. They tokenize your experience, match it against a keyword vocabulary, and
            score it without reading a single sentence in context. By the time a human sees your
            application, the algorithm has already ranked you.
          </p>
        </div>
      </section>

      {/* Score anatomy */}
      <section className="lp-section-alt">
        <div className="lp-section-alt-inner">
          <div
            ref={anatomy.ref}
            className={`fade-up${anatomy.visible ? ' visible' : ''}`}
          >
            <div className="section-label">Score anatomy</div>
            <div className="lp-card" style={{ maxWidth: '680px' }}>
              <div className="card-mono-label">scan · sample_resume.pdf · backend-engineer-jd.txt</div>
              <div className="card-divider" />
              <div className="score-row">
                <div>
                  <div className="score-row-label" style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Overall Score</div>
                </div>
                <div>
                  <div className="score-row-value">64 <span style={{ fontFamily: 'var(--font-data)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>/100</span></div>
                </div>
              </div>
              <div className="score-row">
                <div>
                  <div className="score-row-label">Keyword Match</div>
                  <div className="score-row-note">12 of 18 recognized JD keywords found</div>
                </div>
                <div>
                  <div className="score-row-value">38</div>
                  <div className="score-row-weight">35% of total</div>
                </div>
              </div>
              <div className="score-row">
                <div>
                  <div className="score-row-label">Experience Alignment</div>
                  <div className="score-row-note">Meets 3-year JD requirement</div>
                </div>
                <div>
                  <div className="score-row-value">82</div>
                  <div className="score-row-weight">25% of total</div>
                </div>
              </div>
              <div className="score-row">
                <div>
                  <div className="score-row-label">Parse Integrity</div>
                  <div className="score-row-note">No significant parse issues detected</div>
                </div>
                <div>
                  <div className="score-row-value">91</div>
                  <div className="score-row-weight">20% of total</div>
                </div>
              </div>
              <div className="score-row">
                <div>
                  <div className="score-row-label">Structure</div>
                  <div className="score-row-note">3 of 4 expected sections found</div>
                </div>
                <div>
                  <div className="score-row-value">75</div>
                  <div className="score-row-weight">10% of total</div>
                </div>
              </div>
              <div className="score-row">
                <div>
                  <div className="score-row-label">Quantified Impact</div>
                  <div className="score-row-note">Some bullets include measurable impact</div>
                </div>
                <div>
                  <div className="score-row-value">37</div>
                  <div className="score-row-weight">10% of total</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Issue evidence */}
      <section className="lp-section">
        <div
          ref={evidence.ref}
          className={`fade-up${evidence.visible ? ' visible' : ''}`}
        >
          <div className="section-label">Issue evidence</div>
          <div className="lp-card" style={{ maxWidth: '640px' }}>
            <div className="card-mono-label">issue · keyword_gap</div>
            <div className="severity-chip">high severity</div>
            <div className="card-title">Missing keyword: kubernetes</div>
            <div className="card-evidence">
              &ldquo;kubernetes&rdquo; does not appear anywhere in your résumé text.
              The JD lists it as a required skill under infrastructure qualifications.
            </div>
            <div className="card-divider" />
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.55rem' }}>
              Fix pattern
            </div>
            <div style={{ fontFamily: 'var(--font-body)', fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-primary)', lineHeight: 1.75 }}>
              Add &ldquo;kubernetes&rdquo; in your Skills section or reference it in a relevant
              experience bullet where you worked with container orchestration.
            </div>
          </div>
        </div>
      </section>

      {/* Methodology bridge */}
      <section className="lp-section-alt" style={{ background: 'var(--bg-accent-low)' }}>
        <div className="lp-section-alt-inner">
          <div
            ref={methodology.ref}
            className={`fade-up${methodology.visible ? ' visible' : ''}`}
          >
            <div className="method-grid">
              <div>
                <div className="accent-rule" />
                <h2 className="method-heading">
                  The scoring methodology<br />is public.
                </h2>
                <p className="method-body">
                  Every signal is documented. Every weight is explicit. TraceRank produces
                  deterministic scores — the same résumé against the same JD always produces
                  the same result. No black box. No probabilistic inference.
                </p>
                <p className="method-body">
                  The methodology page includes scoring weights, vocabulary lists, section
                  detection heuristics, and explicit disclaimers about what the engine
                  cannot measure.
                </p>
                <Link href="/methodology" className="link-accent">
                  Read the full methodology →
                </Link>
              </div>
              <div>
                <div className="lp-card">
                  <div className="card-mono-label" style={{ marginBottom: '1.5rem' }}>scoring weights</div>
                  {([
                    { label: 'Keyword / concept match',   pct: 35 },
                    { label: 'Experience alignment',      pct: 25 },
                    { label: 'Parse integrity',           pct: 20 },
                    { label: 'Structure / readability',   pct: 10 },
                    { label: 'Quantified impact',         pct: 10 },
                  ] as const).map(({ label, pct }) => (
                    <div key={label} className="weight-row">
                      <span className="weight-label">{label}</span>
                      <span className="weight-value">{pct}%</span>
                      <div className="weight-bar-track">
                        <div style={{
                          height: '100%', width: `${pct * 2.5}%`,
                          background: 'var(--accent)', opacity: 0.55, borderRadius: '1px',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benchmark teaser */}
      <section className="lp-section-sm">
        <div
          ref={benchmark.ref}
          className={`fade-up${benchmark.visible ? ' visible' : ''}`}
        >
          <div className="section-label" style={{ marginBottom: '2.5rem' }}>Validation</div>
          <div className="bench-grid">
            <div className="bench-item">
              <div className="bench-number">{benchmark.visible ? benchCount1 : 0}</div>
              <div className="bench-label">résumé/JD pairs tested</div>
              <div className="bench-note">internal synthetic validation set</div>
            </div>
            <div className="bench-item">
              <div className="bench-number">30–95</div>
              <div className="bench-label">score range across validation set</div>
              <div className="bench-note">strong same-role matches to weak cross-role pairs</div>
            </div>
            <div className="bench-item">
              <div className="bench-number">
                {benchmark.visible ? benchCount3 : 0}
                <span style={{ fontFamily: 'var(--font-data)', fontSize: '1.3rem', color: 'var(--text-dim)' }}>/50</span>
              </div>
              <div className="bench-label">pairs with recognized JD vocabulary</div>
              <div className="bench-note">6 sparse JDs confirmed neutral default behavior</div>
            </div>
          </div>
          <p style={{ marginTop: '2.25rem', fontFamily: 'var(--font-body)', fontSize: '0.65rem', fontStyle: 'italic', color: 'var(--text-dim)', lineHeight: 1.6 }}>
            Internal validation run only. All data is synthetic. Not a production accuracy claim.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <section style={{ background: 'var(--bg-surface)', borderTop: '1px solid var(--border-subtle)' }}>
        <div
          ref={cta.ref}
          className={`cta-section fade-up${cta.visible ? ' visible' : ''}`}
        >
          <h2 className="cta-heading">
            Know what the machine sees<br />before you apply.
          </h2>
          <div className="cta-btn-row">
            <Link href="/workspace" className="btn-primary">Scan your résumé</Link>
            <Link href="/methodology" className="link-secondary">How scoring works →</Link>
          </div>
          <p className="cta-disclaimer">
            TraceRank does not predict hiring outcomes. Scores reflect structural and lexical
            signal analysis — not ATS vendor simulation.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="lp-footer">
        <span className="footer-copy">© 2026 TraceRank</span>
        <div className="footer-links">
          <Link href="/methodology" className="footer-link">Methodology</Link>
          <Link href="/privacy" className="footer-link">Privacy</Link>
          <Link href="/pricing" className="footer-link">Pricing</Link>
          <Link href="/workspace" className="footer-link">Scanner</Link>
          <ThemeToggle />
        </div>
      </footer>

    </div>
  )
}
