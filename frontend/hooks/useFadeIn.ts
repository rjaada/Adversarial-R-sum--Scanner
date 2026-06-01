/**
 * Triggers a fade-in animation when an element enters the viewport.
 * Returns a ref to attach to the element and a boolean that flips true on intersection.
 *
 * Usage:
 *   const { ref, visible } = useFadeIn()
 *   <div ref={ref} className={`${styles.fadeUp} ${visible ? styles.fadeUpVisible : ''}`} />
 */

import { useEffect, useRef, useState } from "react"

export function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.07 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return { ref, visible }
}
