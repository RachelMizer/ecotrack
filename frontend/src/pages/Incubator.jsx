import { Link } from 'react-router-dom'
import { ErrorNote, GroupTabs } from '../components/bits'
import { formatDate } from '../lib/farm'
import { useApi } from '../lib/useApi'
import './Catalog.css'

// Shell swatches for the egg icon; the label is always shown next to it.
const SHELL_HEX = {
  white: '#f7f4ee', cream: '#efe3c8', light_brown: '#d9b48a', brown: '#b07a4f', dark_brown: '#7d4a2c',
}
const CANDLING_PILL = { developing: 'good', not_candled: 'neutral', unclear: 'warning', clear: 'critical' }
const CANDLING_ICON = { developing: '●', not_candled: '◷', unclear: '◆', clear: '▲' }

export default function Incubator() {
  const { data, error, loading } = useApi('/api/incubators/')
  return (
    <>
      <h1>Incubator</h1>
      <GroupTabs />
      <ErrorNote error={error} />
      <div className={loading ? 'loading' : ''}>
        {(data || []).map((inc) => <IncubatorPanel key={inc.id} inc={inc} />)}
      </div>
    </>
  )
}

function IncubatorPanel({ inc }) {
  const bySlot = Object.fromEntries(inc.eggs.map((e) => [e.slot, e]))
  const slots = Array.from({ length: inc.capacity }, (_, i) => i + 1)
  const nextHatch = inc.eggs.map((e) => e.projected_hatch).sort()[0]
  return (
    <section style={{ marginBottom: '2rem' }}>
      <div className="incubator-summary">
        <h2>{inc.name}</h2>
        <span><span className="muted small">Location</span> {inc.zone}</span>
        <span><span className="muted small">Eggs</span> {inc.eggs.length} of {inc.capacity}</span>
        <span><span className="muted small">Temperature</span> {Number(inc.temp_f).toFixed(1)} °F</span>
        <span><span className="muted small">Humidity</span> {inc.humidity_pct}%</span>
        <span><span className="muted small">Next hatch</span> {formatDate(nextHatch)}</span>
      </div>
      {inc.notes && <p className="small muted" style={{ marginTop: '-.6rem' }}>{inc.notes}</p>}
      <div className="egg-grid">
        {slots.map((n) => bySlot[n]
          ? <EggCard key={n} egg={bySlot[n]} inc={inc} />
          : <div key={n} className="egg-card empty">Slot {n}: empty</div>)}
      </div>
    </section>
  )
}

function EggCard({ egg, inc }) {
  const day = egg.days_incubating
  const toHatch = inc.incubation_days - day
  const stage = day >= inc.incubation_days ? ['warning', '◆ Hatch due'] : day >= inc.lockdown_day ? ['active', '● Lockdown'] : null
  return (
    <article className="egg-card">
      <div className="head">
        <span className="egg-shape" style={{ background: SHELL_HEX[egg.color] }} aria-hidden="true" />
        <span className="slot">Slot {egg.slot}</span>
        {stage && <span className={`pill ${stage[0]}`}>{stage[1]}</span>}
        <span className={`pill ${CANDLING_PILL[egg.candling]}`}>{CANDLING_ICON[egg.candling]} {egg.candling_label}</span>
      </div>
      <dl className="stats">
        <Stat label="Laid by">
          <Link to={`/catalog/chickens#${egg.hen_slug}`}>{egg.hen}</Link>
          <div className="muted small">{egg.hen_breed}, {egg.hen_zone}</div>
        </Stat>
        <Stat label="Color">{egg.color_label}</Stat>
        <Stat label="Size">{egg.size_label} <span className="muted small">({Number(egg.weight_g).toFixed(1)} g)</span></Stat>
        <Stat label="Shell">{egg.shell || '—'}</Stat>
        <Stat label="Laid">{formatDate(egg.laid_date)}</Stat>
        <Stat label="Set in incubator">{formatDate(egg.set_date)}</Stat>
        <Stat label="Time in incubator">{day} day{day === 1 ? '' : 's'} <span className="muted small">(of {inc.incubation_days})</span></Stat>
        <Stat label="Projected hatch">
          {formatDate(egg.projected_hatch)}
          <div className="muted small">{toHatch > 0 ? `in ${toHatch} day${toHatch === 1 ? '' : 's'}` : toHatch === 0 ? 'today' : `${-toHatch} days overdue`}</div>
        </Stat>
        <Stat label="Last checked">{formatDate(egg.last_checked)} <span className="muted small">({ago(egg.last_checked)})</span></Stat>
      </dl>
      {egg.notes && <p className="small muted notes">{egg.notes}</p>}
    </article>
  )
}

function Stat({ label, children }) {
  return <div><dt>{label}</dt><dd>{children}</dd></div>
}

function ago(iso) {
  const days = Math.round((Date.now() - new Date(iso + 'T00:00:00').getTime()) / 86400000)
  return days <= 0 ? 'today' : days === 1 ? 'yesterday' : `${days} days ago`
}
