/**
 * Priority Models List (TypeScript version)
 * Basic model records for direct Prisma ingestion
 */

export interface PriorityModel {
  model_id: string
  provider: string
  family: string | null
  release_date: string | null
  tier: string | null
}

function extractFamily(modelId: string, provider: string): string {
  // GPT family
  if (modelId.includes('GPT')) {
    if (modelId.includes('GPT-4')) return 'GPT-4'
    if (modelId.includes('GPT-3')) return 'GPT-3'
    return 'GPT'
  }
  
  // Claude family
  if (modelId.includes('Claude')) {
    if (modelId.includes('3.5')) return 'Claude 3.5'
    if (modelId.includes('3')) return 'Claude 3'
    if (modelId.includes('2')) return 'Claude 2'
    return 'Claude'
  }
  
  // Gemini family
  if (modelId.includes('Gemini')) {
    if (modelId.includes('2.0') || modelId.includes('Next')) return 'Gemini 2.0'
    if (modelId.includes('1.5')) return 'Gemini 1.5'
    return 'Gemini 1.0'
  }
  
  // Llama family (check more specific first)
  if (modelId.includes('Llama')) {
    if (modelId.includes('3.1')) return 'LLaMA 3.1'
    if (modelId.includes('3-') || modelId.includes('3 ')) return 'LLaMA 3' // Must have dash or space to avoid matching "13B"
    if (modelId.includes('2-') || modelId.includes('2 ')) return 'LLaMA 2' // Must have dash or space to avoid matching "12B", "13B"
    if (modelId.includes('1-') || modelId.includes('1 ')) return 'LLaMA 1' // Must have dash or space
    // Fallback: check for version numbers in different formats
    if (modelId.match(/Llama[-\s]?3/)) return 'LLaMA 3'
    if (modelId.match(/Llama[-\s]?2/)) return 'LLaMA 2'
    if (modelId.match(/Llama[-\s]?1/)) return 'LLaMA 1'
    return 'LLaMA'
  }
  
  // Qwen family
  if (modelId.includes('Qwen')) {
    if (modelId.includes('2.5')) return 'Qwen 2.5'
    if (modelId.includes('2')) return 'Qwen 2'
    if (modelId.includes('1.5')) return 'Qwen 1.5'
    return 'Qwen 1'
  }
  
  // Mistral/Mixtral
  if (modelId.includes('Mixtral')) return 'Mixtral'
  if (modelId.includes('Mistral')) return 'Mistral'
  
  // Grok
  if (modelId.includes('Grok')) return 'Grok'
  
  // DeepSeek
  if (modelId.includes('DeepSeek')) return 'DeepSeek'
  
  // ERNIE
  if (modelId.includes('ERNIE')) return 'ERNIE'
  
  // Falcon
  if (modelId.includes('Falcon')) return 'Falcon'
  
  // Default: use provider as family
  return provider
}

export function getAllPriorityModels(): PriorityModel[] {
  const models: PriorityModel[] = []
  
  // Tier 1: Frontier Closed Models
  const frontierClosed: Record<string, string[]> = {
    'OpenAI': ['GPT-3', 'GPT-3.5', 'GPT-4', 'GPT-4 Turbo', 'GPT-4o', 'GPT-4.1', 'GPT-4.1 Preview', 'GPT-4.1 Mini', 'o1', 'o3'],
    'Anthropic': ['Claude 1', 'Claude 2', 'Claude 2.1', 'Claude 3 Haiku', 'Claude 3 Sonnet', 'Claude 3 Opus', 'Claude 3.5 Haiku', 'Claude 3.5 Sonnet', 'Claude 3.5 Opus'],
    'Google DeepMind': ['PaLM', 'PaLM-2', 'Gemini 1.0 Nano', 'Gemini 1.0 Pro', 'Gemini 1.0 Ultra', 'Gemini 1.5 Flash', 'Gemini 1.5 Pro', 'Gemini 1.5 Ultra', 'Gemini 2.0', 'Gemini Next'],
  }
  
  // Tier 1B: Major Open-Weight Models
  const openWeight: Record<string, string[]> = {
    'Meta': ['Llama-1-7B', 'Llama-1-13B', 'Llama-1-30B', 'Llama-1-65B', 'Llama-2-7B', 'Llama-2-13B', 'Llama-2-70B', 'Llama-3-8B', 'Llama-3-70B', 'Llama-3.1-8B', 'Llama-3.1-70B', 'Llama-3.1-405B'],
    'Mistral AI': ['Mistral-7B', 'Mixtral-8x7B', 'Mixtral-8x22B', 'Mistral Nemo', 'Mistral Small', 'Mistral Medium', 'Mistral Large'],
    'xAI': ['Grok-1', 'Grok-1.5', 'Grok-1.5 Vision', 'Grok-2'],
  }
  
  // Add frontier closed models
  for (const [provider, modelList] of Object.entries(frontierClosed)) {
    for (const modelId of modelList) {
      models.push({
        model_id: modelId,
        provider,
        family: extractFamily(modelId, provider),
        release_date: null, // Will be enriched by Python pipeline
        tier: 'Tier 1: Frontier Closed',
      })
    }
  }
  
  // Add open weight models
  for (const [provider, modelList] of Object.entries(openWeight)) {
    for (const modelId of modelList) {
      models.push({
        model_id: modelId,
        provider,
        family: extractFamily(modelId, provider),
        release_date: null,
        tier: 'Tier 1B: Open Weight',
      })
    }
  }
  
  // Add a few more key models
  models.push(
    { model_id: 'command', provider: 'Cohere', family: 'Command', release_date: '2023-03-15', tier: 'Tier 2' },
    { model_id: 'command-r', provider: 'Cohere', family: 'Command', release_date: '2024-03-11', tier: 'Tier 1' },
    { model_id: 'command-r-plus', provider: 'Cohere', family: 'Command', release_date: '2024-03-11', tier: 'Tier 1' },
    { model_id: 'jurassic-2-ultra', provider: 'AI21 Labs', family: 'Jurassic', release_date: '2023-03-01', tier: 'Tier 1' },
    { model_id: 'jurassic-2-mid', provider: 'AI21 Labs', family: 'Jurassic', release_date: '2023-03-01', tier: 'Tier 2' },
  )
  
  return models
}

