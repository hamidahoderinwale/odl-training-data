import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import ProgressBar from '@/app/components/ProgressBar'
import AutoIngest from '@/app/components/models/AutoIngest'
import AutoEnrich from '@/app/components/models/AutoEnrich'
import TokenEstimateTooltip from '@/app/components/models/TokenEstimateTooltip'
import Tooltip from '@/app/components/Tooltip'

async function getModels() {
  const models = await prisma.modelRegistry.findMany({
    orderBy: { releaseDate: 'desc' },
    select: {
      id: true,
      modelId: true,
      provider: true,
      family: true,
      releaseDate: true,
      params: true,
      tokensEstMin: true,
      tokensEstMax: true,
      tokensEstMid: true,
      evidenceStrength: true,
      architectureType: true,
      isMoe: true,
      multimodal: true,
    },
  })
  return models
}

function formatTokens(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1e15) return `${(value / 1e15).toFixed(1)}P`
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  return `${(value / 1e6).toFixed(0)}M`
}

function formatParams(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1000) return `${(value / 1000).toFixed(1)}T`
  return `${value.toFixed(1)}B`
}

export default async function ModelsPage() {
  const models = await getModels()

  return (
    <main className="min-h-screen bg-background">
      <div className="container-content section-padding">
        {/* Auto-ingest notification */}
        <AutoIngest modelCount={models.length} />
        
        {/* Auto-enrich notification */}
        <AutoEnrich 
          modelCount={models.length} 
          modelsWithTokens={models.filter(m => m.tokensEstMid).length}
        />
        
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-semibold mb-1">Model Registry</h1>
          <p className="text-text-muted text-sm">
            Training data scale estimates for major AI models
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-8">
          <div className="stat-card py-3">
            <div className="text-2xl font-semibold mb-1">{models.length}</div>
            <div className="text-xs text-text-muted">Total Models</div>
          </div>
          <div className="stat-card py-3">
            <div className="text-2xl font-semibold mb-1">
              {new Set(models.map(m => m.provider)).size}
            </div>
            <div className="text-xs text-text-muted">Providers</div>
          </div>
          <div className="stat-card py-3">
            <div className="text-2xl font-semibold mb-1">
              {models.filter(m => m.multimodal).length}
            </div>
            <div className="text-xs text-text-muted">Multimodal</div>
          </div>
        </div>

        {/* Models Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table text-sm">
              <thead>
                <tr className="border-b border-border-subtle">
                  <th className="text-left font-semibold">Model</th>
                  <th className="text-left font-semibold">Provider</th>
                  <th className="text-left font-semibold">
                    <Tooltip content="The number of trainable parameters in the model, typically measured in billions (B) or trillions (T). More parameters generally mean more capacity to learn complex patterns.">
                      <span className="underline decoration-dotted cursor-help">Params</span>
                    </Tooltip>
                  </th>
                  <th className="px-4 py-3 text-right font-semibold">
                    <Tooltip content="Estimated number of training tokens used to train the model. Click the number to see the calculation methodology. Tokens are the basic units of text that models process.">
                      <span className="underline decoration-dotted cursor-help">Tokens (Est.)</span>
                    </Tooltip>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    <Tooltip content="The underlying neural network architecture. Common types include Transformer (standard attention-based models) and MoE (Mixture of Experts, which uses sparse activation).">
                      <span className="underline decoration-dotted cursor-help">Architecture</span>
                    </Tooltip>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">
                    <Tooltip content="The strength of evidence for the token estimate. High = multiple data sources, Medium = some evidence, Low = limited evidence. Based on how much information we have about the model's training.">
                      <span className="underline decoration-dotted cursor-help">Evidence</span>
                    </Tooltip>
                  </th>
                  <th className="px-4 py-3 text-left font-semibold">Released</th>
                </tr>
              </thead>
              <tbody>
                        {models.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="text-center py-12 text-text-muted">
                              No models found. Ingestion will start automatically, or click "Ingest Models" above.
                            </td>
                          </tr>
                        ) : (
                  models.map((model) => (
                    <tr
                      key={model.id}
                      className="cursor-pointer transition-colors border-b border-border-subtle last:border-0 hover:bg-[rgba(232,225,217,0.3)]"
                    >
                      <td>
                        <Link
                          href={`/models/${model.id}`}
                          className="font-medium text-accent hover:text-accent-hover"
                        >
                          {model.modelId}
                        </Link>
                        {model.family && (
                          <div className="text-xs text-text-muted mt-0.5">{model.family}</div>
                        )}
                      </td>
                      <td>
                        <div className="text-sm">{model.provider}</div>
                      </td>
                      <td>
                        <div className="text-sm">{formatParams(model.params)}</div>
                        {model.isMoe && (
                          <Tooltip content="Mixture of Experts (MoE): A model architecture that uses multiple specialized sub-networks (experts) but only activates a subset for each input. This allows for larger models with lower computational costs.">
                            <div className="text-xs text-text-muted mt-0.5 underline decoration-dotted cursor-help">MoE</div>
                          </Tooltip>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {model.tokensEstMin && model.tokensEstMax ? (
                          <div>
                            <div className="font-medium">
                              <TokenEstimateTooltip
                                params={model.params}
                                tokensEstMin={model.tokensEstMin}
                                tokensEstMax={model.tokensEstMax}
                                tokensEstMid={model.tokensEstMid || (model.tokensEstMin + model.tokensEstMax) / 2}
                                isMoe={model.isMoe}
                              />
                            </div>
                            <div className="text-xs text-text-muted mt-0.5">
                              {formatTokens(model.tokensEstMin)}–{formatTokens(model.tokensEstMax)}
                            </div>
                          </div>
                        ) : (
                          <span className="text-text-muted/60">—</span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {model.architectureType && (
                            <span className="badge badge-secondary text-xs">
                              {model.architectureType}
                            </span>
                          )}
                          {model.multimodal && (
                            <Tooltip content="Multimodal models can process and understand multiple types of data simultaneously, such as text, images, audio, and video. Examples include GPT-4o, Claude 3, and Gemini.">
                              <span className="badge badge-primary text-xs underline decoration-dotted cursor-help">Multimodal</span>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                      <td>
                        {model.evidenceStrength && (
                          <span className="badge badge-secondary text-xs">
                            {model.evidenceStrength.replace('S-', '')}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="text-sm text-text-muted/80">
                          {model.releaseDate ? formatDate(model.releaseDate instanceof Date ? model.releaseDate.toISOString() : String(model.releaseDate)) : '—'}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  )
}

