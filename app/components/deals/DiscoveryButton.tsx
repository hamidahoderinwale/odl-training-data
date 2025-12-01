'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function DiscoveryButton() {
  const router = useRouter()
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)

  const handleDiscover = async () => {
    setIsDiscovering(true)
    setStatus('Starting discovery... This may take several minutes.')
    setResults(null)

    try {
      // Use a longer timeout for the fetch request
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 600000) // 10 minutes

      const response = await fetch('/api/discover?source=all&days_back=7', {
        method: 'POST',
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      const data = await response.json()

      if (data.success) {
        setStatus('Discovery complete!')
        setResults(data)
        // Refresh the page to show new deals
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        setStatus(`Error: ${data.error || 'Unknown error'}`)
        setResults(data)
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setStatus('Discovery is taking longer than expected. It may still be running in the background.')
        setResults({ 
          error: 'Request timeout',
          message: 'The discovery process may still be running. Check back in a few minutes or check server logs.',
        })
      } else {
        setStatus(`Error: ${error.message}`)
        setResults({ error: error.message })
      }
    } finally {
      setIsDiscovering(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleDiscover}
        disabled={isDiscovering}
        className={`btn-secondary text-sm ${
          isDiscovering ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Discover new deals using Exa, RSS, News API, and other sources"
      >
        {isDiscovering ? 'Discovering... (this may take a few minutes)' : 'Discover Deals'}
      </button>
      
      {status && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-surface border border-border rounded-sm shadow-lg p-3 min-w-[300px]">
          <div className="text-xs font-semibold mb-2 text-text">{status}</div>
          {results && (
            <div className="text-xs text-text-muted space-y-1">
              {results.urls_discovered !== undefined && (
                <div>URLs discovered: {results.urls_discovered}</div>
              )}
              {results.deals_extracted !== undefined && (
                <div>Deals extracted: {results.deals_extracted}</div>
              )}
              {results.deals_created !== undefined && (
                <div className="text-accent">New deals: {results.deals_created}</div>
              )}
              {results.deals_updated !== undefined && (
                <div>Updated deals: {results.deals_updated}</div>
              )}
              {results.error && (
                <div className="text-red-500 mt-2">{results.error}</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

