/**
 * Phase 2 of the workspace — scanning progress shown while the API call runs.
 *
 * The bar is genuinely indeterminate (a sweeping segment), not a fake
 * fill-to-90%-then-freeze. After 15s a cold-start notice appears: the free
 * backend tier can sleep and take ~30–60s to wake (see DEPLOY.md), and a
 * frozen-looking bar drives abandonment.
 */

"use client"

import { useEffect, useState } from "react"

const FA = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"

const SLOW_NOTICE_MS = 15_000

export function ScanningPhase() {
  const [slow, setSlow] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSlow(true), SLOW_NOTICE_MS)
    return () => clearTimeout(t)
  }, [])

  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#F4F4F4", gap: "20px", padding: "0 24px",
    }}>
      {/* Indeterminate progress bar */}
      <div
        role="progressbar"
        aria-label="Analyzing résumé"
        style={{ position: "relative", width: "280px", height: "2px", background: "#EBEBEB", borderRadius: "2px", overflow: "hidden" }}
      >
        <div
          className="tr-scan-sweep"
          style={{ position: "absolute", top: 0, left: 0, height: "100%", width: "40%", background: "#0D0C0A", borderRadius: "2px" }}
        />
      </div>

      <p style={{ fontFamily: FA, fontSize: "16px", color: "#474546", margin: 0 }}>
        Analyzing your résumé…
      </p>
      <p style={{ fontFamily: FA, fontSize: "13px", color: "#B3B3B3", margin: 0, textAlign: "center" }}>
        Parsing structure, extracting keywords, scoring signals.
      </p>

      {slow && (
        <p style={{ fontFamily: FA, fontSize: "13px", color: "#9a4d22", margin: "4px 0 0", textAlign: "center", maxWidth: 360, lineHeight: 1.5 }}>
          This is taking longer than usual — our server may be waking up. Hang tight.
        </p>
      )}

      <style>{`
        @keyframes tr-scan-sweep {
          0%   { left: -40%; }
          100% { left: 100%; }
        }
        .tr-scan-sweep { animation: tr-scan-sweep 1.1s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .tr-scan-sweep { animation: none; left: 0; width: 100%; opacity: 0.5; }
        }
      `}</style>
    </div>
  )
}
