import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorNote } from '../components/bits'
import { TempPassword } from '../components/duties'
import { api } from '../lib/api'
import { formatDate } from '../lib/farm'
import { useApi } from '../lib/useApi'
import { termLabel } from '../lib/duties'
import { ClassForm } from './Classes'
import './Classroom.css'

export default function ClassDetail() {
  const { id } = useParams()
  const { data: c, error, loading, reload } = useApi(`/api/classes/${id}/`)
  const [editing, setEditing] = useState(false)
  const [adding, setAdding] = useState(false)
  const [created, setCreated] = useState(null)
  const [actionError, setActionError] = useState(null)

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.name} from this roster? Their account and task history stay.`)) return
    try {
      await api(`/api/classes/${id}/students/${s.id}/`, { method: 'DELETE' })
      reload()
    } catch (err) {
      setActionError(err)
    }
  }

  return (
    <>
      <Link className="back arrow-link" to="/classes">← Back to classes</Link>
      <h1>{c ? `${c.name} · Section ${c.section}` : '…'}</h1>
      {c && <p className="tagline">{termLabel(c)} · {formatDate(c.term_start)} – {formatDate(c.term_end)}</p>}
      <ErrorNote error={error || actionError} />

      {c && (editing ? (
        <ClassForm course={c} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); reload() }} />
      ) : (
        <div className="card" style={{ maxWidth: 760, margin: '0 auto 1.5rem' }}>
          <dl className="info-list">
            <dt>Class</dt><dd>{c.name}</dd>
            <dt>Section</dt><dd>{c.section}</dd>
            <dt>Term</dt><dd>{formatDate(c.term_start)} – {formatDate(c.term_end)}</dd>
            <dt>Instructor</dt><dd>{c.instructor}</dd>
            <dt>Description</dt><dd>{c.description || <span className="muted">None</span>}</dd>
          </dl>
          <div className="form-actions"><button className="btn secondary" onClick={() => setEditing(true)}>Edit class</button></div>
        </div>
      ))}

      {c && <>
      <h2>Roster</h2>
      <TempPassword info={created} onClose={() => setCreated(null)} />
      <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
        {!adding && <button className="btn" onClick={() => setAdding(true)}>+ Add student</button>}
      </div>
      {adding && (
        <StudentForm classId={id} onCancel={() => setAdding(false)}
          onSaved={(res) => {
            setAdding(false)
            setCreated(res.temp_password ? { ...res.student, temp_password: res.temp_password } : null)
            reload()
          }} />
      )}
      <div className={`table-wrap ${loading ? 'loading' : ''}`}>
        <table>
          <thead><tr><th>Student</th><th>Email</th><th>Last login</th><th><span className="visually-hidden">Actions</span></th></tr></thead>
          <tbody>
            {(c?.students || []).slice().sort((a, b) => a.last_name.localeCompare(b.last_name)).map((s) => (
              <tr key={s.id}>
                <td><Link to={`/people/${s.id}`}>{s.last_name}, {s.first_name}</Link>
                  {s.volunteer && <span className="pill neutral" style={{ marginLeft: 6 }}>Volunteer</span>}</td>
                <td>{s.email}</td>
                <td className="small">{s.last_login ? formatDate(s.last_login.slice(0, 10)) : <span className="muted">Never</span>}</td>
                <td><button className="link-btn" onClick={() => remove(s)}>Remove</button></td>
              </tr>
            ))}
            {c && c.students.length === 0 && (
              <tr><td colSpan={4} className="muted">No roster yet. Add the first student to create it.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      </>}
    </>
  )
}

function StudentForm({ classId, onCancel, onSaved }) {
  const [f, setF] = useState({ first_name: '', last_name: '', email: '' })
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const save = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      onSaved(await api(`/api/classes/${classId}/students/`, { method: 'POST', body: f }))
    } catch (err) {
      setError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="card" onSubmit={save} style={{ marginBottom: '1.5rem' }}>
      <h3>Add student</h3>
      <div className="form-grid">
        <label>First name<input value={f.first_name} onChange={set('first_name')} required /></label>
        <label>Last name<input value={f.last_name} onChange={set('last_name')} required /></label>
        <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
      </div>
      <ErrorNote error={error} />
      <div className="form-actions">
        <button className="btn" type="submit" disabled={busy}>Add to roster</button>
        <button className="btn secondary" type="button" onClick={onCancel}>Cancel</button>
        <span className="hint">New students get a login with a temporary password. A student who already has an account is just added to this class.</span>
      </div>
    </form>
  )
}
