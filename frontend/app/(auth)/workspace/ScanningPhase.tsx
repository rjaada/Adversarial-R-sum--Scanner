/**
 * Phase 2 of the workspace — scanning progress animation shown while the API call runs.
 * Edit copy or swap the progress bar for a richer animation here.
 * TODO: replace the CSS bar with an animated scanner visualization (document scan line,
 *       keyword extraction pulse, or score counter animation) in a future UI pass.
 */

"use client"

const FA = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"

export function ScanningPhase() {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#F4F4F4", gap: "20px",
    }}>
      {/* Progress bar */}
      <div style={{ width: "280px", height: "2px", background: "#EBEBEB", borderRadius: "2px", overflow: "hidden" }}>
        <div
          className="tr-scan-bar"
          style={{ height: "100%", background: "#0D0C0A", borderRadius: "2px", width: "0%" }}
        />
      </div>
      <p style={{ fontFamily: FA, fontSize: "16px", color: "#474546", margin: 0 }}>
        Analyzing your résumé…
      </p>
      <p style={{ fontFamily: FA, fontSize: "13px", color: "#B3B3B3", margin: 0, textAlign: "center" }}>
        Parsing structure, extracting keywords, scoring signals.
      </p>
    </div>
  )
}
