const SPECS = [
  { k: 'Method', v: 'Curl-field' },
  { k: 'Substrate', v: 'Pixels' },
  { k: 'Particles', v: '≈ 30k' },
  { k: 'Latency', v: 'Inertial' },
  { k: 'Palette', v: 'Bone / Rust' },
  { k: 'State', v: 'Reversible' },
]

export default function Specs() {
  return (
    <section className="scroll-section specs">
      <span className="eyebrow specs__eyebrow">Technical Index</span>
      <div className="specs__grid">
        {SPECS.map((s) => (
          <div className="spec" key={s.k}>
            <span className="spec__key">{s.k}</span>
            <span className="spec__val">
              <em>{s.v}</em>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
