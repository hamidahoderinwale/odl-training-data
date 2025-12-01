/**
 * Deal-Model Linkage System (TypeScript version)
 * Creates temporal and inferred linkages between deals and models
 */

interface Deal {
  id: string
  buyer: string | null
  provider: string | null
  date: Date | null
  modality: string | null
  exclusive: boolean | null
  priceUsd?: number | null
  priceRangeMinUsd?: number | null
  priceRangeMaxUsd?: number | null
  dataType?: string | null
}

interface Model {
  id: string
  modelId: string | null
  provider: string | null
  releaseDate: Date | null
  tokensEstMid?: number | null
  params?: number | null
}

interface Linkage {
  deal_id: string
  model_id: string
  linkage_type: 'temporal_overlap' | 'inferred' | 'explicit'
  linkage_strength: 'high' | 'medium' | 'low'
  impact_inference?: string
}

function extractYear(date: Date | string | null): number | null {
  if (!date) return null
  try {
    const d = date instanceof Date ? date : new Date(date)
    return d.getFullYear()
  } catch {
    return null
  }
}

export function createDealModelLinkages(
  deals: Deal[],
  models: Model[]
): Linkage[] {
  const linkages: Linkage[] = []

  const buyerProviderMap: Record<string, string> = {
    openai: 'openai',
    google: 'google',
    meta: 'meta',
    facebook: 'meta',
    microsoft: 'microsoft',
    anthropic: 'anthropic',
    aws: 'amazon',
    amazon: 'amazon',
  }

  for (const deal of deals) {
    const dealBuyer = (deal.buyer || '').toLowerCase()
    const dealProvider = (deal.provider || '').toLowerCase()
    const dealDate = deal.date
    const dealModality = (deal.modality || '').toLowerCase()

    for (const model of models) {
      const modelProvider = (model.provider || '').toLowerCase()

      // Normalize buyer name
      let normalizedBuyer: string | null = null
      for (const [key, value] of Object.entries(buyerProviderMap)) {
        if (dealBuyer.includes(key)) {
          normalizedBuyer = value
          break
        }
      }

      // Create linkage if buyer matches model provider
      if (normalizedBuyer && modelProvider.includes(normalizedBuyer)) {
        let linkageStrength: 'high' | 'medium' | 'low' = 'high'
        let linkageType: 'temporal_overlap' | 'inferred' | 'explicit' = 'inferred'

        // Check temporal overlap if dates available
        if (dealDate && model.releaseDate) {
          const dealYear = extractYear(dealDate)
          const modelYear = extractYear(model.releaseDate)
          if (dealYear && modelYear && Math.abs(dealYear - modelYear) <= 1) {
            linkageType = 'temporal_overlap'
            linkageStrength = 'high'
          }
        }

        // Generate contextual impact inference
        const impact = generateImpactInference(
          deal,
          model,
          linkageType,
          dealModality,
          modelProvider
        )

        linkages.push({
          deal_id: deal.id,
          model_id: model.id,
          linkage_type: linkageType,
          linkage_strength: linkageStrength,
          impact_inference: impact,
        })
      }
    }
  }

  return linkages
}

/**
 * Generate a contextual impact inference based on deal and model characteristics
 */
function generateImpactInference(
  deal: Deal,
  model: Model,
  linkageType: 'temporal_overlap' | 'inferred' | 'explicit',
  dealModality: string,
  modelProvider: string
): string {
  const modality = dealModality || 'data'
  const provider = modelProvider || 'the model'
  const exclusive = deal.exclusive === true
  const dealValue = deal.priceUsd || deal.priceRangeMinUsd || deal.priceRangeMaxUsd
  const modelSize = model.tokensEstMid || model.params

  // Build base description
  let base = ''
  if (exclusive) {
    base = `Exclusive ${modality} licensing deal`
  } else {
    base = `${modality} data licensing deal`
  }

  // Add value context if available
  let valueContext = ''
  if (dealValue) {
    if (dealValue >= 1000000000) {
      valueContext = ` ($${(dealValue / 1000000000).toFixed(1)}B deal)`
    } else if (dealValue >= 1000000) {
      valueContext = ` ($${(dealValue / 1000000).toFixed(0)}M deal)`
    } else if (dealValue >= 1000) {
      valueContext = ` ($${(dealValue / 1000).toFixed(0)}K deal)`
    }
  }

  // Add temporal context
  let temporalContext = ''
  if (linkageType === 'temporal_overlap') {
    temporalContext = ' during the model\'s training period'
  } else {
    temporalContext = ' that may have contributed to training'
  }

  // Add model context
  let modelContext = ''
  if (modelSize) {
    if (model.tokensEstMid) {
      if (model.tokensEstMid >= 1e12) {
        modelContext = ` for a ${(model.tokensEstMid / 1e12).toFixed(1)}T-token model`
      } else if (model.tokensEstMid >= 1e9) {
        modelContext = ` for a ${(model.tokensEstMid / 1e9).toFixed(1)}B-token model`
      }
    } else if (model.params) {
      if (model.params >= 1e12) {
        modelContext = ` for a ${(model.params / 1e12).toFixed(1)}T-parameter model`
      } else if (model.params >= 1e9) {
        modelContext = ` for a ${(model.params / 1e9).toFixed(1)}B-parameter model`
      }
    }
  }

  // Combine into final inference
  let inference = `${base}${valueContext}${temporalContext}${modelContext}.`
  
  // Add specific implications based on modality
  if (modality.includes('text')) {
    if (deal.provider?.toLowerCase().includes('news') || deal.provider?.toLowerCase().includes('times')) {
      inference += ' Likely improved news and journalism understanding.'
    } else if (deal.provider?.toLowerCase().includes('book') || deal.provider?.toLowerCase().includes('publisher')) {
      inference += ' Likely enhanced literary and long-form text capabilities.'
    } else {
      inference += ' Likely improved general text understanding and generation.'
    }
  } else if (modality.includes('image')) {
    inference += ' Likely enhanced visual understanding and image generation capabilities.'
  } else if (modality.includes('audio') || modality.includes('music')) {
    inference += ' Likely improved audio processing and music generation capabilities.'
  } else if (modality.includes('video')) {
    inference += ' Likely enhanced video understanding and generation capabilities.'
  }

  // Add exclusivity implications
  if (exclusive) {
    inference += ' This exclusive arrangement suggests the data was a strategic priority for training.'
  }

  return inference
}

