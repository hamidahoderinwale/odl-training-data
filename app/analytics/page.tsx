import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import ProgressBar from '../components/ProgressBar'

async function getAnalytics() {
  const deals = await prisma.deal.findMany({
    include: {
      buyerRelations: {
        include: {
          buyer: true,
        },
      },
      providerRelation: true,
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
    providerCounts[deal.provider] = (providerCounts[deal.provider] || 0) + 1
    providerSpend[deal.provider] = (providerSpend[deal.provider] || 0) + (deal.priceUsd || 0)
  })

  // Top buyers by spend
  const topBuyers = Object.entries(buyerSpend)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, spend]) => ({ name, spend, count: buyerCounts[name] }))

  // Top providers by spend
  const topProviders = Object.entries(providerSpend)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([name, spend]) => ({ name, spend, count: providerCounts[name] }))

  return {
    totalDeals,
    totalSpend,
    exclusiveDeals,
    compensatedDeals,
    compensatedPercent,
    modalityCounts,
    topBuyers,
    topProviders,
  }
}

function formatCurrency(amount: number): string {
  if (amount >= 1000000000) {
    return `$${(amount / 1000000000).toFixed(1)}B`
  }
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(0)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${amount.toFixed(0)}`
}

export default async function AnalyticsPage() {
  const analytics = await getAnalytics()

  return (
    <div className="min-h-screen bg-background">
      <div className="container-content section-padding">
        <div className="mb-8">
          <h1 className="text-4xl font-semibold mb-4">Market Analytics</h1>
          <p className="text-text-muted text-lg">
            Market structure, concentration, and trends
          </p>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="stat-card">
            <div className="stat-value">{analytics.totalDeals}</div>
            <div className="stat-label">Total Deals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{formatCurrency(analytics.totalSpend)}</div>
            <div className="stat-label">Total Reported Spend</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{analytics.exclusiveDeals}</div>
            <div className="stat-label">Exclusive Deals</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{analytics.compensatedPercent}%</div>
            <div className="stat-label">With Creator Compensation</div>
          </div>
        </div>

        {/* Modality Breakdown */}
        <div className="card mb-8">
          <h2 className="text-2xl font-semibold mb-6">Deals by Modality</h2>
          <div className="space-y-4">
            {Object.entries(analytics.modalityCounts)
              .sort(([, a], [, b]) => b - a)
              .map(([modality, count]) => (
                <div key={modality} className="flex items-center justify-between py-2 border-b border-border-subtle last:border-0">
                  <span className="font-medium">{modality}</span>
                  <div className="flex items-center gap-4">
                    <div className="w-32">
                      <ProgressBar percentage={(count / analytics.totalDeals) * 100} className="h-2" />
                    </div>
                    <span className="text-text-muted w-12 text-right">{count}</span>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Top Buyers */}
        <div className="grid md:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6">Top Buyers by Spend</h2>
            <div className="space-y-4">
              {analytics.topBuyers.map((buyer, idx) => (
                <div key={buyer.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted w-6">#{idx + 1}</span>
                    <div>
                      <div className="font-medium">{buyer.name}</div>
                      <div className="text-sm text-text-muted">{buyer.count} deal{buyer.count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <span className="font-semibold">{formatCurrency(buyer.spend)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Providers */}
          <div className="card">
            <h2 className="text-2xl font-semibold mb-6">Top Providers by Spend</h2>
            <div className="space-y-4">
              {analytics.topProviders.map((provider, idx) => (
                <div key={provider.name} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <span className="text-text-muted w-6">#{idx + 1}</span>
                    <div>
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-text-muted">{provider.count} deal{provider.count !== 1 ? 's' : ''}</div>
                    </div>
                  </div>
                  <span className="font-semibold">{formatCurrency(provider.spend)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

