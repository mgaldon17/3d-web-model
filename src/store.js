// ─────────────────────────────────────────────────────────────────────────────
// Single source of truth for scroll progress.
//
// Lenis (in App.jsx) writes the normalized scroll progress (0 → 1) here on every
// `scroll` event. The 3D particle system reads `state.progress` inside useFrame
// and interpolates *toward* it (damp/lerp) so the decompose effect never jumps.
//
// We deliberately use a plain mutable object (not React state) because this value
// changes every frame — routing it through React would cause thousands of
// re-renders. UI bits that DO want to re-render (the progress bar) can subscribe.
// ─────────────────────────────────────────────────────────────────────────────

export const scroll = {
  progress: 0, // 0 = fully assembled (top), 1 = fully decomposed (bottom)
}

// Lightweight pub/sub so DOM overlays (e.g. the progress bar) can react without
// pulling in a state library.
const listeners = new Set()

export function setProgress(p) {
  scroll.progress = p
  for (const fn of listeners) fn(p)
}

export function subscribe(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// Mouse position in normalized device-ish coords (-1 → 1), used for camera parallax.
export const pointer = { x: 0, y: 0 }

if (typeof window !== 'undefined') {
  window.addEventListener('pointermove', (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  })
}
