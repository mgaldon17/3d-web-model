import { useEffect, useState, useCallback } from 'react'

import Scene from './scene/Scene.jsx'
import { useSmoothScroll } from './hooks/useSmoothScroll.js'
import { scrollStore } from './stores/scrollStore.js'
import { ScrollProvider } from './stores/ScrollContext.jsx'
import { startPointerTracking } from './stores/pointerStore.js'

import Cursor from './ui/Cursor.jsx'
import Grain from './ui/Grain.jsx'
import Vignette from './ui/Vignette.jsx'
import ScrollProgress from './ui/ScrollProgress.jsx'
import Loader from './ui/Loader.jsx'

import Hero from './sections/Hero.jsx'
import Story from './sections/Story.jsx'
import Specs from './sections/Specs.jsx'
import Cta from './sections/Cta.jsx'
import Footer from './sections/Footer.jsx'

export default function App() {
  const [ready, setReady] = useState(false)

  // Lenis is the single source of scroll truth: the hook writes normalized
  // progress (0→1) into the shared store; the particle system reads it.
  useSmoothScroll(scrollStore.setProgress)

  // Pointer tracking for camera parallax — started here (composition root) with
  // explicit teardown rather than as an import side effect.
  useEffect(() => startPointerTracking(), [])

  const handleReady = useCallback(() => setReady(true), [])

  return (
    <ScrollProvider value={scrollStore}>
      {/* Fixed full-screen WebGL canvas, behind everything (z-index:1). */}
      <div className="canvas-container">
        <Scene onReady={handleReady} />
      </div>

      {/* Scrolling editorial content, in front (z-index:10). */}
      <main className="scroll-wrap">
        <nav className="nav">
          <span className="nav__brand">DECOMPOSE</span>
          <span className="nav__links">
            <a href="#">Index</a>
            <a href="#">Method</a>
            <a href="#">Archive</a>
          </span>
        </nav>

        <Hero />
        <Story
          index="01"
          align="left"
          title="A current beneath the surface"
          body="Every assembled thing is held together against a field that would rather it dissolved. Here we make that field visible: a divergence-free flow that carries each particle along its own quiet trajectory."
        />
        <Story
          index="02"
          align="right"
          title="Order is only borrowed"
          body="Scroll down and the image gives itself up in waves — never all at once. Scroll back and it remembers exactly where it came from. Nothing is lost; it is only momentarily elsewhere."
        />
        <Specs />
        <Cta />
        <Footer />
      </main>

      {/* Chrome overlays (pointer-events: none) */}
      <Grain />
      <Vignette />
      <ScrollProgress />
      <Cursor />
      <Loader ready={ready} />
    </ScrollProvider>
  )
}
