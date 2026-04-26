import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import DealsClient from './deals/DealsClient'
import DiscoveryButton from './components/deals/DiscoveryButton'
import NormalizationInfoBar from './components/deals/NormalizationInfoBar'
import ProgressBar from './components/ui/ProgressBar'
import AutoEnrich from './components/deals/AutoEnrich'
import Tooltip from './components/ui/Tooltip'
import SupplyChainSankey from './components/deals/SupplyChainSankey'
import DisclosurePanel from './components/deals/DisclosurePanel'
import CumulativeTimeStrip from './components/deals/CumulativeTimeStrip'
import { enrichDeal } from '@/lib/api/deal-enrichment'
import {
  buildSankey,
  buildDisclosure,
  buildTimeSeries,
} from '@/lib/api/supply-chain-analytics'

async function getDeals() {
  const deals = await prisma.deal.findMany({
    orderBy: { date: 'desc' },
    take: 100,
    select: {
      id: true,
      provider: true,
      buyer: true,
      modality: true,
      dataType: true,
      priceUsd: true,
      priceRangeMinUsd: true,
      priceRangeMaxUsd: true,
      reportedTerms: true,
      exclusive: true,
      creatorsCompensated: true,
      creatorSplitPercentage: true,
      revenueShare: true,
      date: true,
      dealType: true,
      pricingMechanism: true,
      sourcePrimary: true,
      trainingAllowed: true,
      finetuningAllowed: true,
      inferenceAllowed: true,
      redistributionAllowed: true,
      deletionRequired: true,
      notes: true,
      sources: true,
      pricingNormalizations: {
        select: {
          unitType: true,
          normalizedCostPerUnit: true,
          normalizationMethod: true,
        },
      },
      priceCurrency: true,
      discoveredVia: true,
      exaQuery: true,
      exaScore: true,
      discoveryDate: true,
      durationYears: true,
      dealStage: true,
      confidenceScore: true,
      startDate: true,
      endDate: true,
    },
  })
  // Convert Date objects to ISO strings and enrich with inferred metadata
  return deals.map(deal => {
    const enriched = enrichDeal(deal)
    return {
      ...deal,
      discoveryDate: deal.discoveryDate?.toISOString() || null,
      startDate: deal.startDate?.toISOString() || null,
      endDate: deal.endDate?.toISOString() || null,
      // Merge enriched fields only if they're missing
      dealType: deal.dealType || enriched.dealType || null,
      pricingMechanism: deal.pricingMechanism || enriched.pricingMechanism || null,
      durationYears: deal.durationYears || enriched.durationYears || null,
      trainingAllowed: deal.trainingAllowed ?? enriched.trainingAllowed ?? null,
      finetuningAllowed: deal.finetuningAllowed ?? enriched.finetuningAllowed ?? null,
      inferenceAllowed: deal.inferenceAllowed ?? enriched.inferenceAllowed ?? null,
      redistributionAllowed: deal.redistributionAllowed ?? enriched.redistributionAllowed ?? null,
      deletionRequired: deal.deletionRequired ?? enriched.deletionRequired ?? null,
    }
  })
}

async function getAnalytics() {
  const deals = await prisma.deal.findMany({
    select: {
      buyer: true,
      provider: true,
      modality: true,
      date: true,
      priceUsd: true,
      priceRangeMinUsd: true,
      priceRangeMaxUsd: true,
      exclusive: true,
      creatorsCompensated: true,
      extractionMetadata: true,
    },
  })

  // Calculate stats
  const totalDeals = deals.length
  const totalSpend = deals.reduce((sum, deal) => sum + (deal.priceUsd || 0), 0)
  const exclusiveDeals = deals.filter(d => d.exclusive === true).length
  const compensatedDeals = deals.filter(d => d.creatorsCompensated === true).length
  const compensatedPercent = totalDeals > 0 ? Math.round((compensatedDeals / totalDeals) * 100) : 0

  // Modality breakdown
  const modalityCounts: Record<string, number> = {}
  deals.forEach(deal => {
    if (!deal.modality) return
    modalityCounts[deal.modality] = (modalityCounts[deal.modality] || 0) + 1
  })

  // Buyer breakdown
  // Exclude aggregate/placeholder buyer names
  const excludedBuyers = new Set([
    'Multiple AI labs',
    'Multiple AI Labs',
    'Multiple labs',
    'Various',
    'Various AI labs',
    'Unnamed AI firms',
    'Unnamed AI Firms',
  ])
  
  const buyerCounts: Record<string, number> = {}
  const buyerSpend: Record<string, number> = {}
  deals.forEach(deal => {
    if (!deal.buyer) return
    const buyers = deal.buyer.split(',').map(b => b.trim())
    buyers.forEach(buyer => {
      // Skip excluded aggregate buyer names
      if (excludedBuyers.has(buyer)) {
        return
      }
      buyerCounts[buyer] = (buyerCounts[buyer] || 0) + 1
      buyerSpend[buyer] = (buyerSpend[buyer] || 0) + (deal.priceUsd || 0)
    })
  })

  // Provider breakdown
  const providerCounts: Record<string, number> = {}
  const providerSpend: Record<string, number> = {}
  deals.forEach(deal => {
    if (!deal.provider) return
    providerCounts[deal.provider] = (providerCounts[deal.provider] || 0) + 1
    providerSpend[deal.provider] = (providerSpend[deal.provider] || 0) + (deal.priceUsd || 0)
  })

  // Top buyers by spend
  const topBuyers = Object.entries(buyerSpend)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, spend]) => ({ name, spend, count: buyerCounts[name] }))

  // Top providers by spend
  const topProviders = Object.entries(providerSpend)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, spend]) => ({ name, spend, count: providerCounts[name] }))

  // Supply-chain views — Sankey, disclosure, cumulative time strip
  const sankey = buildSankey(deals)
  const disclosure = buildDisclosure(deals)
  const timeSeries = buildTimeSeries(deals)

  return {
    totalDeals,
    totalSpend,
    exclusiveDeals,
    compensatedDeals,
    compensatedPercent,
    modalityCounts,
    topBuyers,
    topProviders,
    sankey,
    disclosure,
    timeSeries,
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B+`
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(0)}M+`
  }
  return `$${amount.toFixed(0)}`
}

export default async function Home() {
  const deals = await getDeals()
  const analytics = await getAnalytics()
  
  // Count deals with all key fields populated
  const dealsWithAllFields = deals.filter(deal => 
    deal.dealType && 
    deal.pricingMechanism && 
    deal.durationYears !== null &&
    deal.trainingAllowed !== null
  ).length

  return (
    <div className="min-h-screen bg-background">
      <div className="container-content section-padding">
        {/* Auto-enrich notification */}
        <AutoEnrich dealCount={deals.length} dealsWithAllFields={dealsWithAllFields} />
        {/* Header */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-semibold mb-1">Deals Explorer</h1>
              <p className="text-text-muted text-sm">
                Global licensing, acquisition, and commissioning deals (2020–2025)
              </p>
            </div>
            <div className="flex gap-2">
              <DiscoveryButton />
            </div>
          </div>
        </div>

        {/* Normalization Info Bar */}
        <NormalizationInfoBar />

        {/* Condensed Analytics Section - Scrollable */}
        <div className="mb-8">
          {/* Key Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Tooltip content="Total number of training data deals tracked in the database, including licensing, acquisition, and commissioning deals.">
              <div className="stat-card py-3">
                <div className="text-2xl font-semibold mb-1">{analytics.totalDeals}</div>
                <div className="text-xs text-text-muted underline decoration-dotted cursor-help">Total Deals</div>
              </div>
            </Tooltip>
            <Tooltip content="Sum of all reported deal values in USD. Includes both confirmed prices and estimated ranges. Some deals may be undisclosed.">
              <div className="stat-card py-3">
                <div className="text-2xl font-semibold mb-1">{formatCurrency(analytics.totalSpend)}</div>
                <div className="text-xs text-text-muted underline decoration-dotted cursor-help">Total Spend</div>
              </div>
            </Tooltip>
            <Tooltip content="Number of deals that grant exclusive rights to the buyer, meaning the data provider cannot license the same data to other AI companies.">
              <div className="stat-card py-3">
                <div className="text-2xl font-semibold mb-1">{analytics.exclusiveDeals}</div>
                <div className="text-xs text-text-muted underline decoration-dotted cursor-help">Exclusive</div>
              </div>
            </Tooltip>
            <Tooltip content="Percentage of deals where original creators (authors, artists, musicians, etc.) are compensated for their work being used in AI training.">
              <div className="stat-card py-3">
                <div className="text-2xl font-semibold mb-1">{analytics.compensatedPercent}%</div>
                <div className="text-xs text-text-muted underline decoration-dotted cursor-help">Creator Comp.</div>
              </div>
            </Tooltip>
          </div>

          {/* Scrollable Analytics Cards */}
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <div className="flex gap-4 min-w-max">
              {/* Modality Breakdown */}
              <div className="card min-w-[280px] flex-shrink-0">
                <h3 className="text-sm font-semibold mb-3 text-text-muted">By Modality</h3>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(analytics.modalityCounts)
                    .sort(([, a], [, b]) => b - a)
                    .map(([modality, count]) => (
                      <div key={modality} className="flex items-center justify-between text-sm">
                        <span className="truncate flex-1 mr-2">{modality}</span>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <div className="w-16">
                                    <ProgressBar percentage={(count / analytics.totalDeals) * 100} />
                                  </div>
                                  <span className="text-text-muted text-xs w-6 text-right">{count}</span>
                                </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* Top Buyers */}
              <div className="card min-w-[240px] flex-shrink-0">
                <h3 className="text-sm font-semibold mb-3 text-text-muted">Top Buyers</h3>
                <div className="space-y-2">
                  {analytics.topBuyers.map((buyer, idx) => (
                    <div key={buyer.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-text-muted text-xs">#{idx + 1}</span>
                        <span className="truncate font-medium">{buyer.name}</span>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <div className="font-semibold text-xs">{formatCurrency(buyer.spend)}</div>
                        <div className="text-text-muted text-xs">{buyer.count} deal{buyer.count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top Providers */}
              <div className="card min-w-[240px] flex-shrink-0">
                <h3 className="text-sm font-semibold mb-3 text-text-muted">Top Providers</h3>
                <div className="space-y-2">
                  {analytics.topProviders.map((provider, idx) => (
                    <div key={provider.name} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-text-muted text-xs">#{idx + 1}</span>
                        <span className="truncate font-medium">{provider.name}</span>
                      </div>
                      <div className="flex-shrink-0 ml-2">
                        <div className="font-semibold text-xs">{formatCurrency(provider.spend)}</div>
                        <div className="text-text-muted text-xs">{provider.count} deal{provider.count !== 1 ? 's' : ''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Supply-chain views */}
        <div className="space-y-4 mb-8">
          <DisclosurePanel data={analytics.disclosure} />
          <CumulativeTimeStrip data={analytics.timeSeries} />
          <SupplyChainSankey data={analytics.sankey} />
        </div>

        {/* Deals Explorer */}
        <DealsClient initialDeals={deals} />
      </div>
    </div>
  )
}
