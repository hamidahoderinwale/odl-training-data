import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import DealsClient from './deals/DealsClient'

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
    },
  })
  return deals
}

async function getStats() {
  const deals = await prisma.deal.findMany()
  
  const totalDeals = deals.length
  const totalSpend = deals.reduce((sum, deal) => sum + (deal.priceUsd || 0), 0)
  const compensatedDeals = deals.filter(d => d.creatorsCompensated === true).length
  const compensatedPercent = totalDeals > 0 ? Math.round((compensatedDeals / totalDeals) * 100) : 0
  
  return {
    totalDeals,
    totalSpend,
    compensatedPercent,
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
  const stats = await getStats()

  return (
    <main className="min-h-screen bg-background">
      <div className="container-content section-padding">
        {/* Header with stats */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-semibold mb-2">AI Training Data Deals</h1>
              <p className="text-text-muted text-lg">
                Global licensing, acquisition, and commissioning deals (2020–2025)
              </p>
            </div>
            <div className="flex gap-2">
              <Link href="/analytics" className="btn-secondary text-sm">
                Analytics
              </Link>
              <Link href="/normalization" className="btn-secondary text-sm">
                Normalization
              </Link>
            </div>
          </div>
          
          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="stat-card">
              <div className="stat-value">{stats.totalDeals}</div>
              <div className="stat-label">Total Deals</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{formatCurrency(stats.totalSpend)}</div>
              <div className="stat-label">Total Reported Spend</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.compensatedPercent}%</div>
              <div className="stat-label">With Creator Compensation</div>
            </div>
          </div>
        </div>

        {/* Deals Explorer */}
        <DealsClient initialDeals={deals} />
      </div>
    </main>
  )
}
