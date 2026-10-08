import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ErrorNote, HealthPill, Legend } from '../components/bits'
import { formatDate, SPECIES, speciesByKey } from '../lib/farm'
import { useApi } from '../lib/useApi'
import './Tracker.css'

const FULL = { x: 0, y: 0, w: 1000, h: 650 }
const AREAS = {
  coops: { label: 'Coops', box: { x: 30, y: 30, w: 360, h: 275 } },
  pens: { label: 'Pens', box: { x: 30, y: 325, w: 360, h: 300 } },
  enclosures: { label: 'Enclosures', box: { x: 415, y: 25, w: 560, h: 605 } },
}

// Fit a box into the 1000x650 aspect ratio with a little padding.
function fit(box) {
  const pad = 12
  let { x, y, w, h } = { x: box.x - pad, y: box.y - pad, w: box.w + pad * 2, h: box.h + pad * 2 }
  const ratio = FULL.w / FULL.h
  if (w / h > ratio) { const nh = w / ratio; y -= (nh - h) / 2; h = nh } else { const nw = h * ratio; x -= (nw - w) / 2; w = nw }
  return { x, y, w, h }
}

function useAnimatedBox(target) {
  const [box, setBox] = useState(target)
  const from = useRef(target)
  useEffect(() => {
    const start = performance.now()
    const a = from.current
    let raf
    const step = (now) => {
      const t = Math.min(1, (now - start) / 450)
      const e = 1 - Math.pow(1 - t, 3)
      const b = { x: a.x + (target.x - a.x) * e, y: a.y + (target.y - a.y) * e, w: a.w + (target.w - a.w) * e, h: a.h + (target.h - a.h) * e }
      from.current = b
      setBox(b)
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target.x, target.y, target.w, target.h]) // eslint-disable-line react-hooks/exhaustive-deps
  return box
}

export default function Tracker() {
  const navigate = useNavigate()
  const [area, setArea] = useState('')
  const [hours, setHours] = useState(24)
  const [shown, setShown] = useState(() => new Set(SPECIES.map((s) => s.key)))
  const [hover, setHover] = useState(null)
  const wrap = useRef(null)
  const zones = useApi('/api/zones/')
  const tracking = useApi('/api/tracking/', { hours: Math.max(hours, 1) }, { refreshMs: 5000 })

  const target = area ? fit(AREAS[area].box) : FULL
  const box = useAnimatedBox(target)
  const scale = box.w / FULL.w // keeps dots and text the same on-screen size when zoomed

  const animals = (tracking.data?.animals || []).filter((a) => shown.has(a.species) && (!area || a.area === area))
  const toggle = (k) => setShown((prev) => {
    const next = new Set(prev)
    if (next.has(k)) next.delete(k)
    else next.add(k)
    return next
  })
  const isDefault = !area && hours === 24 && shown.size === SPECIES.length
  const clear = () => { setArea(''); setHours(24); setShown(new Set(SPECIES.map((s) => s.key))) }
  const goTo = (a) => navigate(`/catalog/${speciesByKey[a.species].group}#${a.slug}`)

  const onMove = (e, a) => {
    const r = wrap.current.getBoundingClientRect()
    setHover({ a, x: e.clientX - r.left, y: e.clientY - r.top })
  }

  return (
    <>
      <h1>Farm Tracker</h1>
      <p className="tagline">Live tracker positions and movement trails. Click an area to zoom in, or a dot to open that animal's profile.</p>

      <div className="filters" role="group" aria-label="Map controls">
        <div className="segmented" role="group" aria-label="Map area">
          <button aria-pressed={!area} onClick={() => setArea('')}>Whole farm</button>
          {Object.entries(AREAS).map(([k, v]) => (
            <button key={k} aria-pressed={area === k} onClick={() => setArea(k)}>{v.label}</button>
          ))}
        </div>
        <div className="segmented" role="group" aria-label="Trail length">
          {[0, 6, 24, 72].map((h) => (
            <button key={h} aria-pressed={hours === h} onClick={() => setHours(h)}>{h ? `${h}h trail` : 'No trail'}</button>
          ))}
        </div>
        <div className="species-toggles">
          {SPECIES.map((s) => (
            <label key={s.key} className="check">
              <input type="checkbox" checked={shown.has(s.key)} onChange={() => toggle(s.key)} />
              <i style={{ background: s.hex }} /> {s.label}
            </label>
          ))}
        </div>
        <button className="link-btn" onClick={clear} disabled={isDefault}>Clear filters</button>
      </div>

      <ErrorNote error={zones.error || tracking.error} />

      <div className={`map-wrap ${tracking.loading ? 'loading' : ''}`} ref={wrap} onMouseLeave={() => setHover(null)}>
        <svg viewBox={`${box.x} ${box.y} ${box.w} ${box.h}`} className="farm-map" role="img"
          aria-label="Farm map with animal positions">
          <defs>
            <pattern id="grass" width="14" height="14" patternUnits="userSpaceOnUse">
              <rect width="14" height="14" fill="#e3ead6" />
              <path d="M3 10 l1 -3 M9 5 l1 -3" stroke="#c9d6b5" strokeWidth="1" />
            </pattern>
            <pattern id="straw" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="8" height="8" fill="#f2e6cf" /><line x1="0" y1="0" x2="0" y2="8" stroke="#e5d3b0" strokeWidth="2" />
            </pattern>
          </defs>
          <rect x="-500" y="-500" width="2000" height="1650" fill="url(#grass)" />
          {/* farm lane */}
          <path d="M402 0 L402 650" stroke="#d8c8b2" strokeWidth="16" />
          <path d="M0 315 L402 315" stroke="#d8c8b2" strokeWidth="12" />
          {/* pond + trees (decoration) */}
          <ellipse cx="890" cy="235" rx="48" ry="26" fill="#bfdde2" stroke="#9cc6cd" />
          {[[330, 560], [355, 600], [310, 610], [980, 320], [20, 320]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="11" fill="#9cb67f" stroke="#86a268" />
          ))}

          {/* clickable area overlays */}
          {Object.entries(AREAS).map(([k, v]) => (
            <g key={k} className={`area ${area === k ? 'current' : ''}`} onClick={() => setArea(area === k ? '' : k)}
              role="button" tabIndex={0} aria-label={`Zoom to ${v.label}`}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setArea(area === k ? '' : k)}>
              <rect x={v.box.x} y={v.box.y} width={v.box.w} height={v.box.h} rx="6" />
              {!area && (
                // White tab sitting on the dashed border so the label reads over fences and trails.
                <g className="area-tag" pointerEvents="none">
                  <rect x={v.box.x + 12} y={v.box.y - 13} width={v.label.length * 12.5 + 22} height={26} rx="4" />
                  <text x={v.box.x + 23} y={v.box.y + 6} className="area-label" fontSize={16}>{v.label.toUpperCase()}</text>
                </g>
              )}
            </g>
          ))}

          {/* zones */}
          {(zones.data || []).map((z) => (
            <g key={z.slug} className={`zone ${z.kind}`} pointerEvents="none">
              {z.roam_x != null && z.kind !== 'pasture' && z.kind !== 'enclosure' && (
                <rect x={z.roam_x} y={z.roam_y} width={z.roam_width} height={z.roam_height} className="run" rx="3" />
              )}
              <rect x={z.x} y={z.y} width={z.width} height={z.height} rx="3"
                fill={z.kind === 'coop' || z.kind === 'brooder' || z.kind === 'barn' ? 'url(#straw)' : 'none'} />
            </g>
          ))}

          {/* trails */}
          {hours > 0 && animals.map((a) => (
            <polyline key={`t-${a.slug}`} points={a.track.map((p) => `${p[1]},${p[2]}`).join(' ')} fill="none"
              stroke={speciesByKey[a.species].hex} strokeOpacity={hover && hover.a.slug !== a.slug ? 0.12 : 0.45}
              strokeWidth={1.5 * scale} strokeLinejoin="round" pointerEvents="none" />
          ))}

          {/* zone name tags, drawn above trails so they stay readable */}
          {(zones.data || []).map((z) => {
            const fs = 11 * Math.max(scale, 0.55)
            const ty = z.kind === 'pasture' || z.kind === 'enclosure' ? z.y + z.height - 8 * scale : z.y - 5 * scale
            const w = z.name.length * fs * 0.56 + fs
            return (
              <g key={`tag-${z.slug}`} className="zone-tag" pointerEvents="none">
                <rect x={z.x + z.width / 2 - w / 2} y={ty - fs * 0.95} width={w} height={fs * 1.35} rx={fs * 0.3} />
                <text x={z.x + z.width / 2} y={ty} textAnchor="middle" fontSize={fs} className="zone-label">{z.name}</text>
              </g>
            )
          })}

          {/* current positions */}
          {animals.map((a) => {
            const [, x, y] = a.track[a.track.length - 1]
            const sp = speciesByKey[a.species]
            return (
              <g key={a.slug} className="dot" style={{ transform: `translate(${x}px, ${y}px)` }} onClick={() => goTo(a)} onMouseMove={(e) => onMove(e, a)}
                role="link" tabIndex={0} aria-label={`${a.name}, ${sp.single}, ${a.zone}. Open profile.`}
                onKeyDown={(e) => e.key === 'Enter' && goTo(a)}
                onFocus={() => setHover(null)}>
                <circle r={12 * scale} fill="transparent" />
                <circle r={5.5 * scale} fill={sp.hex} stroke="#fffdf9" strokeWidth={2 * scale} />
                {a.health_status === 'sick' && (
                  <circle r={9 * scale} fill="none" stroke="#b3261e" strokeWidth={1.5 * scale} strokeDasharray={`${3 * scale} ${2 * scale}`} />
                )}
                {area && (
                  <text x={8 * scale} y={4 * scale} fontSize={11 * scale} className="dot-label">{a.name}</text>
                )}
              </g>
            )
          })}
        </svg>
        {hover && (
          <div className="tooltip map-tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>
            <strong>{hover.a.name}</strong>
            <div>{hover.a.type_label} · {hover.a.zone}</div>
            <div className="muted small">Last fix {new Date(hover.a.track.at(-1)[0]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</div>
            {hover.a.health_status !== 'healthy' && <HealthPill status={hover.a.health_status} />}
          </div>
        )}
      </div>
      <Legend items={[...SPECIES.filter((s) => shown.has(s.key)).map((s) => ({ label: s.label, color: s.hex })),
        { label: 'Dashed red ring = sick', color: '#b3261e' }]} />
      {tracking.data?.latest && (
        <p className="muted small">Latest tracker sync: {formatDate(tracking.data.latest.slice(0, 10))}{' '}
          {new Date(tracking.data.latest).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' })}. Positions refresh every 5 seconds.</p>
      )}

      <h2>{area ? `Animals in the ${AREAS[area].label.toLowerCase()} area` : 'All tracked animals'}</h2>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Animal</th><th>Species</th><th>Location</th><th>Health</th><th>Last fix</th></tr></thead>
          <tbody>
            {animals.slice().sort((a, b) => a.zone.localeCompare(b.zone) || a.name.localeCompare(b.name)).map((a) => (
              <tr key={a.slug}>
                <td><Link to={`/catalog/${speciesByKey[a.species].group}#${a.slug}`}>{a.name}</Link></td>
                <td>{a.type_label}</td><td>{a.zone}</td><td><HealthPill status={a.health_status} /></td>
                <td className="tabular">{new Date(a.track.at(-1)[0]).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
