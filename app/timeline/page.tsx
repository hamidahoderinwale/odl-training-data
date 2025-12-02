import { prisma } from '@/lib/prisma'
import { formatPrice, getYearPeriod } from '@/lib/utils/utils'
import Link from 'next/link'

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

// Timeline-specific price formatting with special terms handling
function formatTimelinePrice(deal: any): string {
  const basePrice = formatPrice(deal)
  
  // Handle special reported terms for timeline display
  if (deal.reportedTerms) {
    const lower = deal.reportedTerms.toLowerCase()
    if (lower.includes('settlement')) {
      return '$1.5B settlement'
    }
    if (lower.includes('arr')) {
      return '$450M ARR'
    }
    if (lower.includes('per title') || lower.includes('$5k')) {
      return '$5K/title'
    }
    if (lower.includes('per year') || lower.includes('/year')) {
      const val = deal.priceRangeMinUsd || deal.priceUsd
      if (val) {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(0)}M/year`
        if (val >= 1000) return `$${(val / 1000).toFixed(0)}K/year`
        return `$${val.toFixed(0)}/year`
      }
    }
    if (lower.includes('per deal') || lower.includes('/deal')) {
      const val = deal.priceRangeMinUsd || deal.priceUsd
      if (val) {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(0)}M/deal`
        if (val >= 1000) return `$${(val / 1000).toFixed(0)}K/deal`
        return `$${val.toFixed(0)}/deal`
      }
    }
    if (lower.includes('(5 years)') || lower.includes('5yr') || lower.includes('5 year')) {
      const val = deal.priceUsd || deal.priceRangeMinUsd
      if (val) {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(0)}M (5 years)`
        return `$${val.toFixed(0)} (5 years)`
      }
    }
    if (lower.includes('(3 years)') || lower.includes('3yr') || lower.includes('3 year')) {
      const val = deal.priceUsd || deal.priceRangeMinUsd
      if (val) {
        if (val >= 1000000) return `$${(val / 1000000).toFixed(0)}M (3 years)`
        return `$${val.toFixed(0)} (3 years)`
      }
    }
    if (lower.includes('49% stake') || lower.includes('stake')) {
      const val = deal.priceUsd || deal.priceRangeMinUsd
      if (val) {
        if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B (49% stake)`
        if (val >= 1000000) return `$${(val / 1000000).toFixed(0)}M (49% stake)`
      }
    }
  }
  
  return basePrice
}

function getDealDescription(deal: any): string {
  // Use dataType if available
  if (deal.dataType) {
    return deal.dataType
  }
  
  // Use notes if available
  if (deal.notes) {
    return deal.notes
  }
  
  // Generate contextual descriptions based on provider and modality
  const provider = deal.provider.toLowerCase()
  const modality = deal.modality.toLowerCase()
  
  // Provider-specific descriptions
  if (provider.includes('laion') || provider.includes('common crawl')) {
    return 'Foundational datasets for open-source models'
  }
  if (provider.includes('shutterstock')) {
    return 'Stock images and video'
  }
  if (provider.includes('taylor') || provider.includes('francis')) {
    return 'Academic journals and textbooks'
  }
  if (provider.includes('reddit')) {
    return 'Social media UGC feed'
  }
  if (provider.includes('news corp')) {
    return 'Largest journalism deal'
  }
  if (provider.includes('dotdash') || provider.includes('meredith')) {
    return 'Magazine archives'
  }
  if (provider.includes('harpercollins')) {
    return '50/50 author split'
  }
  if (provider.includes('wiley')) {
    return 'Scientific content'
  }
  if (provider.includes('tempus')) {
    return 'Patient genomic data'
  }
  if (provider.includes('youtube')) {
    return 'Unpublished videos'
  }
  if (provider.includes('informatica')) {
    return 'Platform acquisition'
  }
  if (provider.includes('le monde')) {
    return '25% to journalists'
  }
  if (provider.includes('scale ai')) {
    return 'Largest data deal'
  }
  if (provider.includes('sourceaudio')) {
    return 'Pre-cleared songs'
  }
  if (provider.includes('author') || provider.includes('publisher')) {
    return 'Class action'
  }
  if (provider.includes('mercor')) {
    return 'Expert-generated data'
  }
  if (provider.includes('planet')) {
    return 'Satellite imagery'
  }
  if (provider.includes('freepik')) {
    return 'Stock images'
  }
  if (provider.includes('chegg')) {
    return 'Educational content'
  }
  if (provider.includes('new york times')) {
    return 'News archive'
  }
  
  // Modality-based fallbacks
  const modalityDesc: Record<string, string> = {
    'text': 'Text content',
    'image': 'Images',
    'audio': 'Audio content',
    'video': 'Video content',
    'image / video': 'Images and video',
    'image + text': 'Images and text',
    'text / q&a': 'Text and Q&A',
    'satellite': 'Satellite imagery',
    'health / biotech': 'Health and biotech data',
    'legal / books': 'Legal and book content',
    'corporate / data infra': 'Corporate data infrastructure',
    'commissioning': 'Commissioned data',
  }
  
  return modalityDesc[modality] || deal.modality
}

export default async function TimelinePage() {
  const deals = await getDealsForTimeline()
  
  // Group deals by time period
  const dealsByPeriod: Record<string, typeof deals> = {
    '2020-2023': [],
    '2024': [],
    '2025': [],
    'Other': [],
  }
  
  deals.forEach(deal => {
    const period = getYearPeriod(deal.date)
    dealsByPeriod[period].push(deal)
  })
  
  // Sort deals within each period by price (descending)
  Object.keys(dealsByPeriod).forEach(period => {
    dealsByPeriod[period].sort((a, b) => {
      const priceA = a.priceUsd || a.priceRangeMinUsd || 0
      const priceB = b.priceUsd || b.priceRangeMinUsd || 0
      return priceB - priceA
    })
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container-content section-padding">
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-semibold mb-1 tracking-tight">Major AI Training Data Deals (2020–2025)</h1>
          <p className="text-text-muted text-sm mb-1">Tracking the emergence of data markets</p>
          <p className="text-text-muted text-xs font-medium">Source: Open Data Labs (opendatalabs.xyz)</p>
        </div>

        {/* Timeline Grid */}
        <div className="timeline-grid">
          {/* 2020-2023 Column */}
          <div className="year-column">
            <div className="year-header">2020–2023</div>
            <div className="deals-list">
              {dealsByPeriod['2020-2023'].length === 0 ? (
                <div className="timeline-empty">No deals in this period</div>
              ) : (
                dealsByPeriod['2020-2023'].map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="deal-card"
                  >
                    <div className="deal-parties">
                      {deal.provider} → {deal.buyer}
                    </div>
                    <div className="deal-value">
                      {formatTimelinePrice(deal)}
                    </div>
                    <div className="deal-desc">
                      {getDealDescription(deal)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* 2024 Column */}
          <div className="year-column">
            <div className="year-header">2024</div>
            <div className="deals-list">
              {dealsByPeriod['2024'].length === 0 ? (
                <div className="timeline-empty">No deals in this period</div>
              ) : (
                dealsByPeriod['2024'].map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="deal-card"
                  >
                    <div className="deal-parties">
                      {deal.provider} → {deal.buyer}
                    </div>
                    <div className="deal-value">
                      {formatTimelinePrice(deal)}
                    </div>
                    <div className="deal-desc">
                      {getDealDescription(deal)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* 2025 Column */}
          <div className="year-column">
            <div className="year-header">2025</div>
            <div className="deals-list">
              {dealsByPeriod['2025'].length === 0 ? (
                <div className="timeline-empty">No deals in this period</div>
              ) : (
                dealsByPeriod['2025'].map((deal) => (
                  <Link
                    key={deal.id}
                    href={`/deals/${deal.id}`}
                    className="deal-card"
                  >
                    <div className="deal-parties">
                      {deal.provider} → {deal.buyer}
                    </div>
                    <div className="deal-value">
                      {formatTimelinePrice(deal)}
                    </div>
                    <div className="deal-desc">
                      {getDealDescription(deal)}
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
