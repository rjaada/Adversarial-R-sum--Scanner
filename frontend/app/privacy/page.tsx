import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Privacy — TraceRank",
  description: "What TraceRank stores, what it does not store, and how you can delete your data.",
}

// Privacy page is always light — it is a trust document.
export default function PrivacyPage() {
  return (
    <div data-theme="light" style={{ background: "#f6f3ee", minHeight: "100vh", color: "#1f1d1a" }}>

      <nav style={{
        borderBottom: "1px solid #d9d3ca",
        padding: "0 1.75rem",
        height: 52,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#fbfaf7",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/" style={{ fontFamily: "Georgia, serif", fontSize: "1.05rem", fontWeight: 600, color: "#1f1d1a", textDecoration: "none" }}>
            TraceRank
          </Link>
          <span style={{ color: "#d9d3ca", fontSize: "0.9rem" }}>·</span>
          <span style={{ fontSize: "0.8rem", color: "#6f6b64" }}>Privacy</span>
        </div>
        <Link href="/workspace" style={{ color: "#2c5f45", fontSize: "0.875rem", fontWeight: 500, textDecoration: "none" }}>
          Open scanner →
        </Link>
      </nav>

      <main style={{ maxWidth: 680, margin: "0 auto", padding: "3rem 1.5rem 6rem" }}>

        <header style={{ marginBottom: "2.5rem" }}>
          <p style={{ fontSize: "0.68rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#6f6b64", margin: "0 0 0.75rem" }}>
            Data practices
          </p>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 700, color: "#1f1d1a", margin: "0 0 0.8rem", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            What we store and what we don&apos;t.
          </h1>
          <p style={{ color: "#6f6b64", margin: 0, fontSize: "0.925rem", lineHeight: 1.7 }}>
            Plain language. No legal boilerplate.
          </p>
        </header>

        <hr style={{ border: "none", borderTop: "1px solid #d9d3ca", margin: "0 0 2rem" }} />

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
              <strong style={{ color: "#1f1d1a" }}>ATS text preview.</strong>{" "}
              We store the plain-text version of your résumé that an ATS parser would see — the same text shown in the &ldquo;What ATS sees&rdquo; panel.
              Before storing it, we apply pattern-based removal of contact information (email addresses, phone numbers, LinkedIn and GitHub URLs, and US-format physical addresses).
              This removal is best-effort and may not catch every format or variation.
            </li>
            <li>
              <strong style={{ color: "#1f1d1a" }}>Scan results.</strong>{" "}
              We store your scores (overall and five sub-scores), the list of identified issues (type, severity, title, description, and fix suggestion),
              your keyword coverage (matched and missing keywords), and your résumé filename.
            </li>
            <li>
              <strong style={{ color: "#1f1d1a" }}>Account information.</strong>{" "}
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
            <li>Download all your scan data as JSON from <Link href="/account/data" style={{ color: "#2c5f45" }}>Account → Data</Link>.</li>
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

        <div style={{ marginTop: "2.5rem", padding: "1rem 1.25rem", border: "1px solid #d9d3ca", borderRadius: 4, background: "rgba(31,29,26,0.025)", fontSize: "0.825rem", color: "#6f6b64", lineHeight: 1.7 }}>
          <strong style={{ color: "#1f1d1a" }}>Questions?</strong>{" "}
          This page describes our current practices honestly. If something is unclear, the methodology and source code are public.
          The product&apos;s differentiation is transparency — we have a strong interest in keeping these practices accurate.
        </div>

        <footer style={{ marginTop: "3rem", paddingTop: "1.25rem", borderTop: "1px solid #d9d3ca", fontSize: "0.75rem", color: "#a09990" }}>
          Last updated: 2026-05-31
        </footer>

      </main>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ paddingTop: "2rem" }}>
      <h2 style={{ fontSize: "1rem", fontWeight: 600, color: "#1f1d1a", margin: "0 0 0.875rem", letterSpacing: "-0.01em" }}>
        {title}
      </h2>
      <div style={{ fontSize: "0.9rem", lineHeight: 1.75, color: "#1f1d1a" }}>
        {children}
      </div>
    </section>
  )
}

const listStyle: React.CSSProperties = {
  margin: "0 0 0.875rem",
  paddingLeft: "1.25rem",
  display: "grid",
  gap: "0.5rem",
  color: "#6f6b64",
}

const bodyStyle: React.CSSProperties = {
  margin: 0,
  color: "#6f6b64",
}
