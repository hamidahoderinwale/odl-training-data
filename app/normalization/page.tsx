import { prisma } from '@/lib/prisma'
import Link from 'next/link'

async function getDealsForNormalization() {
  const deals = await prisma.deal.findMany({
    where: {
      OR: [
        { priceUsd: { not: null } },
        { priceRangeMinUsd: { not: null } },
      ],
    },
    orderBy: { priceUsd: 'desc' },
  })
  return deals
}

function normalizePrice(deal: any, unitType: string): number | null {
  // This is a simplified normalization - in production, you'd have
  // more sophisticated logic based on data type and assumptions
  
  if (!deal.priceUsd) return null
  
  switch (unitType) {
    case 'token':
      // Rough estimate: 1 book ≈ 80k tokens, 1 article ≈ 1k tokens
      if (deal.modality === 'Text') {
        if (deal.dataType?.toLowerCase().includes('book')) {
          return deal.priceUsd / 80000 // per token
        }
        return deal.priceUsd / 1000 // per token (article estimate)
      }
      return null
      
    case 'record':
      // For per-unit deals, try to extract from reported terms
      if (deal.dealType === 'per-unit') {
        // This would need more sophisticated parsing
        return deal.priceUsd / 1000000 // rough estimate
      }
      return null
      
    case 'image':
      if (deal.modality === 'Image') {
        // Estimate based on deal size
        if (deal.dataType?.includes('200M')) {
          return deal.priceUsd / 200000000 // Freepik example
        }
        return deal.priceUsd / 1000000 // rough estimate
      }
      return null
      
    case 'minute':
      if (deal.modality === 'Video' || deal.modality === 'Audio') {
        // Estimate: 1 hour of content
        return deal.priceUsd / 60 // per minute
      }
      return null
      
    default:
      return null
  }
}

function formatNormalizedPrice(price: number | null, unitType: string): string {
  if (price === null) return 'N/A'
  
  if (price < 0.001) {
    return `$${(price * 1000000).toFixed(2)} per 1M ${unitType}s`
  }
  if (price < 1) {
    return `$${price.toFixed(4)} per ${unitType}`
  }
  return `$${price.toFixed(2)} per ${unitType}`
}

export default async function NormalizationPage() {
  const deals = await getDealsForNormalization()

  const unitTypes = ['token', 'record', 'image', 'minute']

  return (
    <main className="min-h-screen bg-background">
      <div className="container-content section-padding">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold mb-4">Pricing Normalization Tool</h1>
          <p className="text-text-muted text-lg">
            Compare deals on an apples-to-apples basis by normalizing to per-unit pricing
          </p>
        </div>

        <div className="card mb-8">
          <h2 className="text-2xl font-semibold mb-4">How It Works</h2>
          <p className="text-text-muted leading-relaxed mb-4">
            Different deals use different pricing models (per-book, per-track, aggregate licensing, etc.).
            This tool normalizes prices to common units (tokens, records, images, minutes) to enable
            direct comparison.
          </p>
          <p className="text-text-muted text-sm">
            <strong>Note:</strong> Normalizations are estimates based on deal descriptions and assumptions.
            Actual per-unit costs may vary significantly.
          </p>
        </div>

        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Deal</th>
                  <th>Raw Price</th>
                  <th>Per Token</th>
                  <th>Per Record</th>
                  <th>Per Image</th>
                  <th>Per Minute</th>
                </tr>
              </thead>
              <tbody>
                {deals.map((deal) => {
                  const rawPrice = deal.priceUsd
                    ? deal.priceUsd >= 1000000000
                      ? `$${(deal.priceUsd / 1000000000).toFixed(1)}B`
                      : deal.priceUsd >= 1000000
                      ? `$${(deal.priceUsd / 1000000).toFixed(0)}M`
                      : `$${deal.priceUsd.toFixed(0)}`
                    : deal.reportedTerms || 'Undisclosed'

                  return (
                    <tr key={deal.id}>
                      <td>
                        <div>
                          <div className="font-medium">{deal.provider}</div>
                          <div className="text-sm text-text-muted">→ {deal.buyer}</div>
                          <div className="text-xs text-text-muted mt-1">{deal.modality}</div>
                        </div>
                      </td>
                      <td>{rawPrice}</td>
                      <td className="text-sm">
                        {formatNormalizedPrice(normalizePrice(deal, 'token'), 'token')}
                      </td>
                      <td className="text-sm">
                        {formatNormalizedPrice(normalizePrice(deal, 'record'), 'record')}
                      </td>
                      <td className="text-sm">
                        {formatNormalizedPrice(normalizePrice(deal, 'image'), 'image')}
                      </td>
                      <td className="text-sm">
                        {formatNormalizedPrice(normalizePrice(deal, 'minute'), 'minute')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8">
          <Link href="/" className="text-accent hover:text-accent-hover">
            ← Back to Deals
          </Link>
        </div>
      </div>
    </main>
  )
}

