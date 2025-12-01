import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enrichModel } from '@/lib/model-enrichment'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

/**
 * POST /api/models/enrich - Re-enrich all models with metadata
 * 
 * Updates all existing models with parameter estimates, token estimates, etc.
 */
export async function POST() {
  try {
    // Get all models
    const models = await prisma.modelRegistry.findMany({
      select: {
        id: true,
        modelId: true,
        provider: true,
        family: true,
        params: true,
        tokensEstMid: true,
      },
    })

    let updated = 0
    let errors = 0

    for (const model of models) {
      try {
        // Enrich with estimated metadata
        const enrichment = enrichModel(model.modelId, model.provider, model.family)

        // Update model with enriched data (overwrite existing if enrichment has values)
        await prisma.modelRegistry.update({
          where: { id: model.id },
          data: {
            params: enrichment.params ?? model.params,
            tokensEstMin: enrichment.tokensEstMin ?? undefined,
            tokensEstMax: enrichment.tokensEstMax ?? undefined,
            tokensEstMid: enrichment.tokensEstMid ?? model.tokensEstMid,
            architectureType: enrichment.architectureType ?? undefined,
            isMoe: enrichment.isMoe !== undefined ? enrichment.isMoe : undefined,
            multimodal: enrichment.multimodal !== undefined ? enrichment.multimodal : undefined,
            evidenceStrength: enrichment.evidenceStrength ?? undefined,
          },
        })
        updated++
      } catch (error: any) {
        console.error(`Error enriching model ${model.modelId}:`, error.message)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      errors,
      total: models.length,
      message: `Enriched ${updated} models with metadata.`,
    })
  } catch (error: any) {
    console.error('Model enrichment error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to enrich models',
      },
      { status: 500 }
    )
  }
}

