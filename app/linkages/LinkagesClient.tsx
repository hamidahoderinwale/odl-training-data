'use client'

import { useState, useEffect } from 'react'
import React from 'react'
import Tooltip from '@/app/components/ui/Tooltip'
import LinkageRow from './LinkageRow'

interface Linkage {
  id: string
  linkageType: string
  linkageStrength: string
  impactInference: string | null
  deal: {
    id: string
    provider: string
    buyer: string
    modality: string
    priceUsd: number | null
    date: string | null
  }
  model: {
    id: string
    modelId: string
    provider: string
    family: string | null
    tokensEstMid: number | null
  }
}

interface LinkagesClientProps {
  initialLinkages: Linkage[]
}


export default function LinkagesClient({ initialLinkages }: LinkagesClientProps) {
  const [linkages] = useState<Linkage[]>(initialLinkages)
  const [filters, setFilters] = useState({
    linkageType: '',
    linkageStrength: '',
    provider: '',
    buyer: '',
    modelProvider: '',
    modality: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<{ column: string; direction: 'asc' | 'desc' }>({
    column: 'linkageStrength',
    direction: 'desc',
  })
  const [groupBy, setGroupBy] = useState<string>('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Filter linkages
  let filteredLinkages = linkages.filter(linkage => {
    if (!linkage || !linkage.deal || !linkage.model) return false
    
    if (filters.linkageType && linkage.linkageType !== filters.linkageType) return false
    if (filters.linkageStrength && linkage.linkageStrength !== filters.linkageStrength) return false
    if (filters.provider && !linkage.deal.provider.toLowerCase().includes(filters.provider.toLowerCase())) return false
    if (filters.buyer && !linkage.deal.buyer.toLowerCase().includes(filters.buyer.toLowerCase())) return false
    if (filters.modelProvider && !linkage.model.provider.toLowerCase().includes(filters.modelProvider.toLowerCase())) return false
    if (filters.modality && linkage.deal.modality !== filters.modality) return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !linkage.deal.provider.toLowerCase().includes(query) &&
        !linkage.deal.buyer.toLowerCase().includes(query) &&
        !linkage.model.modelId.toLowerCase().includes(query) &&
        !linkage.model.provider.toLowerCase().includes(query) &&
        !linkage.deal.modality.toLowerCase().includes(query)
      ) {
        return false
      }
    }
    return true
  })

  // Sort linkages
  const sortedLinkages = [...filteredLinkages].sort((a, b) => {
    const { column, direction } = sortBy
    let comparison = 0

    switch (column) {
      case 'deal':
        comparison = a.deal.provider.localeCompare(b.deal.provider)
        break
      case 'model':
        comparison = a.model.modelId.localeCompare(b.model.modelId)
        break
      case 'linkageType':
        comparison = a.linkageType.localeCompare(b.linkageType)
        break
      case 'linkageStrength':
        const strengthOrder = { 'high': 3, 'medium': 2, 'low': 1 }
        comparison = (strengthOrder[a.linkageStrength as keyof typeof strengthOrder] || 0) - 
                     (strengthOrder[b.linkageStrength as keyof typeof strengthOrder] || 0)
        break
      case 'date':
        const dateA = a.deal.date || ''
        const dateB = b.deal.date || ''
        comparison = dateA.localeCompare(dateB)
        break
      default:
        comparison = 0
    }

    return direction === 'asc' ? comparison : -comparison
  })

  // Extract unique values for filters
  const linkageTypes = Array.from(new Set(linkages.map(l => l.linkageType))).filter(Boolean).sort()
  const linkageStrengths = Array.from(new Set(linkages.map(l => l.linkageStrength))).filter(Boolean).sort()
  const providers = Array.from(new Set(linkages.map(l => l.deal.provider))).filter(Boolean).sort()
  const buyers = Array.from(new Set(linkages.flatMap(l => l.deal.buyer.split(',').map(b => b.trim())))).filter(Boolean).sort()
  const modelProviders = Array.from(new Set(linkages.map(l => l.model.provider))).filter(Boolean).sort()
  const modalities = Array.from(new Set(linkages.map(l => l.deal.modality))).filter(Boolean).sort()

  // Group linkages
  function groupLinkages(linkages: Linkage[], groupByField: string): Record<string, Linkage[]> {
    if (!groupByField) {
      return { 'All': linkages }
    }

    const groups: Record<string, Linkage[]> = {}

    linkages.forEach(linkage => {
      let groupKey = 'Unknown'
      
      switch (groupByField) {
        case 'linkageType':
          groupKey = linkage.linkageType === 'temporal_overlap' ? 'Same Time Period' : 
                     linkage.linkageType === 'inferred' ? 'Same Company' : 
                     linkage.linkageType || 'Unknown'
          break
        case 'linkageStrength':
          groupKey = linkage.linkageStrength || 'Unknown'
          break
        case 'provider':
          groupKey = linkage.deal.provider || 'Unknown'
          break
        case 'buyer':
          groupKey = linkage.deal.buyer || 'Unknown'
          break
        case 'modelProvider':
          groupKey = linkage.model.provider || 'Unknown'
          break
        case 'modality':
          groupKey = linkage.deal.modality || 'Unknown'
          break
        default:
          groupKey = 'All'
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(linkage)
    })

    return groups
  }

  const groupedLinkages = groupLinkages(sortedLinkages, groupBy)
  const groupKeys = Object.keys(groupedLinkages).sort((a, b) => {
    // Sort by strength order if grouping by strength
    if (groupBy === 'linkageStrength') {
      const strengthOrder = { 'high': 3, 'medium': 2, 'low': 1 }
      return (strengthOrder[b.toLowerCase() as keyof typeof strengthOrder] || 0) - 
             (strengthOrder[a.toLowerCase() as keyof typeof strengthOrder] || 0)
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
      {/* Search and Filters */}
      <div className="card mb-6 p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search linkages..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full text-sm"
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Connection Type</label>
            <select
              value={filters.linkageType}
              onChange={(e) => setFilters({ ...filters, linkageType: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              {linkageTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'temporal_overlap' ? 'Same Time Period' : 
                   type === 'inferred' ? 'Same Company' : type}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Confidence</label>
            <select
              value={filters.linkageStrength}
              onChange={(e) => setFilters({ ...filters, linkageStrength: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              {linkageStrengths.map(strength => (
                <option key={strength} value={strength}>{strength.charAt(0).toUpperCase() + strength.slice(1)}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Data Provider</label>
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
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Model Provider</label>
            <select
              value={filters.modelProvider}
              onChange={(e) => setFilters({ ...filters, modelProvider: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              {modelProviders.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          
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
                setExpandedGroups(new Set())
              }}
              className="input text-sm py-1.5"
            >
              <option value="">None</option>
              <option value="linkageType">Connection Type</option>
              <option value="linkageStrength">Confidence</option>
              <option value="provider">Data Provider</option>
              <option value="buyer">Buyer</option>
              <option value="modelProvider">Model Provider</option>
              <option value="modality">Modality</option>
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
          Showing <span className="font-medium text-text">{sortedLinkages.length}</span> of <span className="font-medium text-text">{linkages.length}</span> linkages
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
                  onClick={() => handleSort('deal')}
                  title="Click to sort by deal"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The training data deal, showing the data provider (who owns the data) and the buyer (the AI company licensing it).">
                      <span className="underline decoration-dotted cursor-help">Deal</span>
                    </Tooltip>
                    {getSortIndicator('deal') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('deal')}</span>
                    )}
                  </div>
                  <div className="text-xs font-normal text-text-muted mt-0.5">Data provider → Buyer</div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none"
                  onClick={() => handleSort('model')}
                  title="Click to sort by model"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The AI model that may have been trained using data from this deal. Linkages are inferred based on company matches and timing.">
                      <span className="underline decoration-dotted cursor-help">Model</span>
                    </Tooltip>
                    {getSortIndicator('model') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('model')}</span>
                    )}
                  </div>
                  <div className="text-xs font-normal text-text-muted mt-0.5">AI model that may have used this data</div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none"
                  onClick={() => handleSort('linkageType')}
                  title="Click to sort by connection type"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The type of connection: 'Same Time Period' (deal and model within 1 year), 'Same Company' (buyer matches model provider), or 'Explicit' (directly stated).">
                      <span className="underline decoration-dotted cursor-help">Connection Type</span>
                    </Tooltip>
                    {getSortIndicator('linkageType') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('linkageType')}</span>
                    )}
                  </div>
                  <div className="text-xs font-normal text-text-muted mt-0.5">How the link was determined</div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none"
                  onClick={() => handleSort('linkageStrength')}
                  title="Click to sort by confidence"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The confidence level in the linkage: High (strong evidence like temporal overlap), Medium (moderate evidence), or Low (weak evidence).">
                      <span className="underline decoration-dotted cursor-help">Confidence</span>
                    </Tooltip>
                    {getSortIndicator('linkageStrength') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('linkageStrength')}</span>
                    )}
                  </div>
                  <div className="text-xs font-normal text-text-muted mt-0.5">How certain we are</div>
                </th>
                <th className="text-left font-semibold">
                  <Tooltip content="An interpretation of what this linkage means - how the deal's data may have impacted the model's training.">
                    <span className="underline decoration-dotted cursor-help">What This Means</span>
                  </Tooltip>
                  <div className="text-xs font-normal text-text-muted mt-0.5">Interpretation of the connection</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedLinkages.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-text-muted">
                    No linkages found matching your filters
                  </td>
                </tr>
              ) : groupBy ? (
                // Grouped view
                groupKeys.map((groupKey) => {
                  const groupLinkages = groupedLinkages[groupKey]
                  const isExpanded = expandedGroups.has(groupKey)
                  
                  return (
                    <React.Fragment key={groupKey}>
                      <tr
                        onClick={() => toggleGroup(groupKey)}
                        className="cursor-pointer bg-border-subtle hover:bg-border transition-colors"
                      >
                        <td colSpan={5}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-text-muted">{isExpanded ? '▼' : '▶'}</span>
                              <span className="font-semibold text-sm">{groupKey}</span>
                              <span className="text-xs text-text-muted">
                                ({groupLinkages.length} {groupLinkages.length === 1 ? 'linkage' : 'linkages'})
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && groupLinkages.map((linkage) => (
                        <LinkageRow key={linkage.id} linkage={linkage} indent />
                      ))}
                    </React.Fragment>
                  )
                })
              ) : (
                // Ungrouped view
                sortedLinkages.map((linkage) => (
                  <LinkageRow key={linkage.id} linkage={linkage} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

