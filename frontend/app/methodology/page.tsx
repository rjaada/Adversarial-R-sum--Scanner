/**
 * Methodology page — public scoring transparency document.
 * Edit section content (copy, table data, callouts) here.
 * Edit section/callout/table visual styles in MethodologyComponents.tsx.
 */

import type { Metadata } from "next"
import Link from "next/link"
import { SCORING_YEAR } from "@/lib/scoring-year"
import { MSection, Callout, MTable } from "./MethodologyComponents"

export const metadata: Metadata = {
  title: "How scoring works — TraceRank",
  description:
    "Transparent methodology for TraceRank's deterministic résumé scoring engine. No claims beyond what the rules-based heuristic model actually computes.",
}

// ─── Page ──────────────────────────────────────────────────────────────────────

const TOC = [
  { id: "what-we-measure",      label: "What TraceRank measures"      },
  { id: "score-composition",    label: "Score composition"             },
  { id: "keyword-matching",     label: "Keyword matching"              },
  { id: "section-detection",    label: "Section detection"             },
  { id: "experience-inference", label: "Experience inference"          },
  { id: "profile-simulations",  label: "Profile simulations"           },
  { id: "issue-generation",     label: "Issue generation and ranking"  },
  { id: "rewrite-assistance",   label: "Rewrite assistance"            },
  { id: "limitations",          label: "Limitations"                   },
]

export default function MethodologyPage() {
  const albertSans = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
  return (
    <div style={{ background: "#FDFCF9", minHeight: "100vh", color: "#1a1917", fontFamily: albertSans }}>

      <nav
        style={{
          borderBottom: "1px solid rgba(26,25,23,0.08)",
          padding: "0 80px",
          height: 64,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#FFFFFF",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "2rem" }}>
          <Link
            href="/"
            style={{
              fontFamily: albertSans,
              fontSize: "1rem",
              fontWeight: 600,
              color: "#1a1917",
              textDecoration: "none",
              letterSpacing: "-0.01em",
            }}
          >
            TraceRank
          </Link>
          <span style={{ fontFamily: albertSans, fontSize: "0.875rem", color: "#6e6b66" }}>Methodology</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
          <Link href="/pricing" style={{ fontFamily: albertSans, fontSize: "0.875rem", color: "#6e6b66", textDecoration: "none" }}>Pricing</Link>
          <Link
            href="/workspace"
            style={{
              fontFamily: albertSans,
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#FDFCF9",
              background: "#1a1917",
              borderRadius: "100px",
              padding: "8px 18px",
              textDecoration: "none",
            }}
          >
            Open scanner →
          </Link>
        </div>
      </nav>

      <main style={{ maxWidth: 760, margin: "0 auto", padding: "2.5rem 1.5rem 3.5rem" }}>

        {/* Header */}
        <header style={{ marginBottom: "2rem" }}>
          <p style={{ fontFamily: albertSans, fontSize: "11px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#a09890", margin: "0 0 0.75rem", display: "flex", alignItems: "center", gap: "6px" }}>
            <span>«</span> Scoring methodology
          </p>
          <h1 style={{ fontFamily: albertSans, fontSize: "1.9rem", fontWeight: 700, color: "#1a1917", margin: "0 0 0.8rem", lineHeight: 1.2, letterSpacing: "-0.02em" }}>
            How scoring works
          </h1>
          <p style={{ fontFamily: albertSans, color: "#6e6b66", margin: 0, fontSize: "1rem", lineHeight: 1.7, maxWidth: 620 }}>
            A complete, honest description of how TraceRank analyzes résumés, computes
            scores, and generates findings. No claims are made beyond what the
            rules-based heuristic model actually computes.
          </p>
        </header>

        {/* Table of contents */}
        <nav
          aria-label="Contents"
          style={{ background: "#FFFFFF", border: "1px solid rgba(26,25,23,0.08)", borderRadius: 4, padding: "1rem 1.25rem", marginBottom: "1.5rem", fontFamily: albertSans, fontSize: "0.875rem" }}
        >
          <p style={{ fontFamily: albertSans, fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#a09890", margin: "0 0 0.6rem", fontWeight: 500 }}>
            Contents
          </p>
          <ol style={{ margin: 0, paddingLeft: "1.25rem", display: "grid", gap: "0.3rem" }}>
            {TOC.map(({ id, label }) => (
              <li key={id}>
                <a href={`#${id}`} style={{ fontFamily: albertSans, color: "#1a1917", textDecoration: "none" }}>
                  {label}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <hr style={{ border: "none", borderTop: "1px solid #d9d3ca", margin: "0 0 0.25rem" }} />

        {/* ── Section 1 ─────────────────────────────────────────────────────── */}
        <MSection id="what-we-measure" title="What TraceRank measures">
          <p style={{ margin: "0 0 0.9rem" }}>
            TraceRank parses résumé text, extracts requirements from a job description,
            and returns a scored breakdown of how well the résumé meets measurable
            structural and keyword criteria. It uses deterministic heuristics —
            transparent, rule-based checks — not machine learning models or proprietary
            ATS vendor logic. Scoring is fully reproducible: the same résumé and job
            description will always produce the same score.
          </p>
          <p style={{ margin: 0, color: "#6e6b66" }}>
            TraceRank does not predict hiring outcomes. It does not replicate Greenhouse,
            Lever, Workday, iCIMS, or any other real ATS system. It does not assess
            writing quality, career narrative, cultural fit, or any criterion that requires
            human judgment.
          </p>
        </MSection>

        {/* ── Section 2 ─────────────────────────────────────────────────────── */}
        <MSection id="score-composition" title="Score composition">
          <p style={{ margin: "0 0 0.9rem" }}>
            The overall score is a weighted linear combination of five sub-scores, each
            measuring a distinct, computable criterion. Weights are fixed and public —
            they do not change between scans.
          </p>
          <MTable
            headers={["Sub-score", "Weight", "What it measures", "How it's computed"]}
            rows={[
              [
                "Keyword Match", "35%",
                "Required JD keywords found in résumé",
                "Exact token match + industry synonym equivalents",
              ],
              [
                "Experience Alignment", "25%",
                "Years of experience vs JD requirement",
                'Explicit "X years" text + date-range span inference',
              ],
              [
                "Parse Integrity", "20%",
                "Résumé structural complexity penalties",
                "Detected columns, tables, text boxes; each penalises score",
              ],
              [
                "Section Completeness", "10%",
                "Expected sections found vs expected",
                "Header pattern matching against recognized variant list",
              ],
              [
                "Quantified Impact", "10%",
                "Metrics and evidence language density",
                "Regex patterns: numbers, percentages, 13 impact verbs",
              ],
            ]}
          />
          <Callout variant="info" title="Neutral defaults">
            When a sub-score cannot be measured, it defaults to 0.50 — neutral. This
            happens when the job description specifies no years requirement (Experience
            defaults to 0.50), or when the JD uses no recognized vocabulary (Keyword
            Match defaults to 0.50). A neutral default is not a penalty. The scan result
            notes when this has occurred.
          </Callout>
          <p style={{ margin: "1.1rem 0 0.9rem" }}>
            The plain-language label shown next to the overall score is a fixed display
            band over the same number — nothing more. Bands are not outcome predictions.
          </p>
          <MTable
            headers={["Score range", "Label"]}
            rows={[
              ["85–100", "Excellent"],
              ["70–84",  "Strong"],
              ["55–69",  "Solid"],
              ["40–54",  "Needs work"],
              ["0–39",   "At risk"],
            ]}
          />
        </MSection>

        {/* ── Section 3 ─────────────────────────────────────────────────────── */}
        <MSection id="keyword-matching" title="Keyword matching">
          <p style={{ margin: "0 0 0.9rem" }}>
            Keyword extraction scans the job description for approximately 65 recognized
            single-term keywords and 18 multi-word phrases. Single-term keywords are
            matched by exact token; phrases by substring. Both lists are deterministic
            and documented below.
          </p>
          <p style={{ margin: "0 0 0.9rem" }}>
            Résumé matching uses exact token matching plus a synonym equivalence table.
            Common industry shorthands are treated as exact equivalents — not approximate
            matches. Short abbreviations (e.g. "ml", "nlp") are matched as whole words
            only, preventing false substring hits against unrelated terms.
          </p>
          <MTable
            headers={["JD term", "Recognized résumé equivalents"]}
            rows={[
              ["kubernetes",                   "k8s"],
              ["machine learning",             "ml (whole word only)"],
              ["natural language processing",  "nlp (whole word only)"],
              ["node.js",                      "nodejs, node"],
              ["c#",                           "csharp"],
              [".net",                         "dotnet"],
              ["ci/cd",                        "continuous integration, continuous deployment"],
              ["vue",                          "vue.js"],
              ["ruby on rails",                "rails"],
              ["postgresql",                   "postgres"],
              ["javascript",                   "js"],
              ["typescript",                   "ts"],
              ["go / golang",                  "golang, go (in technical context only)"],
            ]}
          />
          <Callout variant="warning" title="JD vocabulary limit">
            TraceRank recognizes approximately 65 single-term tech keywords and 18
            multi-word phrases. Job descriptions that use no recognized terms — common
            in non-technical roles, operations, or highly specialized fields — produce a
            Keyword Match default of 0.50. A notice appears in scan results when this
            occurs. Expanding vocabulary coverage is ongoing.
          </Callout>
          <Callout variant="note" title="Adjacent skill inference — Transferable Skills profile only">
            The Transferable Skills profile applies partial credit when a required keyword
            is absent but related terms appear. For example: if "kubernetes" is required
            and the résumé contains "docker" or "helm," partial credit is applied. This
            uses a static lookup table of approximately 50 term-to-related-term mappings
            — not NLP, not vector similarity, not semantic understanding. It is a
            heuristic approximation of how a skills-aware screener might interpret
            transferable background. The label "adjacent skill inference" is used
            throughout to distinguish it from claims of semantic similarity.
          </Callout>
        </MSection>

        {/* ── Section 4 ─────────────────────────────────────────────────────── */}
        <MSection id="section-detection" title="Section detection">
          <p style={{ margin: "0 0 0.9rem" }}>
            Résumé sections are detected by matching header lines against a list of
            recognized variants for each canonical section. Matching is
            case-insensitive and strips trailing punctuation. The engine also recognizes
            headers that begin with a recognized keyword followed by common suffixes
            (e.g. "Skills &amp; Technologies", "Experience (2018–2024)").
          </p>
          <MTable
            headers={["Section", "Key recognized header variants"]}
            rows={[
              [
                "Experience",
                "experience, work experience, professional experience, work history, employment history, relevant experience, professional background, career",
              ],
              [
                "Skills",
                "skills, technical skills, core competencies, areas of expertise, tech stack, technologies, tools, programming languages, technical background, proficiencies",
              ],
              [
                "Education",
                "education, academic background, degree, university, college, educational background",
              ],
              [
                "Summary",
                "summary, professional summary, objective, profile, about, overview — and any header starting with these words",
              ],
              [
                "Projects",
                "projects, personal projects, portfolio, open source",
              ],
            ]}
          />
          <Callout variant="note" title="Unrecognized headers">
            If a résumé uses a header not in the recognized list, content under it is
            classified as unassigned — it is still scanned for keywords and impact
            language. A "missing section" issue is only generated when a section is
            genuinely absent after checking all recognized variants. The issue evidence
            panel shows which headers were searched.
          </Callout>
        </MSection>

        {/* ── Section 5 ─────────────────────────────────────────────────────── */}
        <MSection id="experience-inference" title="Experience inference">
          <p style={{ margin: "0 0 0.9rem" }}>
            Experience Alignment uses two passes. First, the résumé is scanned for
            explicit self-reported tenure ("5 years of experience", "8+ years"). Second,
            date ranges are extracted and summed. The larger of the two results is used.
          </p>
          <p style={{ margin: "0 0 0.9rem" }}>
            Date ranges are detected for patterns such as "2019–2024", "2020–Present",
            and "Jan 2018 – Dec 2022". Overlapping spans are merged before summing to
            avoid double-counting concurrent roles. For example: if a résumé shows
            "Company A, 2019–2022" and "Company B, 2021–2024," the inferred total is
            5 years — not 6 — because the 2021–2022 overlap is counted once. "Present"
            and "Current" resolve to {SCORING_YEAR}, updated annually.
          </p>
          <Callout variant="warning" title="Experience inference limitations">
            Year-granularity only — months are not parsed. Sub-year roles, consulting
            contracts, and overlapping freelance work may be undercounted. Résumés that
            state total tenure explicitly will always use the explicit value if it is
            larger than the inferred date-range span.
          </Callout>
        </MSection>

        {/* ── Section 6 ─────────────────────────────────────────────────────── */}
        <MSection id="profile-simulations" title="Profile simulations">
          <p style={{ margin: "0 0 0.9rem" }}>
            TraceRank computes a second set of scores using three profiles — Exact Match,
            Structure Sensitive, and Transferable Skills — each applying different
            weights to the same pre-computed signals. Profile scores show how the same
            résumé performs under different screening priorities, not under different
            data. All seven signals are extracted once and shared across all three
            profiles.
          </p>
          <MTable
            headers={["Signal", "Exact Match", "Structure Sensitive", "Transferable Skills"]}
            rows={[
              ["Keyword exact match",      "35%",  "18%",  "14%"],
              ["Must-have keywords",       "20%",  "12%",  "10%"],
              ["Adjacent skill inference", "8%",   "8%",   "30%"],
              ["Section completeness",     "12%",  "28%",  "13%"],
              ["Parse integrity",          "10%",  "22%",  "10%"],
              ["Impact language",          "8%",   "6%",   "13%"],
              ["Experience alignment",     "7%",   "6%",   "10%"],
            ]}
          />
          <Callout variant="warning" title="These profiles are heuristic simulations, not replicas of real software">
            They represent three distinct evaluation priorities applied to the same
            extracted signals. They are not reproductions of Greenhouse, Lever, Workday,
            iCIMS, or any other ATS vendor. Score differences across profiles show how
            the same résumé performs under different weighting schemes.
          </Callout>
        </MSection>

        {/* ── Section 7 ─────────────────────────────────────────────────────── */}
        <MSection id="issue-generation" title="Issue generation and ranking">
          <p style={{ margin: "0 0 0.9rem" }}>
            Issues are generated by independent checks, each targeting a specific quality
            criterion. Each issue carries a severity level, evidence text, and a
            suggested fix. The "Fix this first" ranking is computed from an impact score
            combining severity weight, detection confidence, and JD relevance — higher
            impact issues appear first regardless of issue type.
          </p>
          <MTable
            headers={["Issue type", "Trigger", "Severity", "Evidence shown"]}
            rows={[
              [
                "Keyword gap",
                "JD keyword absent from résumé after synonym check",
                "High if in the JD's stated requirements, Medium if mentioned elsewhere",
                "JD keyword + synonym check result",
              ],
              [
                "Weak phrasing",
                "Bullet starts with a passive or weak verb (9 patterns)",
                "Medium",
                "Matched pattern + rewrite starter",
              ],
              [
                "Missing section",
                "Expected section absent after all header variants checked",
                "Critical / High / Medium (by section)",
                "Headers found vs headers searched",
              ],
              [
                "Low quantification",
                "Fewer than 40% of experience bullets contain metrics language",
                "High",
                "Bullet count + checked lines",
              ],
              [
                "Summary mismatch",
                "Summary covers fewer than 20% of JD keywords",
                "High",
                "Overlap percentage + missing terms",
              ],
              [
                "Parse warning",
                "Multi-column layout, tables, or text boxes detected during extraction",
                "High",
                "Detected artifacts + formatting fixes",
              ],
            ]}
          />
        </MSection>

        {/* ── Section 8 ─────────────────────────────────────────────────────── */}
        <MSection id="rewrite-assistance" title="Rewrite assistance">
          <p style={{ margin: "0 0 0.9rem" }}>
            All scoring, issue detection, and issue ranking are fully deterministic —
            no language model is involved in any of these steps. When AI rewrite
            assistance is enabled, a language model generates alternative phrasing
            suggestions for flagged bullets. These suggestions are for reference only;
            they do not change TraceRank's score or issue list. Rewrite suggestions
            without AI are generated from pattern-based templates.
          </p>
          <Callout variant="note" title="AI rewrite assistance is optional">
            The language model only generates phrasing suggestions. It does not assess
            résumé quality, modify scores, or produce findings. Disabling it has no
            effect on scoring or issue generation.
          </Callout>
        </MSection>

        {/* ── Section 9 — Limitations (distinct styling) ────────────────────── */}
        <section
          id="limitations"
          style={{
            marginTop: "2rem",
            border: "1px solid #d9d3ca",
            borderRadius: 6,
            padding: "1.5rem 1.6rem",
            background: "rgba(31,29,26,0.025)",
          }}
        >
          <h2
            style={{
              fontSize: "1.1rem",
              fontWeight: 600,
              color: "#1a1917",
              margin: "0 0 1rem",
              letterSpacing: "-0.01em",
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              gap: "0.6rem",
            }}
          >
            <a href="#limitations" style={{ color: "inherit", textDecoration: "none" }}>
              Limitations
            </a>
            <span
              style={{
                fontSize: "0.62rem",
                fontWeight: 500,
                letterSpacing: "0.09em",
                textTransform: "uppercase",
                color: "#8c2f4e",
                border: "1px solid rgba(140,47,78,0.3)",
                borderRadius: 3,
                padding: "0.15rem 0.5rem",
                lineHeight: 1.4,
              }}
            >
              Read before citing scores
            </span>
          </h2>
          <ul
            style={{
              margin: 0,
              padding: "0 0 0 1.2rem",
              display: "grid",
              gap: "0.7rem",
              fontSize: "0.875rem",
              lineHeight: 1.7,
              color: "#6e6b66",
            }}
          >
            <li>
              <strong style={{ color: "#1a1917" }}>JD vocabulary:</strong>{" "}
              Approximately 65 single-term keywords and 18 phrases are recognized. JDs
              outside this vocabulary produce a neutral keyword score with a notice.
            </li>
            <li>
              <strong style={{ color: "#1a1917" }}>Section detection:</strong>{" "}
              Uses pattern matching. Non-English résumés, highly creative headers, or
              novel section names may not be recognized.
            </li>
            <li>
              <strong style={{ color: "#1a1917" }}>Experience inference:</strong>{" "}
              Year-granularity only. Part-time, freelance, and concurrent roles may be
              undercounted or merged incorrectly.
            </li>
            <li>
              <strong style={{ color: "#1a1917" }}>Parseability signals:</strong>{" "}
              Detecting multi-column layout or tables is a risk signal, not a guarantee
              of ATS parsing failure. Some parsers handle these formats.
            </li>
            <li>
              <strong style={{ color: "#1a1917" }}>No ATS vendor replication:</strong>{" "}
              TraceRank does not emulate any specific hiring software. Scores reflect
              the TraceRank heuristic model only.
            </li>
            <li>
              <strong style={{ color: "#1a1917" }}>No outcome prediction:</strong>{" "}
              A high score does not mean you will pass screening. A low score does not
              mean you will fail. Scores reflect structural and keyword criteria only.
            </li>
            <li>
              <strong style={{ color: "#1a1917" }}>Adjacent skill inference:</strong>{" "}
              The lookup table covers approximately 50 term relationships. It does not
              understand meaning — it matches against a static list.
            </li>
          </ul>
        </section>

        {/* Footer */}
        <footer
          style={{
            marginTop: "2.5rem",
            paddingTop: "1.25rem",
            borderTop: "1px solid #d9d3ca",
            fontSize: "0.78rem",
            color: "#6e6b66",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.35rem 0.75rem",
            alignItems: "center",
          }}
        >
          <span>Methodology version: 1.1</span>
          <span style={{ color: "rgba(26,25,23,0.08)" }}>·</span>
          <span>Engine frozen 2026-05-30</span>
          <span style={{ color: "rgba(26,25,23,0.08)" }}>·</span>
          <a
            href="https://github.com/rjaada/Adversarial-R-sum--Scanner/commits/main"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#1a1917", textDecoration: "none" }}
          >
            View changelog
          </a>
          <span style={{ color: "rgba(26,25,23,0.08)" }}>·</span>
          <a href="/privacy" style={{ color: "#1a1917", textDecoration: "none" }}>Privacy</a>
        </footer>

      </main>
    </div>
  )
}
