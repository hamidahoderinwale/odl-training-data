import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface FeedItem {
  id: string
  type: 'article' | 'tweet' | 'post'
  url: string
  title?: string
  source?: string
  publishedAt?: string | null
  snippet?: string | null
  tweetId?: string
  author?: string
  domain?: string
}

/**
 * Get related content feed for a deal
 * GET /api/deals/[id]/feed
 * 
 * Returns related articles, Twitter posts, and mentions
 */
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const deal = await prisma.deal.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        provider: true,
        buyer: true,
        modality: true,
        dataType: true,
        sources: true,
        sourcePrimary: true,
        exaQuery: true,
        date: true,
      },
    })

    if (!deal) {
      return NextResponse.json({ error: 'Deal not found' }, { status: 404 })
    }

    const feedItems: FeedItem[] = []

    // Parse and add stored sources
    let sourceUrls: string[] = []
    try {
      const sources = JSON.parse(deal.sources || '[]')
      if (Array.isArray(sources)) {
        sourceUrls = sources.filter((s: any) => typeof s === 'string' && s.startsWith('http'))
      }
    } catch (e) {
      // If sources is not JSON, ignore
    }

    // Add sourcePrimary if it's a URL
    if (deal.sourcePrimary && deal.sourcePrimary.startsWith('http')) {
      sourceUrls.push(deal.sourcePrimary)
    }

    // Process sources into feed items
    sourceUrls.forEach((url, idx) => {
      const domain = extractDomain(url)
      const isTwitter = url.includes('twitter.com') || url.includes('x.com')
      const tweetId = isTwitter ? extractTweetId(url) : undefined

      feedItems.push({
        id: `source-${idx}`,
        type: isTwitter ? 'tweet' : 'article',
        url,
        title: domain,
        domain,
        source: 'stored_source',
        publishedAt: null,
        snippet: null,
        tweetId,
      })
    })

    // Use Exa API to find more related content
    const exaApiKey = process.env.EXA_API_KEY
    if (exaApiKey) {
      try {
        const searchQueries = [
          `${deal.provider} ${deal.buyer} AI deal`,
          `${deal.provider} training data licensing`,
          `${deal.buyer} data partnership ${deal.provider}`,
        ]

        for (const query of searchQueries) {
          const exaResults = await searchExa(exaApiKey, query, 5)
          
          for (const result of exaResults) {
            // Skip if already in feed
            if (feedItems.some(item => item.url === result.url)) {
              continue
            }

            const domain = extractDomain(result.url)
            const isTwitter = result.url.includes('twitter.com') || result.url.includes('x.com')
            const tweetId = isTwitter ? extractTweetId(result.url) : undefined

            feedItems.push({
              id: `exa-${feedItems.length}`,
              type: isTwitter ? 'tweet' : 'article',
              url: result.url,
              title: result.title || domain,
              domain,
              source: 'exa',
              publishedAt: result.published_date || null,
              snippet: result.summary || null,
              tweetId,
              author: result.author || null,
            })
          }
        }
      } catch (error) {
        console.error('Exa API error:', error)
        // Continue without Exa results
      }
    }

    // Sort by published date (newest first), then by source (stored sources first)
    feedItems.sort((a, b) => {
      if (a.source === 'stored_source' && b.source !== 'stored_source') return -1
      if (a.source !== 'stored_source' && b.source === 'stored_source') return 1
      if (a.publishedAt && b.publishedAt) {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()
      }
      return 0
    })

    return NextResponse.json({
      dealId: deal.id,
      provider: deal.provider,
      buyer: deal.buyer,
      items: feedItems,
      total: feedItems.length,
    })
  } catch (error: any) {
    console.error('Error fetching deal feed:', error)
    return NextResponse.json(
      { error: 'Failed to fetch feed' },
      { status: 500 }
    )
  }
}

async function searchExa(apiKey: string, query: string, numResults: number = 5) {
  try {
    const response = await fetch('https://api.exa.ai/search', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        num_results: numResults,
        use_autoprompt: true,
      }),
    })

    if (!response.ok) {
      throw new Error(`Exa API error: ${response.statusText}`)
    }

    const data = await response.json()
    return (data.results || []).map((item: any) => ({
      url: item.url || '',
      title: item.title || '',
      summary: item.text || item.summary || '',
      published_date: item.published_date || null,
      author: item.author || null,
      score: item.score || 0,
    }))
  } catch (error) {
    console.error('Exa search error:', error)
    return []
  }
}

function extractDomain(url: string): string {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname.replace('www.', '')
  } catch {
    return url
  }
}

function extractTweetId(url: string): string | undefined {
  try {
    // Match Twitter/X URLs like:
    // https://twitter.com/username/status/1234567890
    // https://x.com/username/status/1234567890
    const match = url.match(/(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/)
    return match ? match[1] : undefined
  } catch {
    return undefined
  }
}

