"use client"

/**
 * InfoTip — monochrome jargon tooltip (beta feedback: "terms like ATS,
 * Parse Integrity… no tooltip to help them out").
 *
 * Trigger is a small "?" dot that inverts on hover. The card renders with
 * position:fixed (computed from the trigger rect) so it escapes any
 * overflow:hidden ancestor (the report Cards clip their children).
 * Hover opens on desktop; tap toggles on touch. Closes on scroll.
 */

import { useEffect, useRef, useState } from "react"

const FA   = "var(--font-albert, 'Albert Sans', system-ui, sans-serif)"
const MONO = "var(--font-mono, 'IBM Plex Mono', monospace)"
const BG   = "#FDFCF9"
const SURF = "#FFFFFF"
const BD   = "rgba(26,25,23,0.08)"
const BD2  = "rgba(26,25,23,0.16)"
const T1   = "#1a1917"
const T2   = "#6e6b66"
const T3   = "#a09890"

const TIP_W = 280

interface Props {
  title: string
  body: string
  learnHref?: string
  /** optional illustrated band rendered above the text (rich variant) */
  art?: React.ReactNode
}

export function InfoTip({ title, body, learnHref, art }: Props) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ x: number; y: number; above: boolean }>({ x: 0, y: 0, above: false })
  const trigRef = useRef<HTMLSpanElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function show() {
    if (closeTimer.current) { clearTimeout(closeTimer.current); closeTimer.current = null }
    const r = trigRef.current?.getBoundingClientRect()
    if (!r) return
    const estH = art ? 300 : 150
    const above = r.bottom + estH + 16 > window.innerHeight
    const x = Math.min(Math.max(r.left + r.width / 2, TIP_W / 2 + 10), window.innerWidth - TIP_W / 2 - 10)
    setPos({ x, y: above ? r.top - 10 : r.bottom + 10, above })
    setOpen(true)
  }
  function scheduleHide() {
    closeTimer.current = setTimeout(() => setOpen(false), 160)
  }

  useEffect(() => {
    if (!open) return
    const close = () => setOpen(false)
    window.addEventListener("scroll", close, true)
    return () => window.removeEventListener("scroll", close, true)
  }, [open])

  return (
    <>
      <span
        ref={trigRef}
        role="button"
        tabIndex={0}
        aria-label={`What is ${title}?`}
        onMouseEnter={show}
        onMouseLeave={scheduleHide}
        onClick={e => { e.stopPropagation(); open ? setOpen(false) : show() }}
        onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); open ? setOpen(false) : show() } }}
        style={{
          width: "15px", height: "15px", borderRadius: "50%",
          background: open ? T1 : "rgba(26,25,23,0.10)",
          color: open ? SURF : T2,
          fontSize: "10px", fontWeight: 600, fontFamily: MONO,
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", flexShrink: 0, verticalAlign: "middle",
          transition: "background 0.15s, color 0.15s", userSelect: "none",
        }}
      >
        ?
      </span>

      {open && (
        <div
          onMouseEnter={show}
          onMouseLeave={scheduleHide}
          onClick={e => e.stopPropagation()}
          style={{
            position: "fixed", left: pos.x, top: pos.y, zIndex: 300,
            transform: `translate(-50%, ${pos.above ? "-100%" : "0"})`,
            width: TIP_W, background: SURF,
            border: `1px solid ${BD2}`, borderRadius: "12px",
            boxShadow: "0 18px 50px rgba(26,25,23,0.14), 0 2px 8px rgba(26,25,23,0.05)",
            overflow: "hidden",
          }}
        >
          {art && (
            <div style={{ background: BG, borderBottom: `1px solid ${BD}` }}>
              {art}
            </div>
          )}
          <div style={{ padding: "14px 16px 15px" }}>
            <div style={{ fontFamily: FA, fontSize: "14px", fontWeight: 700, color: T1, letterSpacing: "-0.01em", marginBottom: "5px" }}>
              {title}
            </div>
            <div style={{ fontFamily: FA, fontSize: "12.5px", color: T2, lineHeight: 1.6 }}>
              {body}
            </div>
            {learnHref && (
              <a
                href={learnHref}
                target="_blank"
                style={{ display: "inline-block", marginTop: "9px", fontFamily: FA, fontSize: "12px", fontWeight: 600, color: T1, textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                Learn more →
              </a>
            )}
          </div>
        </div>
      )}
    </>
  )
}

/**
 * AtsLensArt — the animated magnifier: an A4 sheet scales in, a lens drifts
 * over it revealing the raw words a parser reads; past the paper's edge the
 * lens shows nothing. Used once, on the "What ATS sees" tooltip.
 */
export function AtsLensArt() {
  return (
    <div style={{ position: "relative", height: 150, overflow: "hidden" }}>
      <style>{`
        @keyframes trPageIn { 0% { transform: scale(0.55); } 9%, 100% { transform: scale(1); } }
        @keyframes trLensMove {
          0%, 9% { translate: 66px 16px; } 38% { translate: 142px 52px; }
          70% { translate: 8px 42px; } 100% { translate: 66px 16px; }
        }
        @keyframes trLensInv {
          0%, 9% { translate: -66px -16px; } 38% { translate: -142px -52px; }
          70% { translate: -8px -42px; } 100% { translate: -66px -16px; }
        }
      `}</style>

      {/* the formatted A4 (top half visible) */}
      <div style={{
        position: "absolute", left: 40, top: 12, width: 190, height: 269,
        background: SURF, border: `1px solid ${BD2}`, borderRadius: 3,
        padding: "16px 18px", boxShadow: "0 6px 20px rgba(26,25,23,0.10)",
        display: "flex", flexDirection: "column", gap: 7,
        transformOrigin: "50% 20%", animation: "trPageIn 9s ease-in-out infinite",
      }}>
        <span style={{ position: "absolute", top: -7, right: -9, background: T1, color: BG, fontFamily: MONO, fontSize: 8, fontWeight: 600, letterSpacing: "0.08em", borderRadius: 3, padding: "2.5px 6px" }}>PDF</span>
        <div style={{ height: 8, width: "52%", margin: "0 auto", background: "rgba(26,25,23,0.6)", borderRadius: 2 }} />
        <div style={{ height: 4.5, width: "70%", margin: "0 auto 2px", background: "rgba(26,25,23,0.18)", borderRadius: 2 }} />
        <div style={{ height: 1, background: "rgba(26,25,23,0.14)", margin: "2px 0" }} />
        <div style={{ height: 6.5, width: "32%", background: "rgba(26,25,23,0.42)", borderRadius: 2, marginTop: 3 }} />
        <div style={{ height: 5.5, width: "96%", background: "rgba(26,25,23,0.15)", borderRadius: 2 }} />
        <div style={{ height: 5.5, width: "84%", background: "rgba(26,25,23,0.15)", borderRadius: 2 }} />
        <div style={{ height: 5.5, width: "90%", background: "rgba(26,25,23,0.15)", borderRadius: 2 }} />
        <div style={{ height: 6.5, width: "32%", background: "rgba(26,25,23,0.42)", borderRadius: 2, marginTop: 3 }} />
        <div style={{ height: 5.5, width: "92%", background: "rgba(26,25,23,0.15)", borderRadius: 2 }} />
        <div style={{ height: 5.5, width: "70%", background: "rgba(26,25,23,0.15)", borderRadius: 2 }} />
      </div>

      {/* the magnifier */}
      <div style={{
        position: "absolute", top: 0, left: 0, width: 80, height: 80, zIndex: 2,
        animation: "trLensMove 9s ease-in-out infinite",
        filter: "drop-shadow(0 10px 20px rgba(26,25,23,0.25))",
      }}>
        <div style={{
          position: "absolute", bottom: 2, right: 2, width: 28, height: 8.5,
          borderRadius: 5, background: T1, transform: "rotate(45deg)", transformOrigin: "4px 4px",
        }} />
        <div style={{
          width: "100%", height: "100%", borderRadius: "50%",
          border: `5px solid ${T1}`, overflow: "hidden", position: "relative",
          background: BG,
        }}>
          {/* parsed view exists only inside the page bounds */}
          <div style={{ position: "absolute", top: 0, left: 0, width: 280, height: 300, animation: "trLensInv 9s ease-in-out infinite" }}>
            <div style={{
              position: "absolute", left: 40, top: 12, width: 190, height: 269,
              background: SURF, border: `1px solid ${BD2}`, borderRadius: 3,
              padding: "16px 14px", overflow: "hidden",
              transformOrigin: "50% 20%", animation: "trPageIn 9s ease-in-out infinite",
            }}>
              <div style={{ fontFamily: MONO, fontSize: 9.5, lineHeight: 1.75, color: T1, whiteSpace: "pre" }}>
                {"JANE DOE\njane.doe@email.com\n"}
                <span style={{ color: T3 }}>EXPERIENCE</span>
                {"\nSoftware Engineer —\nMeridian Labs 2019-2024\nLed migration of legacy\n"}
                <span style={{ color: T3 }}>SKILLS</span>
                {"\nPython · Docker · SQL"}
              </div>
            </div>
          </div>
          <div style={{ position: "absolute", top: 7, left: 12, width: 26, height: 10, borderRadius: "50%", background: "rgba(26,25,23,0.06)", transform: "rotate(-28deg)", pointerEvents: "none" }} />
        </div>
      </div>
    </div>
  )
}
