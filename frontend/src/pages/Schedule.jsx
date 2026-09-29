import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNote, HealthPill } from '../components/bits'
import { formatDate, formatWeight, SPECIES, speciesByKey, toISO } from '../lib/farm'
import { useApi } from '../lib/useApi'
import './Schedule.css'

const CAT = {
  feed: { icon: '🌾', label: 'Feed' },
  water: { icon: '💧', label: 'Water' },
  medication: { icon: '💊', label: 'Medication' },
  supplement: { icon: '✚', label: 'Supplement' },
  vaccine: { icon: '💉', label: 'Vaccination' },
  check: { icon: '✔', label: 'Check' },
}

export default function Schedule() {
  const today = toISO(new Date())
  const [day, setDay] = useState(today)
  const [species, setSpecies] = useState('')
  const [animal, setAnimal] = useState('')
  const [cat, setCat] = useState('')
  const [view, setView] = useState('animal')
  const { data, error, loading } = useApi('/api/schedule/', { date: day, species })

  const animals = (data?.animals || []).filter((a) => !animal || a.slug === animal)
  const withItems = animals.map((a) => ({ ...a, items: a.items.filter((i) => !cat || i.category === cat) }))
  const isDefault = day === today && !species && !animal && !cat
  const clear = () => { setDay(today); setSpecies(''); setAnimal(''); setCat('') }

  // "By time" view: one run-sheet row per time slot, grouping identical tasks across animals.
  const slots = {}
  withItems.forEach((a) => a.items.forEach((i) => {
    const key = `${i.time}|${i.category}|${i.item}|${i.amount}`
    slots[i.time] ||= {}
    slots[i.time][key] ||= { ...i, animals: [] }
    slots[i.time][key].animals.push(a)
  }))
  const times = Object.keys(slots).sort((a, b) => (/\d/.test(a[0]) - /\d/.test(b[0])) || a.localeCompare(b))
  const upcoming = animals.flatMap((a) => a.upcoming.map((u) => ({ ...u, animal: a })))
    .filter((u) => !cat || u.kind === cat).sort((a, b) => a.date.localeCompare(b.date))

  return (
    <>
      <h1>Feeding &amp; Medication Schedule</h1>
      <p className="tagline">Rations and doses adjust to each animal's species, age, fertility status and current treatments.</p>

      <div className="filters" role="group" aria-label="Schedule filters">
        <label>Date<input type="date" value={day} onChange={(e) => setDay(e.target.value || today)} /></label>
        <label>Species
          <select value={species} onChange={(e) => { setSpecies(e.target.value); setAnimal('') }}>
            <option value="">All species</option>
            {SPECIES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </label>
        <label>Animal
          <select value={animal} onChange={(e) => setAnimal(e.target.value)}>
            <option value="">All animals</option>
            {(data?.animals || []).map((a) => <option key={a.slug} value={a.slug}>{a.name}</option>)}
          </select>
        </label>
        <label>Task type
          <select value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">All tasks</option>
            {Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </label>
        <div className="segmented" role="group" aria-label="View">
          <button aria-pressed={view === 'animal'} onClick={() => setView('animal')}>By animal</button>
          <button aria-pressed={view === 'time'} onClick={() => setView('time')}>By time</button>
        </div>
        <button className="link-btn" onClick={clear} disabled={isDefault}>Clear filters</button>
      </div>
      <ErrorNote error={error} />

      <div className={loading ? 'loading' : ''}>
        {view === 'animal' ? (
          <div className="grid cols-2">
            {withItems.map((a) => (
              <article key={a.slug} className="card sched-card">
                <header>
                  <h3 className="sched-name">
                    <Link to={`/catalog/${speciesByKey[a.species].group}#${a.slug}`}>{a.name}</Link>
                  </h3>
                  <span className="pill neutral">{a.type_label}</span>
                  {a.health_status !== 'healthy' && <HealthPill status={a.health_status} />}
                </header>
                <p className="small muted" style={{ margin: '.2rem 0' }}>
                  {a.life_stage} · {a.fertility_label} · {formatWeight(a.latest_weight)} · {a.zone}
                </p>
                <p className="basis small">{a.basis}</p>
                <ol className="timeline">
                  {a.items.map((i, n) => <Task key={n} i={i} />)}
                  {a.items.length === 0 && <li className="muted small">No tasks of this type.</li>}
                </ol>
              </article>
            ))}
          </div>
        ) : (
          <div className="runsheet">
            {times.map((t) => (
              <section key={t} className="slot">
                <h3 className="slot-time">{t}</h3>
                <ul>
                  {Object.values(slots[t]).map((i) => (
                    <li key={i.item + i.amount + i.category}>
                      <span className="task-icon" aria-hidden>{CAT[i.category]?.icon}</span>
                      <span>
                        <b>{i.item}</b>{i.amount && <> · {i.amount}</>}{' '}
                        <span className="muted small">
                          for {i.animals.length > 6 ? `${i.animals.length} animals (${i.animals.slice(0, 5).map((a) => a.name).join(', ')}…)` : i.animals.map((a) => a.name).join(', ')}
                        </span>
                        {i.notes && <div className="muted small">{i.notes}</div>}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>

      <h2>Coming up in the next 21 days</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Date</th><th>Animal</th><th>Type</th><th>Treatment</th><th>Dose</th><th>Reason</th></tr></thead>
          <tbody>
            {upcoming.map((u, n) => (
              <tr key={n}>
                <td className="tabular" style={{ whiteSpace: 'nowrap' }}>{formatDate(u.date)}</td>
                <td>{u.animal.name} <span className="muted small">({u.animal.type_label})</span></td>
                <td>{CAT[u.kind]?.icon} {CAT[u.kind]?.label}</td><td>{u.name}</td><td>{u.dose}</td><td>{u.reason}</td>
              </tr>
            ))}
            {!loading && upcoming.length === 0 && <tr><td colSpan={6} className="muted">Nothing scheduled.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="muted small">Scheduled for {formatDate(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}. Rations follow common extension-service guidelines; check doses with your veterinarian.</p>
    </>
  )
}

function Task({ i }) {
  const c = CAT[i.category] || { icon: '•', label: i.category }
  return (
    <li className={`task ${i.category}`}>
      <span className="task-time tabular">{i.time}</span>
      <span className="task-icon" title={c.label} aria-label={c.label}>{c.icon}</span>
      <span>
        <b>{i.item}</b>{i.amount && <> · <span className="tabular">{i.amount}</span></>}
        {i.notes && <div className="muted small">{i.notes}</div>}
      </span>
    </li>
  )
}
