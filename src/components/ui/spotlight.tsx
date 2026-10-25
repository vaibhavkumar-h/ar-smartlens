"use client"

import { useEffect, useRef } from "react"
import { createPortal } from "react-dom"

interface SpotlightProps {
  className?: string
  fill?: string
}

export function Spotlight({
  className = "",
  fill = "white",
}: SpotlightProps) {
  const spotlightRef = useRef<HTMLDivElement>(null)

  const targetPosition = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  })

  const currentPosition = useRef({
    x: typeof window !== "undefined" ? window.innerWidth / 2 : 0,
    y: typeof window !== "undefined" ? window.innerHeight / 2 : 0,
  })

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      targetPosition.current = {
        x: event.clientX,
        y: event.clientY,
      }
    }

    window.addEventListener("mousemove", handleMouseMove, { passive: true })

    let animationFrame = 0

    const animate = () => {
      const target = targetPosition.current
      const current = currentPosition.current

      // Smooth chase: the light follows the cursor without snapping.
      const ease = 0.075

      current.x += (target.x - current.x) * ease
      current.y += (target.y - current.y) * ease

      if (spotlightRef.current) {
        spotlightRef.current.style.transform =
          `translate3d(${current.x - 180}px, ${current.y - 180}px, 0)`
      }

      animationFrame = requestAnimationFrame(animate)
    }

    animationFrame = requestAnimationFrame(animate)

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      cancelAnimationFrame(animationFrame)
    }
  }, [])

  const spotlight = (
    <div
      ref={spotlightRef}
      aria-hidden="true"
      className={`pointer-events-none fixed left-0 top-0 z-[9999] h-[360px] w-[360px] rounded-full ${className}`}
      style={{
        background: `radial-gradient(
          circle at center,
          ${fill} 0%,
          rgba(255,255,255,0.72) 4%,
          rgba(255,255,255,0.34) 12%,
          rgba(255,255,255,0.14) 28%,
          rgba(255,255,255,0.045) 46%,
          transparent 70%
        )`,
        filter: "blur(1px)",
        opacity: 0.72,
        willChange: "transform",
      }}
    />
  )

  if (typeof document === "undefined") return null

  return createPortal(spotlight, document.body)
}
