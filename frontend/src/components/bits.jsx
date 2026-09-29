import { useState } from 'react'
import { NavLink } from 'react-router-dom'
import { HEALTH_LABEL, SPECIES } from '../lib/farm'

/**
 * Animal photo from /public/animals/<slug>.jpg. Until a photo is added, a square
 * placeholder is shown (see dev/images_needed.txt).
 */
export function AnimalPhoto({ slug, name }) {
  const [missing, setMissing] = useState(false)
  if (missing) {
    const initials = name.split(/[\s-]+/).map((w) => w[0]).join('').slice(0, 2)
    return (
      <div className="photo-ph" role="img" aria-label={`Photo of ${name} needed`}>
        <div><b>{initials}</b><small>Photo needed</small></div>
      </div>
    )
  }
  return <img className="photo" src={`/animals/${slug}.jpg`} alt={name} onError={() => setMissing(true)} loading="lazy" />
}

export function HealthPill({ status }) {
  return <span className={`pill ${status}`}>{HEALTH_LABEL[status] || status}</span>
}

const STATUS_ICON = { active: '●', scheduled: '◷', completed: '✓' }
export function StatusPill({ status }) {
  return <span className={`pill ${status}`}>{STATUS_ICON[status]} {status[0].toUpperCase() + status.slice(1)}</span>
}

export function ErrorNote({ error }) {
  if (!error) return null
  return <p className="error" role="alert">{error.message}</p>
}

export function Pager({ page, pages, onPage, total }) {
  if (pages <= 1) return <div className="pager muted">{total} records</div>
  return (
    <div className="pager">
      <span className="muted">{total} records</span>
      <button className="link-btn arrow-link" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span className="tabular">Page {page} of {pages}</span>
      <button className="link-btn arrow-link" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  )
}

export function Legend({ items }) {
  if (items.length < 2) return null
  return (
    <div className="legend" aria-label="Legend">
      {items.map((it) => (
        <span key={it.label}><i style={{ background: it.color }} />{it.label}</span>
      ))}
    </div>
  )
}

/** Tabs across the top of each catalog group page (Cows, Pigs, Chickens, Incubator). */
export function GroupTabs() {
  return (
    <nav className="group-tabs" aria-label="Animal groups">
      {SPECIES.map((s) => <NavLink key={s.key} to={`/catalog/${s.group}`}>{s.label}</NavLink>)}
      <NavLink to="/catalog/incubator">Incubator</NavLink>
    </nav>
  )
}
