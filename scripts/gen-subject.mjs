// Generates public/subject.jpg — a procedural placeholder in the site palette so
// the decompose effect has something recognisable to take apart. Replace
// public/subject.jpg with any real image to use your own subject.
import zlib from 'node:zlib'
import fs from 'node:fs'
import { execSync } from 'node:child_process'

const W = 512
const H = 640
const buf = Buffer.alloc(W * H * 4)

// palette
const ink = [10, 9, 7]
const rust = [194, 90, 42]
const amber = [212, 154, 75]
const bone = [237, 228, 210]

const lerp = (a, b, t) => a + (b - a) * t
const mix = (c1, c2, t) => [lerp(c1[0], c2[0], t), lerp(c1[1], c2[1], t), lerp(c1[2], c2[2], t)]

for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const i = (y * W + x) * 4
    const nx = x / W - 0.5
    const ny = y / H - 0.5

    // an off-center vessel/ellipse silhouette
    const ex = nx / 0.34
    const ey = (ny + 0.02) / 0.42
    const d = Math.sqrt(ex * ex + ey * ey)

    // vertical gradient body color
    const g = (y / H)
    let col = mix(rust, amber, Math.max(0, Math.min(1, g * 1.2)))
    // warm core highlight
    const core = Math.max(0, 1 - d * 1.3)
    col = mix(col, bone, core * 0.55)

    // soft falloff edge of the subject
    const edge = 1 - Math.min(1, Math.max(0, (d - 0.85) / 0.35))
    let a = edge

    if (a <= 0.02) {
      // background = ink
      buf[i] = ink[0]
      buf[i + 1] = ink[1]
      buf[i + 2] = ink[2]
      buf[i + 3] = 255
    } else {
      buf[i] = col[0] | 0
      buf[i + 1] = col[1] | 0
      buf[i + 2] = col[2] | 0
      buf[i + 3] = 255
    }
  }
}

// ── minimal PNG encoder ──
function crc32(buf) {
  let c = ~0
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1))
  }
  return (~c) >>> 0
}
function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const typeBuf = Buffer.from(type, 'ascii')
  const body = Buffer.concat([typeBuf, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

const ihdr = Buffer.alloc(13)
ihdr.writeUInt32BE(W, 0)
ihdr.writeUInt32BE(H, 4)
ihdr[8] = 8 // bit depth
ihdr[9] = 6 // RGBA
// rest 0

// raw scanlines with filter byte 0
const raw = Buffer.alloc(H * (W * 4 + 1))
for (let y = 0; y < H; y++) {
  raw[y * (W * 4 + 1)] = 0
  buf.copy(raw, y * (W * 4 + 1) + 1, y * W * 4, (y + 1) * W * 4)
}
const idat = zlib.deflateSync(raw)

const png = Buffer.concat([
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
  chunk('IHDR', ihdr),
  chunk('IDAT', idat),
  chunk('IEND', Buffer.alloc(0)),
])

fs.mkdirSync('public', { recursive: true })
fs.writeFileSync('public/subject.png', png)
execSync('sips -s format jpeg public/subject.png --out public/subject.jpg', { stdio: 'ignore' })
fs.unlinkSync('public/subject.png')
console.log('wrote public/subject.jpg')
