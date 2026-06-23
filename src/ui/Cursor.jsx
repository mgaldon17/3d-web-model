import { useEffect, useRef } from 'react'

// Custom cursor: a 14px ringed dot with mix-blend-mode: difference that eases
// toward the pointer and swells when hovering interactive elements.
export default function Cursor() {
  const ref = useRef()
  const pos = useRef({ x: 0, y: 0 })
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    // Don't render a fake cursor on touch / coarse pointers.
    if (window.matchMedia('(pointer: coarse)').matches) return

    const onMove = (e) => {
      target.current.x = e.clientX
      target.current.y = e.clientY
    }
    const onOver = (e) => {
      const interactive = e.target.closest('a, button, .pill, [data-cursor]')
      ref.current?.classList.toggle('cursor--hover', !!interactive)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerover', onOver)

    let raf
    const loop = () => {
      pos.current.x += (target.current.x - pos.current.x) * 0.18
      pos.current.y += (target.current.y - pos.current.y) * 0.18
      if (ref.current) {
        ref.current.style.transform = `translate3d(${pos.current.x}px, ${pos.current.y}px, 0) translate(-50%, -50%)`
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerover', onOver)
      cancelAnimationFrame(raf)
    }
  }, [])

  return <div className="cursor" ref={ref} aria-hidden="true" />
}
