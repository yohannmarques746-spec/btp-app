import { MeshGradient } from "@paper-design/shaders-react"
import { useEffect, useState } from "react"

export function GlobalBackground() {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [mounted, setMounted] = useState(false)

  const colors = ["#05070f", "#0b1324", "#111827", "#1f2937", "#1e3a8a", "#0f172a"]

  useEffect(() => {
    const update = () =>
      setDimensions({
        // Use clientWidth to avoid 100vw > 100% on scrollable pages
        width: document.documentElement.clientWidth,
        height: window.innerHeight,
      })
    update()
    setMounted(true)
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  if (!mounted || dimensions.width === 0) return null

  return (
    // inset-0 + fixed covers the whole viewport without adding overflow via w-screen
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <MeshGradient
        width={dimensions.width}
        height={dimensions.height}
        colors={colors}
        distortion={0.8}
        swirl={0.6}
        grainMixer={0}
        grainOverlay={0}
        speed={0.42}
        offsetX={0.08}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <div className="absolute inset-0 pointer-events-none bg-black/45 dark:bg-black/60" />
    </div>
  )
}
