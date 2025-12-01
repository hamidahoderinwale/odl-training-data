import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import TokenCalculationCard from '@/app/components/models/TokenCalculationCard'
import Tooltip from '@/app/components/Tooltip'

async function getModel(id: string) {
  const model = await prisma.modelRegistry.findUnique({
    where: { id },
  })
  
  if (!model) return null
  
  // Fetch linkages separately to avoid relation issues
  const linkages = await prisma.dealModelLinkage.findMany({
    where: { modelId: model.modelId },
    include: {
      deal: {
        select: {
          id: true,
          provider: true,
          buyer: true,
          modality: true,
          priceUsd: true,
          date: true,
        },
      },
    },
    orderBy: { linkageStrength: 'desc' },
  })
  
  return { ...model, modelLinkages: linkages }
}

function formatTokens(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1e15) return `${(value / 1e15).toFixed(1)}P tokens`
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T tokens`
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B tokens`
  return `${(value / 1e6).toFixed(0)}M tokens`
}

function formatParams(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1000) return `${(value / 1000).toFixed(1)}T parameters`
  return `${value.toFixed(1)}B parameters`
}

function formatFLOPs(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1e24) return `${(value / 1e24).toFixed(1)}Y FLOPs`
  if (value >= 1e21) return `${(value / 1e21).toFixed(1)}Z FLOPs`
  if (value >= 1e18) return `${(value / 1e18).toFixed(1)}E FLOPs`
  return `${(value / 1e15).toFixed(1)}P FLOPs`
}

function parseJSON<T>(json: string | null | undefined): T | null {
  if (!json) return null
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

export default async function ModelDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const model = await getModel(params.id)

  if (!model) {
    notFound()
  }

  const evidenceTypes = parseJSON<string[]>(model.evidenceTypes) || []
  const uncertaintySources = parseJSON<string[]>(model.uncertaintySources) || []
  const sources = parseJSON<Array<{ type: string; url: string }>>(model.sources) || []

  return (
    <main className="min-h-screen bg-background">
      <div className="container-content section-padding">
        <Link
          href="/models"
          className="text-accent hover:text-accent-hover mb-6 inline-block"
        >
          ← Back to Models
        </Link>

        <div className="max-w-4xl">
          {/* Header Card */}
          <div className="card mb-8">
            <div className="mb-4">
              <h1 className="text-3xl font-semibold mb-2">{model.modelId}</h1>
              {model.family && (
                <p className="text-text-muted text-lg">{model.family}</p>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border">
              <div>
                <div className="text-sm text-text-muted mb-1">Provider</div>
                <div className="font-medium">{model.provider}</div>
              </div>
              <div>
                <Tooltip content="The number of trainable parameters in the model, typically measured in billions (B) or trillions (T). More parameters generally mean more capacity to learn complex patterns.">
                  <div className="text-sm text-text-muted mb-1 underline decoration-dotted cursor-help">Parameters</div>
                </Tooltip>
                <div className="font-medium">{formatParams(model.params)}</div>
                {model.isMoe && model.numExperts && (
                  <Tooltip content="Mixture of Experts (MoE): A model architecture that uses multiple specialized sub-networks (experts) but only activates a subset for each input. This allows for larger models with lower computational costs.">
                    <div className="text-xs text-text-muted mt-1 underline decoration-dotted cursor-help">
                      MoE: {model.numExperts} experts
                    </div>
                  </Tooltip>
                )}
              </div>
              <div>
                <div className="text-sm text-text-muted mb-1">Released</div>
                <div className="font-medium">
                  {model.releaseDate ? formatDate(model.releaseDate.toISOString()) : '—'}
                </div>
              </div>
              <div>
                <div className="text-sm text-text-muted mb-1">Architecture</div>
                <div className="font-medium">
                  {model.architectureType || '—'}
                  {model.multimodal && (
                    <span className="badge badge-primary text-xs ml-2">Multimodal</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Token Estimates */}
          {(model.tokensEstMin || model.tokensEstMax || model.tokensEstMid) && (
            <div className="mb-8">
              <div className="card mb-6">
                <h2 className="text-xl font-semibold mb-4">Training Token Estimates</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-text-muted mb-1">Minimum</div>
                    <div className="text-2xl font-semibold">
                      {formatTokens(model.tokensEstMin)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-text-muted mb-1">Midpoint</div>
                    <div className="text-2xl font-semibold text-accent">
                      {formatTokens(model.tokensEstMid)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-text-muted mb-1">Maximum</div>
                    <div className="text-2xl font-semibold">
                      {formatTokens(model.tokensEstMax)}
                    </div>
                  </div>
                </div>
                {model.tokensRangeGeneratedAt && (
                  <div className="text-xs text-text-muted mt-4 pt-4 border-t border-border">
                    Generated: {formatDate(model.tokensRangeGeneratedAt.toISOString())}
                  </div>
                )}
              </div>
              
              {/* Calculation Details */}
              <TokenCalculationCard
                params={model.params}
                tokensEstMin={model.tokensEstMin}
                tokensEstMax={model.tokensEstMax}
                tokensEstMid={model.tokensEstMid}
                isMoe={model.isMoe}
              />
            </div>
          )}

          {/* Evidence Profile */}
          {(evidenceTypes.length > 0 || model.evidenceStrength || uncertaintySources.length > 0) && (
            <div className="card mb-8">
              <h2 className="text-xl font-semibold mb-4">Evidence Profile</h2>
              <div className="space-y-4">
                {model.evidenceStrength && (
                  <div>
                    <div className="text-sm text-text-muted mb-2">Strength</div>
                    <span className="badge badge-primary">
                      {model.evidenceStrength.replace('S-', '')}
                    </span>
                  </div>
                )}
                {evidenceTypes.length > 0 && (
                  <div>
                    <div className="text-sm text-text-muted mb-2">Evidence Types</div>
                    <div className="flex flex-wrap gap-2">
                      {evidenceTypes.map((type, idx) => (
                        <span key={idx} className="badge badge-secondary text-xs">
                          {type}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {uncertaintySources.length > 0 && (
                  <div>
                    <div className="text-sm text-text-muted mb-2">Uncertainty Sources</div>
                    <div className="flex flex-wrap gap-2">
                      {uncertaintySources.map((source, idx) => (
                        <span key={idx} className="badge badge-secondary text-xs">
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Training Compute */}
          {(model.flopsReported || model.flopsEstimated) && (
            <div className="card mb-8">
              <h2 className="text-xl font-semibold mb-4">Training Compute</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {model.flopsReported && (
                  <div>
                    <div className="text-sm text-text-muted mb-1">Reported FLOPs</div>
                    <div className="font-medium">{formatFLOPs(model.flopsReported)}</div>
                  </div>
                )}
                {model.flopsEstimated && (
                  <div>
                    <div className="text-sm text-text-muted mb-1">Estimated FLOPs</div>
                    <div className="font-medium">{formatFLOPs(model.flopsEstimated)}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Linked Deals */}
          {model.modelLinkages && model.modelLinkages.length > 0 && (
            <div className="card mb-8">
              <h2 className="text-xl font-semibold mb-4">Linked Training Data Deals</h2>
              <div className="space-y-3">
                {model.modelLinkages.map((linkage) => (
                  <div
                    key={linkage.id}
                    className="p-4 border border-border-subtle rounded-sm hover:bg-border-subtle/30 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Link
                          href={`/deals/${linkage.deal.id}`}
                          className="font-medium text-accent hover:text-accent-hover"
                        >
                          {linkage.deal.provider} → {linkage.deal.buyer}
                        </Link>
                        <div className="text-sm text-text-muted mt-1">
                          {linkage.deal.modality} • {linkage.deal.date || '—'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`badge badge-secondary text-xs`}>
                          {linkage.linkageStrength}
                        </span>
                        <span className="badge badge-secondary text-xs">
                          {linkage.linkageType.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                    {linkage.impactInference && (
                      <div className="text-sm text-text-muted mt-2">
                        {linkage.impactInference}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sources */}
          {sources.length > 0 && (
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">Sources</h2>
              <div className="space-y-2">
                {sources.map((source, idx) => (
                  <div key={idx}>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover underline break-all"
                    >
                      {source.type}: {source.url}
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

