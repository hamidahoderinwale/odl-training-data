'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

interface AutoCreateProps {
  linkageCount: number
  dealCount: number
  modelCount: number
}

export default function AutoCreate({ linkageCount, dealCount, modelCount }: AutoCreateProps) {
  const router = useRouter()
  const [isCreating, setIsCreating] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    // Only auto-create if no linkages exist but we have deals and models
    if (linkageCount === 0 && dealCount > 0 && modelCount > 0 && !isCreating) {
      setIsCreating(true)
      setStatus('Creating linkages between deals and models...')

      const create = async () => {
        try {
          const response = await fetch('/api/linkages/create', {
            method: 'POST',
          })

          const data = await response.json()

          if (data.success) {
            setStatus(`Created ${data.total || 0} linkages. Refreshing...`)
            // Refresh the page to show new linkages
            setTimeout(() => {
              router.refresh()
            }, 2000)
          } else {
            setStatus(`Failed: ${data.error || 'Unknown error'}`)
            setIsCreating(false)
          }
        } catch (error: any) {
          setStatus(`Error: ${error.message}`)
          setIsCreating(false)
        }
      }

      create()
    }
  }, [linkageCount, dealCount, modelCount, router, isCreating])

  if (!isCreating || linkageCount > 0) {
    return null
  }

  return (
    <div className="mb-6 card border-l-[3px] border-accent">
      <div className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="text-accent text-xl animate-spin">⟳</div>
          <div>
            <div className="text-sm font-semibold text-text">{status}</div>
            <div className="text-xs text-text-muted mt-1">
              Analyzing {dealCount} deals and {modelCount} models...
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

