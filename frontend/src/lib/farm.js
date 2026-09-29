// Shared vocabulary for species, catalog groups and value formatting.

export const SPECIES = [
  { key: 'cow', group: 'cows', label: 'Cows', single: 'Cow', color: 'var(--cow)', hex: '#94472f' },
  { key: 'pig', group: 'pigs', label: 'Pigs', single: 'Pig', color: 'var(--pig)', hex: '#5b8a26' },
  { key: 'chicken', group: 'chickens', label: 'Chickens', single: 'Chicken', color: 'var(--chicken)', hex: '#008a9e' },
]

export const speciesByKey = Object.fromEntries(SPECIES.map((s) => [s.key, s]))
export const speciesByGroup = Object.fromEntries(SPECIES.map((s) => [s.group, s]))

// Normal core-temperature ranges (°F) from dev/animal data/*Info.txt.
export const NORMAL_TEMP = {
  chicken: { adult: [105, 107], young: [103.5, 107], youngDays: 21 },
  cow: { adult: [100.4, 102.8], young: [101, 103], youngDays: 180 },
  pig: { adult: [101, 103], young: [102, 104], youngDays: 60 },
}

export function tempRange(species, ageDays) {
  const r = NORMAL_TEMP[species]
  return ageDays != null && ageDays < r.youngDays ? r.young : r.adult
}

export function tempStatus(species, ageDays, value) {
  const [lo, hi] = tempRange(species, ageDays)
  if (value > hi + 1) return 'fever'
  if (value > hi) return 'elevated'
  if (value < lo - 0.5) return 'low'
  return 'normal'
}

export function formatAge(days) {
  if (days == null) return ''
  if (days < 60) return `${days} day${days === 1 ? '' : 's'}`
  const months = Math.floor(days / 30.44)
  if (months < 12) return `${months} months`
  const y = Math.floor(months / 12)
  const m = months % 12
  return `${y} yr${y > 1 ? 's' : ''}${m ? ` ${m} mo` : ''}`
}

export function formatWeight(lbs) {
  if (lbs == null) return '—'
  const n = Number(lbs)
  return n < 10 ? `${n.toFixed(2)} lb` : `${Math.round(n).toLocaleString()} lb`
}

export function formatDate(iso, opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, opts)
}

export function toISO(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export const HEALTH_LABEL = { healthy: '● Healthy', sick: '▲ Sick', recovering: '◆ Recovering' }
