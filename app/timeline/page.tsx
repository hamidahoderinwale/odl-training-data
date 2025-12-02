import { prisma } from '@/lib/prisma'
import TimelineClient from './TimelineClient'

async function getDealsForTimeline() {
  const deals = await prisma.deal.findMany({
    orderBy: { date: 'asc' },
    select: {
      id: true,
      provider: true,
      buyer: true,
      modality: true,
      priceUsd: true,
      priceRangeMinUsd: true,
      priceRangeMaxUsd: true,
      reportedTerms: true,
      date: true,
      notes: true,
      dealType: true,
      exclusive: true,
      creatorsCompensated: true,
      dataType: true,
    },
  })
  return deals
}

export default async function TimelinePage() {
  const deals = await getDealsForTimeline()

  return (
    <div className="min-h-screen bg-background">
      <div className="container-content section-padding">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-semibold mb-1 tracking-tight">Major AI Training Data Deals (2020–2025)</h1>
          <p className="text-text-muted text-sm mb-1">Tracking the emergence of data markets</p>
          <p className="text-text-muted text-xs font-medium">Source: Open Data Labs (opendatalabs.xyz)</p>
        </div>

        {/* Timeline with Filtering, Sorting */}
        <TimelineClient initialDeals={deals} />
      </div>
    </div>
  )
}
