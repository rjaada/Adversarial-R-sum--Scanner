import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy — TraceRank",
  description: "What TraceRank stores, what it does not store, and how you can delete your data.",
}

const fa = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"

// Privacy page is always light — it is a trust document.
export default function PrivacyPage() {
  return (
    <div style={{ background: "#FAFAF8", minHeight: "100vh", color: "#1f1d1a", fontFamily: fa }}>

      {/* Nav — matches site-wide white nav */}
      <nav style={{
        borderBottom: "1px solid #EBEBEB",
        padding:      "0 80px",
        height:       64,
        display:      "flex",
        alignItems:   "center",
        justifyContent: "space-between",
        background:   "#FFFFFF",
        position:     "sticky",
        top:          0,
        zIndex:       10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/" style={{ fontFamily: fa, fontSize: "1rem", fontWeight: 600, color: "#0D0C0A", textDecoration: "none", letterSpacing: "-0.01em" }}>
            TraceRank
          </Link>
          <span style={{ fontFamily: fa, fontSize: "0.875rem", color: "#858585" }}>Privacy</span>
        </div>
        <Link href="/workspace" style={{ fontFamily: fa, fontSize: "0.875rem", fontWeight: 500, color: "#FFFFFF", background: "#0D0C0A", borderRadius: "100px", padding: "8px 18px", textDecoration: "none" }}>
          Open scanner →
        </Link>
      </nav>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}>

        <header style={{ marginBottom: "1.75rem" }}>
          <p style={{ fontFamily: fa, fontSize: "11px", fontWeight: 500, letterSpacing: "0.12em", textTransform: "uppercase", color: "#7c8e5c", margin: "0 0 0.6rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>«</span> Data practices
          </p>
          <h1 style={{ fontFamily: fa, fontSize: "1.8rem", fontWeight: 700, color: "#0D0C0A", margin: "0 0 0.6rem", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            What we store and what we don&apos;t.
          </h1>
          <p style={{ fontFamily: fa, color: "#858585", margin: 0, fontSize: "0.925rem", lineHeight: 1.7 }}>
            Plain language. No legal boilerplate.
          </p>
        </header>

        <hr style={{ border: "none", borderTop: "1px solid #EBEBEB", margin: "0 0 0.25rem" }} />

        <Section title="What we do not store">
          <ul style={listStyle}>
            <li>We do not store your résumé file (PDF or DOCX).</li>
            <li>We do not store the job description text you paste.</li>
            <li>We do not store personally identifiable fields extracted from your résumé such as your name, address, or contact details.</li>
          </ul>
          <p style={bodyStyle}>
            When you upload a résumé, it is read in memory to produce the analysis and then discarded.
            The file is never written to disk or to a database.
          </p>
        </Section>

        <Section title="What we do store">
          <ul style={listStyle}>
            <li>
              <strong style={{ color: "#0D0C0A" }}>ATS text preview.</strong>{" "}
              We store the plain-text version of your résumé that an ATS parser would see — the same text shown in the &ldquo;What ATS sees&rdquo; panel.
              Before storing it, we apply pattern-based removal of contact information (email addresses, phone numbers, LinkedIn and GitHub URLs, and US-format physical addresses).
              This removal is best-effort and may not catch every format or variation.
            </li>
            <li>
              <strong style={{ color: "#0D0C0A" }}>Scan results.</strong>{" "}
              We store your scores (overall and five sub-scores), the list of identified issues (type, severity, title, description, and fix suggestion),
              your keyword coverage (matched and missing keywords), and your résumé filename.
            </li>
            <li>
              <strong style={{ color: "#0D0C0A" }}>Account information.</strong>{" "}
              If you create an account, we store your Clerk user ID, your plan tier (free or pro), and your display preferences.
              Authentication is managed by Clerk.
            </li>
          </ul>
        </Section>

        <Section title="Scan history retention">
          <ul style={listStyle}>
            <li>Free plan: scan history is retained for 90 days from the scan date.</li>
            <li>Pro plan: scan history is retained for 12 months from the scan date.</li>
            <li>You can delete individual scans or all scans at any time from your account settings.</li>
            <li>Account deletion purges all stored scan data within 24 hours.</li>
          </ul>
        </Section>

        <Section title="Your controls">
          <ul style={listStyle}>
            <li>Download all your scan data as JSON from <Link href="/account/data" style={{ color: "#7c8e5c", textDecoration: "none", borderBottom: "1px solid #7c8e5c" }}>Account → Data</Link>.</li>
            <li>Delete individual scans or your entire scan history at any time.</li>
            <li>Delete your account — all data is purged within 24 hours, no recovery.</li>
          </ul>
        </Section>

        <Section title="Data sharing">
          <ul style={listStyle}>
            <li>We do not sell your data to third parties.</li>
            <li>We do not share your résumé content with recruiters, employers, or job boards.</li>
            <li>Authentication is handled by Clerk. Payment processing (Pro) is handled by Stripe. Both receive only the data necessary for their function.</li>
          </ul>
        </Section>

        <div style={{ marginTop: "1.75rem", padding: "1rem 1.25rem", border: "1px solid #EBEBEB", borderRadius: 8, background: "#FFFFFF", fontSize: "0.875rem", color: "#858585", lineHeight: 1.7, fontFamily: fa }}>
          <strong style={{ color: "#0D0C0A" }}>Questions?</strong>{" "}
          This page describes our current practices honestly. If something is unclear, the methodology and source code are public.
          The product&apos;s differentiation is transparency — we have a strong interest in keeping these practices accurate.
        </div>

        <footer style={{ marginTop: "2rem", paddingTop: "1.25rem", borderTop: "1px solid #EBEBEB", fontSize: "0.75rem", color: "#B3B3B3", fontFamily: fa }}>
          Last updated: 2026-05-31
        </footer>

      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const fa = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
  return (
    <section style={{ paddingTop: "1.75rem" }}>
      <h2 style={{ fontFamily: fa, fontSize: "1rem", fontWeight: 600, color: "#0D0C0A", margin: "0 0 0.75rem", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <div style={{ fontFamily: fa, fontSize: "0.9rem", lineHeight: 1.75, color: "#0D0C0A" }}>
        {children}
      </div>
    </section>
  )
}

const listStyle: React.CSSProperties = {
  margin:      "0 0 0.75rem",
  paddingLeft: "1.25rem",
  display:     "grid",
  gap:         "0.5rem",
  color:       "#858585",
}

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color:  "#858585",
}
