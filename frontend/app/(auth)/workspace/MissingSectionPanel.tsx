"use client"

import type { Issue } from "@/types/workspace"
import { MISSING_SECTION_GUIDE, SECTION_HEADER_VARIANTS } from "@/lib/scan-utils"

const FA   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)"
const BG   = "#FDFCF9"
const SURF = "#FFFFFF"
const BD   = "rgba(26,25,23,0.08)"
const T1   = "#1a1917"
const T2   = "#6e6b66"
const T3   = "#a09890"

interface Props {
  issue: Issue
  /** Parsed résumé sections — when provided, "Searched for / Found" rows appear. */
  resumeSections?: Record<string, string>
}

/**
 * Expanded evidence panel for missing_section issues.
 *
 * Replaces the generic evidence+fix layout with a treatment that:
 *   1. Clearly labels the section as absent (not found but weak)
 *   2. Explains the ATS impact in product language
 *   3. Shows which headers were searched and what was found (when resume_sections in scope)
 *   4. Gives a structural content guide instead of a raw fix_pattern string
 */
export function MissingSectionPanel({ issue, resumeSections }: Props) {
  const secKey = issue.title
    .toLowerCase()
    .replace(/^missing\s+/, "")
    .replace(/\s+section$/, "")
    .trim()

  const guide    = MISSING_SECTION_GUIDE[secKey]
  const variants = SECTION_HEADER_VARIANTS[secKey]?.slice(0, 6) ?? []
  const foundSects = resumeSections
    ? Object.keys(resumeSections).filter(k => k !== "_unparsed")
    : null

  return (
    <div style={{
      border: `1px solid rgba(140,47,78,0.18)`,
      borderLeft: `3px solid rgba(140,47,78,0.4)`,
      borderRadius: "4px",
      overflow: "hidden",
      marginBottom: "0.75rem",
    }}>

      {/* Eyebrow — signals absence, not weakness */}
      <div style={{
        padding: "0.45rem 1rem",
        background: "rgba(140,47,78,0.04)",
        borderBottom: `1px solid rgba(140,47,78,0.12)`,
        fontFamily: MONO,
        fontSize: "0.5rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "#8c2f4e",
      }}>
        Section absent from résumé
      </div>

      {/* ATS impact explanation */}
      <div style={{
        padding: "0.75rem 1rem",
        borderBottom: `1px solid ${BD}`,
        fontFamily: FA,
        fontSize: "0.78rem",
        color: T2,
        lineHeight: 1.65,
      }}>
        {guide?.atsImpact ?? issue.description}
      </div>

      {/* Diagnostic rows — only when resume_sections available (WorkspaceResults surfaces) */}
      {foundSects !== null && variants.length > 0 && (
        <div style={{
          padding: "0.55rem 1rem",
          borderBottom: `1px solid ${BD}`,
          background: BG,
          fontFamily: MONO,
          fontSize: "0.62rem",
          lineHeight: 2,
        }}>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <span style={{ color: T3, flexShrink: 0, minWidth: "8rem" }}>Searched for</span>
            <span style={{ color: T2 }}>{variants.join(", ")}</span>
          </div>
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <span style={{ color: T3, flexShrink: 0, minWidth: "8rem" }}>Found in résumé</span>
            <span style={{ color: foundSects.length > 0 ? T2 : T3, fontStyle: foundSects.length === 0 ? "italic" : "normal" }}>
              {foundSects.length > 0 ? foundSects.join(", ") : "none detected"}
            </span>
          </div>
        </div>
      )}

      {/* Content guide — what actually belongs in this section */}
      <div style={{
        padding: "0.75rem 1rem",
        background: SURF,
      }}>
        <div style={{
          fontFamily: MONO,
          fontSize: "0.5rem",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: T3,
          marginBottom: "0.4rem",
        }}>
          What to add
        </div>
        <div style={{
          fontFamily: FA,
          fontSize: "0.78rem",
          color: T1,
          lineHeight: 1.65,
        }}>
          {guide?.contentGuide ?? (issue.fix_pattern || issue.suggested_fix)}
        </div>
      </div>
    </div>
  )
}
