import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const modality = searchParams.get('modality')
    const buyer = searchParams.get('buyer')
    const provider = searchParams.get('provider')
    const exclusive = searchParams.get('exclusive')
    const creatorsCompensated = searchParams.get('creatorsCompensated')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}

    if (modality) {
      where.modality = modality
    }
    if (buyer) {
      where.buyer = { contains: buyer }
    }
    if (provider) {
      where.provider = { contains: provider }
    }
    if (exclusive !== null) {
      where.exclusive = exclusive === 'true'
    }
    if (creatorsCompensated !== null) {
      where.creatorsCompensated = creatorsCompensated === 'true'
    }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { date: 'desc' },
        include: {
          buyerRelations: {
            include: {
              buyer: true,
            },
          },
          providerRelation: true,
        },
      }),
      prisma.deal.count({ where }),
    ])

    return NextResponse.json({
      deals,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching deals:', error)
    return NextResponse.json(
      { error: 'Failed to fetch deals' },
      { status: 500 }
    )
  }
}

