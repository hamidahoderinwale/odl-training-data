'use client'

import { useState } from 'react'
import Tooltip from '@/app/components/ui/Tooltip'

export default function NormalizationInfoBar() {
  const [isExpanded, setIsExpanded] = useState(false)

  return (
    <div className="card mb-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-2 text-left hover:bg-[rgba(232,225,217,0.1)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <Tooltip content="Prices are normalized to common units (per token, per image, per minute) to enable comparison across different deal types and modalities. Click on any price in the table to see normalized costs.">
            <div className="text-sm font-semibold underline decoration-dotted cursor-help">Pricing Normalizations</div>
          </Tooltip>
          <div className="text-xs text-text-muted">
            Click prices to see normalized per-unit costs
          </div>
        </div>
        <div className="text-xs text-text-muted">
          {isExpanded ? '▼' : '▶'}
        </div>
      </button>
              {isExpanded && (
                <div className="px-4 pb-3 pt-2 space-y-4 border-t border-border-subtle">
                  <div className="text-xs text-text-muted leading-relaxed">
                    <p className="mb-2">
                      Prices are normalized to common units for comparison across deals:
                    </p>
                    <ul className="space-y-1.5 ml-4 list-disc">
                      <li><strong>Per token:</strong> For text deals, normalized to cost per token (e.g., $0.0002/token)</li>
                      <li><strong>Per record:</strong> For per-unit deals, normalized to cost per record</li>
                      <li><strong>Per image:</strong> For image deals, normalized to cost per image</li>
                      <li><strong>Per minute:</strong> For video/audio deals, normalized to cost per minute</li>
                    </ul>
                    <p className="mt-3 text-text-muted/80">
                      <strong>Note:</strong> Normalizations marked with <span className="italic">*</span> are estimated. 
                      Stored normalizations (from database) are shown in regular text.
                    </p>
                  </div>

                  {/* Sourcing Information */}
                  <div className="pt-3 border-t border-border-subtle">
                    <h4 className="text-xs font-semibold text-text mb-2">Data Sources & Methodology</h4>
                    <div className="text-xs text-text-muted leading-relaxed space-y-2">
                      <p>
                        <strong>Deal Sources:</strong> Deals are discovered and extracted from multiple sources including:
                      </p>
                      <ul className="space-y-1 ml-4 list-disc">
                        <li>Company filings (SEC, SEDAR, LSE)</li>
                        <li>Press releases and news articles (Reuters, Bloomberg, TechCrunch, etc.)</li>
                        <li>RSS feeds from major AI companies</li>
                        <li>Exa API for intelligent content discovery</li>
                        <li>Perplexity API for feed acquisition</li>
                        <li>Industry trackers (CB Insights, Appen)</li>
                      </ul>
                      <p className="mt-2">
                        <strong>Normalization Methods:</strong>
                      </p>
                      <ul className="space-y-1 ml-4 list-disc">
                        <li><strong>Stored:</strong> Normalizations stored in database from manual review or verified calculations</li>
                        <li><strong>Calculated:</strong> Estimated normalizations using heuristics:
                          <ul className="ml-4 mt-1 space-y-0.5 list-disc">
                            <li>Text: ~80k tokens/book or ~1k tokens/article</li>
                            <li>Images: Based on reported volume (e.g., 200M images)</li>
                            <li>Video/Audio: ~60 minutes per hour estimate</li>
                            <li>Records: ~1M records for per-unit deals</li>
                          </ul>
                        </li>
                      </ul>
                      <p className="mt-2">
                        <strong>Provenance:</strong> Each deal includes source links, discovery metadata, and confidence scores. 
                        Click on any deal to view full source information and related content.
                      </p>
                    </div>
                  </div>
                </div>
              )}
    </div>
  )
}

