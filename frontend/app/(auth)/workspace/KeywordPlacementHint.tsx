"use client"

const FA   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)"
const BG   = "#FDFCF9"
const BD   = "rgba(26,25,23,0.08)"
const T1   = "#1a1917"
const T2   = "#6e6b66"
const T3   = "#a09890"

interface Props {
  keyword: string
  /**
   * Parsed résumé sections from the scan result.
   * When absent or empty (anonymous / gated scans), all suggestions for the
   * keyword's class are shown without section-existence filtering.
   */
  resumeSections?: Record<string, string>
}

type KeywordClass = "technical" | "process"

const PROCESS_SIGNALS = [
  "agile", "scrum", "kanban", "sprint",
  "stakeholder", "management", "leadership",
  "cross-functional", "roadmap", "delivery",
  "planning", "strategy", "governance",
  "coordination", "facilitation",
]

function classify(kw: string): KeywordClass {
  const k = kw.toLowerCase()
  return PROCESS_SIGNALS.some(s => k.includes(s)) ? "process" : "technical"
}

interface Suggestion {
  sectionKey: string
  label: string
  rationale: string
}

const SUGGESTIONS: Record<KeywordClass, Suggestion[]> = {
  technical: [
    {
      sectionKey: "skills",
      label: "Skills",
      rationale: "This section is a common place for keyword matching. List the exact term as it appears in the job description.",
    },
    {
      sectionKey: "experience",
      label: "Experience bullets",
      rationale: "Add context of use in bullets where the work genuinely involved this.",
    },
  ],
  process: [
    {
      sectionKey: "experience",
      label: "Experience bullets",
      rationale: "Show where and how you applied this — context matters more than listing the label alone.",
    },
    {
      sectionKey: "summary",
      label: "Summary",
      rationale: "Worth including if this approach is central to the role you are targeting.",
    },
  ],
}

function getActiveSuggestions(
  cls: KeywordClass,
  resumeSections: Record<string, string> | undefined,
): Suggestion[] {
  const all = SUGGESTIONS[cls]
  const keys = Object.keys(resumeSections ?? {}).filter(k => k !== "_unparsed")
  // No section data (anonymous / gated / old scan) — show all without filtering
  if (keys.length === 0) return all
  const filtered = all.filter(s => s.sectionKey in resumeSections!)
  // Safety: if filtering removed everything, fall back to full list
  return filtered.length > 0 ? filtered : all
}

export function KeywordPlacementHint({ keyword, resumeSections }: Props) {
  const cls = classify(keyword)
  const suggestions = getActiveSuggestions(cls, resumeSections)

  return (
    <div style={{
      border: `1px solid ${BD}`,
      borderRadius: "4px",
      overflow: "hidden",
      marginBottom: "0.75rem",
    }}>

      {/* Eyebrow */}
      <div style={{
        padding: "0.45rem 1rem",
        background: BG,
        borderBottom: `1px solid ${BD}`,
        fontFamily: MONO,
        fontSize: "0.5rem",
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: T3,
      }}>
        Best places to add this term
      </div>

      {/* Suggestion rows */}
      {suggestions.map((s, i) => (
        <div
          key={s.sectionKey}
          style={{
            display: "flex",
            gap: "0.875rem",
            padding: "0.6rem 1rem",
            borderBottom: i < suggestions.length - 1 ? `1px solid ${BD}` : "none",
            alignItems: "flex-start",
          }}
        >
          <span style={{
            fontFamily: MONO,
            fontSize: "0.62rem",
            color: T1,
            fontWeight: 600,
            flexShrink: 0,
            minWidth: "7.5rem",
            paddingTop: "0.1rem",
          }}>
            {s.label}
          </span>
          <span style={{
            fontFamily: FA,
            fontSize: "0.75rem",
            color: T2,
            lineHeight: 1.55,
          }}>
            {s.rationale}
          </span>
        </div>
      ))}

      {/* Caveat footer */}
      <div style={{
        padding: "0.4rem 1rem",
        borderTop: `1px solid ${BD}`,
        background: BG,
        fontFamily: FA,
        fontSize: "0.68rem",
        color: T3,
        fontStyle: "italic",
      }}>
        Use the exact term only where it is genuinely supported by your experience.
      </div>
    </div>
  )
}
