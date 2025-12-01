"""
RSS Feed Scraper
Scrapes press releases and news feeds via RSS
"""

import feedparser
from typing import List, Dict, Any, Optional
from datetime import datetime
import requests


class RSSScraper:
    """Scrape RSS feeds for deal announcements"""
    
    # Common RSS feeds for AI/data deals
    FEEDS = [
        "https://openai.com/blog/rss.xml",
        "https://blog.google/technology/ai/rss/",
        "https://www.anthropic.com/index.xml",
        "https://about.meta.com/feed/",
        # Add more feeds
    ]
    
    def __init__(self, feeds: Optional[List[str]] = None):
        self.feeds = feeds or self.FEEDS
    
    def fetch_feed(self, feed_url: str) -> List[Dict[str, Any]]:
        """
        Fetch and parse RSS feed
        
        Args:
            feed_url: URL of RSS feed
        
        Returns:
            List of article dicts
        """
        try:
            feed = feedparser.parse(feed_url)
            
            articles = []
            for entry in feed.entries:
                articles.append({
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "published_date": self._parse_date(entry.get("published", "")),
                    "summary": entry.get("summary", ""),
                    "content": entry.get("content", [{}])[0].get("value", "") if entry.get("content") else "",
                    "source": "rss",
                    "feed_url": feed_url,
                })
            
            return articles
        
        except Exception as e:
            print(f"Error fetching feed {feed_url}: {e}")
            return []
    
    def fetch_all_feeds(self) -> List[Dict[str, Any]]:
        """
        Fetch all configured feeds
        
        Returns:
            Combined list of articles
        """
        all_articles = []
        
        for feed_url in self.feeds:
            articles = self.fetch_feed(feed_url)
            all_articles.extend(articles)
        
        return all_articles
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse date string to ISO format"""
        if not date_str:
            return None
        
        try:
            # feedparser provides parsed date tuple
            if isinstance(date_str, tuple):
                dt = datetime(*date_str[:6])
                return dt.isoformat()
            # Try parsing as string
            elif isinstance(date_str, str):
                # Try common formats
                for fmt in ["%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%a, %d %b %Y %H:%M:%S %Z"]:
                    try:
                        dt = datetime.strptime(date_str, fmt)
                        return dt.isoformat()
                    except:
                        continue
        except Exception as e:
            pass
        
        return None

