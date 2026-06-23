import { useEffect } from 'react'
import Lenis from 'lenis'

// Encapsulates the Lenis smooth-scroll engine lifecycle: construction, the RAF
// loop, the scroll→progress mapping, and teardown. Calls `onProgress(p)` with a
// normalized 0→1 value on every scroll. Keeps the scroll engine out of layout
// components.
export function useSmoothScroll(onProgress) {
  useEffect(() => {
    const lenis = new Lenis({
      lerp: 0.08,
      smoothWheel: true,
      wheelMultiplier: 1,
    })

    lenis.on('scroll', ({ scroll, limit }) => {
      const p = limit > 0 ? Math.min(1, Math.max(0, scroll / limit)) : 0
      onProgress(p)
    })

    let raf
    const loop = (time) => {
      lenis.raf(time)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [onProgress])
}
