// Aggregations for the supply-chain views (Sankey, disclosure, time strip).
// Pure functions over the deal rows we already loaded — no DB access here.
//
// All three views share the same input so the page only needs one Prisma query.

interface DealRow {
  buyer: string | null
  provider: string | null
  modality: string | null
  date: string | null
  priceUsd: number | null
  priceRangeMinUsd: number | null
  priceRangeMaxUsd: number | null
  exclusive: boolean | null
  creatorsCompensated: boolean | null
  extractionMetadata: string | null
}

const EXCLUDED_BUYERS = new Set([
  'Multiple AI labs',
  'Multiple AI Labs',
  'Multiple labs',
  'Various',
  'Various AI labs',
  'Unnamed AI firms',
  'Unnamed AI Firms',
  'undisclosed',
])

function splitBuyers(s: string | null): string[] {
  if (!s) return []
  return s
    .split(',')
    .map((b) => b.trim())
    .filter((b) => b && !EXCLUDED_BUYERS.has(b))
}

function pickPrice(d: DealRow): number {
  // Conservative: use confirmed priceUsd, else the midpoint of the disclosed range.
  if (d.priceUsd != null) return d.priceUsd
  if (d.priceRangeMinUsd != null && d.priceRangeMaxUsd != null) {
    return (d.priceRangeMinUsd + d.priceRangeMaxUsd) / 2
  }
  if (d.priceRangeMinUsd != null) return d.priceRangeMinUsd
  return 0
}

// Concentration on a market side: 0 = perfectly distributed, 1 = monopoly.
// Computed from share of deal count, not spend (spend is sparse).
function herfindahl(counts: number[]): number {
  const total = counts.reduce((s, c) => s + c, 0)
  if (total === 0) return 0
  const shares = counts.map((c) => c / total)
  return shares.reduce((s, x) => s + x * x, 0)
}

// Sankey ------------------------------------------------------------------

export interface SankeyNode {
  name: string
  count: number
  spend: number
  share: number // share of total deals (0-1)
}

export interface SankeyFlow {
  provider: string
  buyer: string
  count: number
  spend: number
}

export interface SankeyData {
  providers: SankeyNode[]
  buyers: SankeyNode[]
  flows: SankeyFlow[]
  buyerHerfindahl: number
  providerHerfindahl: number
  totalDeals: number
}

export function buildSankey(deals: DealRow[], topProvidersN = 12): SankeyData {
  const providerCounts: Record<string, number> = {}
  const providerSpend: Record<string, number> = {}
  const buyerCounts: Record<string, number> = {}
  const buyerSpend: Record<string, number> = {}
  const flowMap: Record<string, SankeyFlow> = {}

  for (const d of deals) {
    if (!d.provider) continue
    const buyers = splitBuyers(d.buyer)
    if (buyers.length === 0) continue
    const price = pickPrice(d)

    providerCounts[d.provider] = (providerCounts[d.provider] || 0) + 1
    providerSpend[d.provider] = (providerSpend[d.provider] || 0) + price

    for (const b of buyers) {
      buyerCounts[b] = (buyerCounts[b] || 0) + 1
      buyerSpend[b] = (buyerSpend[b] || 0) + price
      const key = `${d.provider}→${b}`
      if (!flowMap[key]) flowMap[key] = { provider: d.provider, buyer: b, count: 0, spend: 0 }
      flowMap[key].count += 1
      flowMap[key].spend += price
    }
  }

  const totalDeals = deals.length

  const sortedProviders = Object.entries(providerCounts).sort(([, a], [, b]) => b - a)
  const topProviderNames = new Set(sortedProviders.slice(0, topProvidersN).map(([n]) => n))

  // Collapse providers outside the top-N into a single "Other providers" node so the
  // diagram stays legible without dropping the long tail of small deals entirely.
  const collapsedProviderCounts: Record<string, number> = {}
  const collapsedProviderSpend: Record<string, number> = {}
  for (const [name, count] of sortedProviders) {
    const key = topProviderNames.has(name) ? name : 'Other providers'
    collapsedProviderCounts[key] = (collapsedProviderCounts[key] || 0) + count
    collapsedProviderSpend[key] = (collapsedProviderSpend[key] || 0) + (providerSpend[name] || 0)
  }

  const collapsedFlowMap: Record<string, SankeyFlow> = {}
  for (const flow of Object.values(flowMap)) {
    const provKey = topProviderNames.has(flow.provider) ? flow.provider : 'Other providers'
    const key = `${provKey}→${flow.buyer}`
    if (!collapsedFlowMap[key]) {
      collapsedFlowMap[key] = { provider: provKey, buyer: flow.buyer, count: 0, spend: 0 }
    }
    collapsedFlowMap[key].count += flow.count
    collapsedFlowMap[key].spend += flow.spend
  }

  const providers: SankeyNode[] = Object.entries(collapsedProviderCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({
      name,
      count,
      spend: collapsedProviderSpend[name] || 0,
      share: count / totalDeals,
    }))

  const buyers: SankeyNode[] = Object.entries(buyerCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([name, count]) => ({
      name,
      count,
      spend: buyerSpend[name] || 0,
      share: count / totalDeals,
    }))

  return {
    providers,
    buyers,
    flows: Object.values(collapsedFlowMap).sort((a, b) => b.count - a.count),
    buyerHerfindahl: herfindahl(Object.values(buyerCounts)),
    providerHerfindahl: herfindahl(Object.values(providerCounts)),
    totalDeals,
  }
}

// Disclosure --------------------------------------------------------------

export interface DisclosureBreakdown {
  field: string
  known: number
  unknown: number
  knownPercent: number
  reasons: { reason: string; count: number }[]
}

export interface DisclosureData {
  totalDeals: number
  financial: DisclosureBreakdown
  creator: DisclosureBreakdown
  exclusivity: DisclosureBreakdown
}

interface MissingReason {
  field: string
  reason: string
}

function reasonsForField(deal: DealRow, field: string): string[] {
  if (!deal.extractionMetadata) return []
  try {
    const meta = JSON.parse(deal.extractionMetadata) as { missing_reasons?: MissingReason[] }
    return (meta.missing_reasons ?? []).filter((m) => m.field === field).map((m) => m.reason)
  } catch {
    return []
  }
}

export function buildDisclosure(deals: DealRow[]): DisclosureData {
  const total = deals.length

  const financialKnown = deals.filter(
    (d) => d.priceUsd != null || d.priceRangeMinUsd != null,
  ).length
  const financialReasons: Record<string, number> = {}
  for (const d of deals) {
    if (d.priceUsd == null && d.priceRangeMinUsd == null) {
      const reasons = reasonsForField(d, 'financial_terms')
      const reason = reasons[0] ?? 'no_provenance_recorded'
      financialReasons[reason] = (financialReasons[reason] || 0) + 1
    }
  }

  const creatorKnown = deals.filter((d) => d.creatorsCompensated !== null).length
  const exclusivityKnown = deals.filter((d) => d.exclusive !== null).length

  const summarise = (
    field: string,
    known: number,
    reasons: Record<string, number>,
  ): DisclosureBreakdown => ({
    field,
    known,
    unknown: total - known,
    knownPercent: total > 0 ? known / total : 0,
    reasons: Object.entries(reasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
  })

  return {
    totalDeals: total,
    financial: summarise('Financial terms', financialKnown, financialReasons),
    creator: summarise('Creator compensation', creatorKnown, {}),
    exclusivity: summarise('Exclusivity', exclusivityKnown, {}),
  }
}

// Time series -------------------------------------------------------------

export interface TimePoint {
  // First-of-month ISO date used as the x-axis position
  date: string
  cumulativeDeals: number
  cumulativeSpend: number
}

export interface TimeSeriesData {
  points: TimePoint[]
  finalDeals: number
  finalSpend: number
  firstDate: string
  lastDate: string
}

// Year-only dates ("2024") get bucketed to mid-year so they sit between the two
// halves of the year on the cumulative line — better than dumping them all into
// January, which created a visible vertical step at year boundaries.
function parseDealDate(s: string | null): Date | null {
  if (!s) return null
  const yearOnly = /^\d{4}$/
  const yearMonth = /^(\d{4})-(\d{2})$/
  const yearMonthDay = /^(\d{4})-(\d{2})-(\d{2})$/
  if (yearOnly.test(s)) return new Date(`${s}-07-01`)
  let m = s.match(yearMonth)
  if (m) return new Date(`${m[1]}-${m[2]}-01`)
  m = s.match(yearMonthDay)
  if (m) return new Date(s)
  return null
}

export function buildTimeSeries(deals: DealRow[]): TimeSeriesData {
  const dated = deals
    .map((d) => ({ deal: d, date: parseDealDate(d.date), price: pickPrice(d) }))
    .filter((x): x is { deal: DealRow; date: Date; price: number } => x.date !== null)
    .sort((a, b) => a.date.getTime() - b.date.getTime())

  if (dated.length === 0) {
    return { points: [], finalDeals: 0, finalSpend: 0, firstDate: '', lastDate: '' }
  }

  // Bucket by month so the line steps once per month instead of once per deal.
  const monthBuckets: Record<string, { count: number; spend: number }> = {}
  for (const { date, price } of dated) {
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-01`
    if (!monthBuckets[key]) monthBuckets[key] = { count: 0, spend: 0 }
    monthBuckets[key].count += 1
    monthBuckets[key].spend += price
  }

  const sortedMonths = Object.keys(monthBuckets).sort()
  const points: TimePoint[] = []
  let cDeals = 0
  let cSpend = 0
  for (const month of sortedMonths) {
    cDeals += monthBuckets[month].count
    cSpend += monthBuckets[month].spend
    points.push({ date: month, cumulativeDeals: cDeals, cumulativeSpend: cSpend })
  }

  return {
    points,
    finalDeals: cDeals,
    finalSpend: cSpend,
    firstDate: sortedMonths[0],
    lastDate: sortedMonths[sortedMonths.length - 1],
  }
}
