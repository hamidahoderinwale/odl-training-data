/**
 * Model metadata enrichment utilities
 * Adds estimated parameters, tokens, and other metadata based on model names
 */

export interface ModelEnrichment {
  params?: number | null
  tokensEstMin?: number | null
  tokensEstMax?: number | null
  tokensEstMid?: number | null
  architectureType?: string | null
  isMoe?: boolean | null
  multimodal?: boolean | null
  evidenceStrength?: string | null
}

/**
 * Extract parameter count from model ID (e.g., "Llama-2-7B" -> 7)
 */
function extractParams(modelId: string): number | null {
  // Patterns: 7B, 13B, 70B, 175B, 405B, etc.
  const patterns = [
    /(\d+(?:\.\d+)?)B/i,  // 7B, 13B, 70B, 405B
    /(\d+(?:\.\d+)?)T/i,  // 1T, 2T
    /(\d+(?:\.\d+)?)M/i,  // 350M
  ]

  for (const pattern of patterns) {
    const match = modelId.match(pattern)
    if (match) {
      const value = parseFloat(match[1])
      if (pattern.source.includes('T')) {
        return value * 1000 // Convert T to B
      } else if (pattern.source.includes('M')) {
        return value / 1000 // Convert M to B
      }
      return value
    }
  }

  // Special cases (check more specific first)
  if (modelId.includes('GPT-4o')) return 1800 // ~1.8T estimated
  if (modelId.includes('GPT-4.1')) return 1800
  if (modelId.includes('GPT-4 Turbo')) return 1800
  if (modelId.includes('GPT-4')) return 1800
  if (modelId.includes('GPT-3.5')) return 175
  if (modelId.includes('GPT-3')) return 175
  if (modelId.includes('Claude 3.5')) return 200
  if (modelId.includes('Claude 3')) return 200
  if (modelId.includes('Claude 2.1')) return 200
  if (modelId.includes('Claude 2')) return 200
  if (modelId.includes('Claude 1')) return 52
  if (modelId.includes('Gemini 2.0') || modelId.includes('Gemini Next')) return 540
  if (modelId.includes('Gemini 1.5')) return 540
  if (modelId.includes('Gemini 1.0')) return 540
  if (modelId.includes('Gemini')) return 540
  if (modelId.includes('PaLM-2')) return 340
  if (modelId.includes('PaLM')) return 540
  if (modelId.includes('o3')) return 70
  if (modelId.includes('o1')) return 70
  if (modelId.includes('Grok-2')) return 314
  if (modelId.includes('Grok-1.5')) return 314
  if (modelId.includes('Grok-1')) return 314
  if (modelId.includes('Grok')) return 314
  if (modelId.includes('Mistral Large')) return 123
  if (modelId.includes('Mistral Medium')) return 17
  if (modelId.includes('Mistral Small')) return 3
  if (modelId.includes('Mistral Nemo')) return 1.2
  if (modelId.includes('Mistral')) return 7
  if (modelId.includes('Mixtral-8x22B')) return 141
  if (modelId.includes('Mixtral-8x7B')) return 47
  if (modelId.includes('Mixtral')) return 47
  if (modelId.includes('command-r-plus')) return 104
  if (modelId.includes('command-r')) return 104
  if (modelId.includes('command')) return 52
  if (modelId.includes('jurassic-2-ultra')) return 178
  if (modelId.includes('jurassic-2-mid')) return 178
  if (modelId.includes('jurassic')) return 178

  return null
}

/**
 * Estimate tokens based on parameters
 */
function estimateTokens(params: number, isMoe: boolean = false): {
  min: number
  max: number
  mid: number
} {
  const paramsAbs = params * 1e9 // Convert to absolute

  // MoE models use fewer tokens per param
  const ratioMin = isMoe ? 3 : 5
  const ratioMax = isMoe ? 15 : 30

  const min = paramsAbs * ratioMin
  const max = paramsAbs * ratioMax
  const mid = (min + max) / 2

  return { min, max, mid }
}

/**
 * Detect architecture type from model ID
 */
function detectArchitecture(modelId: string, provider: string): {
  architectureType: string | null
  isMoe: boolean
  multimodal: boolean
} {
  const lower = modelId.toLowerCase()
  const providerLower = provider.toLowerCase()

  let architectureType: string | null = null
  let isMoe = false
  let multimodal = false

  // MoE detection (check first, but don't stop here)
  if (lower.includes('mixtral') || lower.includes('moe')) {
    isMoe = true
  }

  // Architecture types (set even if MoE)
  if (lower.includes('gpt') || providerLower.includes('openai')) {
    architectureType = isMoe ? 'MoE Transformer' : 'Transformer'
  } else if (lower.includes('claude') || providerLower.includes('anthropic')) {
    architectureType = 'Transformer'
  } else if (lower.includes('gemini') || lower.includes('palm') || providerLower.includes('google')) {
    architectureType = 'Transformer'
  } else if (lower.includes('llama') || providerLower.includes('meta')) {
    architectureType = isMoe ? 'MoE Transformer' : 'Transformer'
  } else if (lower.includes('mistral') || lower.includes('mixtral')) {
    architectureType = isMoe ? 'MoE' : 'Transformer'
  } else if (lower.includes('grok') || providerLower.includes('xai')) {
    architectureType = 'Transformer'
  } else if (lower.includes('command') || providerLower.includes('cohere')) {
    architectureType = 'Transformer'
  } else if (lower.includes('jurassic') || providerLower.includes('ai21')) {
    architectureType = 'Transformer'
  } else {
    // Default to Transformer for most modern LLMs
    architectureType = 'Transformer'
  }

  // Multimodal detection
  if (lower.includes('vision') || lower.includes('multimodal') || 
      lower.includes('gpt-4o') || lower.includes('gpt-4.1') ||
      lower.includes('gemini') || lower.includes('claude-3.5') ||
      lower.includes('claude-3') || lower.includes('grok-1.5 vision')) {
    multimodal = true
  }

  return { architectureType, isMoe, multimodal }
}

/**
 * Calculate evidence strength based on available data
 */
function calculateEvidenceStrength(params: number | null, tokensEstMid: number | null): string | null {
  // Evidence strength: S-High, S-Medium, S-Low
  // Based on how much data we have
  
  if (params && tokensEstMid) {
    // We have both params and token estimates - high evidence
    return 'S-High'
  } else if (params || tokensEstMid) {
    // We have one or the other - medium evidence
    return 'S-Medium'
  } else {
    // No estimates - low evidence
    return 'S-Low'
  }
}

/**
 * Enrich a model with estimated metadata
 */
export function enrichModel(modelId: string, provider: string, family: string | null): ModelEnrichment {
  const params = extractParams(modelId)
  const { architectureType, isMoe, multimodal } = detectArchitecture(modelId, provider)

  let tokensEstMin: number | null = null
  let tokensEstMax: number | null = null
  let tokensEstMid: number | null = null

  if (params) {
    const tokens = estimateTokens(params, isMoe)
    tokensEstMin = tokens.min
    tokensEstMax = tokens.max
    tokensEstMid = tokens.mid
  }

  // Calculate evidence strength based on available data
  const evidenceStrength = calculateEvidenceStrength(params, tokensEstMid)

  return {
    params,
    tokensEstMin,
    tokensEstMax,
    tokensEstMid,
    architectureType,
    isMoe,
    multimodal,
    evidenceStrength,
  }
}

