"use client"

import { useEffect, useRef } from "react"

export function AnimatedSphere() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const chars = "░▒▓█▀▄▌▐│─┤├┴┬╭╮╰╯"
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
      const cx = rect.width / 2
      const cy = rect.height / 2
      const radius = Math.min(rect.width, rect.height) * 0.525

      ctx.font = "12px monospace"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"

      const points: { x: number; y: number; z: number; char: string }[] = []

      for (let phi = 0; phi < Math.PI * 2; phi += 0.15) {
        for (let theta = 0; theta < Math.PI; theta += 0.15) {
          const x = Math.sin(theta) * Math.cos(phi + time * 0.5)
          const y = Math.sin(theta) * Math.sin(phi + time * 0.5)
          const z = Math.cos(theta)

          const rotY = time * 0.3
          const nx = x * Math.cos(rotY) - z * Math.sin(rotY)
          const nz = x * Math.sin(rotY) + z * Math.cos(rotY)

          const rotX = time * 0.2
          const ny = y * Math.cos(rotX) - nz * Math.sin(rotX)
          const fz = y * Math.sin(rotX) + nz * Math.cos(rotX)

          const depth = (fz + 1) / 2
          points.push({
            x: cx + nx * radius,
            y: cy + ny * radius,
            z: fz,
            char: chars[Math.floor(depth * (chars.length - 1))],
          })
        }
      }

      points.sort((a, b) => a.z - b.z)
      points.forEach((p) => {
        const alpha = 0.2 + (p.z + 1) * 0.4
        ctx.fillStyle = `rgba(26, 25, 23, ${alpha})`
        ctx.fillText(p.char, p.x, p.y)
      })

      time += 0.02
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
