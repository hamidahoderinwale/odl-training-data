'use client'

import { useState, useEffect } from 'react'

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

interface DealFeedProps {
  dealId: string
  provider: string
  buyer: string
}

export default function DealFeed({ dealId, provider, buyer }: DealFeedProps) {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchFeed() {
      try {
        const response = await fetch(`/api/deals/${dealId}/feed`)
        if (!response.ok) {
          throw new Error('Failed to fetch feed')
        }
        const data = await response.json()
        setFeedItems(data.items || [])
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    if (dealId) {
      fetchFeed()
    }
  }, [dealId])

  // Reload Twitter widgets when feed items change
  useEffect(() => {
    if (feedItems.length > 0 && typeof window !== 'undefined') {
      const twitterWidget = (window as any).twttr
      if (twitterWidget && twitterWidget.widgets) {
        twitterWidget.widgets.load()
      }
    }
  }, [feedItems])

  if (loading) {
    return (
      <div className="text-center py-8 text-text-muted">
        <div className="text-sm">Loading related content...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8 text-text-muted">
        <div className="text-sm text-red-500">Error loading feed: {error}</div>
      </div>
    )
  }

  if (feedItems.length === 0) {
    return (
      <div className="text-center py-8 text-text-muted">
        <div className="text-sm">No related content found</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Related Content</h3>
        <span className="text-xs text-text-muted">{feedItems.length} items</span>
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {feedItems.map((item) => (
          <FeedItemCard key={item.id} item={item} />
        ))}
      </div>
    </div>
  )
}

function FeedItemCard({ item }: { item: FeedItem }) {
  const [isExpanded, setIsExpanded] = useState(false)

  const isTwitter = item.url.includes('twitter.com') || item.url.includes('x.com')
  const isArticle = item.type === 'article' || (!isTwitter && item.url.startsWith('http'))

  return (
    <div className="border border-border-subtle rounded-sm p-4 hover:border-border transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            {isTwitter && (
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/20 text-blue-500 rounded-sm font-mono">
                TWITTER
              </span>
            )}
            {isArticle && (
              <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded-sm font-mono">
                ARTICLE
              </span>
            )}
            {item.source && (
              <span className="text-xs text-text-muted">{item.source}</span>
            )}
          </div>

          {item.title && (
            <h4 className="font-medium text-sm mb-1 line-clamp-2">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-accent transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                {item.title}
              </a>
            </h4>
          )}

          {item.snippet && (
            <p className="text-xs text-text-muted line-clamp-3 mb-2">{item.snippet}</p>
          )}

          {item.domain && (
            <div className="text-xs text-text-muted/60 mb-2">{item.domain}</div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-accent hover:text-accent-hover font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              View Original →
            </a>
            {item.publishedAt && (
              <span className="text-xs text-text-muted">
                {new Date(item.publishedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Twitter Embed */}
      {isTwitter && item.tweetId && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <blockquote className="twitter-tweet" data-theme="light" data-tweet-id={item.tweetId}>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-text-muted">
              Loading tweet...
            </a>
          </blockquote>
        </div>
      )}
      {isTwitter && !item.tweetId && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent hover:text-accent-hover"
          >
            View on Twitter/X →
          </a>
        </div>
      )}

      {/* Article Preview */}
      {isArticle && isExpanded && (
        <div className="mt-3 pt-3 border-t border-border-subtle">
          <iframe
            src={item.url}
            className="w-full h-64 border border-border-subtle rounded-sm"
            title={item.title || 'Article preview'}
            sandbox="allow-same-origin allow-scripts"
          />
        </div>
      )}
    </div>
  )
}

