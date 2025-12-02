'use client'

import { useEffect } from 'react'
import DealFeed from '../components/deals/DealFeed'
import { getSourceUrl } from '@/lib/utils/utils'
import type { Deal } from '@/lib/types/deal'
import Tooltip from '@/app/components/ui/Tooltip'

interface DealModalProps {
  deal: Deal | null
  isOpen: boolean
  onClose: () => void
}

function formatPrice(deal: Deal) {
  if (deal.priceUsd) {
    if (deal.priceUsd >= 1000000000) {
      return `$${(deal.priceUsd / 1000000000).toFixed(1)}B`
    }
    if (deal.priceUsd >= 1000000) {
      return `$${(deal.priceUsd / 1000000).toFixed(0)}M`
    }
    if (deal.priceUsd >= 1000) {
      return `$${(deal.priceUsd / 1000).toFixed(0)}K`
    }
    return `$${deal.priceUsd.toFixed(0)}`
  }
  if (deal.priceRangeMinUsd && deal.priceRangeMaxUsd) {
    return `$${deal.priceRangeMinUsd.toFixed(2)}–${deal.priceRangeMaxUsd.toFixed(2)}`
  }
  return deal.reportedTerms || 'Undisclosed'
}

export default function DealModal({ deal, isOpen, onClose }: DealModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.classList.add('overflow-hidden')
    } else {
      document.body.classList.remove('overflow-hidden')
    }
    return () => {
      document.body.classList.remove('overflow-hidden')
    }
  }, [isOpen])

  if (!isOpen || !deal) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-none shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-surface border-b border-border px-4 py-3 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold mb-1">
              {deal.provider} → {deal.buyer}
            </h2>
            <p className="text-text-muted">{deal.dataType || deal.modality}</p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text text-2xl leading-none ml-4"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Summary Card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-6 border-b border-border">
            <div>
              <div className="text-sm text-text-muted mb-1">Price</div>
              <div className="text-xl font-semibold">{formatPrice(deal)}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Deal Type</div>
              <div className="font-medium">{deal.dealType || deal.pricingMechanism || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Date</div>
              <div className="font-medium">{deal.date || '—'}</div>
            </div>
            <div>
              <div className="text-sm text-text-muted mb-1">Source</div>
              {(() => {
                const sourceUrl = getSourceUrl(deal.sourcePrimary)
                if (sourceUrl) {
                  return (
                    <a
                      href={sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-accent hover:text-accent-hover underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {deal.sourcePrimary}
                    </a>
                  )
                }
                return <div className="font-medium">{deal.sourcePrimary || '—'}</div>
              })()}
            </div>
          </div>

          {/* Reported Terms */}
          {deal.reportedTerms && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Reported Terms</h3>
              <p className="text-text-muted leading-relaxed">{deal.reportedTerms}</p>
            </div>
          )}

          {/* Deal Details & Compensation */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold mb-4">Deal Details</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Tooltip content="The structure of the deal: 'aggregate' (bulk licensing), 'per-unit' (pay per item), 'commissioning' (custom data creation), or 'acquisition' (company purchase).">
                    <span className="text-text-muted underline decoration-dotted cursor-help">Deal Type</span>
                  </Tooltip>
                  <span className="font-medium">{deal.dealType || deal.pricingMechanism || '—'}</span>
                </div>
                {deal.durationYears && (
                  <div className="flex justify-between">
                    <Tooltip content="The length of the licensing agreement in years. Some deals are one-time purchases, others are multi-year subscriptions.">
                      <span className="text-text-muted underline decoration-dotted cursor-help">Duration</span>
                    </Tooltip>
                    <span>{deal.durationYears === 1 ? '1 year' : `${deal.durationYears} years`}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <Tooltip content="Whether the deal grants exclusive rights to the buyer. Exclusive deals mean the data provider cannot license the same data to other AI companies.">
                    <span className="text-text-muted underline decoration-dotted cursor-help">Exclusive</span>
                  </Tooltip>
                  <span>
                    {deal.exclusive === true ? (
                      <span className="badge badge-primary">Yes</span>
                    ) : deal.exclusive === false ? (
                      'No'
                    ) : (
                      '—'
                    )}
                  </span>
                </div>
                {deal.deletionRequired && (
                  <div className="flex justify-between">
                    <Tooltip content="Whether the deal requires deletion of training data upon request. Some news/publisher deals include 'right to be forgotten' provisions.">
                      <span className="text-text-muted underline decoration-dotted cursor-help">Deletion Required</span>
                    </Tooltip>
                    <span className="badge badge-secondary">Yes</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <Tooltip content="Whether the data can be used for training new AI models. Most deals allow this, as it's the primary purpose.">
                    <span className="text-text-muted underline decoration-dotted cursor-help">Training Allowed</span>
                  </Tooltip>
                  <span>
                    {deal.trainingAllowed === true ? (
                      <span className="badge badge-primary">Yes</span>
                    ) : deal.trainingAllowed === false ? (
                      <span className="text-text-muted/60">No</span>
                    ) : (
                      <span className="text-text-muted/40">—</span>
                    )}
                  </span>
                </div>
                {deal.finetuningAllowed !== null && (
                  <div className="flex justify-between">
                    <Tooltip content="Whether the data can be used for fine-tuning existing models. Some deals restrict this to prevent model copying.">
                      <span className="text-text-muted underline decoration-dotted cursor-help">Finetuning Allowed</span>
                    </Tooltip>
                    <span>
                      {deal.finetuningAllowed ? (
                        <span className="badge badge-primary">Yes</span>
                      ) : (
                        <span className="text-text-muted/60">No</span>
                      )}
                    </span>
                  </div>
                )}
                {deal.redistributionAllowed !== null && (
                  <div className="flex justify-between">
                    <Tooltip content="Whether the trained model can redistribute or share the training data. Most deals prohibit this to protect data rights.">
                      <span className="text-text-muted underline decoration-dotted cursor-help">Redistribution Allowed</span>
                    </Tooltip>
                    <span>
                      {deal.redistributionAllowed ? (
                        <span className="badge badge-primary">Yes</span>
                      ) : (
                        <span className="text-text-muted/60">No</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold mb-4">Creator Compensation</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Tooltip content="Whether the original creators (authors, artists, musicians, etc.) are compensated for their work being used in AI training. This can include direct payments, revenue sharing, or royalties.">
                    <span className="text-text-muted underline decoration-dotted cursor-help">Compensated</span>
                  </Tooltip>
                  <span>
                    {deal.creatorsCompensated === true ? (
                      <span className="badge badge-primary">Yes</span>
                    ) : deal.creatorsCompensated === false ? (
                      'No'
                    ) : (
                      'Unclear'
                    )}
                  </span>
                </div>
                {deal.creatorSplitPercentage && (
                  <div className="flex justify-between">
                    <Tooltip content="The percentage of revenue or payment that goes to the original creators (e.g., authors, artists) versus the publisher or platform.">
                      <span className="text-text-muted underline decoration-dotted cursor-help">Split</span>
                    </Tooltip>
                    <span className="font-medium">{deal.creatorSplitPercentage}%</span>
                  </div>
                )}
                {deal.revenueShare && (
                  <div className="flex justify-between">
                    <Tooltip content="Whether creators receive a share of revenue from the AI model's usage, rather than a one-time payment. This is common in news/publisher deals.">
                      <span className="text-text-muted underline decoration-dotted cursor-help">Revenue Share</span>
                    </Tooltip>
                    <span className="badge badge-primary">Yes</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricing Normalizations */}
          {(() => {
            const normalizations = deal.pricingNormalizations || []
            if (normalizations.length > 0) {
              return (
                <div>
                  <h3 className="text-lg font-semibold mb-4">Pricing Normalizations</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {normalizations.map((norm, idx) => (
                      <div key={idx} className="border border-border-subtle rounded-none p-3">
                        <div className="text-xs text-text-muted mb-1">Per {norm.unitType}</div>
                        <div className="font-medium">
                          {norm.normalizedCostPerUnit < 0.001
                            ? `$${(norm.normalizedCostPerUnit * 1000000).toFixed(2)}/1M`
                            : norm.normalizedCostPerUnit < 1
                            ? `$${norm.normalizedCostPerUnit.toFixed(4)}`
                            : `$${norm.normalizedCostPerUnit.toFixed(2)}`}
                        </div>
                        <div className="text-xs text-text-muted mt-1">
                          {norm.normalizationMethod}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            }
            return null
          })()}

          {/* Notes */}
          {deal.notes && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Notes</h3>
              <p className="text-text-muted leading-relaxed">{deal.notes}</p>
            </div>
          )}

          {/* Sources - Hyperlinked */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Sources</h3>
            <div className="space-y-2">
              {deal.sourcePrimary && (
                <div className="text-text-muted">
                  Primary:{' '}
                  {deal.sourcePrimary.startsWith('http') ? (
                    <a
                      href={deal.sourcePrimary}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-accent hover:text-accent-hover font-medium underline"
                    >
                      {deal.sourcePrimary}
                    </a>
                  ) : (
                    <span className="text-text font-medium">{deal.sourcePrimary}</span>
                  )}
                </div>
              )}
              {deal.sources && (() => {
                try {
                  const sourcesArray = JSON.parse(deal.sources)
                  if (Array.isArray(sourcesArray) && sourcesArray.length > 0) {
                    return (
                      <div>
                        <div className="text-text-muted mb-2">Additional sources:</div>
                        <ul className="list-disc list-inside space-y-1">
                          {sourcesArray.map((source: string, idx: number) => (
                            <li key={idx}>
                              <a
                                href={source}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:text-accent-hover break-all underline"
                              >
                                {source}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )
                  }
                } catch (e) {
                  // If not valid JSON, treat as plain string
                  if (deal.sources) {
                    return (
                      <div>
                        <a
                          href={deal.sources}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-accent hover:text-accent-hover break-all underline"
                        >
                          {deal.sources}
                        </a>
                      </div>
                    )
                  }
                }
                return null
              })()}
              {!deal.sourcePrimary && (!deal.sources || (deal.sources && JSON.parse(deal.sources || '[]').length === 0)) && (
                <div className="text-text-muted">No sources available</div>
              )}
            </div>
          </div>

          {/* Related Content Feed */}
          <div className="pt-6 border-t border-border">
            <DealFeed dealId={deal.id} provider={deal.provider} buyer={deal.buyer} />
          </div>

          {/* Modality Badge */}
          <div className="pt-4 border-t border-border">
            <span className="badge badge-secondary">{deal.modality}</span>
            {deal.exclusive && (
              <span className="badge badge-primary ml-2">Exclusive</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

