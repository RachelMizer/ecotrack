import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { ErrorNote, Pager } from '../components/bits'
import ScatterPanel from '../components/ScatterPanel'
import { formatAge, formatDate, formatWeight, speciesByGroup, tempRange, tempStatus } from '../lib/farm'
import { useApi } from '../lib/useApi'

const PAGE = 25
const STATUS_PILL = { fever: 'critical', elevated: 'critical', low: 'warning', normal: 'good' }
const STATUS_ICON = { fever: '▲', elevated: '▲', low: '▼', normal: '●' }

export default function AnimalRecords() {
  const { group, slug, kind } = useParams()
  const sp = speciesByGroup[group]
  const isTemp = kind === 'temperatures'
  const valid = sp && (kind === 'weights' || isTemp)
  const { data, error, loading } = useApi(valid ? `/api/animals/${slug}/${kind}/` : null)

  const [start, setStart] = useState('')
  const [end, setEnd] = useState('')
  const [min, setMin] = useState('')
  const [max, setMax] = useState('')
  const [flag, setFlag] = useState('')
  const [order, setOrder] = useState('desc')
  const [page, setPage] = useState(1)

  const rows = useMemo(() => {
    if (!data) return []
    const birth = new Date(data.birth_date + 'T00:00:00')
    return data.records.map((r, i, all) => {
      const age = Math.round((new Date(r.date + 'T00:00:00') - birth) / 86400000)
      const prev = all[i - 1]
      return {
        ...r, age,
        change: prev ? r.value - prev.value : null,
        status: isTemp ? tempStatus(data.species, age, r.value) : null,
      }
    })
  }, [data, isTemp])

  if (!valid) return <Navigate to="/catalog" replace />

  const filtered = rows.filter((r) =>
    (!start || r.date >= start) && (!end || r.date <= end) &&
    (min === '' || r.value >= Number(min)) && (max === '' || r.value <= Number(max)) &&
    (!flag || (flag === 'abnormal' ? r.status !== 'normal' : r.status === flag)))
  const sorted = order === 'desc' ? filtered.slice().reverse() : filtered
  const pages = Math.max(1, Math.ceil(sorted.length / PAGE))
  const pageRows = sorted.slice((page - 1) * PAGE, page * PAGE)
  const hasFilters = start || end || min !== '' || max !== '' || flag
  const clear = () => { setStart(''); setEnd(''); setMin(''); setMax(''); setFlag(''); setPage(1) }
  const upd = (fn) => (e) => { fn(e.target.value); setPage(1) }

  const unit = isTemp ? '°F' : 'lb'
  const fmt = (v) => (isTemp ? `${v.toFixed(1)} °F` : formatWeight(v))
  const lastAge = rows.at(-1)?.age
  const band = isTemp && data ? [...tempRange(data.species, lastAge), 'Current normal range'] : null
  const t0 = data ? new Date(data.birth_date + 'T00:00:00').getTime() : 0

  return (
    <>
      <Link className="back arrow-link" to={`/catalog/${group}#${slug}`}>← Back to {data?.animal || 'animal'} in {sp.label}</Link>
      <h1>{data?.animal || '…'}: {isTemp ? 'Temperature' : 'Weight'} Records</h1>
      <p className="tagline">
        {isTemp ? 'Core body temperature, taken every two days since birth.' : 'Weighed weekly since birth / hatching.'}
        {' '}<Link className="arrow-link" to={`/catalog/${group}/${slug}/${isTemp ? 'weights' : 'temperatures'}`}>
          See {isTemp ? 'weights' : 'temperatures'} →</Link>
      </p>

      <div className="filters" role="group" aria-label="Record filters">
        <label>From<input type="date" value={start} onChange={upd(setStart)} /></label>
        <label>To<input type="date" value={end} onChange={upd(setEnd)} /></label>
        <label>Min ({unit})<input type="number" step="any" value={min} onChange={upd(setMin)} style={{ width: 90 }} /></label>
        <label>Max ({unit})<input type="number" step="any" value={max} onChange={upd(setMax)} style={{ width: 90 }} /></label>
        {isTemp && (
          <label>Reading
            <select value={flag} onChange={upd(setFlag)}>
              <option value="">All readings</option>
              <option value="abnormal">Outside normal range</option>
              <option value="fever">Fever</option>
              <option value="elevated">Elevated</option>
              <option value="low">Low</option>
              <option value="normal">Normal</option>
            </select>
          </label>
        )}
        <label>Order
          <select value={order} onChange={upd(setOrder)}>
            <option value="desc">Newest first</option><option value="asc">Oldest first</option>
          </select>
        </label>
        <button className="link-btn" onClick={clear} disabled={!hasFilters}>Clear filters</button>
      </div>

      <ErrorNote error={error} />
      <ScatterPanel
        series={[{ key: 'v', label: data?.animal || '', color: sp.hex,
          points: filtered.map((r) => ({ ...r, x: (new Date(r.date + 'T00:00:00').getTime() - t0) / 86400000, y: r.value })) }]}
        xLabel="Age (days)" xDomain={[0, 'dataMax']} yLabel={isTemp ? 'Temperature (°F)' : 'Weight (lb)'} height={260} band={band} loading={loading}
        yDomain={isTemp ? [(v) => Math.floor(Math.min(v, band?.[0] ?? v) - 1), (v) => Math.ceil(Math.max(v, band?.[1] ?? v) + 1)] : [0, 'auto']}
        renderTooltip={(p) => (
          <div className="tooltip"><strong>{fmt(p.value)}</strong>
            <div className="muted small">{formatDate(p.date)} · age {formatAge(p.age)}</div></div>
        )}
      />

      <div className="table-wrap" style={{ marginTop: '1rem' }}>
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Age</th><th className="num">{isTemp ? 'Temperature' : 'Weight'}</th>
              <th className="num">Change</th>{isTemp && <th>Status</th>}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.date}>
                <td>{formatDate(r.date)}</td>
                <td>{formatAge(r.age)}</td>
                <td className="num">{fmt(r.value)}</td>
                <td className="num muted">{r.change == null ? '—' : `${r.change > 0 ? '+' : ''}${r.change.toFixed(isTemp ? 1 : 2)}`}</td>
                {isTemp && <td><span className={`pill ${STATUS_PILL[r.status]}`}>{STATUS_ICON[r.status]} {r.status}</span></td>}
              </tr>
            ))}
            {!loading && pageRows.length === 0 && <tr><td colSpan={5} className="muted">No records match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
      <Pager page={page} pages={pages} onPage={setPage} total={sorted.length} />
    </>
  )
}
