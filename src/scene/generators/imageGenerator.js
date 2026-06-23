import { loadImage } from '../../lib/imageLoader.js'
import { buildPointBuffers } from '../../lib/buildPointBuffers.js'

// A "point generator" is any `async () => { positions, colors, randoms, seeds,
// count }`. This is the image strategy: load a source URL, then sample it into
// point buffers. To add a new subject (e.g. text), write another generator with
// the same signature and pass it to <DecomposeParticles generate={...} /> — no
// edits to the renderer or the math are needed.
export function createImageGenerator({ src, ...buildOptions } = {}) {
  return async () => {
    const img = await loadImage(src)
    return buildPointBuffers(img, buildOptions)
  }
}
