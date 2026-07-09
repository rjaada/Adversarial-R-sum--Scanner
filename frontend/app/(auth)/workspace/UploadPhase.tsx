/**
 * Phase 1 of the workspace — file upload + job description input.
 * Redesigned from beta feedback ("I didn't know what I was supposed to do"):
 * a 1-2-3 how-it-works line, step-numbered cards, a paper-stack illustration,
 * an explicit Browse button, and a file-chip confirmation state.
 */

"use client"

import type { RefObject } from "react"

const FA   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)"
const BG   = "#FDFCF9"
const MUT  = "#F1EEE8"
const SURF = "#FFFFFF"
const BD   = "rgba(26,25,23,0.08)"
const BD2  = "rgba(26,25,23,0.16)"
const T1   = "#1a1917"
const T2   = "#6e6b66"
const T3   = "#a09890"

interface UploadPhaseProps {
  file: File | null
  jdText: string
  dragOver: boolean
  jdFocused: boolean
  error: string | null
  canScan: boolean
  fileInputRef: RefObject<HTMLInputElement>
  onFileChange: (f: File) => void
  onFileClear: () => void
  onJdChange: (text: string) => void
  onJdFocus: () => void
  onJdBlur: () => void
  onDrop: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: () => void
  onScan: () => void
}

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** Stack of papers — two ghosted tilted pages behind a crisp front page. */
function PaperStack() {
  return (
    <svg width="112" height="82" viewBox="24 10 88 66" fill="none" style={{ transition: "translate 0.25s ease" }}>
      <g transform="rotate(-9 48 50)" opacity="0.30">
        <rect x="30" y="24" width="36" height="48" rx="3" stroke={T1} strokeWidth="1.5" fill={SURF} />
        <line x1="37" y1="36" x2="59" y2="36" stroke={T1} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="37" y1="44" x2="55" y2="44" stroke={T1} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="37" y1="52" x2="58" y2="52" stroke={T1} strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <g transform="rotate(8 88 46)" opacity="0.55">
        <rect x="70" y="20" width="36" height="48" rx="3" stroke={T1} strokeWidth="1.5" fill={SURF} />
        <line x1="77" y1="32" x2="99" y2="32" stroke={T1} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="77" y1="40" x2="93" y2="40" stroke={T1} strokeWidth="1.4" strokeLinecap="round" />
        <line x1="77" y1="48" x2="98" y2="48" stroke={T1} strokeWidth="1.4" strokeLinecap="round" />
      </g>
      <g>
        <path d="M50 14 h26 l10 10 v46 a3 3 0 0 1 -3 3 h-33 a3 3 0 0 1 -3 -3 v-53 a3 3 0 0 1 3 -3 z" stroke={T1} strokeWidth="1.7" fill={SURF} />
        <path d="M76 14 v10 h10" stroke={T1} strokeWidth="1.7" fill="none" strokeLinejoin="round" />
        <line x1="55" y1="34" x2="79" y2="34" stroke={T1} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="55" y1="42" x2="74" y2="42" stroke={T1} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="55" y1="50" x2="78" y2="50" stroke={T1} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="55" y1="58" x2="70" y2="58" stroke={T1} strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

const cardStyle: React.CSSProperties = {
  width: "360px", minHeight: "300px", background: SURF,
  border: `1px solid ${BD2}`, borderRadius: "14px",
  boxShadow: "0 18px 50px rgba(26,25,23,0.07)",
  padding: "26px 28px", position: "relative", boxSizing: "border-box",
}

const stepNoStyle: React.CSSProperties = {
  position: "absolute", top: "18px", left: "20px",
  fontFamily: MONO, fontSize: "11px", color: T3,
}

export function UploadPhase({
  file,
  jdText,
  dragOver,
  jdFocused,
  error,
  canScan,
  fileInputRef,
  onFileChange,
  onFileClear,
  onJdChange,
  onJdFocus,
  onJdBlur,
  onDrop,
  onDragOver,
  onDragLeave,
  onScan,
}: UploadPhaseProps) {
  return (
    <div style={{
      flex: 1, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: MUT, padding: "48px 24px",
    }}>

      {/* Eyebrow */}
      <p style={{ fontFamily: MONO, fontSize: "11px", fontWeight: 500, color: T3, textTransform: "uppercase", letterSpacing: "0.16em", margin: "0 0 14px" }}>
        Résumé Intelligence
      </p>

      {/* Heading */}
      <h2 style={{ fontFamily: FA, fontSize: "28px", fontWeight: 600, color: T1, margin: "0 0 18px", textAlign: "center", maxWidth: 560, lineHeight: 1.3, letterSpacing: "-0.01em" }}>
        See what the machines see.
      </h2>

      {/* How it works — answers "what am I supposed to do?" up front */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", flexWrap: "wrap", fontFamily: FA, fontSize: "13.5px", color: T2, margin: "0 0 30px" }}>
        <span><b style={{ color: T1, fontWeight: 600 }}>1&nbsp; Upload your résumé</b></span>
        <span style={{ color: T3, fontFamily: MONO }}>→</span>
        <span><b style={{ color: T1, fontWeight: 600 }}>2&nbsp; Paste the job description</b></span>
        <span style={{ color: T3, fontFamily: MONO }}>→</span>
        <span><b style={{ color: T1, fontWeight: 600 }}>3&nbsp; Get your scored report</b></span>
      </div>

      {/* Input cards */}
      <div style={{ display: "flex", gap: "20px", alignItems: "stretch", flexWrap: "wrap", justifyContent: "center" }}>

        {/* Card 01 — Résumé file */}
        <div style={cardStyle}>
          <span style={stepNoStyle}>01</span>
          <h3 style={{ fontFamily: FA, fontSize: "15px", fontWeight: 700, color: T1, margin: "14px 0 0", display: "flex", alignItems: "center", gap: "6px" }}>
            Résumé {file && <span style={{ fontSize: "13px" }}>✓</span>}
          </h3>
          <div style={{ fontFamily: FA, fontSize: "12.5px", color: T3, marginTop: "3px" }}>
            One file — we never store it
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f) }}
          />

          {file ? (
            /* confirmation chip */
            <div style={{ marginTop: "18px", display: "flex", alignItems: "center", gap: "12px", border: `1px solid ${BD}`, borderRadius: "10px", padding: "13px 15px", background: BG }}>
              <span style={{
                width: "34px", height: "40px", border: `1.5px solid ${T1}`, borderRadius: "5px",
                position: "relative", flexShrink: 0, background: SURF,
                display: "flex", alignItems: "flex-end", justifyContent: "center",
                fontFamily: MONO, fontSize: "7.5px", fontWeight: 600, color: T1, paddingBottom: "3px",
              }}>
                {file.name.toLowerCase().endsWith(".docx") ? "DOCX" : "PDF"}
              </span>
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: "block", fontFamily: FA, fontSize: "13.5px", fontWeight: 600, color: T1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</span>
                <span style={{ display: "block", fontFamily: MONO, fontSize: "10.5px", color: T3, marginTop: "2px" }}>{fmtSize(file.size)} · READY TO SCAN</span>
              </span>
              <button
                onClick={e => { e.stopPropagation(); onFileClear() }}
                aria-label="Remove file"
                style={{ border: 0, background: "none", fontFamily: MONO, fontSize: "13px", color: T3, cursor: "pointer" }}
              >✕</button>
            </div>
          ) : (
            /* dropzone */
            <div
              onDrop={onDrop}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = T1; (e.currentTarget as HTMLDivElement).style.background = "rgba(26,25,23,0.015)" }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = dragOver ? T1 : BD2; (e.currentTarget as HTMLDivElement).style.background = "transparent" }}
              style={{
                marginTop: "18px",
                border: `1.5px dashed ${dragOver ? T1 : BD2}`,
                borderRadius: "10px", padding: "24px 20px 26px", textAlign: "center",
                display: "flex", flexDirection: "column", alignItems: "center", gap: "10px",
                transition: "border-color 0.2s, background 0.2s", cursor: "pointer",
                background: dragOver ? "rgba(26,25,23,0.02)" : "transparent",
              }}
            >
              <PaperStack />
              <div style={{ fontFamily: FA, fontSize: "15px", fontWeight: 600, color: T1 }}>Drag &amp; drop your résumé</div>
              <div style={{ fontFamily: FA, fontSize: "12px", color: T3 }}>or</div>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); fileInputRef.current?.click() }}
                style={{ fontFamily: FA, fontSize: "13.5px", fontWeight: 600, background: T1, color: BG, border: 0, borderRadius: "999px", padding: "10px 26px", cursor: "pointer" }}
              >
                Browse files
              </button>
              <div style={{ fontFamily: MONO, fontSize: "10.5px", color: T3, letterSpacing: "0.04em", marginTop: "2px" }}>
                PDF · DOCX — MAX 10 MB
              </div>
            </div>
          )}
        </div>

        {/* Card 02 — Job description */}
        <div style={cardStyle}>
          <span style={stepNoStyle}>02</span>
          <h3 style={{ fontFamily: FA, fontSize: "15px", fontWeight: 700, color: T1, margin: "14px 0 0" }}>Job description</h3>
          <div style={{ fontFamily: FA, fontSize: "12.5px", color: T3, marginTop: "3px" }}>
            Paste the full posting — LinkedIn, Indeed, anywhere
          </div>
          <textarea
            value={jdText}
            onChange={e => onJdChange(e.target.value)}
            onFocus={onJdFocus}
            onBlur={onJdBlur}
            placeholder="Paste the job description here…"
            style={{
              marginTop: "14px", width: "100%", height: "180px", resize: "none",
              border: jdFocused ? `1.5px solid ${T1}` : `1.5px dashed ${BD2}`,
              borderRadius: "10px", padding: "14px",
              fontFamily: FA, fontSize: "13.5px", color: T1, background: "transparent",
              outline: "none", lineHeight: 1.6, boxSizing: "border-box",
              transition: "border-color 0.2s",
            }}
          />
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div style={{ marginTop: "16px", fontFamily: FA, fontSize: "13px", color: "var(--sev-critical)", padding: "10px 16px", border: "1px solid rgba(192,112,128,0.3)", borderRadius: "8px", background: "rgba(140,47,78,0.06)" }}>
          {error}
        </div>
      )}

      {/* Scan button */}
      <button
        onClick={onScan}
        disabled={!canScan}
        style={{
          marginTop: "30px",
          background:   canScan ? T1 : "rgba(26,25,23,0.08)",
          color:        canScan ? BG : T3,
          fontFamily:   FA, fontSize: "15px", fontWeight: 600,
          borderRadius: "999px", height: "52px", padding: "0 46px",
          border: "none", cursor: canScan ? "pointer" : "not-allowed",
          transition: "opacity 0.2s",
        }}
        onMouseEnter={e => { if (canScan) (e.currentTarget as HTMLButtonElement).style.opacity = "0.85" }}
        onMouseLeave={e => { if (canScan) (e.currentTarget as HTMLButtonElement).style.opacity = "1" }}
      >
        Scan résumé →
      </button>

      {/* Disclaimer */}
      <p style={{ fontFamily: MONO, fontSize: "10.5px", color: T3, margin: "12px 0 0", textAlign: "center", letterSpacing: "0.04em" }}>
        YOUR FILE IS NEVER STORED · ANALYSIS ONLY
      </p>
    </div>
  )
}
