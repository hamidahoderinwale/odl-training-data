import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    const where: any = {}
    if (provider) {
      where.provider = provider
    }

    const [models, total] = await Promise.all([
      prisma.modelRegistry.findMany({
        where,
        take: limit,
        skip: offset,
        orderBy: { releaseDate: 'desc' },
      }),
      prisma.modelRegistry.count({ where }),
    ])

    return NextResponse.json({
      models,
      total,
      limit,
      offset,
    })
  } catch (error) {
    console.error('Error fetching models:', error)
    return NextResponse.json(
      { error: 'Failed to fetch models' },
      { status: 500 }
    )
  }
}

