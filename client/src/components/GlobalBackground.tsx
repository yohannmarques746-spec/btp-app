import { MeshGradient } from "@paper-design/shaders-react"
import { useEffect, useState } from "react"

export function GlobalBackground() {
  const [dimensions, setDimensions] = useState({ width: 1920, height: 1080 })
  const [mounted, setMounted] = useState(false)

  const colors = ["#72b9bb", "#b5d9d9", "#ffd1bd", "#ffebe0", "#8cc5b8", "#dbf4a4"]

  useEffect(() => {
    setMounted(true)
    const update = () =>
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    update()
    window.addEventListener("resize", update)
    return () => window.removeEventListener("resize", update)
  }, [])

  return (
    <div className="fixed inset-0 w-screen h-screen z-0 pointer-events-none">
      {mounted && (
        <>
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
          />
          <div className="absolute inset-0 pointer-events-none bg-white/20 dark:bg-black/25" />
        </>
      )}
    </div>
  )
}

