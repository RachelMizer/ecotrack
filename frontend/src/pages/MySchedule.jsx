import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ErrorNote } from '../components/bits'
import { DutyStatus, DutyTable, TargetLink, TaskName } from '../components/duties'
import { api } from '../lib/api'
import { formatDate, toISO } from '../lib/farm'
import { formatStamp, formatTime, taskLink } from '../lib/duties'
import { useApi } from '../lib/useApi'
import './Classroom.css'

const READING = { weights: { label: 'Weight (lb)', step: '0.01' }, temperatures: { label: 'Temp (°F)', step: '0.1' } }

export default function MySchedule() {
  const { data, error, loading, reload } = useApi('/api/assignments/')
  const today = toISO(new Date())
  const rows = data || []
  const recent = toISO(new Date(Date.now() - 14 * 86400000))
  const overdue = rows.filter((a) => a.status === 'overdue' && a.due_date >= recent) // last two weeks
  const open = rows.filter((a) => a.status === 'scheduled')
  const days = [...new Set(open.map((a) => a.due_date))].sort()
  const done = rows.filter((a) => a.status === 'completed').sort((a, b) => b.completed_at.localeCompare(a.completed_at))

  return (
    <>
      <h1>My Schedule</h1>
      <p className="tagline">Your farm duties. Open a task to go to the animal or feeder, and mark it complete when you finish.</p>
      <ErrorNote error={error} />

      <div className={loading ? 'loading' : ''}>
        {overdue.length > 0 && (
          <>
            <h3 className="day-head" style={{ color: 'var(--critical)' }}>▲ Missed ({overdue.length})</h3>
            <ul className="duty-list">{overdue.map((a) => <Duty key={a.id} a={a} onDone={reload} showDate />)}</ul>
          </>
        )}
        {days.map((d) => (
          <section key={d}>
            <h3 className="day-head">{d === today ? 'Today' : formatDate(d, { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            <ul className="duty-list">{open.filter((a) => a.due_date === d).map((a) => <Duty key={a.id} a={a} onDone={reload} />)}</ul>
          </section>
        ))}
        {!loading && !overdue.length && !days.length && <p className="muted" style={{ textAlign: 'center' }}>You have no open tasks. Nice work!</p>}
      </div>

      <h2>Completed</h2>
      <DutyTable rows={done.slice(0, 50)} show={['target', 'done']} empty="Nothing completed yet."
        actions={(a) => (Date.now() - new Date(a.completed_at) < 86400000 ? <Undo a={a} onDone={reload} /> : null)} />
      {done.length > 50 && <p className="muted small">Showing your 50 most recent of {done.length} completed tasks.</p>}
    </>
  )
}

function Duty({ a, onDone, showDate }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [note, setNote] = useState('')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const reading = READING[a.task]

  const complete = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await api(`/api/assignments/${a.id}/complete/`, { method: 'POST', body: { value, note } })
      onDone()
    } catch (err) {
      setError(err)
      setBusy(false)
    }
  }

  return (
    <li className={`duty ${a.status}`}>
      <span className="duty-time tabular">{showDate ? formatDate(a.due_date, { month: 'short', day: 'numeric' }) : ''}{showDate && a.due_time ? <br /> : ''}{formatTime(a.due_time) || 'Any time'}</span>
      <div>
        <b><TaskName a={a} /></b> · <TargetLink a={a} />
        {a.treatment_name && <div className="small">{a.treatment_name}{a.treatment_dose && `: ${a.treatment_dose}`}</div>}
        {a.notes && !a.treatment_name && <div className="muted small">{a.notes}</div>}
        <div className="muted small">Assigned by {a.assigned_by || 'your instructor'}{taskLink(a) && <> · <Link className="arrow-link" to={taskLink(a)}>{a.feeder ? 'Go to feeder →' : 'Go to animal →'}</Link></>}</div>
      </div>
      <div className="duty-done">
        <DutyStatus status={a.status} />
        {!open ? (
          <button className="btn" onClick={() => setOpen(true)}>Mark complete</button>
        ) : (
          <form onSubmit={complete}>
            {reading && <input type="number" step={reading.step} value={value} onChange={(e) => setValue(e.target.value)} placeholder={reading.label} aria-label={`${reading.label} (optional)`} />}
            <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note (optional)" maxLength={300} />
            <button className="btn" type="submit" disabled={busy}>✓ Done</button>
            <button className="link-btn" type="button" onClick={() => setOpen(false)}>Cancel</button>
          </form>
        )}
        {open && reading && <span className="hint">Add the {a.task === 'weights' ? 'weight' : 'temperature'} to save it to the animal's records.</span>}
        <ErrorNote error={error} />
      </div>
    </li>
  )
}

function Undo({ a, onDone }) {
  const undo = async () => {
    if (!window.confirm(`Mark "${a.task_label}" for ${a.animal_name || a.feeder_name} as not done? (Completed ${formatStamp(a.completed_at)}.)`)) return
    await api(`/api/assignments/${a.id}/complete/`, { method: 'POST', body: { undo: true } })
    onDone()
  }
  return <button className="link-btn" onClick={undo}>Undo</button>
}
