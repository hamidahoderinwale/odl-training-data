import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'

async function getDeal(id: string) {
  const deal = await prisma.deal.findUnique({
    where: { id },
    include: {
      buyerRelations: {
        include: {
          buyer: true,
        },
      },
      providerRelation: true,
      pricingNormalizations: true,
    },
  })
  return deal
}

function formatPrice(deal: any) {
  if (deal.priceUsd) {
    if (deal.priceUsd >= 1000000000) {
      return `$${(deal.priceUsd / 1000000000).toFixed(1)}B`
    }
    if (deal.priceUsd >= 1000000) {
      return `$${(deal.priceUsd / 1000000).toFixed(0)}M`
    }
    if (deal.priceUsd >= 1000) {
      return `$${(deal.priceUsd / 1000).toFixed(0)}K`
    }
    return `$${deal.priceUsd.toFixed(0)}`
  }
  if (deal.priceRangeMinUsd && deal.priceRangeMaxUsd) {
    return `$${deal.priceRangeMinUsd.toFixed(2)}–${deal.priceRangeMaxUsd.toFixed(2)}`
  }
  return deal.reportedTerms || 'Undisclosed'
}

export default async function DealDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const deal = await getDeal(params.id)

  if (!deal) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container-content section-padding">
        <Link
          href="/deals"
          className="text-accent hover:text-accent-hover mb-6 inline-block"
        >
          ← Back to Deals
        </Link>

        <div className="max-w-4xl">
          {/* Header Card */}
          <div className="card mb-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-3xl font-semibold mb-2">
                  {deal.provider} → {deal.buyer}
                </h1>
                <p className="text-text-muted">{deal.dataType}</p>
              </div>
              <div className="flex gap-2">
                <span className="badge badge-secondary">{deal.modality}</span>
                {deal.exclusive && (
                  <span className="badge badge-primary">Exclusive</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-border">
              <div>
                <div className="text-sm text-text-muted mb-1">Price</div>
                <div className="text-xl font-semibold">{formatPrice(deal)}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted mb-1">Deal Type</div>
                <div className="font-medium">{deal.dealType || deal.pricingMechanism}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted mb-1">Date</div>
                <div className="font-medium">{deal.date || '—'}</div>
              </div>
              <div>
                <div className="text-sm text-text-muted mb-1">Source</div>
                <div className="font-medium">{deal.sourcePrimary || '—'}</div>
              </div>
            </div>
          </div>

          {/* Reported Terms */}
          {deal.reportedTerms && (
            <div className="card mb-8">
              <h2 className="text-xl font-semibold mb-4">Reported Terms</h2>
              <p className="text-lg leading-relaxed">{deal.reportedTerms}</p>
            </div>
          )}

          {/* Rights & Compensation */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Rights Granted</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-muted">Training</span>
                  <span>{deal.trainingAllowed !== null ? (deal.trainingAllowed ? 'Yes' : 'No') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Fine-tuning</span>
                  <span>{deal.finetuningAllowed !== null ? (deal.finetuningAllowed ? 'Yes' : 'No') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Inference</span>
                  <span>{deal.inferenceAllowed !== null ? (deal.inferenceAllowed ? 'Yes' : 'No') : '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Redistribution</span>
                  <span>{deal.redistributionAllowed !== null ? (deal.redistributionAllowed ? 'Yes' : 'No') : '—'}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Creator Compensation</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-muted">Compensated</span>
                  <span>
                    {deal.creatorsCompensated === true ? (
                      <span className="badge badge-primary">Yes</span>
                    ) : deal.creatorsCompensated === false ? (
                      'No'
                    ) : (
                      'Unclear'
                    )}
                  </span>
                </div>
                {deal.creatorSplitPercentage && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Split</span>
                    <span>{deal.creatorSplitPercentage}%</span>
                  </div>
                )}
                {deal.revenueShare && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Revenue Share</span>
                    <span>Yes</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {deal.notes && (
            <div className="card mb-8">
              <h3 className="text-lg font-semibold mb-4">Notes</h3>
              <p className="leading-relaxed">{deal.notes}</p>
            </div>
          )}

          {/* Sources */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Sources</h3>
            <div className="space-y-2">
              {deal.sourcePrimary && (
                <div className="text-text-muted">
                  Primary: <span className="text-text">{deal.sourcePrimary}</span>
                </div>
              )}
              {deal.sources && JSON.parse(deal.sources).length > 0 && (
                <div>
                  <div className="text-text-muted mb-2">Additional sources:</div>
                  <ul className="list-disc list-inside space-y-1">
                    {JSON.parse(deal.sources).map((source: string, idx: number) => (
                      <li key={idx}>
                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent-hover"
                        >
                          {source}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

