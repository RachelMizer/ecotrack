// Farm duties an instructor assigns to students and volunteers.
import { speciesByKey, toISO } from './farm'

// `volunteer`: volunteers can help with it. The rest are done by a veterinarian with
// the instructor during the summer, when no classes are in session.
export const TASKS = {
  refill_feeder: { label: 'Refill feeder', icon: '🌾', volunteer: true },
  special_feeding: { label: 'Special feeding', icon: '🥣', volunteer: true },
  medication: { label: 'Administer medication', icon: '💊' },
  vaccination: { label: 'Administer vaccination', icon: '💉' },
  weights: { label: 'Take weights', icon: '⚖', volunteer: true },
  temperatures: { label: 'Take temperatures', icon: '🌡' },
  routine_exam: { label: 'Routine examination', icon: '🩺' },
  special_exam: { label: 'Special examination', icon: '🔎' },
}

export const STATUS = {
  completed: { cls: 'completed', icon: '✓', label: 'Done' },
  scheduled: { cls: 'scheduled', icon: '◷', label: 'Scheduled' },
  overdue: { cls: 'critical', icon: '▲', label: 'Missed' },
}

const SEASON_LABEL = { spring: 'Spring', summer: 'Summer', fall: 'Fall' }

export function termLabel(c) {
  return `${SEASON_LABEL[c.season]} ${c.term_start.slice(0, 4)}`
}

/** 16 weeks after a start date: the default semester length. */
export function sixteenWeeks(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-').map(Number)
  return toISO(new Date(y, m - 1, d + 16 * 7))
}

/** Split assignments into the upcoming schedule and the fulfillment history (done or missed). */
export function splitDuties(rows) {
  const open = rows.filter((a) => a.status === 'scheduled')
  const history = rows.filter((a) => a.status !== 'scheduled').sort((a, b) => b.due_date.localeCompare(a.due_date))
  return { open, history }
}

/** Summer (June 1 to August 15) is volunteer season; spring and fall are class terms. Matches season_of in models.py. */
export function seasonOf(iso) {
  const m = Number(String(iso).slice(5, 7))
  const d = Number(String(iso).slice(8, 10))
  if (m === 6 || m === 7 || (m === 8 && d <= 15)) return 'summer'
  return m < 6 ? 'spring' : 'fall'
}

/** Where a task happens: the animal's catalog card or the feeder on the Nutrition page. */
export function taskLink(a) {
  if (a.feeder) return `/nutrition#feeder-${a.feeder}`
  const sp = speciesByKey[a.animal_species]
  return sp ? `/catalog/${sp.group}#${a.animal}` : null
}

export function taskTarget(a) {
  return a.feeder_name ? `${a.feeder_name}${a.feeder_zone ? ` (${a.feeder_zone})` : ''}` : a.animal_name
}

export function formatTime(hms) {
  if (!hms) return ''
  const [h, m] = hms.split(':').map(Number)
  return new Date(2000, 0, 1, h, m).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function formatStamp(ts) {
  return ts ? new Date(ts).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : '—'
}
