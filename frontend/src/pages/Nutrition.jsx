import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ErrorNote, Pager, StatusPill } from '../components/bits'
import { formatDate, SPECIES, speciesByKey } from '../lib/farm'
import { useApi } from '../lib/useApi'
import './Nutrition.css'

const AREA_LABEL = { coops: 'Coops', pens: 'Pens', enclosures: 'Enclosures' }
const PAGE = 30

function level(pct) {
  if (pct <= 15) return { cls: 'critical', icon: '▼', label: 'Refill now' }
  if (pct <= 35) return { cls: 'warning', icon: '▼', label: 'Low' }
  return { cls: 'good', icon: '●', label: 'OK' }
}

export default function Nutrition() {
  const feeders = useApi('/api/feeders/')
  const treatments = useApi('/api/treatments/')
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'care' ? 'care' : 'feeders'
  const [area, setArea] = useState('')
  const [f, setF] = useState({ species: '', kind: '', status: '', q: '' })
  const [page, setPage] = useState(1)
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setPage(1) }

  const feederList = (feeders.data || []).filter((fd) => !area || fd.zone_area === area)
  const tx = (treatments.data || []).filter((t) =>
    (!f.species || t.species === f.species) && (!f.kind || t.kind === f.kind) && (!f.status || t.status === f.status) &&
    (!f.q || `${t.animal_name} ${t.name} ${t.reason}`.toLowerCase().includes(f.q.toLowerCase())))
    .sort((a, b) => ({ active: 0, scheduled: 1, completed: 2 }[a.status] - { active: 0, scheduled: 1, completed: 2 }[b.status])
      || (a.status === 'completed' ? b.start_date.localeCompare(a.start_date) : a.start_date.localeCompare(b.start_date)))
  const pages = Math.max(1, Math.ceil(tx.length / PAGE))
  const txDefault = !f.species && !f.kind && !f.status && !f.q

  return (
    <>
      <h1>Nutrition &amp; Care</h1>
      <p className="tagline">Feeder levels, feed types, vaccinations and medications.</p>

      <div className="page-tabs" role="tablist" aria-label="Nutrition sections">
        <button role="tab" id="tab-feeders" aria-selected={tab === 'feeders'} aria-controls="panel-feeders"
          onClick={() => setParams({}, { replace: true })}>Feeding stations</button>
        <button role="tab" id="tab-care" aria-selected={tab === 'care'} aria-controls="panel-care"
          onClick={() => setParams({ tab: 'care' }, { replace: true })}>Vaccinations &amp; medications</button>
      </div>

      {tab === 'feeders' && (
      <section id="panel-feeders" role="tabpanel" aria-labelledby="tab-feeders">
      <div className="filters">
        <div className="segmented" role="group" aria-label="Area">
          <button aria-pressed={!area} onClick={() => setArea('')}>All areas</button>
          {Object.entries(AREA_LABEL).map(([k, v]) => <button key={k} aria-pressed={area === k} onClick={() => setArea(k)}>{v}</button>)}
        </div>
        <button className="link-btn" disabled={!area} onClick={() => setArea('')}>Clear filters</button>
      </div>
      <ErrorNote error={feeders.error} />
      <div className={`grid cols-3 ${feeders.loading ? 'loading' : ''}`}>
        {feederList.map((fd) => (
          <article key={fd.id} className="card feeder">
            <h3>{fd.name}</h3>
            <p className="muted small" style={{ margin: '0 0 .6rem' }}>
              {fd.feeder_type} · {fd.zone}<br />Serves: {fd.serves}
            </p>
            {fd.contents.map((c) => {
              const lv = level(c.percent_full)
              return (
                <div key={c.id} className="feed-row">
                  <div className="feed-name">
                    <span className="feed-title">{c.feed_name}</span>
                    <span className={`pill ${lv.cls}`}>{lv.icon} {lv.label}</span>
                  </div>
                  <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={c.percent_full}
                    aria-label={`${c.feed_name} ${c.percent_full}% full`}>
                    <div className={`meter-fill ${lv.cls}`} style={{ width: `${Math.max(c.percent_full, 1)}%` }} />
                  </div>
                  <div className="feed-meta tabular">
                    <span><b>{Number(c.current_lbs).toLocaleString()}</b> / {Number(c.capacity_lbs).toLocaleString()} lb ({c.percent_full}%)</span>
                    <span>{Number(c.daily_usage_lbs)} lb/day · ~{c.days_remaining ?? '∞'} days left</span>
                  </div>
                  <span className="muted small">{c.category}</span>
                </div>
              )
            })}
            <p className="small" style={{ margin: '.6rem 0 0' }}>
              Refilled {formatDate(fd.last_refilled)} · next refill <b>{formatDate(fd.next_refill)}</b> (every {fd.refill_interval_days} days)
            </p>
          </article>
        ))}
      </div>
      </section>
      )}

      {tab === 'care' && (
      <section id="panel-care" role="tabpanel" aria-labelledby="tab-care">
      <div className="filters" role="group" aria-label="Treatment filters">
        <label>Search<input type="search" value={f.q} onChange={set('q')} placeholder="Animal, drug, reason" /></label>
        <label>Species
          <select value={f.species} onChange={set('species')}>
            <option value="">All species</option>
            {SPECIES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label>Type
          <select value={f.kind} onChange={set('kind')}>
            <option value="">All types</option><option value="vaccine">Vaccinations</option>
            <option value="medication">Medications</option><option value="supplement">Supplements</option>
          </select>
        </label>
        <label>Status
          <select value={f.status} onChange={set('status')}>
            <option value="">Any status</option><option value="active">Active</option>
            <option value="scheduled">Scheduled</option><option value="completed">Completed</option>
          </select>
        </label>
        <button className="link-btn" disabled={txDefault} onClick={() => { setF({ species: '', kind: '', status: '', q: '' }); setPage(1) }}>
          Clear filters
        </button>
      </div>
      <ErrorNote error={treatments.error} />
      <div className={`table-wrap ${treatments.loading ? 'loading' : ''}`}>
        <table>
          <thead>
            <tr><th>Animal</th><th>Type</th><th>Treatment</th><th>Dose / route</th><th>Dates</th><th>Status</th><th>Reason</th><th>Withdrawal</th></tr>
          </thead>
          <tbody>
            {tx.slice((page - 1) * PAGE, page * PAGE).map((t) => (
              <tr key={t.id}>
                <td><Link to={`/catalog/${speciesByKey[t.species].group}#${t.animal_slug}`}>{t.animal_name}</Link></td>
                <td style={{ textTransform: 'capitalize' }}>{t.kind}</td>
                <td>{t.name}</td>
                <td>{t.dose}{t.route && <span className="muted"> · {t.route}</span>}{t.times && <div className="muted small">at {t.times.replaceAll(',', ', ')}</div>}</td>
                <td className="tabular" style={{ whiteSpace: 'nowrap' }}>
                  {formatDate(t.start_date)}{t.end_date && t.end_date !== t.start_date && <> – {formatDate(t.end_date)}</>}
                </td>
                <td><StatusPill status={t.status} /></td>
                <td>{t.reason}{t.condition && <div className="muted small">{t.condition}</div>}</td>
                <td className="small">{t.withdrawal || '—'}</td>
              </tr>
            ))}
            {!treatments.loading && tx.length === 0 && <tr><td colSpan={8} className="muted">No treatments match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} onPage={setPage} total={tx.length} />
      <p className="muted small">
        Drug names and doses are illustrative and must be confirmed by your veterinarian. Always follow label directions and withdrawal times.
      </p>
      </section>
      )}
    </>
  )
}
