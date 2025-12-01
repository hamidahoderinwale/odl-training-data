/**
 * Shared type definitions for Deal entities
 */

export interface Deal {
  id: string
  provider: string
  buyer: string
  modality: string
  dataType: string | null
  priceUsd: number | null
  priceRangeMinUsd: number | null
  priceRangeMaxUsd: number | null
  reportedTerms: string | null
  exclusive: boolean | null
  creatorsCompensated: boolean | null
  creatorSplitPercentage: number | null
  revenueShare: boolean | null
  date: string | null
  dealType: string | null
  pricingMechanism: string | null
  sourcePrimary: string | null
  trainingAllowed: boolean | null
  finetuningAllowed: boolean | null
  inferenceAllowed: boolean | null
  redistributionAllowed: boolean | null
  deletionRequired: boolean | null
  notes: string | null
  sources: string | null
  durationYears: number | null
  pricingNormalizations?: Array<{
    unitType: string
    normalizedCostPerUnit: number
    normalizationMethod: string
  }>
  discoveredVia?: string | null
  exaQuery?: string | null
  exaScore?: number | null
  discoveryDate?: string | null
}

