import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorNote, Pager } from '../components/bits'
import { DutyTable } from '../components/duties'
import { useAuth } from '../lib/auth'
import { speciesByGroup } from '../lib/farm'
import { seasonOf, TASKS } from '../lib/duties'
import { useApi } from '../lib/useApi'
import './Classroom.css'

const PAGE = 25

/** Every duty assigned for one animal: who did it, when, and whether it was done. */
export default function AnimalCare() {
  const { group, slug } = useParams()
  const { isInstructor } = useAuth()
  const sp = speciesByGroup[group]
  const { data, error, loading } = useApi(sp ? `/api/animals/${slug}/care/` : null)
  const [f, setF] = useState({ task: '', status: '', season: '', role: '' })
  const [page, setPage] = useState(1)
  const set = (k) => (e) => { setF((p) => ({ ...p, [k]: e.target.value })); setPage(1) }

  if (!sp) return <Navigate to="/catalog" replace />

  const rows = (data?.assignments || []).filter((a) =>
    (!f.task || a.task === f.task) && (!f.status || a.status === f.status) &&
    (!f.season || seasonOf(a.due_date) === f.season) && (!f.role || a.assignee_role === f.role))
  const pages = Math.max(1, Math.ceil(rows.length / PAGE))
  const isDefault = Object.values(f).every((v) => !v)

  return (
    <>
      <Link className="back arrow-link" to={`/catalog/${group}#${slug}`}>← Back to {data?.animal || 'animal'} in {sp.label}</Link>
      <h1>{data?.animal || '…'}: Care History</h1>
      <p className="tagline">
        Duties assigned for this animal, who did them and when.{' '}
        <Link className="arrow-link" to={`/catalog/${group}/${slug}/weights`}>See weights →</Link>
      </p>
      <div className="filters" role="group" aria-label="Care history filters">
        <label>Task
          <select value={f.task} onChange={set('task')}>
            <option value="">All tasks</option>
            {Object.entries(TASKS).filter(([k]) => k !== 'refill_feeder').map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
          </select>
        </label>
        <label>Done by
          <select value={f.role} onChange={set('role')}>
            <option value="">Anyone</option><option value="student">Students</option>
            <option value="volunteer">Volunteers</option><option value="instructor">Instructor &amp; vet</option>
          </select>
        </label>
        <label>Season
          <select value={f.season} onChange={set('season')}>
            <option value="">All seasons</option><option value="spring">Spring semester</option>
            <option value="summer">Summer</option><option value="fall">Fall semester</option>
          </select>
        </label>
        <label>Status
          <select value={f.status} onChange={set('status')}>
            <option value="">Any status</option><option value="completed">Done</option>
            <option value="scheduled">Scheduled</option><option value="overdue">Missed</option>
          </select>
        </label>
        <button className="link-btn" disabled={isDefault} onClick={() => { setF({ task: '', status: '', season: '', role: '' }); setPage(1) }}>Clear filters</button>
      </div>
      <ErrorNote error={error} />
      <div className={loading ? 'loading' : ''}>
        <DutyTable rows={rows.slice((page - 1) * PAGE, page * PAGE)} show={['person', 'done']} linkPeople={isInstructor}
          empty="No duties match these filters." />
      </div>
      <Pager page={page} pages={pages} onPage={setPage} total={rows.length} />
    </>
  )
}
