/**
 * Pure utility functions for scan scoring, formatting, analytics, and comparison.
 * No React imports — safe to import anywhere including server components.
 *
 * Exports:
 *   pct()                   — convert 0–1 float to 0–100 integer
 *   scoreColor()            — CSS variable for a score value
 *   compareScans()          — diff two ScanResults into a CompareResult
 *   track()                 — fire a lightweight analytics event
 *   SEV_COLOR               — severity → CSS variable map
 *   SECTION_HEADER_VARIANTS — recognized résumé section header strings by canonical key
 */

import type { ScanResult, CompareResult, SubDeltas, Issue } from "@/types/workspace"

const API_BASE = ""

// ── Formatting ──────────────────────────────────────────────────────────────

/** Convert a 0–1 score fraction to a rounded 0–100 integer for display. */
export function pct(v: number): number {
  return Math.round(v * 100)
}

/** Return a CSS variable name for a score value (green / muted / red). */
export function scoreColor(p: number): string {
  if (p >= 75) return "var(--accent)"
  if (p >= 55) return "var(--mineral)"
  return "var(--sev-critical)"
}

// ── Severity colors ──────────────────────────────────────────────────────────

/** Maps issue severity level to its CSS variable. */
export const SEV_COLOR: Record<string, string> = {
  critical: "var(--sev-critical)",
  high:     "var(--sev-high)",
  medium:   "var(--sev-medium)",
  low:      "var(--sev-low)",
}

// ── Section detection ────────────────────────────────────────────────────────

/**
 * Recognized header strings for each canonical résumé section.
 * Used to display which headers were searched when a section is missing.
 * Add variants here when new résumé formats are supported.
 */
export const SECTION_HEADER_VARIANTS: Record<string, string[]> = {
  summary:    ["summary", "professional summary", "career summary", "objective", "career objective", "profile", "professional profile", "about", "overview"],
  skills:     ["skills", "technical skills", "key skills", "core skills", "core competencies", "competencies", "areas of expertise", "technical expertise", "technical background", "technologies", "technology stack", "tech stack", "tools", "tools & technologies", "programming languages", "languages & frameworks", "proficiencies"],
  experience: ["experience", "work experience", "professional experience", "work history", "employment", "employment history", "career", "relevant experience", "professional background", "career history"],
  education:  ["education", "academic background", "academic history", "academic", "degree", "university", "college", "educational", "schooling"],
}

// ── Analytics ────────────────────────────────────────────────────────────────

/** Fire a lightweight analytics event. Failures are silently swallowed. */
export function track(
  event: string,
  properties: Record<string, string | number | boolean | null> = {}
): void {
  void fetch(`${API_BASE}/api/analytics/event`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event, properties }),
  }).catch(() => {})
}

// ── Scan comparison ──────────────────────────────────────────────────────────

/**
 * Diff two scan results and return a structured comparison.
 * `before` = the baseline scan, `after` = the revised scan.
 */
export function compareScans(before: ScanResult, after: ScanResult): CompareResult {
  const rawDelta  = after.scores.overall - before.scores.overall
  const scoreDelta = Math.round(rawDelta * 100)

  const subDeltas: SubDeltas = {
    keyword_match:        Math.round((after.scores.keyword_match        - before.scores.keyword_match)        * 100),
    experience_alignment: Math.round((after.scores.experience_alignment - before.scores.experience_alignment) * 100),
    parse_integrity:      Math.round((after.scores.parse_integrity      - before.scores.parse_integrity)      * 100),
    structure:            Math.round((after.scores.structure            - before.scores.structure)            * 100),
    quantified_impact:    Math.round((after.scores.quantified_impact    - before.scores.quantified_impact)    * 100),
  }

  const beforeMatchedSet   = new Set(before.matched_keywords)
  const keywordsGained     = after.matched_keywords.filter(k => !beforeMatchedSet.has(k))
  const keywordsStillMissing = after.missing_keywords

  const afterTitleSet  = new Set(after.issues.map((i: Issue) => i.title))
  const beforeTitleSet = new Set(before.issues.map((i: Issue) => i.title))

  const issuesResolved  = before.issues.filter((i: Issue) => !afterTitleSet.has(i.title))
  const issuesRemaining = after.issues.filter((i: Issue)  =>  beforeTitleSet.has(i.title))
  const newRegressions  = after.issues.filter((i: Issue)  => !beforeTitleSet.has(i.title))

  const verdict: "improved" | "neutral" | "regressed" =
    scoreDelta > 2 ? "improved" : scoreDelta < -2 ? "regressed" : "neutral"

  const volatilityBefore = before.simulation?.score_spread.delta ?? null
  const volatilityAfter  = after.simulation?.score_spread.delta ?? null
  const volatilityDelta  =
    volatilityBefore !== null && volatilityAfter !== null
      ? volatilityAfter - volatilityBefore
      : null

  return {
    verdict,
    scoreBefore: pct(before.scores.overall),
    scoreAfter:  pct(after.scores.overall),
    scoreDelta,
    subDeltas,
    keywordsGained,
    keywordsStillMissing,
    issuesResolved,
    issuesRemaining,
    newRegressions,
    volatilityBefore,
    volatilityAfter,
    volatilityDelta,
  }
}
