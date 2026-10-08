import { Link } from 'react-router-dom'
import { formatDate } from '../lib/farm'
import { formatStamp, formatTime, STATUS, TASKS, taskLink, taskTarget } from '../lib/duties'

export function DutyStatus({ status }) {
  const s = STATUS[status] || STATUS.scheduled
  return <span className={`pill ${s.cls}`}>{s.icon} {s.label}</span>
}

export function TaskName({ a }) {
  const t = TASKS[a.task]
  return <span className="task-name"><span aria-hidden>{t?.icon}</span> {t?.label || a.task_label}</span>
}

export function TargetLink({ a }) {
  const to = taskLink(a)
  return to ? <Link to={to}>{taskTarget(a)}</Link> : <span>{taskTarget(a)}</span>
}

/** Who did (or will do) a task: name, role and, in summer, the veterinarian. */
export function Doer({ a, link = false }) {
  const role = a.assignee_role && (a.assignee_role[0].toUpperCase() + a.assignee_role.slice(1))
  return (
    <span>
      {link && a.assignee_role !== 'instructor' ? <Link to={`/people/${a.assignee}`}>{a.assignee_name}</Link> : a.assignee_name}
      {role && <span className="muted small"> · {role}</span>}
      {a.veterinarian && <div className="muted small">with {a.veterinarian}</div>}
    </span>
  )
}

export function When({ a }) {
  return <span className="tabular" style={{ whiteSpace: 'nowrap' }}>{formatDate(a.due_date)}{a.due_time && <span className="muted"> · {formatTime(a.due_time)}</span>}</span>
}

/**
 * Assignment table. `show` picks optional columns: target (animal / feeder), person, done (completion
 * timestamp). `actions` renders extra cells per row (e.g. delete for instructors).
 */
export function DutyTable({ rows, show = ['target', 'person', 'done'], actions, empty = 'Nothing here yet.', linkPeople }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Due</th><th>Task</th>{show.includes('target') && <th>Animal / feeder</th>}
            {show.includes('person') && <th>Assigned to</th>}<th>Status</th>{show.includes('done') && <th>Completed</th>}
            {actions && <th><span className="visually-hidden">Actions</span></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id}>
              <td><When a={a} /></td>
              <td>
                <TaskName a={a} />
                {(a.treatment_name || a.notes) && <div className="muted small">{a.treatment_name ? `${a.treatment_name}${a.treatment_dose ? `: ${a.treatment_dose}` : ''}` : a.notes}</div>}
              </td>
              {show.includes('target') && <td><TargetLink a={a} /></td>}
              {show.includes('person') && <td><Doer a={a} link={linkPeople} /></td>}
              <td><DutyStatus status={a.status} /></td>
              {show.includes('done') && (
                <td className="small">{a.completed_at ? formatStamp(a.completed_at) : '—'}
                  {a.completion_note && <div className="muted">“{a.completion_note}”</div>}</td>
              )}
              {actions && <td style={{ whiteSpace: 'nowrap' }}>{actions(a)}</td>}
            </tr>
          ))}
          {rows.length === 0 && <tr><td colSpan={8} className="muted">{empty}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}

/** Shown once after an account is created or its password reset. */
export function TempPassword({ info, onClose }) {
  if (!info?.temp_password) return null
  return (
    <div className="notice" role="status">
      <p style={{ margin: 0 }}>
        <b>{info.name}</b> can now log in with <b>{info.username}</b> and the temporary password{' '}
        <code className="temp-pass">{info.temp_password}</code>
      </p>
      <p className="small muted" style={{ margin: '.3rem 0 0' }}>
        Share it with them now: it won't be shown again. They can change it on their Account page.
      </p>
      <button className="link-btn" onClick={onClose}>Dismiss</button>
    </div>
  )
}
