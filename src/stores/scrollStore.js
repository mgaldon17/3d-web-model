// ─────────────────────────────────────────────────────────────────────────────
// Scroll progress store (single concern: normalized 0→1 scroll position).
//
// We deliberately use a plain mutable store (not React state) because this value
// changes every frame — routing it through React would cause thousands of
// re-renders. The 3D particle system reads `getProgress()` inside useFrame; UI
// bits that DO want to re-render (the progress bar) can `subscribe`.
//
// Exposed as a factory so consumers can be handed an injected instance (see
// ScrollContext) and tested in isolation, with a default singleton for the app.
// ─────────────────────────────────────────────────────────────────────────────

export function createScrollStore() {
  let progress = 0 // 0 = fully assembled (top), 1 = fully decomposed (bottom)
  const listeners = new Set()

  return {
    getProgress: () => progress,
    setProgress(p) {
      progress = p
      for (const fn of listeners) fn(p)
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

export const scrollStore = createScrollStore()
