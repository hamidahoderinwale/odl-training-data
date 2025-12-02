'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/utils'

interface Linkage {
  id: string
  linkageType: string
  linkageStrength: string
  impactInference: string | null
  deal: {
    id: string
    provider: string
    buyer: string
    modality: string
    priceUsd: number | null
    date: string | null
  }
  model: {
    id: string
    modelId: string
    provider: string
    family: string | null
    tokensEstMid: number | null
  }
}

interface AggregatedViewProps {
  linkages: Linkage[]
}

interface AggregatedConnection {
  dealId: string
  provider: string
  buyer: string
  modality: string
  date: string | null
  priceUsd: number | null
  modelProvider: string
  modelFamilies: Array<{
    family: string
    models: Array<{
      id: string
      modelId: string
      tokensEstMid: number | null
    }>
  }>
  totalModels: number
  linkageType: string
  linkageStrength: string
}

export default function AggregatedView({ linkages }: AggregatedViewProps) {
  const aggregated = useMemo(() => {
    // Group linkages by deal + model provider
    const groups = new Map<string, AggregatedConnection>()

    linkages.forEach(linkage => {
      if (!linkage.deal || !linkage.model) return

      const key = `${linkage.deal.id}:${linkage.model.provider}`
      
      if (!groups.has(key)) {
        groups.set(key, {
          dealId: linkage.deal.id,
          provider: linkage.deal.provider,
          buyer: linkage.deal.buyer,
          modality: linkage.deal.modality,
          date: linkage.deal.date,
          priceUsd: linkage.deal.priceUsd,
          modelProvider: linkage.model.provider,
          modelFamilies: [],
          totalModels: 0,
          linkageType: linkage.linkageType,
          linkageStrength: linkage.linkageStrength,
        })
      }

      const group = groups.get(key)!
      const family = linkage.model.family || 'Other'
      
      let familyGroup = group.modelFamilies.find(f => f.family === family)
      if (!familyGroup) {
        familyGroup = { family, models: [] }
        group.modelFamilies.push(familyGroup)
      }

      familyGroup.models.push({
        id: linkage.model.id,
        modelId: linkage.model.modelId,
        tokensEstMid: linkage.model.tokensEstMid,
      })
      group.totalModels++
    })

    return Array.from(groups.values()).sort((a, b) => b.totalModels - a.totalModels)
  }, [linkages])

  function formatTokens(value: number | null | undefined): string {
    if (!value) return '—'
    if (value >= 1e15) return `${(value / 1e15).toFixed(1)}P`
    if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
    if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
    return `${(value / 1e6).toFixed(0)}M`
  }

  if (aggregated.length === 0) {
    return (
      <div className="card p-12 text-center text-text-muted">
        <div className="text-sm">No connections found matching your filters</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="card p-4 bg-border-subtle/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-2xl font-semibold mb-1">{aggregated.length}</div>
            <div className="text-xs text-text-muted">Unique Connections</div>
          </div>
          <div>
            <div className="text-2xl font-semibold mb-1">
              {new Set(aggregated.map(c => c.provider)).size}
            </div>
            <div className="text-xs text-text-muted">Data Providers</div>
          </div>
          <div>
            <div className="text-2xl font-semibold mb-1">
              {new Set(aggregated.map(c => c.modelProvider)).size}
            </div>
            <div className="text-xs text-text-muted">Model Providers</div>
          </div>
        </div>
      </div>

      {aggregated.map((conn, idx) => (
        <div key={idx} className="card p-4 hover:bg-border-subtle/30 transition-colors">
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <Link
                  href={`/deals/${conn.dealId}`}
                  className="font-semibold text-accent hover:text-accent-hover"
                >
                  {conn.provider}
                </Link>
                <span className="text-text-muted">→</span>
                <span className="font-medium">{conn.buyer}</span>
                <span className="text-text-muted">→</span>
                <span className="font-medium text-green-600">{conn.modelProvider}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-text-muted flex-wrap">
                <span className="badge badge-secondary text-xs">{conn.modality}</span>
                {conn.date && <span>{formatDate(conn.date)}</span>}
                {conn.priceUsd && (
                  <span>
                    {conn.priceUsd >= 1e9 ? `$${(conn.priceUsd / 1e9).toFixed(1)}B` :
                     conn.priceUsd >= 1e6 ? `$${(conn.priceUsd / 1e6).toFixed(0)}M` :
                     `$${(conn.priceUsd / 1e3).toFixed(0)}K`}
                  </span>
                )}
                <span className={`badge text-xs ${
                  conn.linkageStrength === 'high' ? 'badge-primary' : 'badge-secondary'
                }`}>
                  {conn.linkageStrength === 'high' ? 'High' : 
                   conn.linkageStrength === 'medium' ? 'Medium' : 'Low'} confidence
                </span>
              </div>
            </div>
            <div className="text-right ml-4">
              <div className="text-2xl font-semibold">{conn.totalModels}</div>
              <div className="text-xs text-text-muted">
                {conn.totalModels === 1 ? 'model' : 'models'}
              </div>
            </div>
          </div>

          {/* Model families - Collapsible */}
          {conn.modelFamilies.length > 0 && (
            <details className="pt-3 border-t border-border-subtle">
              <summary className="cursor-pointer text-sm font-medium text-text-muted hover:text-text mb-2">
                {conn.modelFamilies.length} {conn.modelFamilies.length === 1 ? 'model family' : 'model families'} ({conn.totalModels} total models)
              </summary>
              <div className="space-y-3 mt-3">
                {conn.modelFamilies.map((family, fIdx) => (
                  <div key={fIdx} className="pl-4 border-l-2 border-border-subtle">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-semibold text-text">{family.family}</span>
                      <span className="text-xs text-text-muted">
                        ({family.models.length} {family.models.length === 1 ? 'model' : 'models'})
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {family.models.map(model => (
                        <Link
                          key={model.id}
                          href={`/models/${model.id}`}
                          className="text-xs px-2 py-1 bg-border-subtle hover:bg-border rounded-none text-accent hover:text-accent-hover transition-colors"
                        >
                          {model.modelId}
                          {model.tokensEstMid && (
                            <span className="ml-1 text-text-muted">
                              ({formatTokens(model.tokensEstMid)})
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>
      ))}
    </div>
  )
}

