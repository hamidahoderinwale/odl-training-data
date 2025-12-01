/**
 * Deal Enrichment Utilities
 * Infers missing deal metadata from existing fields
 */

import { Deal } from '@/app/types/deal'

// Partial Deal type for enrichment (only fields we need)
type PartialDeal = Pick<Deal, 'dealType' | 'pricingMechanism' | 'reportedTerms' | 'date' | 'modality' | 'provider' | 'exclusive' | 'durationYears'>

export interface DealEnrichment {
  dealType?: string | null
  pricingMechanism?: string | null
  durationYears?: number | null
  trainingAllowed?: boolean | null
  finetuningAllowed?: boolean | null
  inferenceAllowed?: boolean | null
  redistributionAllowed?: boolean | null
  deletionRequired?: boolean | null
}

/**
 * Infer deal type from pricing mechanism and reported terms
 */
function inferDealType(deal: PartialDeal): string | null {
  // If already set, return it
  if (deal.dealType) return deal.dealType

  const terms = (deal.reportedTerms || '').toLowerCase()
  const pricing = (deal.pricingMechanism || '').toLowerCase()

  // Check for per-unit indicators
  if (
    terms.includes('per title') ||
    terms.includes('per book') ||
    terms.includes('per record') ||
    terms.includes('per image') ||
    terms.includes('per minute') ||
    terms.includes('per token') ||
    pricing.includes('per-unit') ||
    pricing.includes('per title') ||
    pricing.includes('per book')
  ) {
    return 'per-unit'
  }

  // Check for commissioning
  if (
    terms.includes('commission') ||
    terms.includes('commissioning') ||
    pricing.includes('commission')
  ) {
    return 'commissioning'
  }

  // Check for aggregate/licensing
  if (
    terms.includes('license') ||
    terms.includes('licensing') ||
    terms.includes('access') ||
    terms.includes('aggregate') ||
    pricing.includes('license') ||
    pricing.includes('access') ||
    pricing.includes('aggregate')
  ) {
    return 'aggregate'
  }

  // Default to aggregate for most deals
  return 'aggregate'
}

/**
 * Infer pricing mechanism from reported terms
 */
function inferPricingMechanism(deal: PartialDeal): string | null {
  // If already set, return it
  if (deal.pricingMechanism) return deal.pricingMechanism

  const terms = (deal.reportedTerms || '').toLowerCase()

  if (terms.includes('per title') || terms.includes('per book')) {
    return 'Per-unit licensing (per book)'
  }

  if (terms.includes('per record') || terms.includes('per image')) {
    return 'Per-unit licensing'
  }

  if (terms.includes('per minute') || terms.includes('per hour')) {
    return 'Per-unit licensing (time-based)'
  }

  if (terms.includes('revenue share') || terms.includes('revenue-sharing')) {
    return 'Revenue-sharing agreement'
  }

  if (terms.includes('api') || terms.includes('access')) {
    return 'Volume-based API / access'
  }

  if (terms.includes('license') || terms.includes('licensing')) {
    return 'Access / aggregate licensing'
  }

  return null
}

/**
 * Infer duration from reported terms or date ranges
 */
function inferDurationYears(deal: PartialDeal): number | null {
  // If already set, return it
  if (deal.durationYears) return deal.durationYears

  const terms = (deal.reportedTerms || '').toLowerCase()
  const date = deal.date || ''

  // Extract from terms like "5 years", "3-year", etc.
  const yearMatch = terms.match(/(\d+)\s*(?:year|yr)/i)
  if (yearMatch) {
    return parseFloat(yearMatch[1])
  }

  // Try to infer from date ranges
  if (date.includes('–') || date.includes('-')) {
    const parts = date.split(/[–-]/)
    if (parts.length === 2) {
      try {
        const start = new Date(parts[0].trim())
        const end = new Date(parts[1].trim())
        if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
          const years = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
          if (years > 0 && years < 20) {
            return Math.round(years * 10) / 10
          }
        }
      } catch (e) {
        // Ignore parsing errors
      }
    }
  }

  return null
}

/**
 * Infer rights from modality and deal characteristics
 */
function inferRights(deal: PartialDeal): {
  trainingAllowed: boolean | null
  finetuningAllowed: boolean | null
  inferenceAllowed: boolean | null
  redistributionAllowed: boolean | null
  deletionRequired: boolean | null
} {
  // Default assumptions based on modality and exclusivity
  const modality = (deal.modality || '').toLowerCase()
  const exclusive = deal.exclusive === true

  // Most deals allow training (that's the point)
  let trainingAllowed: boolean | null = true
  let finetuningAllowed: boolean | null = null
  let inferenceAllowed: boolean | null = null
  let redistributionAllowed: boolean | null = false
  let deletionRequired: boolean | null = null

  // Exclusive deals often have stricter terms
  if (exclusive) {
    redistributionAllowed = false
  }

  // News/publisher deals often require deletion
  if (modality.includes('text') && (deal.provider?.toLowerCase().includes('news') || deal.provider?.toLowerCase().includes('times'))) {
    deletionRequired = true
  }

  return {
    trainingAllowed,
    finetuningAllowed,
    inferenceAllowed,
    redistributionAllowed,
    deletionRequired,
  }
}

/**
 * Enrich a deal with inferred metadata
 */
export function enrichDeal(deal: PartialDeal): DealEnrichment {
  return {
    dealType: inferDealType(deal),
    pricingMechanism: inferPricingMechanism(deal),
    durationYears: inferDurationYears(deal),
    ...inferRights(deal),
  }
}

