// Generic editorial story block. `align` = "left" | "right".
export default function Story({ index, title, body, align = 'left' }) {
  return (
    <section className={`scroll-section story story--${align}`}>
      <div className="story__inner">
        <span className="story__num">{index}</span>
        <h2 className="story__title">
          <em>{title}</em>
        </h2>
        <p className="story__body">{body}</p>
      </div>
    </section>
  )
}
