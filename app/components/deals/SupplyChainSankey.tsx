// Bipartite buyer↔seller flow diagram. Pure SVG — no chart library.
//
// Sankey-style: providers on the left, buyers on the right, each node sized by
// share of deal count, each flow's thickness proportional to (provider→buyer)
// deal count. Click would later filter the deals table; for now it's read-only.

import type { SankeyData } from '@/lib/api/supply-chain-analytics'

interface Props {
  data: SankeyData
}

const WIDTH = 720
const NODE_WIDTH = 12
const NODE_GAP = 4
const PADDING_TOP = 24
const PADDING_BOTTOM = 16
const HEIGHT = 540

export default function SupplyChainSankey({ data }: Props) {
  const { providers, buyers, flows, totalDeals, buyerHerfindahl, providerHerfindahl } = data

  if (totalDeals === 0) {
    return <div className="card text-text-muted text-sm">No deals to flow.</div>
  }

  const usableHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM

  // Sum-based node heights so each side fills the same vertical extent.
  const totalProviderCount = providers.reduce((s, p) => s + p.count, 0)
  const totalBuyerCount = buyers.reduce((s, b) => s + b.count, 0)
  const providerScale = (usableHeight - (providers.length - 1) * NODE_GAP) / totalProviderCount
  const buyerScale = (usableHeight - (buyers.length - 1) * NODE_GAP) / totalBuyerCount

  // Layout providers down the left
  const providerLayout: Record<string, { y: number; height: number; cursor: number }> = {}
  let cursor = PADDING_TOP
  for (const p of providers) {
    const height = Math.max(2, p.count * providerScale)
    providerLayout[p.name] = { y: cursor, height, cursor: cursor }
    cursor += height + NODE_GAP
  }

  // Layout buyers down the right
  const buyerLayout: Record<string, { y: number; height: number; cursor: number }> = {}
  cursor = PADDING_TOP
  for (const b of buyers) {
    const height = Math.max(2, b.count * buyerScale)
    buyerLayout[b.name] = { y: cursor, height, cursor: cursor }
    cursor += height + NODE_GAP
  }

  // For each flow, allocate a band on each side proportional to its count.
  // Walk flows ordered by provider rank, then within-provider by buyer rank,
  // so flows out of the same provider stack tidily.
  const flowsOrdered = [...flows].sort((a, b) => {
    const providerOrder =
      providers.findIndex((p) => p.name === a.provider) -
      providers.findIndex((p) => p.name === b.provider)
    if (providerOrder !== 0) return providerOrder
    return (
      buyers.findIndex((p) => p.name === a.buyer) -
      buyers.findIndex((p) => p.name === b.buyer)
    )
  })

  const providerCursor: Record<string, number> = {}
  const buyerCursor: Record<string, number> = {}
  for (const p of providers) providerCursor[p.name] = providerLayout[p.name].y
  for (const b of buyers) buyerCursor[b.name] = buyerLayout[b.name].y

  const SANKEY_LEFT_X = 200
  const SANKEY_RIGHT_X = WIDTH - 200

  const flowPaths: { d: string; opacity: number; key: string; tooltip: string }[] = []
  for (const flow of flowsOrdered) {
    const sourceLayout = providerLayout[flow.provider]
    const targetLayout = buyerLayout[flow.buyer]
    if (!sourceLayout || !targetLayout) continue

    const sourceHeight = flow.count * providerScale
    const targetHeight = flow.count * buyerScale

    const sourceY0 = providerCursor[flow.provider]
    const sourceY1 = sourceY0 + sourceHeight
    providerCursor[flow.provider] = sourceY1

    const targetY0 = buyerCursor[flow.buyer]
    const targetY1 = targetY0 + targetHeight
    buyerCursor[flow.buyer] = targetY1

    const x0 = SANKEY_LEFT_X + NODE_WIDTH
    const x1 = SANKEY_RIGHT_X
    const cx = (x0 + x1) / 2

    // Cubic Bézier flow band
    const d = `
      M ${x0} ${sourceY0}
      C ${cx} ${sourceY0}, ${cx} ${targetY0}, ${x1} ${targetY0}
      L ${x1} ${targetY1}
      C ${cx} ${targetY1}, ${cx} ${sourceY1}, ${x0} ${sourceY1}
      Z
    `
      .replace(/\s+/g, ' ')
      .trim()

    flowPaths.push({
      d,
      opacity: 0.32,
      key: `${flow.provider}→${flow.buyer}`,
      tooltip: `${flow.provider} → ${flow.buyer}: ${flow.count} deal${flow.count > 1 ? 's' : ''}`,
    })
  }

  // Top-3 buyer share for the concentration annotation
  const top3BuyerShare =
    totalBuyerCount > 0
      ? buyers.slice(0, 3).reduce((s, b) => s + b.count, 0) / totalBuyerCount
      : 0

  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold">Supply chain · provider → buyer</h3>
        <div className="text-xs text-text-muted">
          {providers.length} providers · {buyers.length} buyers · {totalDeals} deals
        </div>
      </div>

      <div className="text-xs text-text-muted mb-3 leading-relaxed">
        Buyer concentration (HHI): <span className="font-medium text-text">{buyerHerfindahl.toFixed(2)}</span>
        {' · '}
        provider concentration: <span className="font-medium text-text">{providerHerfindahl.toFixed(2)}</span>
        {' · '}
        top-3 buyers account for <span className="font-medium text-text">{Math.round(top3BuyerShare * 100)}%</span> of deals.
      </div>
      <div className="text-xs text-text-muted mb-3 italic">
        Modelling AI development as a supply chain follows{' '}
        <a
          href="https://arxiv.org/abs/2504.20185"
          target="_blank"
          rel="noopener noreferrer"
          className="underline decoration-dotted hover:text-text"
        >
          Cen et al. (2025)
        </a>
        .
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ maxHeight: HEIGHT }}>
        {/* Flow bands */}
        {flowPaths.map((f) => (
          <path
            key={f.key}
            d={f.d}
            fill="var(--color-accent)"
            fillOpacity={f.opacity}
            stroke="none"
          >
            <title>{f.tooltip}</title>
          </path>
        ))}

        {/* Provider nodes (left) — single-line labels, skipped on nodes too short to fit */}
        {providers.map((p) => {
          const layout = providerLayout[p.name]
          const showLabel = layout.height >= 8
          return (
            <g key={`p-${p.name}`}>
              <rect
                x={SANKEY_LEFT_X}
                y={layout.y}
                width={NODE_WIDTH}
                height={layout.height}
                fill="var(--color-text)"
              >
                <title>{`${p.name} · ${p.count} deal${p.count > 1 ? 's' : ''}`}</title>
              </rect>
              {showLabel && (
                <text
                  x={SANKEY_LEFT_X - 8}
                  y={layout.y + layout.height / 2 + 3}
                  textAnchor="end"
                  fontSize="11"
                  fill="var(--color-text)"
                >
                  {p.name} · {p.count}
                </text>
              )}
            </g>
          )
        })}

        {/* Buyer nodes (right) — single-line labels, skipped on nodes too short to fit */}
        {buyers.map((b) => {
          const layout = buyerLayout[b.name]
          const showLabel = layout.height >= 8
          return (
            <g key={`b-${b.name}`}>
              <rect
                x={SANKEY_RIGHT_X - NODE_WIDTH}
                y={layout.y}
                width={NODE_WIDTH}
                height={layout.height}
                fill="var(--color-text)"
              >
                <title>{`${b.name} · ${b.count} deal${b.count > 1 ? 's' : ''} · ${Math.round(b.share * 100)}%`}</title>
              </rect>
              {showLabel && (
                <text
                  x={SANKEY_RIGHT_X + 8}
                  y={layout.y + layout.height / 2 + 3}
                  textAnchor="start"
                  fontSize="11"
                  fill="var(--color-text)"
                >
                  {b.name} · {b.count} · {Math.round(b.share * 100)}%
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
