import {
  CartesianGrid, ReferenceArea, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis,
} from 'recharts'
import { Legend } from './bits'

/**
 * Scatter plot with one colored series per entity, a hover tooltip and a legend.
 * series: [{ key, label, color, points: [{ x, y, ...extra }] }]
 */
export default function ScatterPanel({
  title, series, xLabel, yLabel, xDomain, yDomain, xTicks, height = 320, band, renderTooltip,
  loading, emptyText = 'No readings match these filters.', yTickFormatter,
}) {
  const visible = series.filter((s) => s.points.length)
  return (
    <figure className={`chart-panel ${loading ? 'loading' : ''}`} style={{ margin: 0 }}>
      {title && <figcaption className="chart-title">{title}</figcaption>}
      <Legend items={visible.map((s) => ({ label: s.label, color: s.color }))} />
      {visible.length === 0 ? (
        <div className="chart-empty" style={{ height }}>{emptyText}</div>
      ) : (
        <ResponsiveContainer width="100%" height={height}>
          <ScatterChart margin={{ top: 10, right: 20, bottom: 30, left: 18 }}>
            <CartesianGrid stroke="#efe6e3" strokeDasharray="0" />
            {band && (
              <ReferenceArea y1={band[0]} y2={band[1]} fill="#6b8946" fillOpacity={0.1} stroke="none"
                label={{ value: band[2] || 'Normal range', position: 'insideTopRight', fill: '#3f6e2a', fontSize: 11 }} />
            )}
            <XAxis type="number" dataKey="x" domain={xDomain || ['auto', 'auto']} ticks={xTicks}
              tickLine={false} axisLine={{ stroke: '#7e5044', strokeWidth: 3 }} interval={0}
              label={{ value: xLabel, position: 'bottom', offset: 12 }} allowDecimals={false} />
            <YAxis type="number" dataKey="y" domain={yDomain || ['auto', 'auto']} tickFormatter={yTickFormatter}
              tickLine={false} axisLine={{ stroke: '#7e5044', strokeWidth: 3 }} width={52}
              label={{ value: yLabel, angle: -90, position: 'insideLeft', offset: -8, style: { textAnchor: 'middle' } }} />
            <ZAxis range={[64, 64]} />
            <Tooltip cursor={{ stroke: '#a98c85', strokeDasharray: '3 3' }}
              content={({ active, payload }) => active && payload?.length ? renderTooltip(payload[0].payload) : null} />
            {visible.map((s) => (
              <Scatter key={s.key} name={s.label} data={s.points} fill={s.color} stroke="#fffdf9" strokeWidth={1.5}
                isAnimationActive={false} />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      )}
    </figure>
  )
}
