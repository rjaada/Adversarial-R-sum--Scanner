"use client"

import { useState } from "react"
import { useUser } from "@clerk/nextjs"

const fa = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const mono = "var(--font-mono, 'IBM Plex Mono', monospace)"

export default function AccountPage() {
  const { isLoaded, user } = useUser()
  const [displayName, setDisplayName] = useState("")
  const [saving, setSaving]           = useState(false)
  const [saved, setSaved]             = useState(false)

  if (!isLoaded || !user) {
    return <div style={{ fontFamily: fa, fontSize: "0.85rem", color: "#858585", padding: "48px 0" }}>Loading…</div>
  }

  const currentName = user.fullName ?? user.firstName ?? ""
  const email       = user.primaryEmailAddress?.emailAddress ?? ""
  const providers   = user.externalAccounts.map(a => a.provider)

  async function handleSaveName() {
    if (!displayName.trim() || !user) return
    setSaving(true)
    try {
      const parts = displayName.trim().split(" ")
      await user.update({ firstName: parts[0] ?? "", lastName: parts.slice(1).join(" ") || undefined })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {}
    finally { setSaving(false) }
  }

  return (
    <div>
      <PageHeader label="Account" title="Account settings" subtitle="Manage your identity and connected services." />

      <Section title="Profile">
        <FieldRow label="Display name">
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <input
              type="text"
              placeholder={currentName || "Your name"}
              value={displayName}
              onChange={e => { setDisplayName(e.target.value); setSaved(false) }}
              style={inputStyle}
            />
            <button onClick={handleSaveName} disabled={saving || !displayName.trim()} style={btnStyle(saving || !displayName.trim())}>
              {saving ? "Saving…" : saved ? "Saved" : "Save"}
            </button>
          </div>
        </FieldRow>

        <FieldRow label="Email">
          <span style={{ fontFamily: fa, fontSize: "0.875rem", color: "#474546" }}>{email}</span>
        </FieldRow>

        <FieldRow label="Connected accounts">
          <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
            {providers.length > 0
              ? providers.map(p => <span key={p} style={chipStyle}>{p}</span>)
              : <span style={{ fontFamily: fa, fontSize: "0.85rem", color: "#858585" }}>Email only</span>}
          </div>
        </FieldRow>

        <FieldRow label="Password" last>
          <a
            href="https://accounts.clerk.dev/user/security"
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: fa, fontSize: "0.85rem", color: "#7c8e5c", textDecoration: "none", borderBottom: "1px solid #7c8e5c", paddingBottom: "1px" }}
          >
            Manage password →
          </a>
        </FieldRow>
      </Section>
    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function PageHeader({ label, title, subtitle }: { label: string; title: string; subtitle: string }) {
  const mono = "var(--font-mono, 'IBM Plex Mono', monospace)"
  return (
    <header style={{ marginBottom: "36px" }}>
      <p style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#858585", margin: "0 0 10px" }}>
        {label}
      </p>
      <h1 style={{ fontFamily: fa, fontSize: "1.75rem", fontWeight: 600, color: "#0D0C0A", margin: "0 0 8px", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
        {title}
      </h1>
      <p style={{ fontFamily: fa, fontSize: "0.9rem", color: "#858585", margin: 0, lineHeight: 1.65 }}>
        {subtitle}
      </p>
    </header>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const mono = "var(--font-mono, 'IBM Plex Mono', monospace)"
  return (
    <section style={{ marginBottom: "32px" }}>
      <h2 style={{ fontFamily: mono, fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#858585", margin: "0 0 12px" }}>
        {title}
      </h2>
      <div style={{ background: "#FFFFFF", border: "1px solid #EBEBEB", borderRadius: "12px", overflow: "hidden" }}>
        {children}
      </div>
    </section>
  )
}

function FieldRow({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{
      display:             "grid",
      gridTemplateColumns: "180px 1fr",
      alignItems:          "center",
      gap:                 "16px",
      padding:             "16px 20px",
      borderBottom:        last ? "none" : "1px solid #EBEBEB",
    }}>
      <span style={{ fontFamily: fa, fontSize: "0.875rem", color: "#858585" }}>{label}</span>
      <div>{children}</div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  fontFamily:   fa,
  fontSize:     "0.875rem",
  color:        "#0D0C0A",
  background:   "#F4F4F4",
  border:       "1px solid #DCDCDC",
  borderRadius: "8px",
  padding:      "8px 12px",
  outline:      "none",
  flex:         1,
}

function btnStyle(disabled: boolean): React.CSSProperties {
  return {
    fontFamily:    fa,
    fontSize:      "0.875rem",
    fontWeight:    500,
    color:         disabled ? "#B3B3B3" : "#FFFFFF",
    background:    disabled ? "#EBEBEB" : "#0D0C0A",
    border:        "none",
    borderRadius:  "8px",
    padding:       "8px 16px",
    cursor:        disabled ? "not-allowed" : "pointer",
    transition:    "background 0.15s",
    whiteSpace:    "nowrap",
  }
}

const chipStyle: React.CSSProperties = {
  fontFamily:    fa,
  fontSize:      "0.8rem",
  textTransform: "capitalize",
  color:         "#474546",
  background:    "#F4F4F4",
  border:        "1px solid #EBEBEB",
  borderRadius:  "100px",
  padding:       "3px 10px",
}

// suppress unused warning
void mono
