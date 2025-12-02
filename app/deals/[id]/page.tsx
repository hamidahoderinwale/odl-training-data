import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import DealFeed from '../../components/deals/DealFeed'
import { getSourceUrl } from '@/lib/utils/utils'

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
          href="/"
          className="text-accent hover:text-accent-hover mb-6 inline-block"
        >
          ← Back to Deals
        </Link>

        <div className="max-w-4xl">
          {/* Header Card */}
          <div className="card mb-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-semibold mb-1">
                  {deal.provider} → {deal.buyer}
                </h1>
                <p className="text-text-muted text-sm">{deal.dataType}</p>
              </div>
              <div className="flex gap-2">
                <span className="badge badge-secondary">{deal.modality}</span>
                {deal.exclusive && (
                  <span className="badge badge-primary">Exclusive</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-border">
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
                {(() => {
                  const sourceUrl = getSourceUrl(deal.sourcePrimary)
                  if (sourceUrl) {
                    return (
                      <a
                        href={sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-accent hover:text-accent-hover underline"
                      >
                        {deal.sourcePrimary}
                      </a>
                    )
                  }
                  return <div className="font-medium">{deal.sourcePrimary || '—'}</div>
                })()}
              </div>
            </div>
          </div>

          {/* Reported Terms */}
          {deal.reportedTerms && (
            <div className="card mb-6">
              <h2 className="text-lg font-semibold mb-3">Reported Terms</h2>
              <p className="text-sm leading-relaxed">{deal.reportedTerms}</p>
            </div>
          )}

          {/* Deal Details & Compensation */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            <div className="card">
              <h3 className="text-base font-semibold mb-3">Deal Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-text-muted">Deal Type</span>
                  <span className="font-medium">{deal.dealType || deal.pricingMechanism || '—'}</span>
                </div>
                {deal.durationYears && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Duration</span>
                    <span>{deal.durationYears === 1 ? '1 year' : `${deal.durationYears} years`}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">Exclusive</span>
                  <span>
                    {deal.exclusive === true ? (
                      <span className="badge badge-primary">Yes</span>
                    ) : deal.exclusive === false ? (
                      'No'
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                {deal.deletionRequired && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Deletion Required</span>
                    <span className="badge badge-secondary">Yes</span>
                  </div>
                )}
              </div>
            </div>

            <div className="card">
              <h3 className="text-base font-semibold mb-3">Creator Compensation</h3>
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
                    <span className="font-medium">{deal.creatorSplitPercentage}%</span>
                  </div>
                )}
                {deal.revenueShare && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Revenue Share</span>
                    <span className="badge badge-primary">Yes</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          {deal.notes && (
            <div className="card mb-6">
              <h3 className="text-base font-semibold mb-3">Notes</h3>
              <p className="text-sm leading-relaxed">{deal.notes}</p>
            </div>
          )}

          {/* Sources - Hyperlinked */}
          <div className="card mb-6">
            <h3 className="text-base font-semibold mb-3">Sources</h3>
            <div className="space-y-2">
              {deal.sourcePrimary && (
                <div className="text-text-muted">
                  Primary:{' '}
                  {deal.sourcePrimary.startsWith('http') ? (
                    <a
                      href={deal.sourcePrimary}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover font-medium underline"
                    >
                      {deal.sourcePrimary}
                    </a>
                  ) : (
                    <span className="text-text font-medium">{deal.sourcePrimary}</span>
                  )}
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
                          className="text-accent hover:text-accent-hover underline break-all"
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

          {/* Related Content Feed */}
          <div className="card">
            <DealFeed dealId={deal.id} provider={deal.provider} buyer={deal.buyer} />
          </div>
        </div>
      </div>
    </main>
  )
}

