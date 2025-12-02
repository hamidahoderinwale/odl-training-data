'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { formatPrice, getYearPeriod } from '@/lib/utils/utils'

interface Deal {
  id: string
  provider: string
  buyer: string
  modality: string
  priceUsd: number | null
  priceRangeMinUsd: number | null
  priceRangeMaxUsd: number | null
  reportedTerms: string | null
  date: string | null
  notes: string | null
  dealType: string | null
  exclusive: boolean | null
  creatorsCompensated: boolean | null
  dataType: string | null
}

interface TimelineClientProps {
  initialDeals: Deal[]
}

// Timeline-specific price formatting with special terms handling
function formatTimelinePrice(deal: Deal): string {
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

function getDealDescription(deal: Deal): string {
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

export default function TimelineClient({ initialDeals }: TimelineClientProps) {
  const [deals] = useState<Deal[]>(initialDeals)
  const [filters, setFilters] = useState({
    modality: '',
    buyer: '',
    provider: '',
    period: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<'price' | 'date' | 'provider' | 'buyer'>('price')

  // Filter deals
  const filteredDeals = useMemo(() => {
    return deals.filter(deal => {
      if (filters.modality && deal.modality !== filters.modality) return false
      if (filters.buyer && !deal.buyer.toLowerCase().includes(filters.buyer.toLowerCase())) return false
      if (filters.provider && !deal.provider.toLowerCase().includes(filters.provider.toLowerCase())) return false
      
      if (filters.period) {
        const period = getYearPeriod(deal.date)
        if (period !== filters.period) return false
      }
      
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        if (
          !deal.provider.toLowerCase().includes(query) &&
          !deal.buyer.toLowerCase().includes(query) &&
          !deal.modality.toLowerCase().includes(query) &&
          !(deal.dataType && deal.dataType.toLowerCase().includes(query))
        ) {
          return false
        }
      }
      return true
    })
  }, [deals, filters, searchQuery])

  // Group deals by time period
  const dealsByPeriod = useMemo(() => {
    const grouped: Record<string, Deal[]> = {
      '2020-2023': [],
      '2024': [],
      '2025': [],
      'Other': [],
    }
    
    filteredDeals.forEach(deal => {
      const period = getYearPeriod(deal.date)
      grouped[period].push(deal)
    })
    
    // Sort deals within each period
    Object.keys(grouped).forEach(period => {
      grouped[period].sort((a, b) => {
        switch (sortBy) {
          case 'price':
            const priceA = a.priceUsd || a.priceRangeMinUsd || 0
            const priceB = b.priceUsd || b.priceRangeMinUsd || 0
            return priceB - priceA
          case 'date':
            if (!a.date && !b.date) return 0
            if (!a.date) return 1
            if (!b.date) return -1
            return a.date.localeCompare(b.date)
          case 'provider':
            return a.provider.localeCompare(b.provider)
          case 'buyer':
            return a.buyer.localeCompare(b.buyer)
          default:
            return 0
        }
      })
    })
    
    return grouped
  }, [filteredDeals, sortBy])

  const modalities = Array.from(new Set(deals.map(d => d.modality))).sort()
  const buyers = Array.from(new Set(deals.flatMap(d => d.buyer.split(',').map(b => b.trim())))).sort()
  const providers = Array.from(new Set(deals.map(d => d.provider))).sort()

  return (
    <>
      {/* Search and Filters */}
      <div className="card mb-6 p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full text-sm"
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Modality</label>
            <select
              value={filters.modality}
              onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              {modalities.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Buyer</label>
            <select
              value={filters.buyer}
              onChange={(e) => setFilters({ ...filters, buyer: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              {buyers.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Provider</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              {providers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Period</label>
            <select
              value={filters.period}
              onChange={(e) => setFilters({ ...filters, period: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              <option value="2020-2023">2020-2023</option>
              <option value="2024">2024</option>
              <option value="2025">2025</option>
              <option value="Other">Other</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Sort By</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="input text-sm py-1.5"
            >
              <option value="price">Price (High to Low)</option>
              <option value="date">Date</option>
              <option value="provider">Provider</option>
              <option value="buyer">Buyer</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm text-text-muted">
          Showing <span className="font-medium text-text">{filteredDeals.length}</span> of <span className="font-medium text-text">{deals.length}</span> deals
        </div>
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
    </>
  )
}


