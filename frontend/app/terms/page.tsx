import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Terms — TraceRank",
  description: "Terms of service for TraceRank, the adversarial résumé scanner.",
}

const fa = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const BD = "rgba(26,25,23,0.08)"
const T1 = "#1a1917"
const T2 = "#6e6b66"
const T3 = "#a09890"

export default function TermsPage() {
  return (
    <div style={{ background: "#FDFCF9", minHeight: "100vh", color: T1, fontFamily: fa }}>
      <style dangerouslySetInnerHTML={{ __html: `
        .legal-nav { padding: 0 80px; }
        @media (max-width: 767px) { .legal-nav { padding: 0 20px; } }
      ` }} />

      <nav className="legal-nav" style={{ borderBottom: `1px solid ${BD}`, height: 64, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", background: "#FFFFFF", position: "sticky", top: 0, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexShrink: 0 }}>
          <Link href="/" style={{ fontFamily: fa, fontSize: "1rem", fontWeight: 600, color: T1, textDecoration: "none", letterSpacing: "-0.01em" }}>TraceRank</Link>
          <span style={{ fontFamily: fa, fontSize: "0.875rem", color: T3 }}>Terms</span>
        </div>
        <Link href="/workspace" style={{ fontFamily: fa, fontSize: "0.875rem", fontWeight: 500, color: "#FDFCF9", background: T1, borderRadius: "100px", padding: "8px 18px", textDecoration: "none", whiteSpace: "nowrap", flexShrink: 0 }}>
          Open scanner →
        </Link>
      </nav>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>

        <header style={{ marginBottom: "1.75rem" }}>
          <p style={{ fontFamily: fa, fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: T3, margin: "0 0 0.6rem" }}>
            Terms of service
          </p>
          <h1 style={{ fontFamily: fa, fontSize: "1.8rem", fontWeight: 700, color: T1, margin: "0 0 0.6rem", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            The terms, in plain language.
          </h1>
          <p style={{ fontFamily: fa, color: T2, margin: 0, fontSize: "0.925rem", lineHeight: 1.7 }}>
            Short, honest, and readable. By using TraceRank you agree to the following.
          </p>
        </header>

        <hr style={{ border: "none", borderTop: `1px solid ${BD}`, margin: "0 0 0.25rem" }} />

        <Section title="What TraceRank is">
          <p style={bodyStyle}>
            TraceRank is a résumé analysis tool. You upload a résumé and paste a job
            description; the service parses both and returns scores, findings, and
            rewrite suggestions describing how automated hiring systems are likely to
            read your résumé. The scoring model is rules-based and{" "}
            <Link href="/methodology" style={linkStyle}>publicly documented</Link>.
          </p>
        </Section>

        <Section title="No guarantee of hiring outcomes">
          <p style={bodyStyle}>
            TraceRank does not predict or guarantee hiring outcomes. A high score does
            not mean you will pass screening; a low score does not mean you will fail.
            Scores reflect structural and keyword criteria only, and no specific ATS
            vendor is emulated. Use the results as guidance, not as a promise.
          </p>
        </Section>

        <Section title="What we store">
          <ul style={listStyle}>
            <li>Your résumé file is never stored — it is processed in memory and discarded.</li>
            <li>Scan results (scores, findings, keyword coverage) and an ATS text preview scrubbed of contact details are stored so your history works. Details are in the <Link href="/privacy" style={linkStyle}>privacy page</Link>.</li>
          </ul>
        </Section>

        <Section title="Your content, your responsibility">
          <ul style={listStyle}>
            <li>Only upload résumés you have the right to use — your own, or documents you are authorized to analyze.</li>
            <li>Do not upload content that is unlawful or that infringes someone else&apos;s rights.</li>
            <li>You keep all rights to what you upload. We claim no ownership over your résumé or its content.</li>
          </ul>
        </Section>

        <Section title="Deleting your data">
          <p style={bodyStyle}>
            You can download or delete your scan data at any time from{" "}
            <Link href="/account/data" style={linkStyle}>Account → Data</Link>. Deleting
            your account purges all stored data within 24 hours, with no recovery.
          </p>
        </Section>

        <Section title="Service availability">
          <p style={bodyStyle}>
            TraceRank is provided &ldquo;as is&rdquo;, currently as a free beta. We do
            not guarantee uninterrupted availability, and features may change as the
            product develops. We will not remove your right to export or delete your
            data.
          </p>
        </Section>

        <Section title="Governing law">
          <p style={bodyStyle}>
            These terms are governed by the laws of Spain and applicable European Union
            law. If you are in the EU/EEA, the GDPR applies to how your data is handled —
            see the <Link href="/privacy" style={linkStyle}>privacy page</Link> for your rights and controls.
          </p>
        </Section>

        <div style={{ marginTop: "1.75rem", padding: "1rem 1.25rem", border: `1px solid ${BD}`, borderRadius: "4px", background: "#FFFFFF", fontSize: "0.875rem", color: T2, lineHeight: 1.7, fontFamily: fa }}>
          <strong style={{ color: T1 }}>Questions or problems?</strong>{" "}
          Open an issue on{" "}
          <a href="https://github.com/rjaada/Adversarial-R-sum--Scanner/issues" target="_blank" rel="noopener noreferrer" style={linkStyle}>
            GitHub
          </a>{" "}
          — the project is developed in the open, and that is the fastest way to reach us.
        </div>

        <footer style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: `1px solid ${BD}`, fontSize: "0.75rem", color: T3, fontFamily: fa }}>
          Last updated: 2026-07-04
        </footer>

      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ paddingTop: "1.75rem" }}>
      <h2 style={{ fontFamily: "var(--font-albert, 'Albert Sans', system-ui, sans-serif)", fontSize: "1rem", fontWeight: 600, color: "#1a1917", margin: "0 0 0.75rem", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <div style={{ fontFamily: "var(--font-albert, 'Albert Sans', system-ui, sans-serif)", fontSize: "0.9rem", lineHeight: 1.75, color: "#1a1917" }}>
        {children}
      </div>
    </section>
  )
}

const listStyle: React.CSSProperties = {
  margin: "0 0 0.75rem", paddingLeft: "1.25rem",
  display: "grid", gap: "0.5rem",
  color: "#6e6b66",
}

const bodyStyle: React.CSSProperties = {
  margin: 0, color: "#6e6b66",
}

const linkStyle: React.CSSProperties = {
  color: "#1a1917", textDecoration: "underline", textUnderlineOffset: "2px",
}
