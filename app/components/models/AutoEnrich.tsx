'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AutoEnrichProps {
  modelCount: number
  modelsWithTokens: number
  modelsWithDates: number
}

export default function AutoEnrich({ modelCount, modelsWithTokens, modelsWithDates }: AutoEnrichProps) {
  const router = useRouter()
  const [isEnriching, setIsEnriching] = useState(false)
  const [isEnrichingDates, setIsEnrichingDates] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [enrichmentType, setEnrichmentType] = useState<'tokens' | 'dates' | null>(null)

  useEffect(() => {
    // Auto-enrich if we have models but no token estimates
    if (modelCount > 0 && modelsWithTokens === 0 && !isEnriching && !isEnrichingDates) {
      setIsEnriching(true)
      setEnrichmentType('tokens')
      setStatus('Enriching models with parameter and token estimates...')

      const enrich = async () => {
        try {
          const response = await fetch('/api/models/enrich', {
            method: 'POST',
          })

          const data = await response.json()

          if (data.success) {
            setStatus(`Enriched ${data.updated} models. Refreshing...`)
            // Refresh the page to show enriched data
            setTimeout(() => {
              router.refresh()
            }, 2000)
          } else {
            setStatus(`Enrichment failed: ${data.error || 'Unknown error'}`)
            setIsEnriching(false)
            setEnrichmentType(null)
          }
        } catch (error: any) {
          setStatus(`Error: ${error.message}`)
          setIsEnriching(false)
          setEnrichmentType(null)
        }
      }

      enrich()
    }
  }, [modelCount, modelsWithTokens, router, isEnriching, isEnrichingDates])

  const handleEnrichDates = async () => {
    setIsEnrichingDates(true)
    setEnrichmentType('dates')
    setStatus('Enriching release dates from arXiv and company websites...')

    try {
      const response = await fetch('/api/models/enrich-dates', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setStatus(`Enriched ${data.updated} models with release dates. Refreshing...`)
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        setStatus(`Enrichment failed: ${data.error || 'Unknown error'}`)
        setIsEnrichingDates(false)
        setEnrichmentType(null)
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`)
      setIsEnrichingDates(false)
      setEnrichmentType(null)
    }
  }

  const modelsWithoutDates = modelCount - modelsWithDates
  const showDatesEnrichment = modelsWithoutDates > 0 && !isEnriching && !isEnrichingDates

  if (!isEnriching && !isEnrichingDates && modelsWithTokens > 0 && !showDatesEnrichment) {
    return null
  }

  return (
    <div className="mb-6 card border-l-[3px] border-accent">
      <div className="px-4 py-3">
        {(isEnriching || isEnrichingDates) ? (
          <div className="flex items-center gap-3">
            <div className="text-accent text-xl animate-spin">⟳</div>
            <div className="flex-1">
              <div className="text-sm font-semibold text-text">{status}</div>
              <div className="text-xs text-text-muted mt-1">
                {enrichmentType === 'tokens' 
                  ? 'Extracting parameters from model names and estimating token counts.'
                  : 'Searching arXiv technical reports and company websites for release dates.'}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <div className="text-sm font-semibold text-text mb-1">
                {modelsWithoutDates} models missing release dates
              </div>
              <div className="text-xs text-text-muted">
                Enrich release dates from arXiv technical reports and company websites.
              </div>
            </div>
            <button
              onClick={handleEnrichDates}
              disabled={isEnrichingDates}
              className="px-4 py-2 bg-accent text-white rounded hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
            >
              Enrich Dates
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

