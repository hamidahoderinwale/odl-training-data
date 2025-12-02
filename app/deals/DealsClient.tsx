'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import DealModal from './DealModal'
import type { Deal } from '@/lib/types/deal'
import Tooltip from '@/app/components/ui/Tooltip'

interface DealsClientProps {
  initialDeals: Deal[]
}

export default function DealsClient({ initialDeals }: DealsClientProps) {
  const [deals] = useState<Deal[]>(initialDeals)
  const [filters, setFilters] = useState({
    modality: '',
    buyer: '',
    provider: '',
    exclusive: '',
    creatorsCompensated: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [sortBy, setSortBy] = useState<{ column: string; direction: 'asc' | 'desc' }>({
    column: 'date',
    direction: 'desc',
  })
  const [groupBy, setGroupBy] = useState<string>('') // 'year', 'modality', 'buyer', 'provider', ''
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  function formatDate(dateString: string | null): string {
    if (!dateString) return '—'
    
    // Handle formats like "2025-09-05", "2025-08", "2025 H1", "2023-2024"
    if (dateString.includes('H1') || dateString.includes('H2')) {
      return dateString
    }
    
    if (dateString.includes('–') || dateString.includes('-')) {
      const parts = dateString.split(/[–-]/)
      if (parts.length === 2) {
        const start = formatDate(parts[0].trim())
        const end = formatDate(parts[1].trim())
        return `${start}–${end}`
      }
    }
    
    // Try to parse as date
    const date = new Date(dateString)
    if (!isNaN(date.getTime())) {
      const month = date.toLocaleDateString('en-US', { month: 'short' })
      const year = date.getFullYear()
      return `${month} ${year}`
    }
    
    // If it's just a year or year-month, return as is
    if (/^\d{4}$/.test(dateString)) {
      return dateString
    }
    if (/^\d{4}-\d{2}$/.test(dateString)) {
      const [year, month] = dateString.split('-')
      const monthName = new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('en-US', { month: 'short' })
      return `${monthName} ${year}`
    }
    
    return dateString
  }

  let filteredDeals = deals.filter(deal => {
    if (filters.modality && deal.modality !== filters.modality) return false
    if (filters.buyer && !deal.buyer.toLowerCase().includes(filters.buyer.toLowerCase())) return false
    if (filters.provider && !deal.provider.toLowerCase().includes(filters.provider.toLowerCase())) return false
    if (filters.exclusive === 'true' && deal.exclusive !== true) return false
    if (filters.exclusive === 'false' && deal.exclusive !== false) return false
    if (filters.creatorsCompensated === 'true' && deal.creatorsCompensated !== true) return false
    if (filters.creatorsCompensated === 'false' && deal.creatorsCompensated !== false) return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !deal.provider.toLowerCase().includes(query) &&
        !deal.buyer.toLowerCase().includes(query) &&
        !deal.modality.toLowerCase().includes(query) &&
        !(deal.reportedTerms && deal.reportedTerms.toLowerCase().includes(query))
      ) {
        return false
      }
    }
    return true
  })

  // Sort deals
  const sortedDeals = [...filteredDeals].sort((a, b) => {
    const { column, direction } = sortBy
    let comparison = 0

    switch (column) {
      case 'provider':
        comparison = a.provider.localeCompare(b.provider)
        break
      case 'buyer':
        comparison = a.buyer.localeCompare(b.buyer)
        break
      case 'modality':
        comparison = a.modality.localeCompare(b.modality)
        break
      case 'price':
        const priceA = a.priceUsd || a.priceRangeMinUsd || 0
        const priceB = b.priceUsd || b.priceRangeMinUsd || 0
        comparison = priceA - priceB
        break
      case 'exclusive':
        const exclusiveA = a.exclusive === true ? 1 : a.exclusive === false ? 0 : -1
        const exclusiveB = b.exclusive === true ? 1 : b.exclusive === false ? 0 : -1
        comparison = exclusiveA - exclusiveB
        break
      case 'creatorsCompensated':
        const compA = a.creatorsCompensated === true ? 1 : a.creatorsCompensated === false ? 0 : -1
        const compB = b.creatorsCompensated === true ? 1 : b.creatorsCompensated === false ? 0 : -1
        comparison = compA - compB
        break
      case 'date':
      default:
        if (!a.date && !b.date) comparison = 0
        else if (!a.date) comparison = 1
        else if (!b.date) comparison = -1
        else comparison = a.date.localeCompare(b.date)
        break
    }

    return direction === 'asc' ? comparison : -comparison
  })

  const modalities = Array.from(new Set(deals.map(d => d.modality))).sort()
  const buyers = Array.from(new Set(deals.flatMap(d => d.buyer.split(',').map(b => b.trim())))).sort()
  const providers = Array.from(new Set(deals.map(d => d.provider))).sort()

  // Extract year from date string
  function extractYear(dateString: string | null): string {
    if (!dateString) return 'Unknown'
    
    // Try to extract year from various formats
    const yearMatch = dateString.match(/\b(20\d{2})\b/)
    if (yearMatch) {
      return yearMatch[1]
    }
    
    // Handle ranges like "2023-2024"
    if (dateString.includes('–') || dateString.includes('-')) {
      const parts = dateString.split(/[–-]/)
      if (parts.length === 2) {
        const startYear = parts[0].trim().match(/\b(20\d{2})\b/)
        if (startYear) {
          return startYear[1]
        }
      }
    }
    
    return 'Unknown'
  }

  // Group deals
  function groupDeals(deals: Deal[], groupByField: string): Record<string, Deal[]> {
    if (!groupByField) {
      return { 'All': deals }
    }

    const groups: Record<string, Deal[]> = {}

    deals.forEach(deal => {
      let groupKey = 'Unknown'
      
      switch (groupByField) {
        case 'year':
          groupKey = extractYear(deal.date)
          break
        case 'modality':
          groupKey = deal.modality || 'Unknown'
          break
        case 'buyer':
          groupKey = deal.buyer || 'Unknown'
          break
        case 'provider':
          groupKey = deal.provider || 'Unknown'
          break
        default:
          groupKey = 'All'
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(deal)
    })

    return groups
  }

  // Get grouped deals
  const groupedDeals = groupDeals(sortedDeals, groupBy)
  const groupKeys = Object.keys(groupedDeals).sort((a, b) => {
    // Sort years descending, others alphabetically
    if (groupBy === 'year') {
      if (a === 'Unknown') return 1
      if (b === 'Unknown') return -1
      return parseInt(b) - parseInt(a)
    }
    return a.localeCompare(b)
  })

  const toggleGroup = (groupKey: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(groupKey)) {
        next.delete(groupKey)
      } else {
        next.add(groupKey)
      }
      return next
    })
  }

  // Expand all groups by default
  useEffect(() => {
    if (groupBy && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groupKeys))
    }
  }, [groupBy, groupKeys])

  const handleDealClick = (deal: Deal) => {
    setSelectedDeal(deal)
    setIsModalOpen(true)
  }

  const handleSort = (column: string) => {
    setSortBy(prev => ({
      column,
      direction: prev.column === column && prev.direction === 'asc' ? 'desc' : 'asc',
    }))
  }

  const getSortIndicator = (column: string) => {
    if (sortBy.column !== column) return null
    return sortBy.direction === 'asc' ? '↑' : '↓'
  }

  return (
    <>
      <DealModal
        deal={selectedDeal}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedDeal(null)
        }}
      />
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
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Exclusive</label>
            <select
              value={filters.exclusive}
              onChange={(e) => setFilters({ ...filters, exclusive: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Creators Comp.</label>
            <select
              value={filters.creatorsCompensated}
              onChange={(e) => setFilters({ ...filters, creatorsCompensated: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grouping and Results Count */}
      <div className="mb-3 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wide">Group by:</label>
            <select
              value={groupBy}
              onChange={(e) => {
                setGroupBy(e.target.value)
                setExpandedGroups(new Set()) // Reset expanded groups
              }}
              className="input text-sm py-1.5"
            >
              <option value="">None</option>
              <option value="year">Year</option>
              <option value="modality">Modality</option>
              <option value="buyer">Buyer</option>
              <option value="provider">Provider</option>
            </select>
          </div>
          {groupBy && (
            <button
              onClick={() => {
                setExpandedGroups(new Set(groupKeys))
              }}
              className="text-xs text-accent hover:text-accent-hover"
            >
              Expand All
            </button>
          )}
          {groupBy && (
            <button
              onClick={() => {
                setExpandedGroups(new Set())
              }}
              className="text-xs text-accent hover:text-accent-hover"
            >
              Collapse All
            </button>
          )}
        </div>
        <div className="text-sm text-text-muted">
          Showing <span className="font-medium text-text">{sortedDeals.length}</span> of <span className="font-medium text-text">{deals.length}</span> deals
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="table text-sm">
            <thead>
              <tr className="bg-border-subtle">
                <th 
                  className="cursor-pointer hover:bg-border select-none"
                  onClick={() => handleSort('provider')}
                  title="Click to sort by provider"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The organization or entity that owns and provides the training data (e.g., News Corp, Reddit, Shutterstock).">
                      <span className="underline decoration-dotted cursor-help">Provider</span>
                    </Tooltip>
                    {getSortIndicator('provider') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('provider')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3"
                  onClick={() => handleSort('buyer')}
                  title="Click to sort by buyer"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The AI company or organization that is licensing or purchasing the training data (e.g., OpenAI, Google, Meta).">
                      <span className="underline decoration-dotted cursor-help">Buyer</span>
                    </Tooltip>
                    {getSortIndicator('buyer') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('buyer')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3"
                  onClick={() => handleSort('modality')}
                  title="Click to sort by modality"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The type of data being licensed (Text, Image, Audio, Video, etc.). This indicates what kind of content the AI model will be trained on.">
                      <span className="underline decoration-dotted cursor-help">Modality</span>
                    </Tooltip>
                    {getSortIndicator('modality') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('modality')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3 text-right"
                  onClick={() => handleSort('price')}
                  title="Click to sort by price"
                >
                  <div className="flex items-center justify-end gap-2">
                    <Tooltip content="The total deal value in USD. Click on prices to see normalized per-unit costs (e.g., cost per token, per image, per minute).">
                      <span className="underline decoration-dotted cursor-help">Price</span>
                    </Tooltip>
                    {getSortIndicator('price') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('price')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3 text-center"
                  onClick={() => handleSort('exclusive')}
                  title="Click to sort by exclusivity"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Tooltip content="Whether the deal grants exclusive rights to the buyer. Exclusive deals mean the data provider cannot license the same data to other AI companies.">
                      <span className="underline decoration-dotted cursor-help">Exclusive</span>
                    </Tooltip>
                    {getSortIndicator('exclusive') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('exclusive')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3 text-center"
                  onClick={() => handleSort('creatorsCompensated')}
                  title="Click to sort by creator compensation"
                >
                  <div className="flex items-center justify-center gap-2">
                    <Tooltip content="Whether the original creators (authors, artists, musicians, etc.) are compensated for their work being used in AI training. This can include direct payments, revenue sharing, or royalties.">
                      <span className="underline decoration-dotted cursor-help">Creators Comp.</span>
                    </Tooltip>
                    {getSortIndicator('creatorsCompensated') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('creatorsCompensated')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3"
                  onClick={() => handleSort('date')}
                  title="Click to sort by date"
                >
                  <div className="flex items-center gap-2">
                    Date
                    {getSortIndicator('date') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('date')}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-text-muted">
                    No deals found matching your filters
                  </td>
                </tr>
              ) : groupBy ? (
                // Grouped view
                groupKeys.map((groupKey) => {
                  const groupDeals = groupedDeals[groupKey]
                  const isExpanded = expandedGroups.has(groupKey)
                  const groupTotal = groupDeals.reduce((sum, d) => sum + (d.priceUsd || d.priceRangeMinUsd || 0), 0)
                  
                  return (
                    <React.Fragment key={groupKey}>
                      <tr
                        onClick={() => toggleGroup(groupKey)}
                        className="cursor-pointer bg-border-subtle hover:bg-border transition-colors"
                      >
                        <td colSpan={7}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-text-muted">{isExpanded ? '▼' : '▶'}</span>
                              <span className="font-semibold text-sm">
                                {groupBy === 'year' ? `${groupKey} Deals` : groupKey}
                              </span>
                              <span className="text-xs text-text-muted">
                                ({groupDeals.length} {groupDeals.length === 1 ? 'deal' : 'deals'})
                              </span>
                              {groupTotal > 0 && (
                                <span className="text-xs text-text-muted">
                                  • {(() => {
                                    const total = groupTotal
                                    if (total >= 1000000000) return `$${(total / 1000000000).toFixed(1)}B`
                                    if (total >= 1000000) return `$${(total / 1000000).toFixed(1)}M`
                                    if (total >= 1000) return `$${(total / 1000).toFixed(0)}K`
                                    return `$${total.toFixed(0)}`
                                  })()} total
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && groupDeals.map((deal) => (
                        <tr
                          key={deal.id}
                          onClick={() => handleDealClick(deal)}
                          className="cursor-pointer transition-colors border-b border-border-subtle last:border-0 hover:bg-[rgba(232,225,217,0.3)]"
                        >
                          <td className="pl-6">
                            <div className="flex items-center gap-2">
                              <div className="font-medium text-accent hover:text-accent-hover">
                                {deal.provider}
                              </div>
                              {deal.discoveredVia === 'exa' && (
                                <span 
                                  className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-none font-mono"
                                  title={`Source: Exa${deal.exaQuery ? ` (${deal.exaQuery})` : ''}${deal.exaScore ? ` - Score: ${deal.exaScore.toFixed(2)}` : ''}`}
                                >
                                  ARTICLE
                                </span>
                              )}
                              {deal.discoveredVia && deal.discoveredVia !== 'exa' && (
                                <span 
                                  className="text-[10px] px-1.5 py-0.5 bg-border-subtle text-text-muted rounded-none"
                                  title={`Discovered via ${deal.discoveredVia}`}
                                >
                                  {deal.discoveredVia.toUpperCase()}
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="text-sm">{deal.buyer}</div>
                          </td>
                          <td>
                            <span className="badge badge-secondary text-xs">{deal.modality}</span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <PriceCellWithTooltip deal={deal} />
                          </td>
                          <td className="px-4 py-3 text-center">
                            {deal.exclusive === true ? (
                              <span className="badge badge-primary text-xs">Yes</span>
                            ) : deal.exclusive === false ? (
                              <span className="text-text-muted/60 text-xs">No</span>
                            ) : (
                              <span className="text-text-muted/40 text-xs">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {deal.creatorsCompensated === true ? (
                              <span className="badge badge-primary text-xs">Yes</span>
                            ) : deal.creatorsCompensated === false ? (
                              <span className="text-text-muted/60 text-xs">No</span>
                            ) : (
                              <span className="text-text-muted/40 text-xs">—</span>
                            )}
                          </td>
                          <td>
                            <div className="text-sm text-text-muted/80">{formatDate(deal.date)}</div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  )
                })
              ) : (
                // Ungrouped view
                sortedDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => handleDealClick(deal)}
                    className="cursor-pointer transition-colors border-b border-border-subtle last:border-0 hover:bg-[rgba(232,225,217,0.3)]"
                  >
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-accent hover:text-accent-hover">
                          {deal.provider}
                        </div>
                        {deal.discoveredVia === 'exa' && (
                          <span 
                            className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-none font-mono"
                            title={`Source: Exa${deal.exaQuery ? ` (${deal.exaQuery})` : ''}${deal.exaScore ? ` - Score: ${deal.exaScore.toFixed(2)}` : ''}`}
                          >
                            ARTICLE
                          </span>
                        )}
                        {deal.discoveredVia && deal.discoveredVia !== 'exa' && (
                          <span 
                            className="text-[10px] px-1.5 py-0.5 bg-border-subtle text-text-muted rounded-none"
                            title={`Discovered via ${deal.discoveredVia}`}
                          >
                            {deal.discoveredVia.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="text-sm">{deal.buyer}</div>
                    </td>
                    <td>
                      <span className="badge badge-secondary text-xs">{deal.modality}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <PriceCellWithTooltip deal={deal} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deal.exclusive === true ? (
                        <span className="badge badge-primary text-xs">Yes</span>
                      ) : deal.exclusive === false ? (
                        <span className="text-text-muted/60 text-xs">No</span>
                      ) : (
                        <span className="text-text-muted/40 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {deal.creatorsCompensated === true ? (
                        <span className="badge badge-primary text-xs">Yes</span>
                      ) : deal.creatorsCompensated === false ? (
                        <span className="text-text-muted/60 text-xs">No</span>
                      ) : (
                        <span className="text-text-muted/40 text-xs">—</span>
                      )}
                    </td>
                    <td>
                      <div className="text-sm text-text-muted/80">{formatDate(deal.date)}</div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

// Price Cell with Tooltip Component
function PriceCellWithTooltip({ deal }: { deal: Deal }) {
  const [showTooltip, setShowTooltip] = useState(false)
  const normalizations = getNormalizations(deal)
  
  const stored = normalizations.filter(n => n.method === 'stored')
  const calculated = normalizations.filter(n => n.method === 'calculated')
  const toShow = [...stored, ...calculated].slice(0, 3)

  if (normalizations.length === 0) {
    return (
      <div>
        <div className="font-semibold text-base mb-1">{formatPrice(deal)}</div>
      </div>
    )
  }

  return (
    <div className="relative">
      <div
        className="cursor-help"
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
      >
        <div className="font-semibold text-base mb-1">{formatPrice(deal)}</div>
        <div className="mt-1.5 space-y-1">
          {toShow.map((norm, idx) => (
            <div
              key={idx}
              className={`text-xs text-right font-mono ${
                norm.method === 'calculated'
                  ? 'text-text-muted/60 italic'
                  : 'text-text-muted/90 font-medium'
              }`}
            >
              {formatNormalizedPrice(norm.price, norm.unitType)}
              {norm.method === 'calculated' && ' *'}
            </div>
          ))}
        </div>
      </div>
      {showTooltip && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-surface border border-border rounded-none shadow-lg p-3 min-w-[280px]">
          <div className="text-xs font-semibold mb-2 text-text">Normalized Pricing</div>
          <div className="space-y-2">
            {normalizations.map((norm, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Per {norm.unitType}:</span>
                <span className={`font-mono ${
                  norm.method === 'calculated' ? 'text-text-muted/80 italic' : 'font-medium'
                }`}>
                  {formatNormalizedPrice(norm.price, norm.unitType)}
                  {norm.method === 'calculated' && ' *'}
                </span>
              </div>
            ))}
          </div>
          {calculated.length > 0 && (
            <div className="mt-2 pt-2 border-t border-border-subtle text-[10px] text-text-muted italic">
              * Estimated values
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper functions (moved outside component for reuse)
function formatPrice(deal: Deal) {
  if (deal.priceUsd) {
    if (deal.priceUsd >= 1000000000) {
      return `$${(deal.priceUsd / 1000000000).toFixed(1)}B`
    }
    if (deal.priceUsd >= 1000000) {
      return `$${(deal.priceUsd / 1000000).toFixed(1)}M`
    }
    if (deal.priceUsd >= 1000) {
      return `$${(deal.priceUsd / 1000).toFixed(0)}K`
    }
    return `$${deal.priceUsd.toFixed(0)}`
  }
  if (deal.priceRangeMinUsd && deal.priceRangeMaxUsd) {
    const formatValue = (val: number) => {
      if (val >= 1000000000) return `$${(val / 1000000000).toFixed(1)}B`
      if (val >= 1000000) return `$${(val / 1000000).toFixed(1)}M`
      if (val >= 1000) return `$${(val / 1000).toFixed(0)}K`
      return `$${val.toFixed(0)}`
    }
    return `${formatValue(deal.priceRangeMinUsd)}–${formatValue(deal.priceRangeMaxUsd)}`
  }
  return deal.reportedTerms || 'Undisclosed'
}

function formatNormalizedPrice(price: number | null, unitType: string): string {
  if (price === null) return ''
  
  if (price < 0.0001) {
    return `$${(price * 1000000).toFixed(2)}/1M ${unitType}s`
  }
  if (price < 0.01) {
    return `$${price.toFixed(4)}/${unitType}`
  }
  if (price < 1) {
    return `$${price.toFixed(2)}/${unitType}`
  }
  return `$${price.toFixed(2)}/${unitType}`
}

function calculateNormalization(deal: Deal, unitType: string): number | null {
  if (!deal.priceUsd) return null

  switch (unitType) {
    case 'token':
      if (deal.modality === 'Text') {
        if (deal.dataType?.toLowerCase().includes('book')) {
          return deal.priceUsd / 80000 // per token (80k tokens per book)
        }
        return deal.priceUsd / 1000 // per token (article estimate)
      }
      return null

    case 'record':
      if (deal.dealType === 'per-unit') {
        return deal.priceUsd / 1000000 // rough estimate
      }
      return null

    case 'image':
      if (deal.modality === 'Image') {
        if (deal.dataType?.includes('200M')) {
          return deal.priceUsd / 200000000 // Freepik example
        }
        return deal.priceUsd / 1000000 // rough estimate
      }
      return null

    case 'minute':
      if (deal.modality === 'Video' || deal.modality === 'Audio') {
        return deal.priceUsd / 60 // per minute (1 hour estimate)
      }
      return null

    default:
      return null
  }
}

function getNormalizations(deal: Deal) {
  const normalizations: Array<{ unitType: string; price: number; method: 'stored' | 'calculated' }> = []
  
  // Add stored normalizations
  if (deal.pricingNormalizations) {
    deal.pricingNormalizations.forEach(norm => {
      normalizations.push({
        unitType: norm.unitType,
        price: norm.normalizedCostPerUnit,
        method: 'stored',
      })
    })
  }
  
  // Calculate missing normalizations
  const unitTypes = ['token', 'record', 'image', 'minute']
  const storedUnitTypes = new Set(deal.pricingNormalizations?.map(n => n.unitType) || [])
  
  unitTypes.forEach(unitType => {
    if (!storedUnitTypes.has(unitType)) {
      const calculated = calculateNormalization(deal, unitType)
      if (calculated !== null) {
        normalizations.push({
          unitType,
          price: calculated,
          method: 'calculated',
        })
      }
    }
  })
  
  return normalizations
}


