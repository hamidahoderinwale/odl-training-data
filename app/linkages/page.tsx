import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import AutoCreate from '@/app/components/linkages/AutoCreate'
import Tooltip from '@/app/components/Tooltip'

async function getLinkages() {
  try {
    // Fetch linkages with relations
    const linkages = await prisma.dealModelLinkage.findMany({
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
        model: {
          select: {
            id: true,
            modelId: true,
            provider: true,
            family: true,
            tokensEstMid: true,
          },
        },
      },
      orderBy: [
        { linkageStrength: 'desc' },
        { analysisTimestamp: 'desc' },
      ],
    })
    return linkages
  } catch (error: any) {
    console.error('Error fetching linkages:', error)
    // Return empty array on error to prevent page crash
    return []
  }
}

function formatTokens(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1e15) return `${(value / 1e15).toFixed(1)}P`
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  return `${(value / 1e6).toFixed(0)}M`
}

async function getDealCount() {
  try {
    return await prisma.deal.count()
  } catch {
    return 0
  }
}

async function getModelCount() {
  try {
    return await prisma.modelRegistry.count()
  } catch {
    return 0
  }
}

export default async function LinkagesPage() {
  const linkages = await getLinkages()
  const dealCount = await getDealCount()
  const modelCount = await getModelCount()

  return (
    <main className="min-h-screen bg-background">
      <div className="container-content section-padding">
        {/* Auto-create notification */}
        <AutoCreate 
          linkageCount={linkages.length} 
          dealCount={dealCount}
          modelCount={modelCount}
        />
        
        {/* Header */}
        <div className="mb-6">
          <div className="mb-6">
            <h1 className="text-4xl font-semibold mb-2">Deal-Model Linkages</h1>
            <p className="text-text-muted text-lg mb-4">
              Connections between training data deals and AI models
            </p>
            
            {/* Simple Explanation */}
            <div className="card bg-[rgba(139,111,71,0.05)] border border-accent/20">
              <div className="p-4">
                <h3 className="font-semibold text-text mb-2">What are linkages?</h3>
                <p className="text-sm text-text-muted leading-relaxed">
                  Linkages connect training data deals to AI models. For example: if OpenAI signed a deal with News Corp in 2023, 
                  and GPT-4 was released in 2023, there's a linkage suggesting the News Corp data may have been used to train GPT-4.
                </p>
                <p className="text-sm text-text-muted leading-relaxed mt-2">
                  The system automatically creates linkages when: (1) the deal buyer matches the model provider (e.g., OpenAI deal → OpenAI model), 
                  and (2) optionally, when the deal date and model release date are close in time (within 1 year).
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* Linkages Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table text-sm">
                      <thead>
                        <tr className="border-b border-border-subtle">
                          <th className="px-4 py-3 text-left font-semibold">
                            <Tooltip content="The training data deal, showing the data provider (who owns the data) and the buyer (the AI company licensing it).">
                              <div className="underline decoration-dotted cursor-help">Deal</div>
                            </Tooltip>
                            <div className="text-xs font-normal text-text-muted mt-0.5">Data provider → Buyer</div>
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            <Tooltip content="The AI model that may have been trained using data from this deal. Linkages are inferred based on company matches and timing.">
                              <div className="underline decoration-dotted cursor-help">Model</div>
                            </Tooltip>
                            <div className="text-xs font-normal text-text-muted mt-0.5">AI model that may have used this data</div>
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            <Tooltip content="The type of connection: 'Same Time Period' (deal and model within 1 year), 'Same Company' (buyer matches model provider), or 'Explicit' (directly stated).">
                              <div className="underline decoration-dotted cursor-help">Connection Type</div>
                            </Tooltip>
                            <div className="text-xs font-normal text-text-muted mt-0.5">How the link was determined</div>
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            <Tooltip content="The confidence level in the linkage: High (strong evidence like temporal overlap), Medium (moderate evidence), or Low (weak evidence).">
                              <div className="underline decoration-dotted cursor-help">Confidence</div>
                            </Tooltip>
                            <div className="text-xs font-normal text-text-muted mt-0.5">How certain we are</div>
                          </th>
                          <th className="px-4 py-3 text-left font-semibold">
                            <Tooltip content="An interpretation of what this linkage means - how the deal's data may have impacted the model's training.">
                              <div className="underline decoration-dotted cursor-help">What This Means</div>
                            </Tooltip>
                            <div className="text-xs font-normal text-text-muted mt-0.5">Interpretation of the connection</div>
                          </th>
                        </tr>
                      </thead>
              <tbody>
                {linkages.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-text-muted">
                      {dealCount === 0 || modelCount === 0 
                        ? `No ${dealCount === 0 ? 'deals' : 'models'} found. Please seed the database first.`
                        : 'No linkages found. Linkage creation will start automatically.'}
                    </td>
                  </tr>
                ) : (
                  linkages
                    .filter(linkage => linkage && linkage.deal && linkage.model)
                    .map((linkage) => (
                      <tr
                        key={linkage.id}
                        className="transition-colors border-b border-border-subtle last:border-0 hover:bg-[rgba(232,225,217,0.3)]"
                      >
                        <td className="px-4 py-3">
                          <Link
                            href={`/deals/${linkage.deal.id}`}
                            className="font-medium text-accent hover:text-accent-hover"
                          >
                            {linkage.deal.provider} → {linkage.deal.buyer}
                          </Link>
                          <div className="text-xs text-text-muted mt-0.5">
                            {linkage.deal.modality} • {linkage.deal.date ? formatDate(linkage.deal.date) : '—'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/models/${linkage.model.id}`}
                            className="font-medium text-accent hover:text-accent-hover"
                          >
                            {linkage.model.modelId}
                          </Link>
                          {linkage.model.family && (
                            <div className="text-xs text-text-muted mt-0.5">
                              {linkage.model.family} • {linkage.model.provider}
                            </div>
                          )}
                          {linkage.model.tokensEstMid && (
                            <div className="text-xs text-text-muted mt-0.5">
                              {formatTokens(linkage.model.tokensEstMid)} tokens
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-1">
                            <span className="badge badge-secondary text-xs">
                              {linkage.linkageType === 'temporal_overlap' ? 'Same Time Period' : 
                               linkage.linkageType === 'inferred' ? 'Same Company' : 
                               linkage.linkageType || '—'}
                            </span>
                            <div className="text-xs text-text-muted/70">
                              {linkage.linkageType === 'temporal_overlap' 
                                ? 'Deal & model within 1 year'
                                : linkage.linkageType === 'inferred'
                                ? 'Buyer matches model provider'
                                : ''}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`badge ${
                            linkage.linkageStrength === 'high' 
                              ? 'badge-primary' 
                              : 'badge-secondary'
                          } text-xs`}>
                            {linkage.linkageStrength === 'high' ? 'High' : 
                             linkage.linkageStrength === 'medium' ? 'Medium' : 
                             linkage.linkageStrength === 'low' ? 'Low' : 
                             '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-text leading-relaxed">
                            {linkage.impactInference || '—'}
                          </div>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detailed Explanation */}
        {linkages.length > 0 && (
          <div className="card mt-8">
            <h2 className="text-xl font-semibold mb-4">How Linkages Work</h2>
            <div className="space-y-4 text-sm text-text-muted">
              <div>
                <h3 className="font-semibold text-text mb-2">Example:</h3>
                <p className="leading-relaxed">
                  If you see a linkage: <strong className="text-text">News Corp → OpenAI</strong> connected to <strong className="text-text">GPT-4</strong>, 
                  it means OpenAI signed a deal with News Corp, and because GPT-4 is an OpenAI model, there's a potential connection. 
                  If the deal happened in 2023 and GPT-4 was released in 2023, that's a stronger connection (temporal overlap).
                </p>
              </div>
              
              <div className="pt-3 border-t border-border-subtle">
                <h3 className="font-semibold text-text mb-2">Connection Types:</h3>
                <ul className="space-y-2">
                  <li>
                    <strong className="text-text">Same Time Period:</strong> Deal and model release are within 1 year. 
                    Suggests the deal's data may have been used in training.
                  </li>
                  <li>
                    <strong className="text-text">Same Company:</strong> Deal buyer matches model provider, but different time periods. 
                    Shows organizational relationship but less direct connection.
                  </li>
                </ul>
              </div>
              
              <div className="pt-3 border-t border-border-subtle">
                <h3 className="font-semibold text-text mb-2">Confidence Levels:</h3>
                <p className="leading-relaxed">
                  Currently all linkages are marked as <strong className="text-text">High</strong> confidence because they require 
                  a clear match between the deal buyer and model provider. The system automatically creates these connections 
                  when it finds matching company names (e.g., "OpenAI" in both the deal and model).
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
