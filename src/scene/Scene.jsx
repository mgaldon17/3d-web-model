import { Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'

import DecomposeParticles from './DecomposeParticles.jsx'
import { pointer } from '../stores/pointerStore.js'

// Subtle, sub-1 intensity bloom over the particles only. Grain + vignette live in
// CSS (see styles.css) so they don't get blurred by postprocessing.
const BLOOM_INTENSITY = 0.45

// Eases the camera toward a target that's nudged by the mouse — gives a soft
// parallax / depth feel without being seasick-inducing.
function CameraRig() {
  const { camera } = useThree()
  useFrame((_, delta) => {
    const tx = pointer.x * 0.6
    const ty = pointer.y * 0.4
    const t = 1 - Math.pow(0.002, delta)
    camera.position.x += (tx - camera.position.x) * t
    camera.position.y += (ty - camera.position.y) * t
    camera.lookAt(0, 0, 0)
  })
  return null
}

export default function Scene({ onReady }) {
  return (
    <Canvas
      className="canvas"
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 8], fov: 45, near: 0.1, far: 100 }}
      onCreated={({ gl }) => gl.setClearColor(new THREE.Color('#0a0907'), 1)}
    >
      <CameraRig />
      <Suspense fallback={null}>
        <DecomposeParticles onReady={onReady} />
      </Suspense>
      <EffectComposer>
        <Bloom
          intensity={BLOOM_INTENSITY}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.6}
          mipmapBlur
        />
      </EffectComposer>
    </Canvas>
  )
}
