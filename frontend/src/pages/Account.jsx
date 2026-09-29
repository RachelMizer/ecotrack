import { useEffect, useState } from 'react'
import { ErrorNote } from '../components/bits'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'

const FIELDS = [
  ['first_name', 'First name'], ['last_name', 'Last name'], ['email', 'Email', 'email'],
  ['phone', 'Phone'], ['farm_name', 'Farm name'], ['role', 'Role'], ['farm_address', 'Farm address'],
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

  useEffect(() => { api('/api/account/').then(setUser).catch(setError) }, [setUser])
  useEffect(() => { if (user) setForm(Object.fromEntries(FIELDS.map(([k]) => [k, user[k] || '']))) }, [user])

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

  return (
    <>
      <h1>Account</h1>
      <p className="tagline">Signed in as <b>{user.username}</b></p>
      <div className="card" style={{ maxWidth: 640, margin: '0 auto' }}>
        <form onSubmit={save}>
          <dl className="acct-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(120px, 180px) 1fr', gap: '.7rem 1rem', margin: 0 }}>
            <dt className="sub small">Username</dt><dd style={{ margin: 0 }}>{user.username}</dd>
            {FIELDS.map(([k, label, type]) => (
              <Row key={k} label={label} id={`f-${k}`}>
                {editing ? (
                  <input id={`f-${k}`} type={type || 'text'} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} style={{ width: '100%' }} />
                ) : (user[k] || <span className="muted">Not set</span>)}
              </Row>
            ))}
            <dt className="sub small">Member since</dt><dd style={{ margin: 0 }}>{fmt(user.date_joined)}</dd>
            <dt className="sub small">Last login</dt><dd style={{ margin: 0 }}>{fmt(user.last_login)}</dd>
          </dl>
          <ErrorNote error={error} />
          <div style={{ display: 'flex', gap: '.6rem', marginTop: '1.2rem', alignItems: 'center' }}>
            {editing ? (
              <>
                <button className="btn" type="submit">Save changes</button>
                <button className="btn secondary" type="button" onClick={() => { setEditing(false); setForm(Object.fromEntries(FIELDS.map(([k]) => [k, user[k] || '']))) }}>Cancel</button>
              </>
            ) : (
              <button className="btn" type="button" onClick={() => { setEditing(true); setSaved(false) }}>Edit details</button>
            )}
            {saved && <span className="pill good" role="status">✓ Saved</span>}
          </div>
        </form>
      </div>
    </>
  )
}

function Row({ label, id, children }) {
  return (
    <>
      <dt className="sub small"><label htmlFor={id}>{label}</label></dt>
      <dd style={{ margin: 0 }}>{children}</dd>
    </>
  )
}
