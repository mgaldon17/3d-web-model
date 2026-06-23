import { useEffect, useRef, useState } from 'react'
import { useScroll } from '../stores/ScrollContext.jsx'

// Vertical 1px rail on the right that fills with scroll progress, plus a live %
// readout in JetBrains Mono.
export default function ScrollProgress() {
  const fillRef = useRef()
  const [pct, setPct] = useState(0)
  const scroll = useScroll()

  useEffect(() => {
    // Subscribe to the injected scroll source (updated by Lenis in App.jsx).
    return scroll.subscribe((p) => {
      if (fillRef.current) fillRef.current.style.transform = `scaleY(${p})`
      setPct(Math.round(p * 100))
    })
  }, [scroll])

  return (
    <div className="progress" aria-hidden="true">
      <div className="progress__track">
        <div className="progress__fill" ref={fillRef} />
      </div>
      <span className="progress__label">{String(pct).padStart(3, '0')}%</span>
    </div>
  )
}
