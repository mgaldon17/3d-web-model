// ─────────────────────────────────────────────────────────────────────────────
// Pointer store (single concern: mouse position for camera parallax).
//
// Normalized device-ish coords (-1 → 1). Tracking is started explicitly by the
// app via startPointerTracking(), which returns a teardown — importing this
// module has no side effects, so it's safe under HMR/SSR and in tests.
// ─────────────────────────────────────────────────────────────────────────────

export const pointer = { x: 0, y: 0 }

export function startPointerTracking() {
  if (typeof window === 'undefined') return () => {}

  const onMove = (e) => {
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1
    pointer.y = -((e.clientY / window.innerHeight) * 2 - 1)
  }
  window.addEventListener('pointermove', onMove)
  return () => window.removeEventListener('pointermove', onMove)
}
