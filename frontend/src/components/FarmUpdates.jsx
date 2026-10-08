import { useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../lib/auth'
import { formatStamp } from '../lib/duties'
import { useApi } from '../lib/useApi'
import { ErrorNote } from './bits'
import '../pages/Classroom.css'

/** Dashboard bulletin: the instructor's farm updates. Instructors can post and remove them. */
export default function FarmUpdates() {
  const { isInstructor } = useAuth()
  const { data, error, reload } = useApi('/api/updates/')
  const [all, setAll] = useState(false)
  const [posting, setPosting] = useState(false)
  const [f, setF] = useState({ title: '', body: '' })
  const [postError, setPostError] = useState(null)

  const post = async (e) => {
    e.preventDefault()
    setPostError(null)
    try {
      await api('/api/updates/', { method: 'POST', body: f })
      setF({ title: '', body: '' })
      setPosting(false)
      reload()
    } catch (err) {
      setPostError(err)
    }
  }

  const remove = async (u) => {
    if (!window.confirm(`Remove the update "${u.title}"?`)) return
    await api(`/api/updates/${u.id}/`, { method: 'DELETE' }).catch(setPostError)
    reload()
  }

  const updates = data || []
  if (!isInstructor && !updates.length) return null
  return (
    <section className="bulletin" aria-labelledby="farm-updates">
      <div className="bulletin-head">
        <h2 id="farm-updates">📌 Farm Updates</h2>
        {isInstructor && !posting && <button className="link-btn" onClick={() => setPosting(true)}>+ Post an update</button>}
      </div>
      {posting && (
        <form onSubmit={post} className="form-grid" style={{ margin: '.6rem 0' }}>
          <label className="wide">Title<input value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} required maxLength={120} /></label>
          <label className="wide">Details<textarea rows={2} value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} /></label>
          <div className="form-actions wide" style={{ marginTop: 0 }}>
            <button className="btn" type="submit">Post</button>
            <button className="btn secondary" type="button" onClick={() => setPosting(false)}>Cancel</button>
          </div>
        </form>
      )}
      <ErrorNote error={error || postError} />
      <ul>
        {updates.slice(0, all ? undefined : 2).map((u) => (
          <li key={u.id}>
            <b>{u.title}</b> <span className="muted small">· {u.author}, {formatStamp(u.created_at)}</span>
            {isInstructor && <button className="link-btn" style={{ marginLeft: '.6rem', padding: 0 }} onClick={() => remove(u)}>Remove</button>}
            {u.body && <p>{u.body}</p>}
          </li>
        ))}
        {!updates.length && <li className="muted small">No updates yet.</li>}
      </ul>
      {updates.length > 2 && <button className="link-btn" onClick={() => setAll((v) => !v)}>{all ? 'Show fewer' : `Show all ${updates.length}`}</button>}
    </section>
  )
}
