'use client'

import { useState } from 'react'
import DealModal from './DealModal'

interface Deal {
  id: string
  provider: string
  buyer: string
  modality: string
  dataType: string | null
  priceUsd: number | null
  priceRangeMinUsd: number | null
  priceRangeMaxUsd: number | null
  reportedTerms: string | null
  exclusive: boolean | null
  creatorsCompensated: boolean | null
  creatorSplitPercentage: number | null
  revenueShare: boolean | null
  date: string | null
  dealType: string | null
  pricingMechanism: string | null
  sourcePrimary: string | null
  trainingAllowed: boolean | null
  finetuningAllowed: boolean | null
  inferenceAllowed: boolean | null
  redistributionAllowed: boolean | null
  deletionRequired: boolean | null
  notes: string | null
  sources: string | null
  pricingNormalizations?: Array<{
    unitType: string
    normalizedCostPerUnit: number
    normalizationMethod: string
  }>
}

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

  function formatPrice(deal: Deal) {
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

  function formatNormalizedPrice(price: number | null, unitType: string): string {
    if (price === null) return ''
    
    if (price < 0.001) {
      return `$${(price * 1000000).toFixed(2)}/1M ${unitType}s`
    }
    if (price < 1) {
      return `$${price.toFixed(4)}/${unitType}`
    }
    return `$${price.toFixed(2)}/${unitType}`
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
      <div className="card mb-6">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search deals..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Modality</label>
            <select
              value={filters.modality}
              onChange={(e) => setFilters({ ...filters, modality: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              {modalities.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Buyer</label>
            <select
              value={filters.buyer}
              onChange={(e) => setFilters({ ...filters, buyer: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              {buyers.map(b => (
                <option key={b} value={b}>{b}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Provider</label>
            <select
              value={filters.provider}
              onChange={(e) => setFilters({ ...filters, provider: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              {providers.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Exclusive</label>
            <select
              value={filters.exclusive}
              onChange={(e) => setFilters({ ...filters, exclusive: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Creators Comp.</label>
            <select
              value={filters.creatorsCompensated}
              onChange={(e) => setFilters({ ...filters, creatorsCompensated: e.target.value })}
              className="input"
            >
              <option value="">All</option>
              <option value="true">Yes</option>
              <option value="false">No</option>
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th 
                  className="cursor-pointer hover:bg-border-subtle select-none"
                  onClick={() => handleSort('provider')}
                  title="Click to sort by provider"
                >
                  Provider
                  {getSortIndicator('provider') && (
                    <span className="ml-2 text-text-muted">{getSortIndicator('provider')}</span>
                  )}
                </th>
                <th 
                  className="cursor-pointer hover:bg-border-subtle select-none"
                  onClick={() => handleSort('buyer')}
                  title="Click to sort by buyer"
                >
                  Buyer
                  {getSortIndicator('buyer') && (
                    <span className="ml-2 text-text-muted">{getSortIndicator('buyer')}</span>
                  )}
                </th>
                <th 
                  className="cursor-pointer hover:bg-border-subtle select-none"
                  onClick={() => handleSort('modality')}
                  title="Click to sort by modality"
                >
                  Modality
                  {getSortIndicator('modality') && (
                    <span className="ml-2 text-text-muted">{getSortIndicator('modality')}</span>
                  )}
                </th>
                <th 
                  className="cursor-pointer hover:bg-border-subtle select-none"
                  onClick={() => handleSort('price')}
                  title="Click to sort by price"
                >
                  Price
                  {getSortIndicator('price') && (
                    <span className="ml-2 text-text-muted">{getSortIndicator('price')}</span>
                  )}
                </th>
                <th 
                  className="cursor-pointer hover:bg-border-subtle select-none"
                  onClick={() => handleSort('exclusive')}
                  title="Click to sort by exclusivity"
                >
                  Exclusive
                  {getSortIndicator('exclusive') && (
                    <span className="ml-2 text-text-muted">{getSortIndicator('exclusive')}</span>
                  )}
                </th>
                <th 
                  className="cursor-pointer hover:bg-border-subtle select-none"
                  onClick={() => handleSort('creatorsCompensated')}
                  title="Click to sort by creator compensation"
                >
                  Creators Comp.
                  {getSortIndicator('creatorsCompensated') && (
                    <span className="ml-2 text-text-muted">{getSortIndicator('creatorsCompensated')}</span>
                  )}
                </th>
                <th 
                  className="cursor-pointer hover:bg-border-subtle select-none"
                  onClick={() => handleSort('date')}
                  title="Click to sort by date"
                >
                  Date
                  {getSortIndicator('date') && (
                    <span className="ml-2 text-text-muted">{getSortIndicator('date')}</span>
                  )}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedDeals.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-text-muted">
                    No deals found
                  </td>
                </tr>
              ) : (
                sortedDeals.map((deal) => (
                  <tr
                    key={deal.id}
                    onClick={() => handleDealClick(deal)}
                    className="cursor-pointer hover:bg-border-subtle transition-colors"
                  >
                    <td className="font-medium text-accent hover:text-accent-hover">
                      {deal.provider}
                    </td>
                    <td>{deal.buyer}</td>
                    <td>
                      <span className="badge badge-secondary">{deal.modality}</span>
                    </td>
                    <td>
                      <div>
                        <div className="font-medium">{formatPrice(deal)}</div>
                        {(() => {
                          const normalizations = getNormalizations(deal)
                          if (normalizations.length > 0) {
                            // Show stored normalizations first, then calculated
                            const stored = normalizations.filter(n => n.method === 'stored')
                            const calculated = normalizations.filter(n => n.method === 'calculated')
                            const toShow = [...stored, ...calculated].slice(0, 2)
                            
                            return (
                              <div className="mt-1 space-y-0.5">
                                {toShow.map((norm, idx) => (
                                  <div
                                    key={idx}
                                    className={`text-xs ${
                                      norm.method === 'calculated'
                                        ? 'text-text-muted/50 italic'
                                        : 'text-text-muted/70'
                                    }`}
                                    title={norm.method === 'calculated' ? 'Estimated' : 'From database'}
                                  >
                                    {formatNormalizedPrice(norm.price, norm.unitType)}
                                    {norm.method === 'calculated' && ' *'}
                                  </div>
                                ))}
                              </div>
                            )
                          }
                          return null
                        })()}
                      </div>
                    </td>
                    <td>
                      {deal.exclusive === true ? (
                        <span className="badge badge-primary">Yes</span>
                      ) : deal.exclusive === false ? (
                        <span className="text-text-muted">No</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td>
                      {deal.creatorsCompensated === true ? (
                        <span className="badge badge-primary">Yes</span>
                      ) : deal.creatorsCompensated === false ? (
                        <span className="text-text-muted">No</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </td>
                    <td className="text-text-muted">{deal.date || '—'}</td>
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

