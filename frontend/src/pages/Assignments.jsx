import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ErrorNote, Pager } from '../components/bits'
import { DutyTable } from '../components/duties'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatDate, SPECIES, toISO } from '../lib/farm'
import { seasonOf, TASKS } from '../lib/duties'
import { useApi } from '../lib/useApi'
import './Classroom.css'

function shift(days) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toISO(d)
}

export default function Assignments() {
  const [params] = useSearchParams()
  const people = useApi('/api/people/')
  const animals = useApi('/api/animals/')
  const feeders = useApi('/api/feeders/')
  const [flt, setFlt] = useState({ start: shift(-1), end: shift(7), task: '', assignee: params.get('assignee') || '', status: '' })
  const list = useApi('/api/assignments/', flt)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState(1)
  const set = (k) => (e) => { setFlt((p) => ({ ...p, [k]: e.target.value })); setPage(1) }
  const isDefault = flt.start === shift(-1) && flt.end === shift(7) && !flt.task && !flt.assignee && !flt.status

  const remove = async (a) => {
    if (!window.confirm(`Delete this ${TASKS[a.task].label.toLowerCase()} task for ${a.assignee_name}?`)) return
    try {
      await api(`/api/assignments/${a.id}/`, { method: 'DELETE' })
      list.reload()
    } catch (err) {
      setError(err)
    }
  }

  return (
    <>
      <h1>Feeding &amp; Vaccination Assignments</h1>
      <p className="tagline">Assign feeder refills, feedings, medications, vaccinations, weights, temperatures and exams to students and volunteers.</p>

      <AssignForm people={people.data || []} animals={animals.data || []} feeders={feeders.data || []}
        initialAssignee={params.get('assignee') || ''}
        onSaved={(n) => { setNotice(`Assigned ${n} task${n === 1 ? '' : 's'}.`); list.reload() }} />
      {notice && <p className="pill good" role="status" style={{ margin: '0 0 1rem' }}>✓ {notice}</p>}

      <h2>Assigned tasks</h2>
      <div className="filters" role="group" aria-label="Assignment filters">
        <label>From<input type="date" value={flt.start} onChange={set('start')} /></label>
        <label>To<input type="date" value={flt.end} onChange={set('end')} /></label>
        <label>Task
          <select value={flt.task} onChange={set('task')}>
            <option value="">All tasks</option>
            {Object.entries(TASKS).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
        </label>
        <label>Assigned to
          <select value={flt.assignee} onChange={set('assignee')}>
            <option value="">Everyone</option>
            {(people.data || []).map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
          </select>
        </label>
        <label>Status
          <select value={flt.status} onChange={set('status')}>
            <option value="">Any status</option><option value="open">Not done</option><option value="completed">Done</option>
          </select>
        </label>
        <button className="link-btn" disabled={isDefault}
          onClick={() => { setFlt({ start: shift(-1), end: shift(7), task: '', assignee: '', status: '' }); setPage(1) }}>Clear filters</button>
      </div>
      <ErrorNote error={list.error || error} />
      <div className={list.loading ? 'loading' : ''}>
        <DutyTable rows={(list.data || []).slice((page - 1) * 40, page * 40)} linkPeople empty="No tasks match these filters."
          actions={(a) => <button className="link-btn" onClick={() => remove(a)}>Delete</button>} />
      </div>
      <Pager page={page} pages={Math.max(1, Math.ceil((list.data || []).length / 40))} onPage={setPage} total={(list.data || []).length} />
      <p className="muted small">Tasks due {formatDate(flt.start)} to {formatDate(flt.end)}.</p>
    </>
  )
}

const EMPTY = { task: 'refill_feeder', assignee: '', feeder: '', animals: [], treatment: '', due_date: '', due_time: '',
  repeat: '', repeat_until: '', notes: '', veterinarian: '' }

function AssignForm({ people, animals, feeders, initialAssignee, onSaved }) {
  const { user } = useAuth()
  const [f, setF] = useState({ ...EMPTY, assignee: initialAssignee, due_date: toISO(new Date()) })
  const [species, setSpecies] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const task = TASKS[f.task]
  const summer = f.due_date && seasonOf(f.due_date) === 'summer'
  const vetWork = summer && !task.volunteer // a veterinarian does this with the instructor
  const person = people.find((p) => String(p.id) === String(f.assignee))
  const single = f.animals.length === 1 ? f.animals[0] : null
  const detail = useApi(single && (f.task === 'medication' || f.task === 'vaccination') ? `/api/animals/${single}/` : null)
  const treatments = (detail.data?.treatments || []).filter((t) => (f.task === 'vaccination' ? t.kind === 'vaccine' : t.kind !== 'vaccine'))

  // Volunteers only help with volunteer tasks; in summer vet work goes to the instructor.
  const assignable = useMemo(() => people.filter((p) => task.volunteer || p.role !== 'volunteer'), [people, task])
  const shown = animals.filter((a) => !species || a.species === species)
  const toggle = (slug) => setF((p) => ({ ...p, animals: p.animals.includes(slug) ? p.animals.filter((s) => s !== slug) : [...p.animals, slug] }))
  const allShown = shown.length > 0 && shown.every((a) => f.animals.includes(a.slug))
  const toggleAll = () => setF((p) => ({
    ...p, animals: allShown ? p.animals.filter((s) => !shown.some((a) => a.slug === s)) : [...new Set([...p.animals, ...shown.map((a) => a.slug)])],
  }))

  const save = async (e) => {
    e.preventDefault()
    setError(null)
    if (f.task !== 'refill_feeder' && !f.animals.length) { setError(new Error('Choose at least one animal.')); return }
    setBusy(true)
    try {
      const body = {
        ...f, assignee: vetWork ? user.id : f.assignee, feeder: f.feeder || null, treatment: f.treatment || null,
        due_time: f.due_time || null, animals: f.task === 'refill_feeder' ? undefined : f.animals,
        veterinarian: vetWork ? f.veterinarian : '',
      }
      const created = await api('/api/assignments/', { method: 'POST', body })
      onSaved(created.length)
      setF((p) => ({ ...p, animals: [], treatment: '', notes: '' }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={save}>
      <h3>New assignment</h3>
      <div className="form-grid">
        <label>Task
          <select value={f.task} onChange={(e) => setF((p) => ({ ...p, task: e.target.value, treatment: '' }))}>
            {Object.entries(TASKS).map(([k, t]) => <option key={k} value={k}>{t.icon} {t.label}</option>)}
          </select>
        </label>
        <label>Date<input type="date" value={f.due_date} onChange={set('due_date')} required /></label>
        <label>Time (optional)<input type="time" value={f.due_time} onChange={set('due_time')} /></label>
        {vetWork ? (
          <label>Veterinarian<input value={f.veterinarian} onChange={set('veterinarian')} required placeholder="e.g. Dr. Elena Ruiz, DVM" />
            <span className="hint">Summer: done by a veterinarian with you.</span></label>
        ) : (
          <label>Assign to
            <select value={f.assignee} onChange={set('assignee')} required>
              <option value="">Choose a person…</option>
              <optgroup label="Students">
                {assignable.filter((p) => p.role === 'student').map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}{p.volunteer ? ' (volunteer)' : ''}</option>)}
              </optgroup>
              {task.volunteer && (
                <optgroup label="Volunteers">
                  {assignable.filter((p) => p.role === 'volunteer').map((p) => <option key={p.id} value={p.id}>{p.last_name}, {p.first_name}</option>)}
                </optgroup>
              )}
            </select>
            {person?.role === 'volunteer' && !task.volunteer && <span className="hint">Volunteers can't take this task.</span>}
          </label>
        )}
        <label>Repeat
          <select value={f.repeat} onChange={set('repeat')}>
            <option value="">Just once</option><option value="daily">Daily</option><option value="weekly">Weekly</option>
          </select>
        </label>
        {f.repeat && <label>Until<input type="date" value={f.repeat_until} onChange={set('repeat_until')} min={f.due_date} required /></label>}

        {f.task === 'refill_feeder' ? (
          <label className="wide">Feeder
            <select value={f.feeder} onChange={set('feeder')} required>
              <option value="">Choose a feeder…</option>
              {['coops', 'pens', 'enclosures'].map((area) => (
                <optgroup key={area} label={area[0].toUpperCase() + area.slice(1)}>
                  {feeders.filter((fd) => fd.zone_area === area).map((fd) => <option key={fd.id} value={fd.id}>{fd.name} · {fd.zone}</option>)}
                </optgroup>
              ))}
            </select>
          </label>
        ) : (
          <fieldset className="wide animal-pick">
            <legend>Animals <span className="hint">({f.animals.length} selected; each gets its own task)</span></legend>
            <div className="filters" style={{ margin: '0 0 .4rem' }}>
              <div className="segmented" role="group" aria-label="Species">
                <button type="button" aria-pressed={!species} onClick={() => setSpecies('')}>All</button>
                {SPECIES.map((s) => <button key={s.key} type="button" aria-pressed={species === s.key} onClick={() => setSpecies(s.key)}>{s.label}</button>)}
              </div>
              <button type="button" className="link-btn" onClick={toggleAll}>{allShown ? 'Clear these' : 'Select all shown'}</button>
            </div>
            <div className="animal-checks">
              {shown.map((a) => (
                <label key={a.slug} className="check">
                  <input type="checkbox" checked={f.animals.includes(a.slug)} onChange={() => toggle(a.slug)} />
                  {a.name} <span className="muted small">{a.type_label}{a.health_status !== 'healthy' ? ` · ${a.health_status}` : ''}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {single && treatments.length > 0 && (
          <label className="wide">Treatment (optional)
            <select value={f.treatment} onChange={set('treatment')}>
              <option value="">None</option>
              {treatments.map((t) => <option key={t.id} value={t.id}>{t.name}: {t.dose} ({t.status})</option>)}
            </select>
          </label>
        )}
        <label className="wide">Notes (optional)<input value={f.notes} onChange={set('notes')} maxLength={300} placeholder="Anything the student should know" /></label>
      </div>
      <p className="hint" style={{ margin: '.8rem 0 0' }}>
        {summer
          ? 'Summer: volunteers help with feeder refills, special feedings and weights. Medications, vaccinations, temperatures and exams are done by a veterinarian with the instructor.'
          : 'Spring and fall semesters: assign any task to students.'}
      </p>
      <ErrorNote error={error} />
      <div className="form-actions">
        <button className="btn" type="submit" disabled={busy}>{busy ? 'Assigning…' : 'Assign task'}</button>
      </div>
    </form>
  )
}
