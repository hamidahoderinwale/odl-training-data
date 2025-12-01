import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const dealId = searchParams.get('dealId')
    const modelId = searchParams.get('modelId')

    const where: any = {}
    if (dealId) {
      where.dealId = dealId
    }
    if (modelId) {
      where.modelId = modelId
    }

    const linkages = await prisma.dealModelLinkage.findMany({
      where,
      include: {
        deal: {
          select: {
            id: true,
            provider: true,
            buyer: true,
            modality: true,
            priceUsd: true,
          },
        },
        model: {
          select: {
            id: true,
            modelId: true,
            provider: true,
            tokensEstMin: true,
            tokensEstMax: true,
          },
        },
      },
      orderBy: { analysisTimestamp: 'desc' },
    })

    return NextResponse.json({ linkages })
  } catch (error) {
    console.error('Error fetching linkages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch linkages' },
      { status: 500 }
    )
  }
}

