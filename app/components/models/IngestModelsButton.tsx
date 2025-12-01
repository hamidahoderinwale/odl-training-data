'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function IngestModelsButton() {
  const router = useRouter()
  const [isIngesting, setIsIngesting] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)

  const handleIngest = async () => {
    setIsIngesting(true)
    setStatus('Starting model ingestion... This may take several minutes.')
    setResults(null)

    try {
      // Use a longer timeout for the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 minutes

      // Try direct ingestion first (no Python required)
      let response = await fetch('/api/models/ingest-direct', {
        method: 'POST',
        signal: controller.signal,
      })

      // If direct ingestion fails, try Python pipeline
      if (!response.ok) {
        response = await fetch('/api/models/ingest', {
          method: 'POST',
          signal: controller.signal,
        })
      }

      clearTimeout(timeoutId)

      const data = await response.json()

      if (data.success) {
        setStatus('Model ingestion complete!')
        setResults(data)
        // Refresh the page to show new models
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        setStatus(`Error: ${data.error || 'Unknown error'}`)
        setResults(data)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setStatus('Ingestion is taking longer than expected. It may still be running in the background.')
        setResults({ 
          error: 'Request timeout',
          message: 'The ingestion process may still be running. Check back in a few minutes or check server logs.',
        })
      } else {
        setStatus(`Error: ${error.message}`)
        setResults({ error: error.message })
      }
    } finally {
      setIsIngesting(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleIngest}
        disabled={isIngesting}
        className={`btn-secondary text-sm ${
          isIngesting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Ingest priority models from Epoch AI and HuggingFace"
      >
        {isIngesting ? 'Ingesting... (this may take a few minutes)' : 'Ingest Models'}
      </button>
      
      {status && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-surface border border-border rounded-none shadow-lg p-3 min-w-[300px]">
          <div className="text-xs font-semibold mb-2 text-text">{status}</div>
          {results && (
            <div className="text-xs text-text-muted space-y-1">
              {(results.models_ingested !== undefined || results.created !== undefined) && (
                <div className="text-accent">
                  Models ingested: {results.models_ingested || results.created || results.total || 0}
                </div>
              )}
              {results.error && (
                <div className="text-red-500 mt-2">{results.error}</div>
              )}
              {results.message && (
                <div className="text-text-muted mt-2">{results.message}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

