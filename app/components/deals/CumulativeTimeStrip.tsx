// Cumulative time strip — two stacked lines:
//   • cumulative deal count
//   • cumulative disclosed spend ($M)
//
// Cumulative (not per-quarter) because at n=78 a histogram is noisy; the
// monotonic curve makes the inflection points readable.

import type { TimeSeriesData } from '@/lib/api/supply-chain-analytics'

interface Props {
  data: TimeSeriesData
}

const WIDTH = 720
const HEIGHT = 200
const PAD_LEFT = 48
const PAD_RIGHT = 56
const PAD_TOP = 16
const PAD_BOTTOM = 24

function formatMoney(usd: number): string {
  if (usd >= 1_000_000_000) return `$${(usd / 1_000_000_000).toFixed(1)}B`
  if (usd >= 1_000_000) return `$${Math.round(usd / 1_000_000)}M`
  if (usd >= 1_000) return `$${Math.round(usd / 1_000)}k`
  return `$${usd}`
}

function dateLabel(iso: string): string {
  const [y, m] = iso.split('-')
  return `${y}-${m}`
}

export default function CumulativeTimeStrip({ data }: Props) {
  const { points, finalDeals, finalSpend, firstDate, lastDate } = data

  if (points.length < 2) {
    return (
      <div className="card text-text-muted text-sm">
        Not enough dated deals to plot a time series.
      </div>
    )
  }

  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM

  const t0 = new Date(points[0].date).getTime()
  const t1 = new Date(points[points.length - 1].date).getTime()
  const tSpan = Math.max(1, t1 - t0)

  const maxDeals = points[points.length - 1].cumulativeDeals
  const maxSpend = points[points.length - 1].cumulativeSpend

  const x = (date: string): number =>
    PAD_LEFT + ((new Date(date).getTime() - t0) / tSpan) * innerW
  const yDeals = (n: number): number => PAD_TOP + innerH - (n / maxDeals) * innerH
  const ySpend = (s: number): number =>
    PAD_TOP + innerH - (maxSpend > 0 ? (s / maxSpend) * innerH : 0)

  const dealsPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date).toFixed(1)} ${yDeals(p.cumulativeDeals).toFixed(1)}`)
    .join(' ')
  const spendPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(p.date).toFixed(1)} ${ySpend(p.cumulativeSpend).toFixed(1)}`)
    .join(' ')

  // X-axis ticks: one per year between t0 and t1
  const startYear = new Date(t0).getFullYear()
  const endYear = new Date(t1).getFullYear()
  const yearTicks: { x: number; label: string }[] = []
  for (let y = startYear; y <= endYear; y += 1) {
    const tickDate = `${y}-01-01`
    const tickT = new Date(tickDate).getTime()
    if (tickT < t0 || tickT > t1) continue
    yearTicks.push({ x: x(tickDate), label: `${y}` })
  }

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">Cumulative deals & disclosed spend</h3>
        <div className="text-xs text-text-muted">
          {dateLabel(firstDate)} → {dateLabel(lastDate)} · {finalDeals} deals · {formatMoney(finalSpend)}
        </div>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full">
        {/* Year gridlines */}
        {yearTicks.map((t) => (
          <line
            key={t.label}
            x1={t.x}
            x2={t.x}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            stroke="var(--color-border-subtle)"
            strokeDasharray="2 3"
          />
        ))}

        {/* Spend line (drawn first, behind deals) */}
        <path d={spendPath} fill="none" stroke="var(--color-accent)" strokeWidth={1.5} />
        {/* Deals line */}
        <path d={dealsPath} fill="none" stroke="var(--color-text)" strokeWidth={1.5} />

        {/* X-axis tick labels */}
        {yearTicks.map((t) => (
          <text
            key={`xt-${t.label}`}
            x={t.x}
            y={HEIGHT - 6}
            textAnchor="middle"
            fontSize="10"
            fill="var(--color-text-muted)"
          >
            {t.label}
          </text>
        ))}

        {/* Legend */}
        <g transform={`translate(${PAD_LEFT}, ${PAD_TOP - 8})`}>
          <rect x={0} y={-6} width={10} height={2} fill="var(--color-text)" />
          <text x={14} y={-3} fontSize="10" fill="var(--color-text-muted)">
            cumulative deals
          </text>
          <rect x={130} y={-6} width={10} height={2} fill="var(--color-accent)" />
          <text x={144} y={-3} fontSize="10" fill="var(--color-text-muted)">
            cumulative disclosed spend
          </text>
        </g>
      </svg>
    </div>
  )
}
