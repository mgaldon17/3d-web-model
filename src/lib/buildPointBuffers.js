// Pure point-buffer generation from a decoded image. No network, no React, no
// rendering — given an <img> (or anything drawImage accepts) and options, it
// returns the typed-array buffers the particle system consumes. This makes the
// sampling math independent of the renderer and the loader.
//
// Returns: { positions, colors, randoms, seeds, count }

export const DEFAULT_BUILD_OPTIONS = {
  step: 2, // sample every Nth pixel (↑ = fewer particles, faster)
  maxDim: 380, // cap source resolution so particle count stays sane
  planeWidth: 5.0, // world-space width the image is mapped onto
  lumaThreshold: 0.0, // skip pixels darker than this (0 = keep everything opaque)
  seedScale: 4, // spread of the per-particle direction seed
}

export function buildPointBuffers(img, options = {}) {
  const { step, maxDim, planeWidth, lumaThreshold, seedScale } = {
    ...DEFAULT_BUILD_OPTIONS,
    ...options,
  }

  let w = img.naturalWidth ?? img.width
  let h = img.naturalHeight ?? img.height
  const scaleDown = Math.min(1, maxDim / Math.max(w, h))
  w = Math.max(1, Math.round(w * scaleDown))
  h = Math.max(1, Math.round(h * scaleDown))

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0, w, h)
  const data = ctx.getImageData(0, 0, w, h).data

  const aspect = w / h
  const planeW = planeWidth
  const planeH = planeW / aspect

  const positions = []
  const colors = []
  const randoms = []
  const seeds = []

  for (let y = 0; y < h; y += step) {
    for (let x = 0; x < w; x += step) {
      const i = (y * w + x) * 4
      const r = data[i] / 255
      const g = data[i + 1] / 255
      const b = data[i + 2] / 255
      const a = data[i + 3] / 255
      const luma = 0.299 * r + 0.587 * g + 0.114 * b
      if (a < 0.1 || luma < lumaThreshold) continue

      // Map pixel coords -> centered world-space plane (y flipped, image is top-down).
      const px = (x / w - 0.5) * planeW
      const py = -(y / h - 0.5) * planeH
      positions.push(px, py, 0)
      colors.push(r, g, b)
      randoms.push(Math.random())

      // Random unit-ish direction seed, scaled big so it decorrelates the noise.
      seeds.push(
        (Math.random() - 0.5) * seedScale,
        (Math.random() - 0.5) * seedScale,
        (Math.random() - 0.5) * seedScale
      )
    }
  }

  return {
    positions: new Float32Array(positions),
    colors: new Float32Array(colors),
    randoms: new Float32Array(randoms),
    seeds: new Float32Array(seeds),
    count: randoms.length,
  }
}
