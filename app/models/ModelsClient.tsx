'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/utils'
import TokenEstimateTooltip from '@/app/components/models/TokenEstimateTooltip'
import Tooltip from '@/app/components/ui/Tooltip'

interface Model {
  id: string
  modelId: string
  provider: string
  family: string | null
  releaseDate: string | null
  params: number | null
  tokensEstMin: number | null
  tokensEstMax: number | null
  tokensEstMid: number | null
  evidenceStrength: string | null
  architectureType: string | null
  isMoe: boolean | null
  multimodal: boolean | null
}

interface ModelsClientProps {
  initialModels: Model[]
}

function formatTokens(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1e15) return `${(value / 1e15).toFixed(1)}P`
  if (value >= 1e12) return `${(value / 1e12).toFixed(1)}T`
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}B`
  return `${(value / 1e6).toFixed(0)}M`
}

function formatParams(value: number | null | undefined): string {
  if (!value) return '—'
  if (value >= 1000) return `${(value / 1000).toFixed(1)}T`
  return `${value.toFixed(1)}B`
}

export default function ModelsClient({ initialModels }: ModelsClientProps) {
  const [models] = useState<Model[]>(initialModels)
  const [filters, setFilters] = useState({
    provider: '',
    architectureType: '',
    evidenceStrength: '',
    multimodal: '',
  })
  const [searchQuery, setSearchQuery] = useState('')
  const [sortBy, setSortBy] = useState<{ column: string; direction: 'asc' | 'desc' }>({
    column: 'releaseDate',
    direction: 'desc',
  })
  const [groupBy, setGroupBy] = useState<string>('provider')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  // Filter models
  let filteredModels = models.filter(model => {
    if (filters.provider && !model.provider.toLowerCase().includes(filters.provider.toLowerCase())) return false
    if (filters.architectureType && model.architectureType !== filters.architectureType) return false
    if (filters.evidenceStrength && model.evidenceStrength !== filters.evidenceStrength) return false
    if (filters.multimodal === 'true' && model.multimodal !== true) return false
    if (filters.multimodal === 'false' && model.multimodal !== false) return false
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      if (
        !model.modelId.toLowerCase().includes(query) &&
        !model.provider.toLowerCase().includes(query) &&
        !(model.family && model.family.toLowerCase().includes(query)) &&
        !(model.architectureType && model.architectureType.toLowerCase().includes(query))
      ) {
        return false
      }
    }
    return true
  })

  // Sort models with improved logic
  const sortedModels = [...filteredModels].sort((a, b) => {
    const { column, direction } = sortBy
    let comparison = 0

    switch (column) {
      case 'modelId':
        // A-Z / Z-A text sorting with numeric awareness
        const modelIdA = (a.modelId || '').toLowerCase().trim()
        const modelIdB = (b.modelId || '').toLowerCase().trim()
        comparison = modelIdA.localeCompare(modelIdB, undefined, { numeric: true, sensitivity: 'base' })
        break
      case 'provider':
        // A-Z / Z-A text sorting
        const providerA = (a.provider || '').toLowerCase().trim()
        const providerB = (b.provider || '').toLowerCase().trim()
        comparison = providerA.localeCompare(providerB, undefined, { numeric: true, sensitivity: 'base' })
        break
      case 'params':
        // Numeric sorting: nulls go to end
        const paramsA = a.params ?? null
        const paramsB = b.params ?? null
        if (paramsA === null && paramsB === null) comparison = 0
        else if (paramsA === null) comparison = 1
        else if (paramsB === null) comparison = -1
        else comparison = paramsA - paramsB
        break
      case 'tokens':
        // Numeric sorting: nulls go to end
        const tokensA = a.tokensEstMid ?? null
        const tokensB = b.tokensEstMid ?? null
        if (tokensA === null && tokensB === null) comparison = 0
        else if (tokensA === null) comparison = 1
        else if (tokensB === null) comparison = -1
        else comparison = tokensA - tokensB
        break
      case 'architectureType':
        // A-Z / Z-A text sorting
        const archA = (a.architectureType || '').toLowerCase().trim()
        const archB = (b.architectureType || '').toLowerCase().trim()
        comparison = archA.localeCompare(archB, undefined, { numeric: true, sensitivity: 'base' })
        break
      case 'evidenceStrength':
        // Ordinal sorting: high > medium > low > null
        const strengthOrder = { 'high': 4, 'medium': 3, 'low': 2, 's-high': 4, 's-medium': 3, 's-low': 2 }
        const strengthA = strengthOrder[(a.evidenceStrength || '').toLowerCase() as keyof typeof strengthOrder] || 0
        const strengthB = strengthOrder[(b.evidenceStrength || '').toLowerCase() as keyof typeof strengthOrder] || 0
        comparison = strengthA - strengthB
        break
      case 'releaseDate':
      default:
        // Date sorting: extract year for comparison, nulls go to end
        const dateA = a.releaseDate || ''
        const dateB = b.releaseDate || ''
        if (!dateA && !dateB) comparison = 0
        else if (!dateA) comparison = 1
        else if (!dateB) comparison = -1
        else {
          // Extract year for better sorting
          const yearA = dateA.match(/\b(20\d{2})\b/)?.[1] || '0000'
          const yearB = dateB.match(/\b(20\d{2})\b/)?.[1] || '0000'
          if (yearA !== yearB) {
            comparison = yearA.localeCompare(yearB)
          } else {
            // Same year, compare full date string
            comparison = dateA.localeCompare(dateB)
          }
        }
        break
    }

    return direction === 'asc' ? comparison : -comparison
  })

  // Extract unique values for filters
  const providers = Array.from(new Set(models.map(m => m.provider))).sort()
  const architectureTypes = Array.from(new Set(models.map(m => m.architectureType).filter((a): a is string => Boolean(a)))).sort()
  const evidenceStrengths = Array.from(new Set(models.map(m => m.evidenceStrength).filter((e): e is string => Boolean(e)))).sort()

  // Extract year from release date
  function extractYear(dateString: string | null): string {
    if (!dateString) return 'Unknown'
    const yearMatch = dateString.match(/\b(20\d{2})\b/)
    if (yearMatch) {
      return yearMatch[1]
    }
    return 'Unknown'
  }

  // Group models
  function groupModels(models: Model[], groupByField: string): Record<string, Model[]> {
    if (!groupByField) {
      return { 'All': models }
    }

    const groups: Record<string, Model[]> = {}

    models.forEach(model => {
      let groupKey = 'Unknown'
      
      switch (groupByField) {
        case 'year':
          groupKey = extractYear(model.releaseDate)
          break
        case 'provider':
          groupKey = model.provider || 'Unknown'
          break
        case 'architectureType':
          groupKey = model.architectureType || 'Unknown'
          break
        case 'evidenceStrength':
          groupKey = model.evidenceStrength || 'Unknown'
          break
        default:
          groupKey = 'All'
      }

      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(model)
    })

    return groups
  }

  // Get grouped models
  const groupedModels = groupModels(sortedModels, groupBy)
  const groupKeys = Object.keys(groupedModels).sort((a, b) => {
    // Sort years descending, others alphabetically
    if (groupBy === 'year') {
      if (a === 'Unknown') return 1
      if (b === 'Unknown') return -1
      return parseInt(b) - parseInt(a)
    }
    if (groupBy === 'evidenceStrength') {
      const strengthOrder = { 'high': 3, 'medium': 2, 'low': 1 }
      const strengthA = strengthOrder[a.toLowerCase() as keyof typeof strengthOrder] || 0
      const strengthB = strengthOrder[b.toLowerCase() as keyof typeof strengthOrder] || 0
      return strengthB - strengthA
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
    // For numeric columns, show different indicators
    if (column === 'params' || column === 'tokens') {
      return sortBy.direction === 'asc' ? '↑ Low→High' : '↓ High→Low'
    }
    return sortBy.direction === 'asc' ? '↑ A→Z' : '↓ Z→A'
  }

  return (
    <>
      {/* Search and Filters */}
      <div className="card mb-6 p-4">
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search models..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full text-sm"
          />
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Architecture</label>
            <select
              value={filters.architectureType}
              onChange={(e) => setFilters({ ...filters, architectureType: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              {architectureTypes.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Evidence</label>
            <select
              value={filters.evidenceStrength}
              onChange={(e) => setFilters({ ...filters, evidenceStrength: e.target.value })}
              className="input text-sm py-1.5"
            >
              <option value="">All</option>
              {evidenceStrengths.map(e => (
                <option key={e} value={e}>{e.replace('S-', '')}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium text-text-muted mb-1.5 uppercase tracking-wide">Multimodal</label>
            <select
              value={filters.multimodal}
              onChange={(e) => setFilters({ ...filters, multimodal: e.target.value })}
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
                setExpandedGroups(new Set())
              }}
              className="input text-sm py-1.5"
            >
              <option value="">None</option>
              <option value="year">Year</option>
              <option value="provider">Provider</option>
              <option value="architectureType">Architecture</option>
              <option value="evidenceStrength">Evidence</option>
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
          Showing <span className="font-medium text-text">{sortedModels.length}</span> of <span className="font-medium text-text">{models.length}</span> models
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
                  onClick={() => handleSort('modelId')}
                  title="Click to sort by model"
                >
                  <div className="flex items-center gap-2">
                    Model
                    {getSortIndicator('modelId') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('modelId')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none"
                  onClick={() => handleSort('provider')}
                  title="Click to sort by provider"
                >
                  <div className="flex items-center gap-2">
                    Provider
                    {getSortIndicator('provider') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('provider')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none"
                  onClick={() => handleSort('params')}
                  title="Click to sort by parameters"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The number of trainable parameters in the model, typically measured in billions (B) or trillions (T). More parameters generally mean more capacity to learn complex patterns.">
                      <span className="underline decoration-dotted cursor-help">Params</span>
                    </Tooltip>
                    {getSortIndicator('params') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('params')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3 text-right"
                  onClick={() => handleSort('tokens')}
                  title="Click to sort by tokens"
                >
                  <div className="flex items-center justify-end gap-2">
                    <Tooltip content="Estimated number of training tokens used to train the model. Click the number to see the calculation methodology. Tokens are the basic units of text that models process.">
                      <span className="underline decoration-dotted cursor-help">Tokens (Est.)</span>
                    </Tooltip>
                    {getSortIndicator('tokens') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('tokens')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3"
                  onClick={() => handleSort('architectureType')}
                  title="Click to sort by architecture"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The underlying neural network architecture. Common types include Transformer (standard attention-based models) and MoE (Mixture of Experts, which uses sparse activation).">
                      <span className="underline decoration-dotted cursor-help">Architecture</span>
                    </Tooltip>
                    {getSortIndicator('architectureType') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('architectureType')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3"
                  onClick={() => handleSort('evidenceStrength')}
                  title="Click to sort by evidence strength"
                >
                  <div className="flex items-center gap-2">
                    <Tooltip content="The strength of evidence for the token estimate. High = multiple data sources, Medium = some evidence, Low = limited evidence. Based on how much information we have about the model's training.">
                      <span className="underline decoration-dotted cursor-help">Evidence</span>
                    </Tooltip>
                    {getSortIndicator('evidenceStrength') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('evidenceStrength')}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="cursor-pointer hover:bg-border select-none px-4 py-3"
                  onClick={() => handleSort('releaseDate')}
                  title="Click to sort by release date"
                >
                  <div className="flex items-center gap-2">
                    Released
                    {getSortIndicator('releaseDate') && (
                      <span className="text-text-muted text-xs">{getSortIndicator('releaseDate')}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedModels.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-text-muted">
                    No models found matching your filters
                  </td>
                </tr>
              ) : groupBy ? (
                // Grouped view
                groupKeys.map((groupKey) => {
                  const groupModels = groupedModels[groupKey]
                  const isExpanded = expandedGroups.has(groupKey)
                  
                  return (
                    <Fragment key={groupKey}>
                      <tr
                        onClick={() => toggleGroup(groupKey)}
                        className="cursor-pointer bg-border-subtle hover:bg-border transition-colors"
                      >
                        <td colSpan={7}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-text-muted">{isExpanded ? '▼' : '▶'}</span>
                              <span className="font-semibold text-sm">
                                {groupBy === 'year' ? `${groupKey} Models` : groupKey}
                              </span>
                              <span className="text-xs text-text-muted">
                                ({groupModels.length} {groupModels.length === 1 ? 'model' : 'models'})
                              </span>
                            </div>
                          </div>
                        </td>
                      </tr>
                      {isExpanded && groupModels.map((model) => (
                        <tr
                          key={model.id}
                          className="cursor-pointer transition-colors border-b border-border-subtle last:border-0 hover:bg-[rgba(232,225,217,0.3)]"
                        >
                          <td className="pl-6">
                            <Link
                              href={`/models/${model.id}`}
                              className="font-medium text-accent hover:text-accent-hover"
                            >
                              {model.modelId}
                            </Link>
                            {model.family && (
                              <div className="text-xs text-text-muted mt-0.5">{model.family}</div>
                            )}
                          </td>
                          <td>
                            <div className="text-sm">{model.provider}</div>
                          </td>
                          <td>
                            <div className="text-sm">{formatParams(model.params)}</div>
                            {model.isMoe && (
                              <Tooltip content="Mixture of Experts (MoE): A model architecture that uses multiple specialized sub-networks (experts) but only activates a subset for each input. This allows for larger models with lower computational costs.">
                                <div className="text-xs text-text-muted mt-0.5 underline decoration-dotted cursor-help">MoE</div>
                              </Tooltip>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {model.tokensEstMin && model.tokensEstMax ? (
                              <div>
                                <div className="font-medium">
                                  <TokenEstimateTooltip
                                    params={model.params}
                                    tokensEstMin={model.tokensEstMin}
                                    tokensEstMax={model.tokensEstMax}
                                    tokensEstMid={model.tokensEstMid || (model.tokensEstMin + model.tokensEstMax) / 2}
                                    isMoe={model.isMoe}
                                  />
                                </div>
                                <div className="text-xs text-text-muted mt-0.5">
                                  {formatTokens(model.tokensEstMin)}–{formatTokens(model.tokensEstMax)}
                                </div>
                              </div>
                            ) : (
                              <span className="text-text-muted/60">—</span>
                            )}
                          </td>
                          <td>
                            <div className="flex items-center gap-2">
                              {model.architectureType && (
                                <span className="badge badge-secondary text-xs">
                                  {model.architectureType}
                                </span>
                              )}
                              {model.multimodal && (
                                <Tooltip content="Multimodal models can process and understand multiple types of data simultaneously, such as text, images, audio, and video. Examples include GPT-4o, Claude 3, and Gemini.">
                                  <span className="badge badge-primary text-xs underline decoration-dotted cursor-help">Multimodal</span>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                          <td>
                            {model.evidenceStrength && (
                              <span className="badge badge-secondary text-xs">
                                {model.evidenceStrength.replace('S-', '')}
                              </span>
                            )}
                          </td>
                          <td>
                            <div className="text-sm text-text-muted/80">
                              {model.releaseDate ? formatDate(String(model.releaseDate)) : '—'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </Fragment>
                  )
                })
              ) : (
                // Ungrouped view
                sortedModels.map((model) => (
                  <tr
                    key={model.id}
                    className="cursor-pointer transition-colors border-b border-border-subtle last:border-0 hover:bg-[rgba(232,225,217,0.3)]"
                  >
                    <td>
                      <Link
                        href={`/models/${model.id}`}
                        className="font-medium text-accent hover:text-accent-hover"
                      >
                        {model.modelId}
                      </Link>
                      {model.family && (
                        <div className="text-xs text-text-muted mt-0.5">{model.family}</div>
                      )}
                    </td>
                    <td>
                      <div className="text-sm">{model.provider}</div>
                    </td>
                    <td>
                      <div className="text-sm">{formatParams(model.params)}</div>
                      {model.isMoe && (
                        <Tooltip content="Mixture of Experts (MoE): A model architecture that uses multiple specialized sub-networks (experts) but only activates a subset for each input. This allows for larger models with lower computational costs.">
                          <div className="text-xs text-text-muted mt-0.5 underline decoration-dotted cursor-help">MoE</div>
                        </Tooltip>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {model.tokensEstMin && model.tokensEstMax ? (
                        <div>
                          <div className="font-medium">
                            <TokenEstimateTooltip
                              params={model.params}
                              tokensEstMin={model.tokensEstMin}
                              tokensEstMax={model.tokensEstMax}
                              tokensEstMid={model.tokensEstMid || (model.tokensEstMin + model.tokensEstMax) / 2}
                              isMoe={model.isMoe}
                            />
                          </div>
                          <div className="text-xs text-text-muted mt-0.5">
                            {formatTokens(model.tokensEstMin)}–{formatTokens(model.tokensEstMax)}
                          </div>
                        </div>
                      ) : (
                        <span className="text-text-muted/60">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        {model.architectureType && (
                          <span className="badge badge-secondary text-xs">
                            {model.architectureType}
                          </span>
                        )}
                        {model.multimodal && (
                          <Tooltip content="Multimodal models can process and understand multiple types of data simultaneously, such as text, images, audio, and video. Examples include GPT-4o, Claude 3, and Gemini.">
                            <span className="badge badge-primary text-xs underline decoration-dotted cursor-help">Multimodal</span>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td>
                      {model.evidenceStrength && (
                        <span className="badge badge-secondary text-xs">
                          {model.evidenceStrength.replace('S-', '')}
                        </span>
                      )}
                    </td>
                    <td>
                      <div className="text-sm text-text-muted/80">
                        {model.releaseDate ? formatDate(String(model.releaseDate)) : '—'}
                      </div>
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

