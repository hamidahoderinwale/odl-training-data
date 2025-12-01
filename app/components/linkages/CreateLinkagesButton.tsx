'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function CreateLinkagesButton() {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [results, setResults] = useState<any>(null)

  const handleCreate = async () => {
    setIsCreating(true)
    setStatus('Creating linkages...')
    setResults(null)

    try {
      const response = await fetch('/api/linkages/create', {
        method: 'POST',
      })

      const data = await response.json()

      if (data.success) {
        setStatus('Linkages created successfully!')
        setResults(data)
        // Refresh the page to show new linkages
        setTimeout(() => {
          router.refresh()
        }, 2000)
      } else {
        setStatus(`Error: ${data.error || 'Unknown error'}`)
        setResults(data)
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`)
      setResults({ error: error.message })
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={handleCreate}
        disabled={isCreating}
        className={`btn-secondary text-sm ${
          isCreating ? 'opacity-50 cursor-not-allowed' : ''
        }`}
        title="Create linkages between all deals and models"
      >
        {isCreating ? 'Creating...' : 'Create Linkages'}
      </button>
      
      {status && (
        <div className="absolute top-full right-0 mt-2 z-50 bg-surface border border-border rounded-sm shadow-lg p-3 min-w-[300px]">
          <div className="text-xs font-semibold mb-2 text-text">{status}</div>
          {results && (
            <div className="text-xs text-text-muted space-y-1">
              {results.created !== undefined && (
                <div className="text-accent">Created: {results.created}</div>
              )}
              {results.updated !== undefined && (
                <div>Updated: {results.updated}</div>
              )}
              {results.total !== undefined && (
                <div className="font-medium">Total: {results.total}</div>
              )}
              {results.deals_count !== undefined && (
                <div>Deals: {results.deals_count}</div>
              )}
              {results.models_count !== undefined && (
                <div>Models: {results.models_count}</div>
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

