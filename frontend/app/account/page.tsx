"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"

export default function AccountPage() {
  const { isLoaded, user } = useUser()
  const [displayName, setDisplayName] = useState("")
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!isLoaded || !user) {
    return (
      <div style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--text-dim)" }}>
        Loading…
      </div>
    )
  }

  const currentName = user.fullName ?? user.firstName ?? ""
  const email = user.primaryEmailAddress?.emailAddress ?? ""

  const connectedProviders = user.externalAccounts.map(a => a.provider)

  async function handleSaveName() {
    if (!displayName.trim()) return
    setSaving(true)
    try {
      const parts = displayName.trim().split(" ")
      await user.update({
        firstName: parts[0] ?? "",
        lastName: parts.slice(1).join(" ") || undefined,
      })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      // Clerk API error — non-fatal
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        label="Account"
        title="Account settings"
        subtitle="Manage your identity and connected services."
      />

      <Section title="Profile">
        <FieldRow label="Display name">
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <input
              type="text"
              placeholder={currentName || "Your name"}
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setSaved(false) }}
              style={inputStyle}
            />
            <button
              onClick={handleSaveName}
              disabled={saving || !displayName.trim()}
              style={btnStyle(saving || !displayName.trim())}
            >
              {saving ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Email">
          <span style={{ fontFamily: "var(--font-body)", fontSize: "0.85rem", color: "var(--text-secondary)" }}>
            {email}
          </span>
        </FieldRow>

        <FieldRow label="Connected accounts">
          <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
            {connectedProviders.length > 0
              ? connectedProviders.map(p => (
                  <span key={p} style={chipStyle}>{p}</span>
                ))
              : <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--text-dim)" }}>Email only</span>
            }
          </div>
        </FieldRow>

        <FieldRow label="Password">
          <a
            href="https://accounts.clerk.dev/user/security"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--accent)", textDecoration: "none", borderBottom: "1px solid currentColor", paddingBottom: "1px" }}
          >
            Manage password →
          </a>
        </FieldRow>
      </Section>

    </div>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────

function PageHeader({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  return (
    <header style={{ marginBottom: "2.5rem" }}>
      <p style={{ fontFamily: "var(--font-data)", fontSize: "0.56rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 0.6rem" }}>
        {label}
      </p>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.75rem", fontWeight: 400, color: "var(--text-primary)", margin: "0 0 0.6rem", lineHeight: 1.2 }}>
        {title}
      </h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: "0.875rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.65, fontWeight: 300 }}>
        {subtitle}
      </p>
    </header>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "2.5rem" }}>
      <h2 style={{ fontFamily: "var(--font-data)", fontSize: "0.58rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--text-dim)", margin: "0 0 1.25rem" }}>
        {title}
      </h2>
      <div style={{ border: "1px solid var(--border-subtle)", borderRadius: "3px", overflow: "hidden" }}>
        {children}
      </div>
    </section>
  )
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "160px 1fr",
      alignItems: "center", gap: "1rem",
      padding: "0.875rem 1.25rem",
      borderBottom: "1px solid var(--border-subtle)",
    }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: "0.8rem", color: "var(--text-secondary)", fontWeight: 400 }}>
        {label}
      </span>
      <div>{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontFamily: "var(--font-body)", fontSize: "0.85rem",
  color: "var(--text-primary)", background: "var(--bg-elevated)",
  border: "1px solid var(--border-mid)", borderRadius: "2px",
  padding: "0.45rem 0.75rem", outline: "none", flex: 1,
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    fontFamily: "var(--font-body)", fontSize: "0.78rem", fontWeight: 500,
    color: disabled ? "var(--text-dim)" : "#0d0c0a",
    background: disabled ? "var(--border-mid)" : "var(--accent)",
    border: "none", borderRadius: "2px", padding: "0.45rem 1rem",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 0.2s ease", whiteSpace: "nowrap",
  }
}

const chipStyle: React.CSSProperties = {
  fontFamily: "var(--font-data)", fontSize: "0.62rem", letterSpacing: "0.06em",
  textTransform: "capitalize",
  color: "var(--text-secondary)",
  border: "1px solid var(--border-mid)",
  borderRadius: "2px", padding: "0.1rem 0.45rem",
}
