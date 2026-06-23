import { useMemo, useRef, useEffect } from 'react'
import { useFrame, useThree, extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'
import * as THREE from 'three'

import { useScroll } from '../stores/ScrollContext.jsx'
import { logger } from '../lib/logger.js'
import { createImageGenerator } from './generators/imageGenerator.js'

// Shaders are loaded as raw strings (Vite `?raw`). curlNoise is prepended to the
// vertex source so curlNoise()/snoise() are in scope there.
import curlNoise from './shaders/curlNoise.glsl?raw'
import vertexShader from './shaders/vertex.glsl?raw'
import fragmentShader from './shaders/fragment.glsl?raw'

// ─────────────────────────────────────────────────────────────────────────────
// Default look/perf tuning. These are the component's *defaults* — every value
// can be overridden via props, and the point source itself is a swappable
// `generate` strategy (see generators/), so new subjects (image, text, …) don't
// require editing this renderer.
// ─────────────────────────────────────────────────────────────────────────────
export const DEFAULTS = {
  amplitude: 3.2, // how far particles fly when fully decomposed
  freq: 0.35, // curl-noise spatial frequency (turbulence scale)
  pointSize: 88.0, // base point size (px, before perspective scaling)
}
export const SUBJECT_SRC = '/subject.jpg'

const vertexWithNoise = `${curlNoise}\n${vertexShader}`

// drei's shaderMaterial wires uniforms into a reusable THREE.ShaderMaterial and
// registers it as a JSX element (<decomposeMaterial />).
const DecomposeMaterial = shaderMaterial(
  {
    uProgress: 0,
    uTime: 0,
    uAmplitude: DEFAULTS.amplitude,
    uFreq: DEFAULTS.freq,
    uSize: DEFAULTS.pointSize,
    uPixelRatio: 1,
    uOpacity: 0,
  },
  vertexWithNoise,
  fragmentShader
)
extend({ DecomposeMaterial })

export default function DecomposeParticles({
  onReady,
  generate,
  amplitude = DEFAULTS.amplitude,
  freq = DEFAULTS.freq,
  pointSize = DEFAULTS.pointSize,
}) {
  const matRef = useRef()
  const geomRef = useRef()
  const group = useRef()
  const { gl } = useThree()

  // smoothed progress (lerped toward the scroll source every frame)
  const smoothed = useRef(0)

  // Built point buffers, available once the generator resolves.
  const buffers = useRef(null)

  // Injected scroll source (abstraction, not a concrete singleton).
  const scroll = useScroll()

  // Default to the image generator, but let callers inject any strategy.
  const generator = useMemo(
    () => generate ?? createImageGenerator({ src: SUBJECT_SRC }),
    [generate]
  )

  // Keep the latest onReady in a ref so the (potentially expensive) generation
  // effect depends only on the generator, not on the callback's identity.
  const onReadyRef = useRef(onReady)
  useEffect(() => {
    onReadyRef.current = onReady
  }, [onReady])

  // Build geometry once the generator resolves.
  useEffect(() => {
    let cancelled = false
    generator()
      .then((b) => {
        if (cancelled) return
        buffers.current = b
        const geom = geomRef.current
        if (geom) {
          geom.setAttribute('position', new THREE.BufferAttribute(b.positions, 3))
          geom.setAttribute('aColor', new THREE.BufferAttribute(b.colors, 3))
          geom.setAttribute('aRandom', new THREE.BufferAttribute(b.randoms, 1))
          geom.setAttribute('aSeed', new THREE.BufferAttribute(b.seeds, 3))
          geom.computeBoundingSphere()
        }
        onReadyRef.current?.(b.count)
      })
      .catch((err) => {
        logger.error('[decompose]', err)
        onReadyRef.current?.(0)
      })
    return () => {
      cancelled = true
    }
  }, [generator])

  useFrame((_, delta) => {
    const m = matRef.current
    if (!m) return

    // Smoothly chase the shared scroll target so decompose never snaps.
    // Frame-rate independent exponential smoothing.
    const t = 1 - Math.pow(0.0015, delta) // ~ damp factor
    smoothed.current += (scroll.getProgress() - smoothed.current) * t

    m.uniforms.uProgress.value = smoothed.current
    m.uniforms.uTime.value += delta
    // Read each frame so it tracks devicePixelRatio changes (DPI switch, zoom).
    m.uniforms.uPixelRatio.value = gl.getPixelRatio()

    // Fade particles in once geometry exists.
    if (buffers.current) {
      m.uniforms.uOpacity.value = Math.min(1, m.uniforms.uOpacity.value + delta * 1.5)
    }

    // Gentle whole-cloud rotation with progress for a touch of depth.
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
          uAmplitude={amplitude}
          uFreq={freq}
          uSize={pointSize}
        />
      </points>
    </group>
  )
}
