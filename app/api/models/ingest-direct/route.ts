import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAllPriorityModels } from '@/lib/priority-models'
import { enrichModel } from '@/lib/model-enrichment'

export const dynamic = 'force-dynamic'
export const maxDuration = 600 // 10 minutes

/**
 * POST /api/models/ingest-direct - Ingest models directly via Prisma (no Python)
 * 
 * Creates model records with automatically enriched metadata:
 * - Parameter estimates from model names (e.g., "7B" -> 7 billion)
 * - Token estimates based on parameter ratios
 * - Architecture detection (Transformer, MoE)
 * - Multimodal detection
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')

    // Get priority models list
    const priorityModels = getAllPriorityModels()
    const modelsToIngest = limit ? priorityModels.slice(0, parseInt(limit)) : priorityModels

    let created = 0
    let updated = 0
    let errors = 0

    for (const model of modelsToIngest) {
      try {
        // Check if model already exists
        const existing = await prisma.modelRegistry.findUnique({
          where: { modelId: model.model_id },
        })

        if (existing) {
          // Always enrich to ensure metadata is up to date
          const enrichment = enrichModel(model.model_id, model.provider, model.family)
          
          // Update with enriched data (prefer enrichment values if they exist)
          await prisma.modelRegistry.update({
            where: { id: existing.id },
            data: {
              provider: model.provider,
              family: model.family || null,
              releaseDate: model.release_date ? new Date(model.release_date) : null,
              version: '1.0',
                // Use enrichment values if available, otherwise keep existing
                params: enrichment.params ?? existing.params,
                tokensEstMin: enrichment.tokensEstMin ?? existing.tokensEstMin,
                tokensEstMax: enrichment.tokensEstMax ?? existing.tokensEstMax,
                tokensEstMid: enrichment.tokensEstMid ?? existing.tokensEstMid,
                architectureType: enrichment.architectureType ?? existing.architectureType,
                isMoe: enrichment.isMoe !== undefined ? enrichment.isMoe : existing.isMoe,
                multimodal: enrichment.multimodal !== undefined ? enrichment.multimodal : existing.multimodal,
                evidenceStrength: enrichment.evidenceStrength ?? existing.evidenceStrength,
            },
          })
          updated++
        } else {
          // Enrich with estimated metadata
          const enrichment = enrichModel(model.model_id, model.provider, model.family)

          // Create new model with enriched data
          await prisma.modelRegistry.create({
            data: {
              modelId: model.model_id,
              provider: model.provider,
              family: model.family || null,
              releaseDate: model.release_date ? new Date(model.release_date) : null,
              version: '1.0',
              // Enriched metadata
              params: enrichment.params,
              tokensEstMin: enrichment.tokensEstMin,
              tokensEstMax: enrichment.tokensEstMax,
              tokensEstMid: enrichment.tokensEstMid,
              architectureType: enrichment.architectureType,
              isMoe: enrichment.isMoe || false,
              multimodal: enrichment.multimodal || false,
              evidenceStrength: enrichment.evidenceStrength,
            },
          })
          created++
        }
      } catch (error: any) {
        console.error(`Error ingesting model ${model.model_id}:`, error.message)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      created,
      updated,
      errors,
      total: created + updated,
      models_ingested: created + updated, // For compatibility with AutoIngest
      message: 'Model records created with enriched metadata (parameters, tokens, architecture).',
    })
  } catch (error: any) {
    console.error('Direct model ingestion error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to ingest models',
      },
      { status: 500 }
    )
  }
}

