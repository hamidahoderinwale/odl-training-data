import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import { convertCurrency, extractDateForConversion } from '@/lib/currency'

async function getDealsForNormalization() {
  const deals = await prisma.deal.findMany({
    where: {
      OR: [
        { priceUsd: { not: null } },
        { priceRangeMinUsd: { not: null } },
      ],
    },
    select: {
      id: true,
      provider: true,
      buyer: true,
      modality: true,
      priceUsd: true,
      priceRangeMinUsd: true,
      priceRangeMaxUsd: true,
      priceCurrency: true,
      reportedTerms: true,
      date: true,
      notes: true,
      dealType: true,
      dataType: true,
      pricingNormalizations: {
        select: {
          unitType: true,
          normalizedCostPerUnit: true,
          normalizationMethod: true,
        },
      },
    },
    orderBy: { priceUsd: 'desc' },
  })
  return deals
}

async function convertToUSD(
  amount: number | null,
  currency: string | null,
  date: string | null
): Promise<number | null> {
  if (!amount || !currency || currency.toUpperCase() === 'USD') {
    return amount
  }

  const conversionDate = extractDateForConversion(date)
  const converted = await convertCurrency(amount, currency, 'USD', conversionDate || undefined)
  return converted
}

async function getNormalizedPrice(deal: any, unitType: string): Promise<number | null> {
  // First, check if we have a stored normalization
  if (deal.pricingNormalizations) {
    const stored = deal.pricingNormalizations.find((n: any) => n.unitType === unitType)
    if (stored) {
      return stored.normalizedCostPerUnit
    }
  }
  
  // Convert price to USD if needed
  const priceUsd = await convertToUSD(
    deal.priceUsd || deal.priceRangeMinUsd,
    deal.priceCurrency || 'USD',
    deal.date
  )
  
  if (!priceUsd) return null
  
  switch (unitType) {
    case 'token':
      if (deal.modality === 'Text') {
        if (deal.dataType?.toLowerCase().includes('book')) {
          return priceUsd / 80000
        }
        return priceUsd / 1000
      }
      return null
      
    case 'record':
      if (deal.dealType === 'per-unit') {
        return priceUsd / 1000000
      }
      return null
      
    case 'image':
      if (deal.modality === 'Image') {
        if (deal.dataType?.includes('200M')) {
          return priceUsd / 200000000
        }
        return priceUsd / 1000000
      }
      return null
      
    case 'minute':
      if (deal.modality === 'Video' || deal.modality === 'Audio') {
        return priceUsd / 60
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

  // Convert all prices to USD for normalization
  const dealsWithUSD = await Promise.all(
    deals.map(async (deal) => {
      const priceUsd = await convertToUSD(
        deal.priceUsd || deal.priceRangeMinUsd,
        deal.priceCurrency || 'USD',
        deal.date
      )
      return {
        ...deal,
        priceUsdConverted: priceUsd,
        originalCurrency: deal.priceCurrency || 'USD',
      }
    })
  )

  return (
    <main className="min-h-screen bg-background">
      <div className="container-content section-padding">
        <div className="mb-4">
          <h1 className="text-3xl font-semibold mb-1">Pricing Normalization Tool</h1>
          <p className="text-text-muted text-sm">
            Compare deals on an apples-to-apples basis by normalizing to per-unit pricing
          </p>
        </div>

        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-3">How It Works</h2>
          <p className="text-text-muted text-sm leading-relaxed mb-3">
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
                {await Promise.all(
                  dealsWithUSD.map(async (deal) => {
                    const rawPrice = deal.priceUsdConverted
                      ? deal.priceUsdConverted >= 1000000000
                        ? `$${(deal.priceUsdConverted / 1000000000).toFixed(1)}B`
                        : deal.priceUsdConverted >= 1000000
                        ? `$${(deal.priceUsdConverted / 1000000).toFixed(0)}M`
                        : `$${deal.priceUsdConverted.toFixed(0)}`
                      : deal.reportedTerms || 'Undisclosed'

                    const currencyNote = deal.originalCurrency !== 'USD' 
                      ? ` (converted from ${deal.originalCurrency})`
                      : ''

                    return (
                      <tr key={deal.id}>
                        <td>
                          <div>
                            <div className="font-medium">{deal.provider}</div>
                            <div className="text-sm text-text-muted">→ {deal.buyer}</div>
                            <div className="text-xs text-text-muted mt-1">{deal.modality}</div>
                          </div>
                        </td>
                        <td>
                          <div>{rawPrice}</div>
                          {currencyNote && (
                            <div className="text-xs text-text-muted/70 italic">{currencyNote}</div>
                          )}
                        </td>
                        <td className="text-sm">
                          {formatNormalizedPrice(await getNormalizedPrice(deal, 'token'), 'token')}
                        </td>
                        <td className="text-sm">
                          {formatNormalizedPrice(await getNormalizedPrice(deal, 'record'), 'record')}
                        </td>
                        <td className="text-sm">
                          {formatNormalizedPrice(await getNormalizedPrice(deal, 'image'), 'image')}
                        </td>
                        <td className="text-sm">
                          {formatNormalizedPrice(await getNormalizedPrice(deal, 'minute'), 'minute')}
                        </td>
                      </tr>
                    )
                  })
                )}
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

