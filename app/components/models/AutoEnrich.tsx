'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AutoEnrichProps {
  modelCount: number
  modelsWithTokens: number
}

export default function AutoEnrich({ modelCount, modelsWithTokens }: AutoEnrichProps) {
  const router = useRouter()
  const [isEnriching, setIsEnriching] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    // Auto-enrich if we have models but no token estimates
    if (modelCount > 0 && modelsWithTokens === 0 && !isEnriching) {
      setIsEnriching(true)
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
          }
        } catch (error: any) {
          setStatus(`Error: ${error.message}`)
          setIsEnriching(false)
        }
      }

      enrich()
    }
  }, [modelCount, modelsWithTokens, router, isEnriching])

  if (!isEnriching || modelsWithTokens > 0) {
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
              Extracting parameters from model names and estimating token counts.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

