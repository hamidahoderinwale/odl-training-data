"""
News API Scraper
Uses NewsAPI, GDELT, or similar services to find deal articles
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import os
import requests


class NewsAPIScraper:
    """Scrape news APIs for deal articles"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("NEWS_API_KEY")
        self.base_url = "https://newsapi.org/v2"
    
    def search(self, query: str, days_back: int = 7) -> List[Dict[str, Any]]:
        """
        Search news API for articles
        
        Args:
            query: Search query
            days_back: How many days back to search
        
        Returns:
            List of article dicts
        """
        if not self.api_key:
            print("News API key not configured")
            return []
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        params = {
            "q": query,
            "from": start_date.strftime("%Y-%m-%d"),
            "to": end_date.strftime("%Y-%m-%d"),
            "apiKey": self.api_key,
            "sortBy": "relevancy",
            "pageSize": 100,
        }
        
        try:
            response = requests.get(f"{self.base_url}/everything", params=params)
            response.raise_for_status()
            
            data = response.json()
            articles = []
            
            for article in data.get("articles", []):
                articles.append({
                    "title": article.get("title", ""),
                    "url": article.get("url", ""),
                    "published_date": article.get("publishedAt", ""),
                    "summary": article.get("description", ""),
                    "content": article.get("content", ""),
                    "source": article.get("source", {}).get("name", ""),
                    "source_type": "news_api",
                })
            
            return articles
        
        except Exception as e:
            print(f"Error searching News API: {e}")
            return []
    
    def search_deal_queries(self, days_back: int = 7) -> List[Dict[str, Any]]:
        """
        Search with common deal-related queries
        
        Args:
            days_back: How many days back to search
        
        Returns:
            Combined list of articles
        """
        queries = [
            "OpenAI licensing deal",
            "Google data partnership",
            "AI training data",
            "content licensing AI",
            "Reddit API deal",
            "news archive AI",
        ]
        
        all_articles = []
        for query in queries:
            articles = self.search(query, days_back)
            all_articles.extend(articles)
        
        # Deduplicate by URL
        seen_urls = set()
        unique_articles = []
        for article in all_articles:
            url = article.get("url", "")
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_articles.append(article)
        
        return unique_articles

