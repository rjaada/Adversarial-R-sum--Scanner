/**
 * Phase 1 of the workspace — file upload + job description input.
 * Shown before the user runs a scan. Handles drag-drop and file selection.
 * Edit copy (heading, disclaimer) here. Edit card layout/sizing here.
 */

"use client"

import type { RefObject } from "react"

const FA = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"

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
      background: "#F4F4F4", padding: "48px 24px",
    }}>

      {/* Eyebrow */}
      <p style={{ fontFamily: FA, fontSize: "12px", fontWeight: 500, color: "#858585", textTransform: "uppercase", letterSpacing: "0.1em", margin: "0 0 16px" }}>
        Résumé Intelligence
      </p>

      {/* Heading — edit copy here */}
      <h2 style={{ fontFamily: FA, fontSize: "28px", fontWeight: 600, color: "#0D0C0A", margin: "0 0 48px", textAlign: "center", maxWidth: 560, lineHeight: 1.3 }}>
        Upload your résumé and paste a job description to begin.
      </h2>

      {/* Input cards */}
      <div style={{ display: "flex", gap: "24px", alignItems: "stretch", flexWrap: "wrap", justifyContent: "center" }}>

        {/* Card 1 — Résumé file */}
        <div
          className="upload-card-hover"
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onClick={() => fileInputRef.current?.click()}
          style={{
            width: "340px", minHeight: "260px",
            background: dragOver ? "#FAFAF8" : "#FFFFFF",
            border: `1.5px dashed ${dragOver ? "#0D0C0A" : "#C8C4BE"}`,
            borderRadius: "12px", padding: "40px 32px",
            cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "10px",
            transition: "border-color 0.2s, background 0.2s", boxSizing: "border-box",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx"
            style={{ display: "none" }}
            onChange={e => { const f = e.target.files?.[0]; if (f) onFileChange(f) }}
          />
          {/* Upload icon */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M12 15V4" stroke="#B3B3B3" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M8 8l4-4 4 4" stroke="#B3B3B3" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M3 16v3a2 2 0 002 2h14a2 2 0 002-2v-3" stroke="#B3B3B3" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: FA, fontSize: "15px", fontWeight: 600, color: "#0D0C0A" }}>Résumé</span>
          {file ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ color: "#7c8e5c", fontSize: "13px" }}>✓</span>
              <span style={{ fontFamily: FA, fontSize: "13px", color: "#0D0C0A", wordBreak: "break-all", textAlign: "center" }}>{file.name}</span>
              <button
                onClick={e => { e.stopPropagation(); onFileClear() }}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#858585", padding: "0 2px", lineHeight: 1, flexShrink: 0 }}
              >×</button>
            </div>
          ) : (
            <span style={{ fontFamily: FA, fontSize: "13px", color: "#858585" }}>PDF or DOCX</span>
          )}
        </div>

        {/* Card 2 — Job description */}
        <div style={{
          width: "340px", minHeight: "260px",
          background: "#FFFFFF",
          border: `1.5px dashed ${jdFocused ? "#0D0C0A" : "#C8C4BE"}`,
          borderRadius: "12px", padding: "40px 32px",
          transition: "border-color 0.2s", boxSizing: "border-box",
          display: "flex", flexDirection: "column", gap: "4px",
        }}>
          <span style={{ fontFamily: FA, fontSize: "15px", fontWeight: 600, color: "#0D0C0A" }}>Job Description</span>
          <span style={{ fontFamily: FA, fontSize: "13px", color: "#858585", marginBottom: "8px" }}>Paste the full job posting</span>
          <textarea
            value={jdText}
            onChange={e => onJdChange(e.target.value)}
            onFocus={onJdFocus}
            onBlur={onJdBlur}
            placeholder="Paste the job description here..."
            style={{
              flex: 1, minHeight: "120px", border: "none", outline: "none",
              background: "transparent", fontFamily: FA, fontSize: "14px",
              color: "#474546", lineHeight: 1.6, resize: "none",
              width: "100%", boxSizing: "border-box",
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
          marginTop: "32px",
          background:   canScan ? "#0D0C0A" : "#EBEBEB",
          color:        canScan ? "#FFFFFF"  : "#B3B3B3",
          fontFamily:   FA, fontSize: "15px", fontWeight: 500,
          borderRadius: "100px", height: "52px", padding: "0 48px",
          border: "none", cursor: canScan ? "pointer" : "not-allowed",
          transition: "background 0.2s",
        }}
        onMouseEnter={e => { if (canScan) (e.currentTarget as HTMLButtonElement).style.background = "#474546" }}
        onMouseLeave={e => { if (canScan) (e.currentTarget as HTMLButtonElement).style.background = "#0D0C0A" }}
      >
        Scan résumé →
      </button>

      {/* Disclaimer — edit copy here */}
      <p style={{ fontFamily: FA, fontSize: "12px", color: "#B3B3B3", margin: "12px 0 0", textAlign: "center" }}>
        Your résumé file is never stored. Analysis only.
      </p>
    </div>
  )
}
