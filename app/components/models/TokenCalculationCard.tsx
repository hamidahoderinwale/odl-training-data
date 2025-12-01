'use client'

interface TokenCalculationCardProps {
  params: number | null
  tokensEstMin: number | null
  tokensEstMax: number | null
  tokensEstMid: number | null
  isMoe: boolean | null
}

export default function TokenCalculationCard({
  params,
  tokensEstMin,
  tokensEstMax,
  tokensEstMid,
  isMoe,
}: TokenCalculationCardProps) {
  if (!params || !tokensEstMid) {
    return null
  }

  const paramsAbs = params * 1e9 // Convert billions to absolute
  const ratioMin = isMoe ? 3 : 5
  const ratioMax = isMoe ? 15 : 30

  return (
    <div className="card mt-6">
      <h3 className="text-lg font-semibold mb-4">Token Estimate Calculation</h3>
      
      <div className="space-y-4 text-sm">
        <div>
          <strong className="text-text">Method:</strong> Parameter Ratio Rule
        </div>
        
        <div>
          <strong className="text-text">Parameters:</strong> {params.toFixed(1)}B ({paramsAbs.toLocaleString()})
        </div>
        
        <div>
          <strong className="text-text">Ratio Range:</strong> {ratioMin}x - {ratioMax}x parameters per token
          {isMoe && (
            <div className="text-xs text-text-muted mt-1 ml-4">
              MoE (Mixture of Experts) models typically use fewer tokens per parameter due to sparse activation.
            </div>
          )}
          {!isMoe && (
            <div className="text-xs text-text-muted mt-1 ml-4">
              Standard transformer models typically use 5-30x parameters per token based on published data.
            </div>
          )}
        </div>
        
        <div className="pt-3 border-t border-border-subtle">
          <strong className="text-text">Step-by-Step Calculation:</strong>
          <div className="mt-2 space-y-2 font-mono text-xs bg-[rgba(139,111,71,0.05)] p-3 rounded-sm">
            <div>
              <span className="text-text-muted">Min estimate:</span> {paramsAbs.toLocaleString()} params × {ratioMin} = {tokensEstMin ? (tokensEstMin / 1e9).toFixed(1) : '—'}B tokens
            </div>
            <div>
              <span className="text-text-muted">Max estimate:</span> {paramsAbs.toLocaleString()} params × {ratioMax} = {tokensEstMax ? (tokensEstMax / 1e9).toFixed(1) : '—'}B tokens
            </div>
            <div className="pt-2 border-t border-border-subtle">
              <span className="text-text-muted">Midpoint:</span> ({tokensEstMin ? (tokensEstMin / 1e9).toFixed(1) : '—'} + {tokensEstMax ? (tokensEstMax / 1e9).toFixed(1) : '—'}) ÷ 2 = <strong className="text-text">{tokensEstMid ? (tokensEstMid / 1e9).toFixed(1) : '—'}B tokens</strong>
            </div>
          </div>
        </div>
        
        <div className="pt-3 border-t border-border-subtle text-xs text-text-muted">
          <strong className="text-text">Note:</strong> These estimates are based on parameter-to-token ratios observed in published models (e.g., GPT-3, Chinchilla scaling laws). 
          Actual training data may vary significantly based on data quality, curriculum learning, and other factors.
        </div>
      </div>
    </div>
  )
}

