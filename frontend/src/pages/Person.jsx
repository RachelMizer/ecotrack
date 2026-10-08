import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorNote, Pager } from '../components/bits'
import { DutyTable, TempPassword } from '../components/duties'
import { api } from '../lib/api'
import { formatDate } from '../lib/farm'
import { formatStamp, splitDuties, termLabel } from '../lib/duties'
import { useApi } from '../lib/useApi'
import './Classroom.css'

const FIELDS = [['first_name', 'First name'], ['last_name', 'Last name'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel']]

/** A student's or volunteer's page: details, responsibility schedule and fulfillment history. */
export default function Person() {
  const { id } = useParams()
  const { data: p, error, loading, reload } = useApi(`/api/people/${id}/`)
  const [form, setForm] = useState(null)
  const [saveError, setSaveError] = useState(null)
  const [reset, setReset] = useState(null)
  const [page, setPage] = useState(1)

  const save = async (e) => {
    e.preventDefault()
    setSaveError(null)
    try {
      await api(`/api/people/${id}/`, { method: 'PATCH', body: form })
      setForm(null)
      reload()
    } catch (err) {
      setSaveError(err)
    }
  }

  const resetPassword = async () => {
    if (!window.confirm(`Give ${p.name} a new temporary password? Their current password stops working.`)) return
    try {
      const res = await api(`/api/people/${id}/reset-password/`, { method: 'POST' })
      setReset({ name: p.name, ...res })
    } catch (err) {
      setSaveError(err)
    }
  }

  const { open, history } = splitDuties(p?.assignments || [])
  const done = history.filter((a) => a.status === 'completed').length
  const role = p?.role === 'volunteer' ? 'Volunteer' : p?.volunteer ? 'Student · summer volunteer' : 'Student'

  return (
    <>
      {p?.role === 'volunteer'
        ? <Link className="back arrow-link" to="/classes?tab=volunteers">← Back to volunteers</Link>
        : <Link className="back arrow-link" to="/classes">← Back to classes</Link>}
      <div className="person-head">
        <h1>{p?.name || '…'}</h1>
        {p && <span className="pill neutral">{role}</span>}
      </div>
      <ErrorNote error={error} />
      <TempPassword info={reset} onClose={() => setReset(null)} />

      {p && (
        <div className="card" style={{ maxWidth: 760, margin: '0 auto' }}>
          {form ? (
            <form onSubmit={save}>
              <div className="form-grid">
                {FIELDS.map(([k, label, type]) => (
                  <label key={k}>{label}
                    <input type={type || 'text'} value={form[k]} required={k !== 'phone'}
                      onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
                  </label>
                ))}
              </div>
              <ErrorNote error={saveError} />
              <div className="form-actions">
                <button className="btn" type="submit">Save changes</button>
                <button className="btn secondary" type="button" onClick={() => { setForm(null); setSaveError(null) }}>Cancel</button>
              </div>
            </form>
          ) : (
            <>
              <dl className="info-list">
                <dt>Name</dt><dd>{p.first_name} {p.last_name}</dd>
                <dt>Email</dt><dd><a href={`mailto:${p.email}`}>{p.email}</a></dd>
                <dt>Phone</dt><dd>{p.phone || <span className="muted">Not set</span>}</dd>
                <dt>Login</dt><dd>{p.username} <span className="muted small">· last login {p.last_login ? formatStamp(p.last_login) : 'never'}</span></dd>
                <dt>Classes</dt>
                <dd>
                  {p.classes.length ? p.classes.map((c) => (
                    <div key={c.id}><Link to={`/classes/${c.id}`}>{c.name} · Section {c.section}</Link> <span className="muted small">({termLabel(c)})</span></div>
                  )) : <span className="muted">None</span>}
                </dd>
                <dt>Tasks</dt><dd>{done} completed · {open.length} upcoming · {history.length - done} missed</dd>
              </dl>
              <ErrorNote error={saveError} />
              <div className="form-actions">
                <button className="btn secondary" onClick={() => setForm(Object.fromEntries(FIELDS.map(([k]) => [k, p[k] || ''])))}>Edit details</button>
                <button className="link-btn" onClick={resetPassword}>Reset password</button>
                <Link className="arrow-link small" to={`/assignments?assignee=${p.id}`}>Assign a task →</Link>
              </div>
            </>
          )}
        </div>
      )}

      <h2>Responsibility schedule</h2>
      <div className={loading ? 'loading' : ''}>
        <DutyTable rows={open} show={['target']} empty="No upcoming tasks." />
      </div>
      <p className="muted small">Due dates from today on. Tasks show as missed if the due date passes before they're marked done.</p>

      <h2>Fulfillment history</h2>
      <div className={loading ? 'loading' : ''}>
        <DutyTable rows={history.slice((page - 1) * 25, page * 25)} show={['target', 'done']} empty="No completed tasks yet." />
      </div>
      <Pager page={page} pages={Math.max(1, Math.ceil(history.length / 25))} onPage={setPage} total={history.length} />
      {history.length > 0 && <p className="muted small">Since {formatDate(history.at(-1).due_date)}.</p>}
    </>
  )
}
