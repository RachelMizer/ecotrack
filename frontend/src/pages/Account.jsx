import { useEffect, useState } from 'react'
import { ErrorNote } from '../components/bits'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { termLabel } from '../lib/duties'
import { formatDate } from '../lib/farm'
import { useApi } from '../lib/useApi'
import './Classroom.css'

const BASE_FIELDS = [
  ['first_name', 'First name'], ['last_name', 'Last name'], ['email', 'Email', 'email'], ['phone', 'Phone', 'tel'],
  ['farm_name', 'Farm name'], ['farm_address', 'Farm address'],
]
// Shown to the instructor's students and volunteers.
const INSTRUCTOR_FIELDS = [
  ['office_location', 'Office location'], ['office_hours', 'Office hours'], ['message', 'Message to students', 'textarea'],
]

function fmt(ts) {
  return ts ? new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

export default function Account() {
  const { user, setUser } = useAuth()
  const [form, setForm] = useState(null)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState(null)
  const [saved, setSaved] = useState(false)
  const isInstructor = user?.role === 'instructor'
  const fields = isInstructor ? [...BASE_FIELDS, ...INSTRUCTOR_FIELDS] : BASE_FIELDS
  const reset = () => setForm(Object.fromEntries(fields.map(([k]) => [k, user[k] || ''])))

  useEffect(() => { api('/api/account/').then(setUser).catch(setError) }, [setUser])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (user) reset() }, [user])

  const save = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const updated = await api('/api/account/', { method: 'PATCH', body: form })
      setUser(updated)
      setEditing(false)
      setSaved(true)
    } catch (err) {
      setError(err)
    }
  }

  if (!user || !form) return <><h1>Account</h1><ErrorNote error={error} /></>

  const roleLabel = user.role_label + (user.role === 'student' && user.volunteer ? ' · summer volunteer' : '')
  return (
    <>
      <h1>{isInstructor ? 'Instructor Account' : 'Account'}</h1>
      <p className="tagline">Signed in as <b>{user.username}</b></p>
      <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
        <form onSubmit={save}>
          <dl className="info-list">
            <dt>Username</dt><dd>{user.username}</dd>
            <dt>Role</dt><dd><span className="pill neutral">{roleLabel}</span></dd>
            {fields.map(([k, label, type]) => (
              <Row key={k} label={label} id={`f-${k}`}>
                {editing ? (
                  type === 'textarea'
                    ? <textarea id={`f-${k}`} rows={4} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ width: '100%' }} />
                    : <input id={`f-${k}`} type={type || 'text'} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ width: '100%' }} />
                ) : (user[k] ? <span style={{ whiteSpace: 'pre-line' }}>{user[k]}</span> : <span className="muted">Not set</span>)}
              </Row>
            ))}
            <dt>Member since</dt><dd>{fmt(user.date_joined)}</dd>
            <dt>Last login</dt><dd>{fmt(user.last_login)}</dd>
          </dl>
          <ErrorNote error={error} />
          <div className="form-actions">
            {editing ? (
              <>
                <button className="btn" type="submit">Save changes</button>
                <button className="btn secondary" type="button" onClick={() => { setEditing(false); reset() }}>Cancel</button>
              </>
            ) : (
              <button className="btn" type="button" onClick={() => { setEditing(true); setSaved(false) }}>Edit details</button>
            )}
            {saved && <span className="pill good" role="status">✓ Saved</span>}
          </div>
        </form>
        {isInstructor && <p className="hint" style={{ marginTop: '1rem' }}>Your office location, hours and message appear on your students' and volunteers' Account pages.</p>}
      </div>

      {!isInstructor && <MyClasses />}
      <PasswordForm />
    </>
  )
}

function Row({ label, id, children }) {
  return (
    <>
      <dt><label htmlFor={id}>{label}</label></dt>
      <dd>{children}</dd>
    </>
  )
}

/** Students and volunteers: their classes and instructor contact details. */
function MyClasses() {
  const { data, error } = useApi('/api/account/classes/')
  if (!data && !error) return null
  const cards = [
    ...(data?.classes || []).map((c) => ({ key: `c${c.id}`, title: `${c.name} · Section ${c.section}`, course: c, instructor: c.instructor_card })),
    ...(data?.volunteer_supervisor ? [{ key: 'vol', title: 'Summer volunteering', instructor: data.volunteer_supervisor }] : []),
  ]
  return (
    <>
      <h2>My Class &amp; Instructor</h2>
      <ErrorNote error={error} />
      {!cards.length && <p className="muted" style={{ textAlign: 'center' }}>You're not on a class roster yet. Your instructor adds you.</p>}
      <div className="grid cols-2" style={{ maxWidth: 1000, margin: '0 auto' }}>
        {cards.map(({ key, title, course, instructor }) => (
          <section key={key} className="card">
            <h3>{title}</h3>
            <dl className="info-list">
              {course && <><dt>Term</dt><dd>{termLabel(course)} · {formatDate(course.term_start)} – {formatDate(course.term_end)}</dd></>}
              {course?.description && <><dt>About</dt><dd>{course.description}</dd></>}
              <dt>Instructor</dt><dd><b>{instructor.name}</b></dd>
              <dt>Email</dt><dd><a href={`mailto:${instructor.email}`}>{instructor.email}</a></dd>
              {instructor.phone && <><dt>Phone</dt><dd>{instructor.phone}</dd></>}
              <dt>Office</dt><dd>{instructor.office_location || <span className="muted">Not set</span>}</dd>
              <dt>Office hours</dt><dd>{instructor.office_hours || <span className="muted">Not set</span>}</dd>
            </dl>
            {instructor.message && <p className="notice small" style={{ margin: '.8rem 0 0', whiteSpace: 'pre-line' }}>{instructor.message}</p>}
          </section>
        ))}
      </div>
    </>
  )
}

function PasswordForm() {
  const [open, setOpen] = useState(false)
  const [f, setF] = useState({ current_password: '', new_password: '', confirm: '' })
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)

  const save = async (e) => {
    e.preventDefault()
    setError(null)
    if (f.new_password !== f.confirm) { setError(new Error("The new passwords don't match.")); return }
    try {
      await api('/api/account/password/', { method: 'POST', body: { current_password: f.current_password, new_password: f.new_password } })
      setF({ current_password: '', new_password: '', confirm: '' })
      setOpen(false)
      setDone(true)
    } catch (err) {
      setError(err)
    }
  }

  return (
    <div style={{ maxWidth: 640, margin: '2rem auto 0', textAlign: 'center' }}>
      {done && <p className="pill good" role="status">✓ Password changed</p>}
      {!open ? (
        <button className="link-btn" onClick={() => { setOpen(true); setDone(false) }}>Change password</button>
      ) : (
        <form className="card" onSubmit={save} style={{ textAlign: 'left' }}>
          <h3>Change password</h3>
          <div className="form-grid">
            <label className="wide">Current password<input type="password" autoComplete="current-password" value={f.current_password} onChange={(e) => setF({ ...f, current_password: e.target.value })} required /></label>
            <label>New password<input type="password" autoComplete="new-password" value={f.new_password} onChange={(e) => setF({ ...f, new_password: e.target.value })} required minLength={8} /></label>
            <label>Confirm new password<input type="password" autoComplete="new-password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></label>
          </div>
          <ErrorNote error={error} />
          <div className="form-actions">
            <button className="btn" type="submit">Change password</button>
            <button className="btn secondary" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  )
}
