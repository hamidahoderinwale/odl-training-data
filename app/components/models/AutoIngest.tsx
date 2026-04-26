'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AutoIngestProps {
  modelCount: number
}

export default function AutoIngest({ modelCount }: AutoIngestProps) {
  const router = useRouter()
  const [isIngesting, setIsIngesting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    // Only auto-ingest if no models exist
    if (modelCount === 0 && !isIngesting) {
      setIsIngesting(true)
      setStatus('No models found. Starting automatic ingestion...')

      const ingest = async () => {
        try {
          // Use direct ingestion (no Python required, includes metadata enrichment)
          const response = await fetch('/api/models/ingest-direct', {
            method: 'POST',
          })

          const data = await response.json()

          if (data.success) {
            // Handle both direct ingestion (created/updated) and Python pipeline (models_ingested)
            const count = data.models_ingested || data.created || data.total || 0
            setStatus(`Ingested ${count} models. Enriching with metadata...`)
            
            // After ingestion, enrich all models
            try {
              const enrichResponse = await fetch('/api/models/enrich', {
                method: 'POST',
              })
              const enrichData = await enrichResponse.json()
              if (enrichData.success) {
                setStatus(`Ingested ${count} models and enriched ${enrichData.updated} with metadata. Refreshing...`)
              }
            } catch (enrichError) {
              console.error('Enrichment error:', enrichError)
              // Continue anyway
            }
            
            // Refresh the page to show new models
            setTimeout(() => {
              router.refresh()
            }, 2000)
          } else {
            setStatus(`Ingestion failed: ${data.error || 'Unknown error'}`)
            setIsIngesting(false)
          }
        } catch (error: any) {
          setStatus(`Error: ${error.message}`)
          setIsIngesting(false)
        }
      }

      ingest()
    }
  }, [modelCount, router, isIngesting])

  if (!isIngesting || modelCount > 0) {
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
              Creating model records with estimated parameters, tokens, and architecture metadata.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

