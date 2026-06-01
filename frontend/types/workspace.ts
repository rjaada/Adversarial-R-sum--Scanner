/**
 * TypeScript interfaces for workspace scan results and related data.
 * Edit here when the backend API schema changes.
 * Imported by: workspace/page.tsx, scan-utils.ts, mock-scan.ts
 */

export interface Issue {
  issue_type: string
  severity: "critical" | "high" | "medium" | "low"
  title: string
  description: string
  evidence?: string
  fix_pattern?: string
  rewrite_starter?: string
  source_excerpt: string
  suggested_fix: string
  impact_score: number
}

export interface Scores {
  overall: number
  keyword_match: number
  experience_alignment: number
  parse_integrity: number
  structure: number
  quantified_impact: number
}

export interface ProfileResult {
  id: string
  label: string
  description: string
  score: number
  parse_quality: number
  keyword_match: number
  adjacent_skills: number
  structure_confidence: number
  risk_level: "LOW" | "MEDIUM" | "HIGH"
  top_strengths: string[]
  top_failures: string[]
  lost_signals: string[]
  recommended_fixes: string[]
}

export interface ScoreSpread {
  min: number
  max: number
  delta: number
  volatility: "LOW" | "MEDIUM" | "HIGH"
}

export interface ProfileSimulation {
  profiles: ProfileResult[]
  universal_fixes: string[]
  score_spread: ScoreSpread
  cross_profile_summary: string
}

export interface RankedFix {
  issue_index: number
  issue_type: string
  title: string
  suggested_fix: string
  fix_pattern: string
  labels: string[]
  affects_profiles: string[]
  rank_score: number
}

export interface ScanResult {
  scan_id: string
  source_id: string
  ats_text_preview: string
  resume_sections?: Record<string, string>
  jd_requirements?: Record<string, unknown>
  scores: Scores
  issues: Issue[]
  missing_keywords: string[]
  matched_keywords: string[]
  top_fixes: RankedFix[]
  simulation?: ProfileSimulation
}

export interface ScanSummary {
  scan_id: string
  source_id: string
  scanned_at: string
  overall_score: number
}

export interface RewriteResponse {
  variants: string[]
  available: boolean
  model: string
  error: string
}

export interface LLMStatus {
  available: boolean
  model: string
  healthy: boolean | null
}

export interface SubDeltas {
  keyword_match: number
  experience_alignment: number
  parse_integrity: number
  structure: number
  quantified_impact: number
}

export interface CompareResult {
  verdict: "improved" | "neutral" | "regressed"
  scoreBefore: number
  scoreAfter: number
  scoreDelta: number
  subDeltas: SubDeltas
  keywordsGained: string[]
  keywordsStillMissing: string[]
  issuesResolved: Issue[]
  issuesRemaining: Issue[]
  newRegressions: Issue[]
  volatilityBefore: number | null
  volatilityAfter: number | null
  volatilityDelta: number | null
}
