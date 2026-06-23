import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

import { scroll } from '../store.js'

// Shaders are loaded as raw strings (Vite `?raw`). curlNoise is prepended to the
// vertex source so curlNoise()/snoise() are in scope there.
import curlNoise from './shaders/curlNoise.glsl?raw'
import vertexShader from './shaders/vertex.glsl?raw'
import fragmentShader from './shaders/fragment.glsl?raw'

// ─────────────────────────────────────────────────────────────────────────────
// Adjustable constants — tune the look/perf here.
// ─────────────────────────────────────────────────────────────────────────────
export const PARTICLE_STEP = 2        // sample every Nth pixel (↑ = fewer particles, faster)
export const AMPLITUDE = 3.2          // how far particles fly when fully decomposed
export const FREQ = 0.35              // curl-noise spatial frequency (turbulence scale)
export const POINT_SIZE = 88.0        // base point size (px, before perspective scaling)
export const PLANE_WIDTH = 5.0        // world-space width the image is mapped onto
export const SUBJECT = 'image'        // "image" | "text"  (see note below)
export const SUBJECT_SRC = '/subject.jpg'
// For a photo we want the WHOLE frame to depixelate, so keep every opaque pixel
// (0 = no luma cull). Raise this if your subject sits on a flat dark background
// and you'd rather drop it — e.g. 0.06 keeps only the lit subject.
export const LUMA_THRESHOLD = 0.0     // skip near-black / fully transparent pixels

// NOTE on SUBJECT === "text":
// To use 3D text as the subject instead of an image, render a <Text> (drei) to a
// render target or sample points along its glyph geometry, then feed the same
// {positions, colors, randoms, seeds} buffers below. The decompose math is
// identical — only the point-generation source changes. Left as an image here so
// the default works with zero extra setup.

const vertexWithNoise = `${curlNoise}\n${vertexShader}`

// drei's shaderMaterial wires uniforms into a reusable THREE.ShaderMaterial and
// registers it as a JSX element (<decomposeMaterial />).
const DecomposeMaterial = shaderMaterial(
  {
    uProgress: 0,
    uTime: 0,
    uAmplitude: AMPLITUDE,
    uFreq: FREQ,
    uSize: POINT_SIZE,
    uPixelRatio: 1,
    uOpacity: 0,
  },
  vertexWithNoise,
  fragmentShader
)
extend({ DecomposeMaterial })

// Build particle buffers from an <img> by drawing it to an offscreen 2D canvas
// and reading pixels. One particle per (step×step) block above the luma threshold.
function buildFromImage(img, step) {
  const maxDim = 380 // cap source resolution so particle count stays sane
  let w = img.naturalWidth
  let h = img.naturalHeight
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
  const planeW = PLANE_WIDTH
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
      if (a < 0.1 || luma < LUMA_THRESHOLD) continue

      // Map pixel coords -> centered world-space plane (y flipped, image is top-down).
      const px = (x / w - 0.5) * planeW
      const py = -(y / h - 0.5) * planeH
      positions.push(px, py, 0)
      colors.push(r, g, b)
      randoms.push(Math.random())

      // Random unit-ish direction seed, scaled big so it decorrelates the noise.
      seeds.push(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4
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

export default function DecomposeParticles({ onReady }) {
  const matRef = useRef()
  const geomRef = useRef()
  const { gl } = useThree()

  // smoothed progress (lerped toward scroll.progress every frame)
  const smoothed = useRef(0)

  // Build geometry once the image is decoded.
  const buffers = useRef(null)

  useEffect(() => {
    let cancelled = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = SUBJECT_SRC
    img.onload = () => {
      if (cancelled) return
      const b = buildFromImage(img, PARTICLE_STEP)
      buffers.current = b
      const geom = geomRef.current
      if (geom) {
        geom.setAttribute('position', new THREE.BufferAttribute(b.positions, 3))
        geom.setAttribute('aColor', new THREE.BufferAttribute(b.colors, 3))
        geom.setAttribute('aRandom', new THREE.BufferAttribute(b.randoms, 1))
        geom.setAttribute('aSeed', new THREE.BufferAttribute(b.seeds, 3))
        geom.computeBoundingSphere()
      }
      onReady?.(b.count)
    }
    img.onerror = () => {
      console.error('[decompose] could not load', SUBJECT_SRC)
      onReady?.(0)
    }
    return () => {
      cancelled = true
    }
  }, [onReady])

  useEffect(() => {
    if (matRef.current) matRef.current.uniforms.uPixelRatio.value = gl.getPixelRatio()
  }, [gl])

  useFrame((_, delta) => {
    const m = matRef.current
    if (!m) return

    // Smoothly chase the shared scroll target so decompose never snaps.
    // Frame-rate independent exponential smoothing.
    const t = 1 - Math.pow(0.0015, delta) // ~ damp factor
    smoothed.current += (scroll.progress - smoothed.current) * t

    m.uniforms.uProgress.value = smoothed.current
    m.uniforms.uTime.value += delta

    // Fade particles in once geometry exists.
    if (buffers.current) {
      m.uniforms.uOpacity.value = Math.min(1, m.uniforms.uOpacity.value + delta * 1.5)
    }
  })

  // Gentle whole-cloud rotation with progress for a touch of depth.
  const group = useRef()
  useFrame(() => {
    if (group.current) {
      group.current.rotation.y = smoothed.current * 0.25
      group.current.rotation.x = smoothed.current * 0.08
    }
  })

  return (
    <group ref={group}>
      <points>
        <bufferGeometry ref={geomRef} />
        <decomposeMaterial
          ref={matRef}
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
        />
      </points>
    </group>
  )
}
