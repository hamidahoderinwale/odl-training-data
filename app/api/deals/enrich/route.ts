import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { enrichDeal } from '@/lib/deal-enrichment'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes

/**
 * POST /api/deals/enrich - Enrich all deals with inferred metadata
 * 
 * This endpoint enriches deals that are missing fields like dealType,
 * pricingMechanism, durationYears, and rights fields.
 */
export async function POST() {
  try {
    // Get all deals (only fields needed for enrichment)
    const deals = await prisma.deal.findMany({
      select: {
        id: true,
        provider: true,
        modality: true,
        reportedTerms: true,
        exclusive: true,
        date: true,
        dealType: true,
        pricingMechanism: true,
        trainingAllowed: true,
        finetuningAllowed: true,
        inferenceAllowed: true,
        redistributionAllowed: true,
        deletionRequired: true,
        durationYears: true,
      },
    })

    let updated = 0
    let errors = 0

    for (const deal of deals) {
      try {
        // Enrich with inferred metadata
        const enrichment = enrichDeal(deal)

        // Only update fields that are missing
        const updateData: any = {}
        
        if (!deal.dealType && enrichment.dealType) {
          updateData.dealType = enrichment.dealType
        }
        
        if (!deal.pricingMechanism && enrichment.pricingMechanism) {
          updateData.pricingMechanism = enrichment.pricingMechanism
        }
        
        if (!deal.durationYears && enrichment.durationYears) {
          updateData.durationYears = enrichment.durationYears
        }
        
        if (deal.trainingAllowed === null && enrichment.trainingAllowed !== null) {
          updateData.trainingAllowed = enrichment.trainingAllowed
        }
        
        if (deal.finetuningAllowed === null && enrichment.finetuningAllowed !== null) {
          updateData.finetuningAllowed = enrichment.finetuningAllowed
        }
        
        if (deal.inferenceAllowed === null && enrichment.inferenceAllowed !== null) {
          updateData.inferenceAllowed = enrichment.inferenceAllowed
        }
        
        if (deal.redistributionAllowed === null && enrichment.redistributionAllowed !== null) {
          updateData.redistributionAllowed = enrichment.redistributionAllowed
        }
        
        if (deal.deletionRequired === null && enrichment.deletionRequired !== null) {
          updateData.deletionRequired = enrichment.deletionRequired
        }

        // Only update if there are fields to update
        if (Object.keys(updateData).length > 0) {
          await prisma.deal.update({
            where: { id: deal.id },
            data: updateData,
          })
          updated++
        }
      } catch (error: any) {
        console.error(`Error enriching deal ${deal.id}:`, error.message)
        errors++
      }
    }

    return NextResponse.json({
      success: true,
      updated,
      errors,
      total: deals.length,
      message: `Enriched ${updated} deals with inferred metadata.`,
    })
  } catch (error: any) {
    console.error('Deal enrichment error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to enrich deals',
      },
      { status: 500 }
    )
  }
}

