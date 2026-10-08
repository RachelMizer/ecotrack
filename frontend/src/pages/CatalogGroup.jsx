import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useParams } from 'react-router-dom'
import { AnimalPhoto, ErrorNote, GroupTabs, HealthPill } from '../components/bits'
import { DutyStatus } from '../components/duties'
import { api } from '../lib/api'
import { formatStamp, formatTime, TASKS } from '../lib/duties'
import { formatAge, formatDate, formatWeight, speciesByGroup, tempStatus } from '../lib/farm'
import { useApi } from '../lib/useApi'
import './Catalog.css'

export default function CatalogGroup() {
  const { group } = useParams()
  const { hash } = useLocation()
  const sp = speciesByGroup[group]
  const { data, error, loading } = useApi(sp ? '/api/animals/' : null, { species: sp?.key })
  const [zone, setZone] = useState('')
  const [health, setHealth] = useState('')
  const [q, setQ] = useState('')
  const target = decodeURIComponent(hash.slice(1))

  // Reset filters when switching group so a linked animal is always visible.
  useEffect(() => { setZone(''); setHealth(''); setQ('') }, [group, target])

  // Scroll to the animal named in the URL hash (e.g. from a Tracker dot).
  useEffect(() => {
    if (!data || !target) return
    const el = document.getElementById(target)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [data, target])

  if (!sp) return <Navigate to="/catalog" replace />

  const animals = (data || []).filter((a) =>
    (!zone || a.zone === zone) && (!health || a.health_status === health) &&
    (!q || a.name.toLowerCase().includes(q.toLowerCase())))
  const zones = [...new Set((data || []).map((a) => a.zone))].sort()

  return (
    <>
      <h1>{sp.label}</h1>
      <GroupTabs />
      <div className="filters">
        <label>Search<input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name" /></label>
        <label>Location
          <select value={zone} onChange={(e) => setZone(e.target.value)}>
            <option value="">All locations</option>
            {zones.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
        <label>Health
          <select value={health} onChange={(e) => setHealth(e.target.value)}>
            <option value="">Any</option><option value="healthy">Healthy</option>
            <option value="sick">Sick</option><option value="recovering">Recovering</option>
          </select>
        </label>
        <button className="link-btn" disabled={!zone && !health && !q} onClick={() => { setZone(''); setHealth(''); setQ('') }}>
          Clear filters
        </button>
        <span className="muted small" style={{ marginLeft: 'auto' }}>{animals.length} of {data?.length ?? 0} shown</span>
      </div>
      <ErrorNote error={error} />
      <div className={`animal-list ${loading ? 'loading' : ''}`}>
        {animals.map((a) => <AnimalCard key={a.slug} a={a} group={group} highlight={a.slug === target} />)}
      </div>
    </>
  )
}

function AnimalCard({ a, group, highlight }) {
  const [detail, setDetail] = useState(null)
  useEffect(() => {
    if (a.health_status !== 'healthy' || highlight) api(`/api/animals/${a.slug}/`).then(setDetail).catch(() => {})
  }, [a.slug, a.health_status, highlight])

  const ts = a.latest_temp != null ? tempStatus(a.species, a.age_days, Number(a.latest_temp)) : null
  const current = detail?.health_events.filter((e) => e.ongoing || (e.end_date && daysSince(e.end_date) <= 14)) || []
  const activeTx = detail?.treatments.filter((t) => t.status === 'active') || []

  return (
    <article id={a.slug} className={`animal-card ${highlight ? 'highlight' : ''}`}>
      <AnimalPhoto slug={a.slug} name={a.name} />
      <div>
        <div className="head">
          <h3 className="name">{a.name}</h3>
          <span className="pill neutral">{a.type_label}</span>
          <HealthPill status={a.health_status} />
        </div>
        <dl className="stats">
          <Stat label="Tag">{a.tag_id}</Stat>
          <Stat label="Breed">{a.breed}</Stat>
          <Stat label="Age">{formatAge(a.age_days)} <span className="muted small">({a.life_stage})</span></Stat>
          <Stat label="Born / hatched">{formatDate(a.birth_date)}</Stat>
          <Stat label="Fertility status">{a.fertility_label}</Stat>
          <Stat label="Location">{a.zone}</Stat>
          <Stat label="Weight">
            {formatWeight(a.latest_weight)}
            <Link className="arrow-link" to={`/catalog/${group}/${a.slug}/weights`}>history →</Link>
          </Stat>
          <Stat label="Temperature">
            {a.latest_temp != null ? `${Number(a.latest_temp).toFixed(1)} °F` : '—'}
            {ts && ts !== 'normal' && <span className={`pill ${ts === 'low' ? 'warning' : 'critical'}`} style={{ marginLeft: 6 }}>▲ {ts}</span>}
            <Link className="arrow-link" to={`/catalog/${group}/${a.slug}/temperatures`}>history →</Link>
          </Stat>
          {a.egg_count_mtd != null && <Stat label="Eggs this month">{a.egg_count_mtd}</Stat>}
          {a.dam && <Stat label="Dam">{a.dam}</Stat>}
        </dl>
        {a.notes && <p className="small muted" style={{ marginBottom: 0 }}>{a.notes}</p>}
        <Duties a={a} group={group} />
        {(current.length > 0 || activeTx.length > 0) && (
          <div className="care">
            {current.map((e) => (
              <div key={e.id}>
                <strong>{e.condition}</strong>: {e.ongoing ? `since ${formatDate(e.start_date)}` : `resolved ${formatDate(e.end_date)}`}.{' '}
                <span className="muted">{e.notes}</span>
              </div>
            ))}
            {activeTx.length > 0 && (
              <>
                <div style={{ marginTop: '.4rem' }}>Current treatments:</div>
                <ul>{activeTx.map((t) => <li key={t.id}>{t.name}: {t.dose} ({t.route})</li>)}</ul>
              </>
            )}
          </div>
        )}
      </div>
    </article>
  )
}

/** Student and volunteer assignments for this animal: what's coming up and who did the last ones. */
function Duties({ a, group }) {
  const upcoming = a.duties.filter((d) => d.status === 'scheduled').slice(0, 3)
  const recent = a.duties.filter((d) => d.status !== 'scheduled').sort((x, y) => y.due_date.localeCompare(x.due_date)).slice(0, 3)
  return (
    <div className="care duties">
      <div className="duties-head">
        <span>Assigned care</span>
        <Link className="arrow-link" to={`/catalog/${group}/${a.slug}/care`}>care history →</Link>
      </div>
      {upcoming.length === 0 && recent.length === 0 && <div className="muted">No duties in the last month.</div>}
      <ul>
        {upcoming.map((d) => <DutyLine key={d.id} d={d} />)}
        {recent.map((d) => <DutyLine key={d.id} d={d} />)}
      </ul>
    </div>
  )
}

function DutyLine({ d }) {
  const t = TASKS[d.task]
  return (
    <li>
      <span aria-hidden>{t?.icon}</span> {t?.label}{' '}
      <span className="muted">· {d.assignee_name} ({d.veterinarian ? `Instructor with ${d.veterinarian}` : d.assignee_role})</span>{' '}
      {d.status === 'completed'
        ? <span className="muted">· done {formatStamp(d.completed_at)}</span>
        : <span className="muted">· due {formatDate(d.due_date)}{d.due_time && ` ${formatTime(d.due_time)}`}</span>}{' '}
      <DutyStatus status={d.status} />
    </li>
  )
}

function Stat({ label, children }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>
}

function daysSince(iso) {
  return (Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000
}
