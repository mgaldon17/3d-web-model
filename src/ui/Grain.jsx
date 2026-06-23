// Film grain overlay. An SVG feTurbulence fractal noise tiled over the viewport.
// Pure CSS/SVG so it sits crisply on top of everything and isn't touched by the
// WebGL postprocessing.
export default function Grain() {
  return (
    <div className="grain" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
        <filter id="grain-noise">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.9"
            numOctaves="3"
            stitchTiles="stitch"
          />
        </filter>
        <rect width="100%" height="100%" filter="url(#grain-noise)" />
      </svg>
    </div>
  )
}
