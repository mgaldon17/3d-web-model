// ─────────────────────────────────────────────────────────────────────────────
// Fragment shader — paints each point as a soft circular dab of the original
// pixel color, fading out the more it has scattered.
// ─────────────────────────────────────────────────────────────────────────────

uniform float uOpacity; // global opacity (driven by the loader fade-in)

varying vec3 vColor;
varying float vDisplace; // 0 = home, 1 = fully scattered

void main() {
  // gl_PointCoord is 0..1 across the point sprite. Distance from its center
  // gives us a radial mask; smoothstep makes a soft anti-aliased edge and we
  // discard everything outside the disc so points are round, not square.
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float circle = smoothstep(0.5, 0.35, d); // 1 in the middle, fading to the rim

  // Alpha decays as the particle drifts from home: assembled = crisp image,
  // dispersed = airy and translucent. Keep a floor so motes stay faintly visible.
  float spreadFade = mix(1.0, 0.25, vDisplace);

  float alpha = circle * spreadFade * uOpacity;
  if (alpha < 0.01) discard;

  // Color comes entirely from aColor so the assembled cloud reproduces the
  // source image. A touch of extra brightness when scattered helps Bloom catch.
  vec3 color = vColor + vDisplace * 0.06;

  gl_FragColor = vec4(color, alpha);
}
