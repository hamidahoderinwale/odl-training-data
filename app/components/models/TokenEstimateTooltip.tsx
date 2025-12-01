'use client'

import { useState } from 'react'

interface TokenEstimateTooltipProps {
  params: number | null
  tokensEstMin: number | null
  tokensEstMax: number | null
  tokensEstMid: number | null
  isMoe: boolean | null
}

export default function TokenEstimateTooltip({
  params,
  tokensEstMin,
  tokensEstMax,
  tokensEstMid,
  isMoe,
}: TokenEstimateTooltipProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!params || !tokensEstMid) {
    return <span className="text-text-muted/60">—</span>
  }

  const paramsAbs = params * 1e9 // Convert billions to absolute
  const ratioMin = isMoe ? 3 : 5
  const ratioMax = isMoe ? 15 : 30

  return (
    <div className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation()
          setIsOpen(!isOpen)
        }}
        className="text-accent hover:text-accent-hover underline decoration-dotted cursor-help"
        title="Click to see calculation details"
      >
        {tokensEstMid >= 1e15 ? `${(tokensEstMid / 1e15).toFixed(1)}P` :
         tokensEstMid >= 1e12 ? `${(tokensEstMid / 1e12).toFixed(1)}T` :
         tokensEstMid >= 1e9 ? `${(tokensEstMid / 1e9).toFixed(1)}B` :
         `${(tokensEstMid / 1e6).toFixed(0)}M`}
      </button>
      
      {isOpen && (
        <div 
          className="absolute z-50 left-0 top-full mt-2 w-80 bg-surface border border-border rounded-none shadow-lg p-4 text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="font-semibold text-text mb-2">Token Estimate Calculation</div>
          
          <div className="space-y-2 text-text-muted">
            <div>
              <strong className="text-text">Parameters:</strong> {params.toFixed(1)}B ({paramsAbs.toLocaleString()})
            </div>
            
            <div>
              <strong className="text-text">Method:</strong> Parameter Ratio Rule
            </div>
            
            <div>
              <strong className="text-text">Ratio Range:</strong> {ratioMin}x - {ratioMax}x
              {isMoe && <span className="ml-1 text-text-muted/70">(MoE models use fewer tokens per parameter)</span>}
            </div>
            
            <div className="pt-2 border-t border-border-subtle">
              <div><strong className="text-text">Calculation:</strong></div>
              <div className="ml-2 mt-1 font-mono text-[10px]">
                Min: {paramsAbs.toLocaleString()} × {ratioMin} = {tokensEstMin ? (tokensEstMin / 1e9).toFixed(1) : '—'}B tokens<br/>
                Max: {paramsAbs.toLocaleString()} × {ratioMax} = {tokensEstMax ? (tokensEstMax / 1e9).toFixed(1) : '—'}B tokens<br/>
                Mid: ({tokensEstMin ? (tokensEstMin / 1e9).toFixed(1) : '—'} + {tokensEstMax ? (tokensEstMax / 1e9).toFixed(1) : '—'}) ÷ 2 = {tokensEstMid ? (tokensEstMid / 1e9).toFixed(1) : '—'}B tokens
              </div>
            </div>
            
            <div className="pt-2 border-t border-border-subtle text-[10px] text-text-muted/70">
              <strong className="text-text">Note:</strong> These are estimates based on parameter-to-token ratios observed in published models. 
              Actual training data may vary significantly.
            </div>
          </div>
          
          <button
            onClick={() => setIsOpen(false)}
            className="mt-3 text-xs text-accent hover:text-accent-hover"
          >
            Close
          </button>
        </div>
      )}
      
      {isOpen && (
        <div 
          className="fixed inset-0 z-40"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
}

