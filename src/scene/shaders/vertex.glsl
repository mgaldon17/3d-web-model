// ─────────────────────────────────────────────────────────────────────────────
// Vertex shader — drives the decompose.
//
// NOTE: curlNoise.glsl (which defines snoise + curlNoise) is concatenated ABOVE
// this file at build time in DecomposeParticles.jsx, so curlNoise() is in scope.
// ─────────────────────────────────────────────────────────────────────────────

uniform float uProgress;   // 0 = assembled, 1 = decomposed (smoothed scroll value)
uniform float uTime;       // seconds, for animating the noise field
uniform float uAmplitude;  // how far particles can travel when scattered
uniform float uFreq;       // spatial frequency of the curl field (turbulence scale)
uniform float uSize;       // base point size in px
uniform float uPixelRatio; // devicePixelRatio, so points are crisp on retina

attribute vec3 aColor;     // sampled pixel color (passed through to fragment)
attribute float aRandom;   // per-particle seed 0..1 (delay + amplitude variance)
attribute vec3 aSeed;      // per-particle base direction (adds variety to the flow)

varying vec3 vColor;
varying float vDisplace;   // 0..1 normalized "how far from home", for alpha falloff in fragment

void main() {
  // 1) Fluid scatter target: offset the home position by the curl field.
  //    Sampling at position*uFreq makes nearby particles share local flow
  //    (coherent swirls); + aSeed decorrelates them a little; uTime animates it.
  vec3 flow = curlNoise(position * uFreq + aSeed + uTime * 0.08);
  vec3 scattered = position + flow * (aRandom * uAmplitude);

  // 2) Per-particle staggered reveal. Each particle starts and finishes its
  //    journey at a slightly different point along uProgress, so the cloud comes
  //    apart in waves instead of all at once. smoothstep gives an ease in/out.
  float startP = aRandom * 0.4;
  float endP   = 0.4 + aRandom * 0.6;
  float p = smoothstep(startP, endP, uProgress);

  // 3) Blend between assembled and scattered.
  vec3 finalPos = mix(position, scattered, p);
  vDisplace = p;

  vec4 mvPosition = modelViewMatrix * vec4(finalPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // 4) Point size: shrink slightly as it disperses, scale by perspective so
  //    far points are smaller, and account for the device pixel ratio.
  float sizeFalloff = mix(1.0, 0.65, p);
  gl_PointSize = uSize * sizeFalloff * uPixelRatio * (1.0 / -mvPosition.z);

  vColor = aColor;
}
