// Disclosure-rate panel — what fraction of deals actually disclose each field,
// and (for financial terms) why they don't when they don't.
//
// This is the methodology contribution. Without it, top-line numbers like
// "9% of deals compensate creators" mislead — really we only *know* the
// answer for ~9% of deals; the rest are unknown, not "no".

import type { DisclosureData } from '@/lib/api/supply-chain-analytics'
import Tooltip from '@/app/components/ui/Tooltip'

interface Props {
  data: DisclosureData
}

const REASON_LABELS: Record<string, string> = {
  undisclosed: 'undisclosed',
  potential_future: 'potential / future deal',
  unknown: 'no signal',
  no_provenance_recorded: 'no provenance recorded',
  not_applicable: 'not applicable',
}

function DisclosureRow({
  label,
  known,
  total,
  knownPercent,
  reasons,
  tooltip,
}: {
  label: string
  known: number
  total: number
  knownPercent: number
  reasons: { reason: string; count: number }[]
  tooltip: string
}) {
  const knownPct = Math.round(knownPercent * 100)
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <Tooltip content={tooltip}>
          <span className="text-sm underline decoration-dotted cursor-help">{label}</span>
        </Tooltip>
        <span className="text-xs text-text-muted">
          <span className="text-text font-medium">{known}</span>/{total}
          {' · '}
          <span className="text-text font-medium">{knownPct}%</span> disclosed
        </span>
      </div>
      <div className="h-2 bg-border-subtle rounded-none overflow-hidden mb-1">
        <div
          className="h-full bg-text"
          style={{ width: `${knownPct}%` }}
        />
      </div>
      {reasons.length > 0 && (
        <div className="text-xs text-text-muted">
          of the {total - known} unknown:{' '}
          {reasons
            .map((r) => `${r.count} ${REASON_LABELS[r.reason] ?? r.reason}`)
            .join(', ')}
        </div>
      )}
    </div>
  )
}

export default function DisclosurePanel({ data }: Props) {
  return (
    <div className="card">
      <div className="flex items-baseline justify-between mb-3">
        <h3 className="text-sm font-semibold">Disclosure rate</h3>
        <div className="text-xs text-text-muted">across {data.totalDeals} deals</div>
      </div>

      <div className="text-xs text-text-muted mb-4 leading-relaxed">
        Most public deals don&apos;t disclose terms. The bars below show what we
        actually know — not what&apos;s true of the market. A 0% disclosure rate
        on creator compensation, for example, means the deal is silent on
        compensation, not that creators get nothing.
      </div>

      <div className="space-y-5">
        <DisclosureRow
          label="Financial terms disclosed"
          known={data.financial.known}
          total={data.totalDeals}
          knownPercent={data.financial.knownPercent}
          reasons={data.financial.reasons}
          tooltip="Deals with at least a numeric price (single value or range), parsed from the reported financial terms."
        />
        <DisclosureRow
          label="Creator compensation specified"
          known={data.creator.known}
          total={data.totalDeals}
          knownPercent={data.creator.knownPercent}
          reasons={data.creator.reasons}
          tooltip="Deals where the source explicitly states whether original creators (authors, photographers, musicians) are compensated."
        />
        <DisclosureRow
          label="Exclusivity specified"
          known={data.exclusivity.known}
          total={data.totalDeals}
          knownPercent={data.exclusivity.knownPercent}
          reasons={data.exclusivity.reasons}
          tooltip="Deals where the source explicitly states whether the buyer holds exclusive rights to the data."
        />
      </div>
    </div>
  )
}
