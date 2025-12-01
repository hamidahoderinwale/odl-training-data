import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/deals - Fetch deals with optional filters
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const buyer = searchParams.get('buyer')
    const modality = searchParams.get('modality')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (provider) where.provider = { contains: provider }
    if (buyer) where.buyer = { contains: buyer }
    if (modality) where.modality = modality

    const deals = await prisma.deal.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { date: 'desc' },
      select: {
        id: true,
        provider: true,
        buyer: true,
        modality: true,
        dataType: true,
        priceUsd: true,
        priceRangeMinUsd: true,
        priceRangeMaxUsd: true,
        reportedTerms: true,
        exclusive: true,
        creatorsCompensated: true,
        creatorSplitPercentage: true,
        revenueShare: true,
        date: true,
        dealType: true,
        pricingMechanism: true,
        sourcePrimary: true,
        trainingAllowed: true,
        finetuningAllowed: true,
        inferenceAllowed: true,
        redistributionAllowed: true,
        deletionRequired: true,
        notes: true,
        sources: true,
        durationYears: true,
        pricingNormalizations: {
          select: {
            unitType: true,
            normalizedCostPerUnit: true,
            normalizationMethod: true,
          },
        },
        priceCurrency: true,
        discoveredVia: true,
        exaQuery: true,
        exaScore: true,
        discoveryDate: true,
      },
    })

    const total = await prisma.deal.count({ where })

    return NextResponse.json({
      deals: deals.map(deal => ({
        ...deal,
        discoveryDate: deal.discoveryDate?.toISOString() || null,
      })),
      total,
      limit,
      offset,
    })
  } catch (error: any) {
    console.error('Error fetching deals:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch deals' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/deals - Create or update a deal
 * This endpoint can be used by MCP servers or directly
 */
export async function POST(request: Request) {
  try {
    const dealData = await request.json()

    // Map deal data to Prisma schema
    // Reuse logic from ingestion/pipeline/db_integration.py
    const mapped: any = {
      provider: dealData.provider || '',
      buyer: dealData.buyer || '',
      modality: dealData.modality || 'Text',
      dataType: dealData.dataType || null,
      priceUsd: dealData.priceUsd || null,
      priceRangeMinUsd: dealData.priceRangeMinUsd || null,
      priceRangeMaxUsd: dealData.priceRangeMaxUsd || null,
      reportedTerms: dealData.reportedTerms || null,
      exclusive: dealData.exclusive ?? null,
      creatorsCompensated: dealData.creatorsCompensated ?? null,
      creatorSplitPercentage: dealData.creatorSplitPercentage || null,
      revenueShare: dealData.revenueShare ?? null,
      date: dealData.date ? new Date(dealData.date) : null,
      dealType: dealData.dealType || null,
      pricingMechanism: dealData.pricingMechanism || null,
      sourcePrimary: dealData.sourcePrimary || dealData.source_url || null,
      trainingAllowed: dealData.trainingAllowed ?? null,
      finetuningAllowed: dealData.finetuningAllowed ?? null,
      inferenceAllowed: dealData.inferenceAllowed ?? null,
      redistributionAllowed: dealData.redistributionAllowed ?? null,
      deletionRequired: dealData.deletionRequired ?? null,
      notes: dealData.notes || null,
      sources: dealData.sources ? JSON.stringify(dealData.sources) : null,
      durationYears: dealData.durationYears || null,
      priceCurrency: dealData.priceCurrency || null,
      discoveredVia: dealData.discoveredVia || dealData.discovered_via || null,
      exaQuery: dealData.exaQuery || dealData.exa_query || null,
      exaScore: dealData.exaScore || dealData.exa_score || null,
      discoveryDate: dealData.discoveryDate ? new Date(dealData.discoveryDate) : null,
    }

    // Check if deal exists (by provider, buyer, date)
    const existing = await prisma.deal.findFirst({
      where: {
        provider: mapped.provider,
        buyer: mapped.buyer,
        date: mapped.date,
      },
    })

    let result
    let action: 'created' | 'updated'

    if (existing) {
      result = await prisma.deal.update({
        where: { id: existing.id },
        data: {
          ...mapped,
          updatedAt: new Date(),
        },
      })
      action = 'updated'
    } else {
      result = await prisma.deal.create({
        data: mapped,
      })
      action = 'created'
    }

    return NextResponse.json({
      success: true,
      deal_id: result.id,
      action,
      version: result.version || '1.0',
      provenance: {
        source: dealData.source_url || dealData.sourcePrimary,
        extracted_at: new Date().toISOString(),
        discovered_via: dealData.discoveredVia || dealData.discovered_via || 'api',
      },
    })
  } catch (error: any) {
    console.error('Error upserting deal:', error)
    return NextResponse.json(
      { 
        success: false,
        error: error.message || 'Failed to upsert deal',
        details: error.stack,
      },
      { status: 500 }
    )
  }
}
