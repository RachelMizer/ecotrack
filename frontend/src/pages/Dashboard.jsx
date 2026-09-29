import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNote, HealthPill } from '../components/bits'
import ScatterPanel from '../components/ScatterPanel'
import { formatDate, SPECIES, speciesByKey, tempRange, toISO } from '../lib/farm'
import { useApi } from '../lib/useApi'

const STAGES = {
  chicken: ['chick', 'pullet', 'cockerel', 'adult'],
  cow: ['neonatal calf', 'calf', 'yearling', 'adult'],
  pig: ['nursing piglet', 'weaner', 'grower', 'adult'],
}

function monthOptions() {
  const now = new Date()
  return Array.from({ length: 13 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    return { value, label: d.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) }
  })
}

function monthRange(ym) {
  const [y, m] = ym.split('-').map(Number)
  const start = new Date(y, m - 1, 1)
  const end = new Date(y, m, 0)
  const today = new Date()
  return { start: toISO(start), end: toISO(end > today ? today : end), days: end.getDate() }
}

const EMPTY = { species: '', zone: '', stage: '', animal: '', health: '' }

export default function Dashboard() {
  const months = useMemo(monthOptions, [])
  const [month, setMonth] = useState(months[0].value)
  const [f, setF] = useState(EMPTY)
  const [tableView, setTableView] = useState(false)
  const range = monthRange(month)

  const temps = useApi('/api/readings/', { kind: 'temperature', start: range.start, end: range.end })
  const weights = useApi('/api/readings/', { kind: 'weight', start: range.start, end: range.end })
  const summary = useApi('/api/summary/')

  const set = (k) => (e) => setF((prev) => {
    const next = { ...prev, [k]: e.target.value }
    if (k === 'species') { next.zone = ''; next.stage = ''; next.animal = '' }
    if (k === 'zone') next.animal = ''
    return next
  })
  const isDefault = month === months[0].value && Object.values(f).every((v) => !v)
  const clear = () => { setF(EMPTY); setMonth(months[0].value) }

  const allRows = temps.data?.rows || []
  const match = (r) =>
    (!f.species || r.species === f.species) && (!f.zone || r.zone === f.zone) && (!f.stage || r.stage === f.stage) &&
    (!f.animal || r.slug === f.animal) && (!f.health || (f.health === 'unwell' ? r.health !== 'healthy' : r.health === f.health))

  // Filter options come from the data so they are always valid for the month.
  const zones = [...new Set(allRows.filter((r) => !f.species || r.species === f.species).map((r) => r.zone))].sort()
  const animals = [...new Map(allRows
    .filter((r) => (!f.species || r.species === f.species) && (!f.zone || r.zone === f.zone))
    .map((r) => [r.slug, r.name])).entries()].sort((a, b) => a[1].localeCompare(b[1]))

  const tempRows = allRows.filter(match)
  const tempSeries = SPECIES.map((s) => ({
    key: s.key, label: s.label, color: s.hex,
    points: tempRows.filter((r) => r.species === s.key).map((r) => ({ ...r, x: Number(r.date.slice(8, 10)), y: r.value })),
  }))
  const band = f.species ? [...tempRange(f.species, f.stage === 'adult' || !f.stage ? 9999 : 0), `Normal ${speciesByKey[f.species].single.toLowerCase()} range`] : null
  const days = Array.from({ length: range.days }, (_, i) => i + 1)

  const weightRows = (weights.data?.rows || []).filter(match)
  const weightSpecies = SPECIES.filter((s) => !f.species || s.key === f.species)

  const tip = (unit) => (p) => (
    <div className="tooltip">
      <strong>{p.value.toFixed(unit === '°F' ? 1 : 2)} {unit}</strong>
      <div>{p.name} · {speciesByKey[p.species].single}</div>
      <div className="muted small">{formatDate(p.date)} · {p.zone}</div>
      <div className="muted small">Click the catalog for details</div>
    </div>
  )

  const s = summary.data
  return (
    <>
      <h1>Statistics Dashboard</h1>
      <p className="tagline">Where animal health meets land insight</p>

      <div className="filters" role="group" aria-label="Dashboard filters">
        <label>Month
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {months.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
        </label>
        <label>Species
          <select value={f.species} onChange={set('species')}>
            <option value="">All species</option>
            {SPECIES.map((sp) => <option key={sp.key} value={sp.key}>{sp.label}</option>)}
          </select>
        </label>
        <label>Group
          <select value={f.zone} onChange={set('zone')}>
            <option value="">All groups</option>
            {zones.map((z) => <option key={z}>{z}</option>)}
          </select>
        </label>
        <label>Life stage
          <select value={f.stage} onChange={set('stage')} disabled={!f.species}>
            <option value="">{f.species ? 'All stages' : 'Pick a species'}</option>
            {(STAGES[f.species] || []).map((st) => <option key={st}>{st}</option>)}
          </select>
        </label>
        <label>Animal
          <select value={f.animal} onChange={set('animal')}>
            <option value="">All animals</option>
            {animals.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
        </label>
        <label>Health
          <select value={f.health} onChange={set('health')}>
            <option value="">Any</option>
            <option value="unwell">Sick or recovering</option>
            <option value="sick">Sick</option>
            <option value="recovering">Recovering</option>
            <option value="healthy">Healthy</option>
          </select>
        </label>
        <button className="link-btn" onClick={clear} disabled={isDefault}>Clear filters</button>
      </div>

      <ErrorNote error={temps.error || weights.error || summary.error} />

      <ScatterPanel
        title={`Body temperatures · ${months.find((m) => m.value === month).label}`}
        series={tempSeries} xLabel="Days of the month" yLabel="Temperature (°F)" xDomain={[1, range.days]} xTicks={days}
        yDomain={[(min) => Math.floor(Math.min(min, band?.[0] ?? min) - 1), (max) => Math.ceil(Math.max(max, band?.[1] ?? max) + 1)]}
        band={band} renderTooltip={tip('°F')} loading={temps.loading} height={360}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', margin: '.4rem 0' }}>
        <p className="muted small" style={{ margin: 0 }}>
          {tempRows.length} readings. Temperatures are taken every two days.
          {f.species ? ' The shaded band is the normal adult range.' : ' Pick a species to see its normal range.'}
        </p>
        <button className="link-btn" onClick={() => setTableView((v) => !v)} aria-expanded={tableView}>
          {tableView ? 'Hide table' : 'View as table'}
        </button>
      </div>
      {tableView && (
        <div className="table-wrap" style={{ maxHeight: 320, overflowY: 'auto' }}>
          <table>
            <thead><tr><th>Date</th><th>Animal</th><th>Species</th><th>Group</th><th className="num">Temp °F</th></tr></thead>
            <tbody>
              {tempRows.slice().sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name)).map((r) => (
                <tr key={r.slug + r.date}><td>{formatDate(r.date)}</td><td>{r.name}</td><td>{speciesByKey[r.species].single}</td>
                  <td>{r.zone}</td><td className="num">{r.value.toFixed(1)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2>Weight by age</h2>
      <p className="muted small" style={{ textAlign: 'center', marginTop: '-.6rem' }}>
        Weekly weigh-ins in the selected month. Each species has its own scale.
      </p>
      <div className="grid cols-3">
        {weightSpecies.map((sp) => {
          const pts = weightRows.filter((r) => r.species === sp.key)
            .map((r) => ({ ...r, x: +(r.age_days / 7).toFixed(1), y: r.value }))
          return (
            <ScatterPanel key={sp.key} title={sp.label}
              series={[{ key: sp.key, label: sp.label, color: sp.hex, points: pts }]}
              xLabel="Age (weeks)" yLabel="Weight (lb)" height={260} renderTooltip={tip('lb')}
              loading={weights.loading} yTickFormatter={(v) => v.toLocaleString()} />
          )
        })}
      </div>

      <h2>Herd at a glance</h2>
      <div className={`grid cols-3 ${summary.loading ? 'loading' : ''}`}>
        <section className="tile green" aria-labelledby="t-health">
          <h3 id="t-health">Health</h3>
          <div className="stat-row">
            {SPECIES.map((sp) => (
              <div key={sp.key}><div className="stat">{s?.species[sp.key] ?? '–'}</div><div className="stat-label">{sp.label}</div></div>
            ))}
          </div>
          <p className="small" style={{ margin: '0 0 .3rem' }}>Needs attention:</p>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            {s?.attention.map((a) => (
              <li key={a.slug} className="small">
                <Link to={`/catalog/${speciesByKey[a.species].group}#${a.slug}`}>{a.name}</Link>{' '}
                <HealthPill status={a.status} /> <span className="muted">{a.condition}</span>
              </li>
            ))}
          </ul>
        </section>
        <section className="tile teal" aria-labelledby="t-feed">
          <h3 id="t-feed">Feed &amp; treatments</h3>
          <div className="stat-row">
            <div><div className="stat">{s?.active_medications ?? '–'}</div><div className="stat-label">Active meds &amp; supplements</div></div>
            <div><div className="stat">{s?.upcoming_vaccinations ?? '–'}</div><div className="stat-label">Vaccinations due (21 days)</div></div>
          </div>
          <p className="small" style={{ margin: '0 0 .3rem' }}>Feeders at or below 25%:</p>
          <ul style={{ margin: 0, paddingLeft: '1rem' }}>
            {s?.low_feed.length === 0 && <li className="small">None, all feeders are stocked.</li>}
            {s?.low_feed.map((l) => (
              <li key={l.feeder + l.feed} className="small">
                <span className="pill warning">▼ {l.percent_full}%</span> {l.feeder}: {l.feed}
                <span className="muted"> (~{l.days_remaining} days left)</span>
              </li>
            ))}
          </ul>
          <p className="small" style={{ marginBottom: 0 }}><Link to="/nutrition">Go to Nutrition →</Link></p>
        </section>
        <section className="tile mauve" aria-labelledby="t-eggs">
          <h3 id="t-eggs">Eggs this month</h3>
          <div className="stat-row">
            <div><div className="stat">{s ? s.eggs.reduce((t, e) => t + e.eggs, 0) : '–'}</div><div className="stat-label">Eggs month-to-date</div></div>
          </div>
          <EggBars eggs={s?.eggs || []} />
        </section>
      </div>
    </>
  )
}

function EggBars({ eggs }) {
  const max = Math.max(1, ...eggs.map((e) => e.eggs))
  return (
    <div role="list" aria-label="Eggs per hen">
      {eggs.slice().sort((a, b) => b.eggs - a.eggs).map((e) => (
        <div role="listitem" key={e.slug} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 28px', alignItems: 'center', gap: 6, fontSize: '.8rem', margin: '3px 0' }}
          title={`${e.name}: ${e.eggs} eggs (${e.status})`}>
          <Link to={`/catalog/chickens#${e.slug}`}>{e.name}</Link>
          <div style={{ height: 10, background: 'rgba(255,255,255,.7)', borderRadius: 2 }}>
            <div style={{ width: `${(e.eggs / max) * 100}%`, height: '100%', background: '#008a9e', borderRadius: '0 4px 4px 0' }} />
          </div>
          <span className="tabular" style={{ textAlign: 'right' }}>{e.eggs}</span>
        </div>
      ))}
    </div>
  )
}
