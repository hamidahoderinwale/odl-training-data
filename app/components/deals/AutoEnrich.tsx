'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AutoEnrichProps {
  dealCount: number
  dealsWithAllFields: number
}

export default function AutoEnrich({ dealCount, dealsWithAllFields }: AutoEnrichProps) {
  const router = useRouter()
  const [isEnriching, setIsEnriching] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    // Only auto-enrich if we have deals but some are missing fields
    // Check if less than 80% of deals have all key fields
    const enrichmentThreshold = 0.8
    const needsEnrichment = dealCount > 0 && (dealsWithAllFields / dealCount) < enrichmentThreshold

    if (needsEnrichment && !isEnriching) {
      setIsEnriching(true)
      setStatus(`Enriching ${dealCount - dealsWithAllFields} deals with missing metadata...`)

      const enrich = async () => {
        try {
          const response = await fetch('/api/deals/enrich', {
            method: 'POST',
          })

          const data = await response.json()

          if (data.success) {
            setStatus(`Enriched ${data.updated || 0} deals. Refreshing...`)
            setTimeout(() => {
              router.refresh()
            }, 2000)
          } else {
            setStatus(`Enrichment failed: ${data.error || 'Unknown error'}`)
            setIsEnriching(false)
          }
        } catch (error: any) {
          setStatus(`Error: ${error.message}`)
          setIsEnriching(false)
        }
      }

      enrich()
    }
  }, [dealCount, dealsWithAllFields, router, isEnriching])

  if (!isEnriching) {
    return null
  }

  return (
    <div className="mb-6 card">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-accent text-xl animate-spin">⟳</div>
          <div>
            <div className="text-sm font-semibold text-text">{status}</div>
            <div className="text-xs text-text-muted mt-1">
              Inferring deal type, pricing mechanism, duration, and rights from existing data.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

