// Network/decoding I/O only: resolve an <img> for a source URL, or reject.
// Kept separate from pixel parsing and rendering so it can be swapped or tested
// (or mocked) in isolation.
export function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`could not load image: ${src}`))
    img.src = src
  })
}
