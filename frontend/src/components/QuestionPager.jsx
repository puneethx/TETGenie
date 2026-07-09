import { useState } from 'react'
import Icon from './Icon'

// Renders a long list of questions in pages (default 20) so the browser only
// mounts a slice at a time — big win on phones for 150-question papers.
export default function QuestionPager({ items = [], pageSize = 20, renderItem }) {
  const [page, setPage] = useState(0)
  const pages = Math.max(1, Math.ceil(items.length / pageSize))
  const p = Math.min(page, pages - 1)
  const start = p * pageSize
  const end = Math.min(start + pageSize, items.length)
  const slice = items.slice(start, end)

  function go(next) {
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <>
      <div className="stack gap-4">
        {slice.map((it, k) => renderItem(it, start + k))}
      </div>

      {pages > 1 && (
        <div className="row gap-3 mt-4" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn btn-ghost" style={{ minHeight: 40, padding: '0 14px' }} disabled={p === 0} onClick={() => go(p - 1)}>
            <Icon name="arrowLeft" size={16} /> Prev
          </button>
          <span className="muted" style={{ fontSize: 'var(--fs-sm)', fontWeight: 700 }}>
            {start + 1}–{end} of {items.length}
          </span>
          <button className="btn btn-ghost" style={{ minHeight: 40, padding: '0 14px' }} disabled={p >= pages - 1} onClick={() => go(p + 1)}>
            Next <Icon name="chevronRight" size={16} />
          </button>
        </div>
      )}
    </>
  )
}
