import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ErrorNote } from '../components/bits'
import { TempPassword } from '../components/duties'
import { api } from '../lib/api'
import { sixteenWeeks, termLabel } from '../lib/duties'
import { formatDate } from '../lib/farm'
import { useApi } from '../lib/useApi'
import './Classroom.css'

export default function Classes() {
  const [params, setParams] = useSearchParams()
  const tab = params.get('tab') === 'volunteers' ? 'volunteers' : 'classes'
  return (
    <>
      <h1>Classes &amp; Volunteers</h1>
      <p className="tagline">Class rosters for the spring and fall semesters, and the summer volunteer list.</p>
      <div className="page-tabs" role="tablist" aria-label="Classes sections">
        <button role="tab" id="tab-classes" aria-selected={tab === 'classes'} aria-controls="panel-classes"
          onClick={() => setParams({}, { replace: true })}>Classes</button>
        <button role="tab" id="tab-volunteers" aria-selected={tab === 'volunteers'} aria-controls="panel-volunteers"
          onClick={() => setParams({ tab: 'volunteers' }, { replace: true })}>Summer volunteers</button>
      </div>
      {tab === 'classes' ? <ClassList /> : <Volunteers />}
    </>
  )
}

function ClassList() {
  const { data, error, loading } = useApi('/api/classes/')
  const [creating, setCreating] = useState(false)
  const navigate = useNavigate()

  // Group by term, newest first.
  const terms = []
  for (const c of data || []) {
    const label = termLabel(c)
    if (!terms.length || terms.at(-1).label !== label) terms.push({ label, classes: [] })
    terms.at(-1).classes.push(c)
  }

  return (
    <section id="panel-classes" role="tabpanel" aria-labelledby="tab-classes">
      <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
        {!creating && <button className="btn" onClick={() => setCreating(true)}>+ Create new class</button>}
      </div>
      {creating && <ClassForm onCancel={() => setCreating(false)} onSaved={(c) => navigate(`/classes/${c.id}`)} />}
      <ErrorNote error={error} />
      <div className={loading ? 'loading' : ''}>
        {terms.map((t) => (
          <section key={t.label} className="term-group">
            <h2>{t.label}</h2>
            <div className="grid cols-2">
              {t.classes.map((c) => (
                <Link key={c.id} to={`/classes/${c.id}`} className="card class-card">
                  <h3>{c.name}</h3>
                  <div className="class-meta">
                    <span className="pill neutral">Section {c.section}</span>
                    <span>{formatDate(c.term_start)} – {formatDate(c.term_end)}</span>
                    <span>{c.student_count} student{c.student_count === 1 ? '' : 's'}</span>
                  </div>
                  {c.description && <p className="small muted" style={{ margin: '.2rem 0 0' }}>{c.description}</p>}
                  <span className="arrow-link small" style={{ marginTop: 'auto' }}>Open roster →</span>
                </Link>
              ))}
            </div>
          </section>
        ))}
        {!loading && !terms.length && <p className="muted" style={{ textAlign: 'center' }}>No classes yet. Create the first one above.</p>}
      </div>
    </section>
  )
}

/** Create or edit a class. Term end defaults to 16 weeks after the start. */
export function ClassForm({ course, onCancel, onSaved }) {
  const [f, setF] = useState({
    name: course?.name || '', section: course?.section || '', description: course?.description || '',
    term_start: course?.term_start || '', term_end: course?.term_end || '',
  })
  const [endTouched, setEndTouched] = useState(!!course)
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => {
    const v = e.target.value
    setF((p) => ({ ...p, [k]: v, ...(k === 'term_start' && !endTouched ? { term_end: sixteenWeeks(v) } : {}) }))
    if (k === 'term_end') setEndTouched(true)
  }

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const saved = await api(course ? `/api/classes/${course.id}/` : '/api/classes/', { method: course ? 'PATCH' : 'POST', body: f })
      onSaved(saved)
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={save} style={{ marginBottom: '1.5rem' }}>
      <h3>{course ? 'Edit class' : 'New class'}</h3>
      <div className="form-grid">
        <label>Class name<input value={f.name} onChange={set('name')} required maxLength={120} /></label>
        <label>Section<input value={f.section} onChange={set('section')} required maxLength={20} placeholder="e.g. 01" /></label>
        <label>Term start<input type="date" value={f.term_start} onChange={set('term_start')} required /></label>
        <label>Term end<input type="date" value={f.term_end} onChange={set('term_end')} required min={f.term_start} />
          <span className="hint">Semesters default to 16 weeks.</span></label>
        <label className="wide">Description (optional)<textarea rows={3} value={f.description} onChange={set('description')} /></label>
      </div>
      <ErrorNote error={error} />
      <div className="form-actions">
        <button className="btn" type="submit" disabled={busy}>{course ? 'Save changes' : 'Create class'}</button>
        <button className="btn secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  )
}

function Volunteers() {
  const vols = useApi('/api/people/', { volunteer: 1 })
  const students = useApi('/api/people/', { role: 'student' })
  const [adding, setAdding] = useState(false)
  const [created, setCreated] = useState(null)
  const [error, setError] = useState(null)

  const remove = async (p) => {
    if (!window.confirm(`Take ${p.name} off the volunteer list? Their account and task history stay.`)) return
    try {
      await api(`/api/volunteers/${p.id}/`, { method: 'DELETE' })
      vols.reload()
    } catch (err) {
      setError(err)
    }
  }

  const onAdded = (res) => {
    setAdding(false)
    setCreated(res.temp_password ? { ...res.volunteer, temp_password: res.temp_password } : null)
    vols.reload()
    students.reload()
  }

  const list = vols.data || []
  return (
    <section id="panel-volunteers" role="tabpanel" aria-labelledby="tab-volunteers">
      <p className="muted" style={{ textAlign: 'center', maxWidth: 720, margin: '0 auto 1.2rem' }}>
        People working the farm over the summer, when no veterinary science classes are held. Volunteers help with
        feeder refills, special feedings and weights. Medications, vaccinations, temperatures and exams are done by a
        veterinarian with the instructor.
      </p>
      <TempPassword info={created} onClose={() => setCreated(null)} />
      <div style={{ textAlign: 'center', marginBottom: '1.2rem' }}>
        {!adding && <button className="btn" onClick={() => setAdding(true)}>+ Add volunteer</button>}
      </div>
      {adding && <VolunteerForm students={(students.data || []).filter((s) => !s.volunteer)} onCancel={() => setAdding(false)} onSaved={onAdded} />}
      <ErrorNote error={vols.error || error} />
      <div className={`table-wrap ${vols.loading ? 'loading' : ''}`}>
        <table>
          <thead><tr><th>Name</th><th>Type</th><th>Email</th><th>Phone</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/people/${p.id}`}>{p.name}</Link></td>
                <td>{p.role === 'student' ? <span className="pill neutral">Student volunteer</span> : <span className="pill active">Volunteer</span>}</td>
                <td>{p.email}</td><td>{p.phone || <span className="muted">—</span>}</td>
                <td><button className="link-btn" onClick={() => remove(p)}>Remove</button></td>
              </tr>
            ))}
            {!vols.loading && list.length === 0 && <tr><td colSpan={5} className="muted">No volunteers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function VolunteerForm({ students, onCancel, onSaved }) {
  const [kind, setKind] = useState('new')
  const [f, setF] = useState({ student: '', first_name: '', last_name: '', email: '', phone: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      const body = kind === 'student' ? { student: f.student, phone: f.phone } : { ...f, student: undefined }
      onSaved(await api('/api/volunteers/', { method: 'POST', body }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={save} style={{ marginBottom: '1.5rem' }}>
      <h3>Add volunteer</h3>
      <div className="segmented" role="group" aria-label="Volunteer type" style={{ marginBottom: '1rem' }}>
        <button type="button" aria-pressed={kind === 'new'} onClick={() => setKind('new')}>Not a student</button>
        <button type="button" aria-pressed={kind === 'student'} onClick={() => setKind('student')}>Current or past student</button>
      </div>
      <div className="form-grid">
        {kind === 'student' ? (
          <label className="wide">Student
            <select value={f.student} onChange={set('student')} required>
              <option value="">Choose a student…</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name} ({s.email})</option>)}
            </select>
          </label>
        ) : (
          <>
            <label>First name<input value={f.first_name} onChange={set('first_name')} required /></label>
            <label>Last name<input value={f.last_name} onChange={set('last_name')} required /></label>
            <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
          </>
        )}
        <label>Phone (optional)<input type="tel" value={f.phone} onChange={set('phone')} /></label>
      </div>
      <ErrorNote error={error} />
      <div className="form-actions">
        <button className="btn" type="submit" disabled={busy}>Add volunteer</button>
        <button className="btn secondary" type="button" onClick={onCancel}>Cancel</button>
        {kind === 'new' && <span className="hint">A login is created for them with a temporary password.</span>}
      </div>
    </form>
  )
}
