"use client"

import { useEffect, useRef } from "react"

export function AnimatedWave() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const chars = "·∘○◯◌●◉"
    let time = 0

    const resize = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener("resize", resize)

    const render = () => {
      const rect = canvas.getBoundingClientRect()
      ctx.clearRect(0, 0, rect.width, rect.height)
      ctx.font = "14px monospace"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      const cols = Math.floor(rect.width / 20)
      const rows = Math.floor(rect.height / 20)

      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const px = (x + 0.5) * (rect.width / cols)
          const py = (y + 0.5) * (rect.height / rows)
          const w1 = Math.sin(x*0.2 + time*2) * Math.cos(y*0.15 + time)
          const w2 = Math.sin((x+y)*0.1 + time*1.5)
          const w3 = Math.cos(x*0.1 - y*0.1 + time*0.8)
          const combined = (w1+w2+w3)/3
          const norm = (combined+1)/2
          const ci = Math.floor(norm*(chars.length-1))
          const alpha = 0.15 + norm*0.5
          ctx.fillStyle = `rgba(26, 25, 23, ${alpha})`
          ctx.fillText(chars[ci], px, py)
        }
      }

      time += 0.03
      frameRef.current = requestAnimationFrame(render)
    }

    render()
    return () => {
      window.removeEventListener("resize", resize)
      cancelAnimationFrame(frameRef.current)
    }
  }, [])

  return <canvas ref={canvasRef} className="w-full h-full" style={{ display: "block" }} />
}
