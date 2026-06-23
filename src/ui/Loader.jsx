import { useEffect, useState } from 'react'

// Full-screen --ink overlay with an animated bar. Fades out once `ready` flips
// (the particle geometry has been built). Unmounts after the fade so it never
// eats pointer events.
export default function Loader({ ready }) {
  const [hidden, setHidden] = useState(false)
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!ready) return
    // small beat so the bar visibly completes before fading
    const t1 = setTimeout(() => setHidden(true), 250)
    const t2 = setTimeout(() => setGone(true), 1150)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [ready])

  if (gone) return null

  return (
    <div className={`loader ${hidden ? 'loader--hidden' : ''}`}>
      <div className="loader__inner">
        <span className="loader__label">DECOMPOSE</span>
        <div className="loader__bar">
          <div className={`loader__bar-fill ${ready ? 'is-done' : ''}`} />
        </div>
        <span className="loader__meta">ARCHIVE OF MATTER — N° 049</span>
      </div>
    </div>
  )
}
