/**
 * Reusable layout components for the methodology page.
 * Edit here to change the visual style of sections, callouts, and tables.
 * Content (copy, data) lives in methodology/page.tsx.
 *
 * Exports: MSection, Callout, MTable
 */

import type { ReactNode } from "react"

const ALBERT = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"

// ── Section wrapper ──────────────────────────────────────────────────────────

export function MSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: ReactNode
}) {
  return (
    <section id={id} style={{ paddingTop: "2rem" }}>
      <h2
        style={{
          fontFamily:    ALBERT,
          fontSize:      "1.1rem",
          fontWeight:    600,
          color:         "#0D0C0A",
          margin:        "0 0 1rem",
          letterSpacing: "-0.01em",
        }}
      >
        <a href={`#${id}`} style={{ color: "inherit", textDecoration: "none" }} aria-label={`Link to: ${title}`}>
          {title}
        </a>
      </h2>
      <div
        style={{
          fontFamily: ALBERT,
          fontSize:   "0.925rem",
          lineHeight: 1.7,
          color:      "#474546",
        }}
      >
        {children}
      </div>
    </section>
  )
}

// ── Callout ──────────────────────────────────────────────────────────────────

type CalloutVariant = "info" | "warning" | "note"

const CALLOUT_STYLES: Record<CalloutVariant, { border: string; bg: string; labelColor: string }> = {
  info:    { border: "#0f5c52", bg: "rgba(15,92,82,0.05)",    labelColor: "#0f5c52" },
  warning: { border: "#9a4d22", bg: "rgba(154,77,34,0.06)",   labelColor: "#9a4d22" },
  note:    { border: "#6f6b64", bg: "rgba(111,107,100,0.05)", labelColor: "#6f6b64" },
}

export function Callout({
  variant = "info",
  title,
  children,
}: {
  variant?: CalloutVariant
  title?: string
  children: ReactNode
}) {
  const s = CALLOUT_STYLES[variant]
  return (
    <div
      style={{
        borderLeft:  `3px solid ${s.border}`,
        background:  s.bg,
        padding:     "0.85rem 1.1rem",
        margin:      "1.25rem 0",
        borderRadius: "0 4px 4px 0",
        fontFamily:  ALBERT,
        fontSize:    "0.875rem",
        lineHeight:  1.7,
        color:       "#474546",
      }}
    >
      {title && (
        <div
          style={{
            fontWeight:    600,
            marginBottom:  "0.4rem",
            fontSize:      "0.7rem",
            textTransform: "uppercase" as const,
            letterSpacing: "0.09em",
            color:         s.labelColor,
          }}
        >
          {title}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Data table ───────────────────────────────────────────────────────────────

export function MTable({
  headers,
  rows,
}: {
  headers: string[]
  rows: (string | ReactNode)[][]
}) {
  return (
    <div style={{ overflowX: "auto", margin: "1.25rem 0", background: "#FFFFFF", border: "1px solid #EBEBEB", borderRadius: "8px", padding: "0 24px" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: ALBERT, fontSize: "0.855rem", lineHeight: 1.55 }}>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                style={{
                  textAlign:     "left",
                  padding:       "12px 8px",
                  borderBottom:  "1px solid #EBEBEB",
                  color:         "#0D0C0A",
                  fontWeight:    600,
                  fontSize:      "0.7rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  whiteSpace:    "nowrap",
                  fontFamily:    ALBERT,
                }}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} style={{ background: ri % 2 === 1 ? "#FAFAFA" : "#FFFFFF" }}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  style={{
                    padding:      "10px 8px",
                    verticalAlign: "top",
                    borderBottom: "1px solid #EBEBEB",
                    color:        ci === 0 ? "#0D0C0A" : "#474546",
                    fontWeight:   ci === 0 ? 500 : 400,
                    fontFamily:   ALBERT,
                  }}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
