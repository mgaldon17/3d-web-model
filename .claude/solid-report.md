# SOLID Audit Report — 2026-06-23

## Language(s): JavaScript / JSX (React), GLSL
## Project type: Client-side web app — React + react-three-fiber WebGL "decompose" landing page (Vite)

## Summary
| Severity | Count |
|----------|-------|
| CRITICAL | 0     |
| HIGH     | 2     |
| MEDIUM   | 3     |
| LOW      | 5     |

> No crash/data-loss bugs were found — the code is small and mostly well-behaved.
> The material findings are structural: one component concentrates several
> responsibilities and the modules are wired to concrete globals rather than
> abstractions, which makes the core (the particle system, the scroll store) hard
> to test or reuse in isolation.

## Findings

### [HIGH] `DecomposeParticles` mixes image I/O, pixel parsing, buffer building, rendering, and animation
- **File**: src/scene/DecomposeParticles.jsx:57 (buildFromImage), :116-199 (component)
- **Principle**: SRP
- **Snippet**:
  ```jsx
  function buildFromImage(img, step) {
    const c = document.createElement('canvas')   // DOM / I/O
    const ctx = c.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(img, 0, 0, w, h)
    const data = ctx.getImageData(0, 0, w, h).data  // pixel reading
    // ...loops, world-space mapping, Float32Array packing...
  }
  // and inside the component:
  const img = new Image(); img.src = SUBJECT_SRC; img.onload = () => { ... }  // network I/O
  useFrame(...)  // animation + opacity fade + rotation
  ```
- **Description**: This single 200-line module owns (1) loading an image over the
  network, (2) rasterising it to an offscreen canvas and reading pixels, (3) the
  pixel→world-space sampling math, (4) the R3F render tree, and (5) two per-frame
  animation loops. These are unrelated reasons to change: swapping the point
  source (the `SUBJECT === "text"` note at :29 spells this out), retuning the math,
  or changing the render all force edits to the same file, and none of the
  generation logic can be unit-tested without a DOM + canvas.
- **Fix sketch**: Extract point generation into a pure, DOM-light module — e.g.
  `loadImage(src) → Promise<HTMLImageElement>` and `buildPointBuffers(img, opts) →
  {positions, colors, randoms, seeds, count}`. The component then just consumes a
  `buffers` value (loaded via a hook/`useLoader` or passed as a prop) and renders.
  This also unlocks the `image | text` extension without touching the renderer.

### [HIGH] Core components depend on the concrete global `scroll` store, not an abstraction
- **File**: src/scene/DecomposeParticles.jsx:6,166; src/ui/ScrollProgress.jsx:2,12; src/store.js:13-29
- **Principle**: DIP
- **Snippet**:
  ```jsx
  // DecomposeParticles.jsx
  import { scroll } from '../store.js'
  smoothed.current += (scroll.progress - smoothed.current) * t   // reads concrete singleton
  ```
- **Description**: The particle system and the progress rail reach directly into a
  module-level mutable singleton. There is no injection point (prop/context), so
  the components cannot be rendered with a different progress source, driven in a
  test, or reused on a page that computes progress differently. Combined with the
  import-time side effect in `store.js` (see below), importing these components
  pulls in global browser state unconditionally.
- **Fix sketch**: Depend on an abstraction the caller provides — pass a
  `getProgress`/`subscribe` pair via props or a React context
  (`ScrollProvider`). The current global can remain the default implementation,
  but high-level components should receive it rather than import it.

### [MEDIUM] `store.js` bundles two unrelated concerns plus an import-time global side effect
- **File**: src/store.js:13-29 (scroll pub/sub), :32-39 (pointer + window listener)
- **Principle**: SRP / DIP
- **Snippet**:
  ```js
  export const pointer = { x: 0, y: 0 }
  if (typeof window !== 'undefined') {
    window.addEventListener('pointermove', (e) => { ... })  // runs on import
  }
  ```
- **Description**: One file owns both scroll progress (pub/sub) and pointer
  tracking — distinct concerns with distinct consumers. Worse, merely importing
  the module attaches a global `pointermove` listener as a side effect, so any
  consumer (including tests) silently registers browser state. Two reasons to
  change, and no way to import the scroll store without the pointer machinery.
- **Fix sketch**: Split into `scrollStore.js` and `pointerStore.js`. Replace the
  import-time listener with an explicit `initPointer()`/`startPointerTracking()`
  the app calls once (returning a teardown), so import stays side-effect-free.

### [MEDIUM] `App` embeds the Lenis scroll-engine lifecycle inside the root layout component
- **File**: src/App.jsx:24-47
- **Principle**: SRP
- **Snippet**:
  ```jsx
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.08, smoothWheel: true, wheelMultiplier: 1 })
    lenis.on('scroll', ({ scroll, limit }) => { ... setProgress(p) })
    const loop = (time) => { lenis.raf(time); raf = requestAnimationFrame(loop) }
    // ...
  }, [])
  ```
- **Description**: The top-level component is responsible both for composing the
  page (sections, overlays, canvas) and for owning a third-party scroll engine's
  construction, RAF loop, event wiring, and teardown. Tuning scroll behaviour and
  changing page structure are different reasons to edit the same component.
- **Fix sketch**: Extract a `useSmoothScroll()` hook (or `<ScrollProvider>`) that
  encapsulates Lenis setup/teardown and publishes progress. `App` then just calls
  the hook and composes the tree.

### [MEDIUM] Subject source and look are hardcoded module constants — changing the subject means editing source
- **File**: src/scene/DecomposeParticles.jsx:17-33
- **Principle**: OCP
- **Snippet**:
  ```jsx
  export const SUBJECT = 'image'        // "image" | "text"  (see note below)
  export const SUBJECT_SRC = '/subject.jpg'
  // NOTE on SUBJECT === "text": ...only the point-generation source changes...
  ```
- **Description**: `SUBJECT` advertises an `image | text` variant axis, but the
  code only handles `image` and the source/tuning are fixed constants. Adding the
  text path (or any new point source) requires editing this module and the
  component rather than supplying a new generator. The constants also can't be set
  per-instance.
- **Fix sketch**: Make point generation a strategy: accept a
  `generate(opts) → buffers` function (image generator as the default) via props,
  and pass tunables (`src`, `amplitude`, `freq`, …) as props/config rather than
  module constants. New subjects become new strategies, no edits to the renderer.

### [LOW] `console.error` left in a production code path
- **File**: src/scene/DecomposeParticles.jsx:147
- **Principle**: Bug (hygiene)
- **Snippet**:
  ```jsx
  img.onerror = () => {
    console.error('[decompose] could not load', SUBJECT_SRC)
    onReady?.(0)
  }
  ```
- **Description**: Raw `console.error` ships to production. It's the only failure
  signal and otherwise degrades gracefully, but logging should go through a
  toggleable logger or surface a user-visible fallback.
- **Fix sketch**: Route through a tiny logger gated on `import.meta.env.DEV`, or
  render a visible "subject failed to load" state.

### [LOW] Global `pointermove` listener in `store.js` is never removed
- **File**: src/store.js:34-39
- **Principle**: Bug (resource hygiene)
- **Description**: The listener is attached at module load and never detached. It
  only registers once per page load today, but under HMR or if the module is
  re-imported in a test/SSR-hydration context it leaks. There is no teardown.
- **Fix sketch**: Move it behind an explicit init that returns a cleanup function
  (ties into the SRP split above).

### [LOW] `uPixelRatio` is set once and won't track DPR changes
- **File**: src/scene/DecomposeParticles.jsx:155-157
- **Principle**: Bug (minor correctness)
- **Snippet**:
  ```jsx
  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio()
  }, [gl])
  ```
- **Description**: If the device pixel ratio changes after mount (window dragged
  to a different-DPI monitor, browser zoom), point sizes won't update because the
  effect only runs on `[gl]`. Visually minor.
- **Fix sketch**: Re-read `gl.getPixelRatio()` inside `useFrame` (cheap), or
  listen for `matchMedia('(resolution: …)')` changes.

### [LOW] Image-load effect depends on `onReady`, coupling buffer rebuilds to callback identity
- **File**: src/scene/DecomposeParticles.jsx:127-153
- **Principle**: Bug (fragile coupling)
- **Description**: The effect that loads the image and builds GPU buffers lists
  `onReady` in its dependency array. It works today only because `App` wraps the
  callback in `useCallback([])`. If a parent ever passes an inline callback, the
  whole image reload + buffer rebuild re-runs on every render.
- **Fix sketch**: Keep the latest callback in a ref and run the load effect with
  `[]` (it depends only on `SUBJECT_SRC`), so reloads are tied to the source, not
  the callback's identity.

### [LOW] Two separate per-frame `useFrame` callbacks for one logical update
- **File**: src/scene/DecomposeParticles.jsx:159-184
- **Principle**: SRP (minor)
- **Description**: Smoothing/uniform updates and group rotation are split across
  two `useFrame` registrations that both read `smoothed.current`. Harmless but
  redundant; one callback is clearer and avoids relying on registration order.
- **Fix sketch**: Merge the rotation update into the existing `useFrame` after
  `smoothed` is advanced.

## Fix Log — 2026-06-23

No test suite exists; green baseline and post-fix verification used
`npm run build` (success) plus a dev-server smoke test (`vite` serves `/` → 200).

| File | Change | Principle |
|------|--------|-----------|
| src/lib/imageLoader.js (new) | Extracted image network/decode I/O into `loadImage(src) → Promise<img>` | SRP |
| src/lib/buildPointBuffers.js (new) | Extracted canvas pixel parsing + sampling math into a pure `buildPointBuffers(img, opts)` | SRP |
| src/scene/generators/imageGenerator.js (new) | Point source is now a swappable `generate` strategy (`createImageGenerator`) | OCP |
| src/scene/DecomposeParticles.jsx | Reduced to a thin renderer; consumes a `generate` strategy + injected scroll source; tunables via props | SRP / OCP / DIP |
| src/stores/scrollStore.js (new) | Split scroll concern into a factory + default singleton (`getProgress/setProgress/subscribe`) | SRP |
| src/stores/ScrollContext.jsx (new) | Components depend on an injectable scroll abstraction via context | DIP |
| src/stores/pointerStore.js (new) | Split pointer concern out; `startPointerTracking()` returns teardown (no import-time side effect / no leak) | SRP / Bug |
| src/store.js (deleted) | Replaced by scrollStore + pointerStore | SRP |
| src/hooks/useSmoothScroll.js (new) | Extracted Lenis scroll-engine lifecycle out of the root component | SRP |
| src/App.jsx | Uses `useSmoothScroll` + `ScrollProvider`; starts pointer tracking with teardown | SRP / DIP |
| src/ui/ScrollProgress.jsx | Subscribes via injected `useScroll()` instead of concrete `subscribe` import | DIP |
| src/scene/Scene.jsx | Imports `pointer` from the new pointerStore | SRP |
| src/lib/logger.js (new) | Dev-gated logger replaces raw `console.error` | Bug (hygiene) |
| src/scene/DecomposeParticles.jsx | `uPixelRatio` read per-frame (tracks DPR changes); load effect keyed to generator via `onReady` ref; rotation merged into single `useFrame` | Bug |

