import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createDealModelLinkages } from '@/lib/linkage'

export const dynamic = 'force-dynamic'

/**
 * POST /api/linkages/create - Create linkages between all deals and models
 */
export async function POST() {
  try {
    // Get all deals
    const deals = await prisma.deal.findMany({
      select: {
        id: true,
        buyer: true,
        provider: true,
        date: true,
        modality: true,
        exclusive: true,
        priceUsd: true,
        priceRangeMinUsd: true,
        priceRangeMaxUsd: true,
        dataType: true,
      },
    })

    // Get all models
    const models = await prisma.modelRegistry.findMany({
      select: {
        id: true,
        modelId: true,
        provider: true,
        releaseDate: true,
        tokensEstMid: true,
        params: true,
      },
    })

    if (deals.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No deals found. Please seed the database first.',
      }, { status: 400 })
    }

    if (models.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No models found. Please run the registry ingestion pipeline first.',
      }, { status: 400 })
    }

            // Create linkages
            const linkages = createDealModelLinkages(
              deals.map(d => ({
                id: d.id,
                buyer: d.buyer,
                provider: d.provider,
                date: d.date ? new Date(d.date) : null,
                modality: d.modality,
                exclusive: d.exclusive,
                priceUsd: d.priceUsd,
                priceRangeMinUsd: d.priceRangeMinUsd,
                priceRangeMaxUsd: d.priceRangeMaxUsd,
                dataType: d.dataType,
              })),
      models.map(m => ({
        id: m.id,
        modelId: m.modelId,
        provider: m.provider,
        releaseDate: m.releaseDate,
        tokensEstMid: m.tokensEstMid,
        params: m.params,
      }))
    )

    // Store linkages
    let created_count = 0
    let updated_count = 0
    let error_count = 0

    for (const linkage of linkages) {
      try {
        const existing = await prisma.dealModelLinkage.findUnique({
          where: {
            dealId_modelId: {
              dealId: linkage.deal_id,
              modelId: linkage.model_id,
            },
          },
        })

        if (existing) {
          await prisma.dealModelLinkage.update({
            where: { id: existing.id },
            data: {
              linkageType: linkage.linkage_type,
              linkageStrength: linkage.linkage_strength,
              impactInference: linkage.impact_inference || null,
              analysisTimestamp: new Date(),
            },
          })
          updated_count++
        } else {
          await prisma.dealModelLinkage.create({
            data: {
              dealId: linkage.deal_id,
              modelId: linkage.model_id,
              linkageType: linkage.linkage_type,
              linkageStrength: linkage.linkage_strength,
              impactInference: linkage.impact_inference || null,
              analysisTimestamp: new Date(),
            },
          })
          created_count++
        }
      } catch (error: any) {
        console.error(`Error creating linkage: ${error.message}`)
        error_count++
      }
    }

    return NextResponse.json({
      success: true,
      created: created_count,
      updated: updated_count,
      errors: error_count,
      total: created_count + updated_count,
      deals_count: deals.length,
      models_count: models.length,
      linkages_generated: linkages.length,
    })
  } catch (error: any) {
    console.error('Error creating linkages:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to create linkages',
      },
      { status: 500 }
    )
  }
}

