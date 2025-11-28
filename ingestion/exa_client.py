"""
Exa API Client - Intelligent URL retrieval for deal discovery
"""

import os
from typing import List, Dict, Optional
from dataclasses import dataclass
import requests
from source_registry import EXA_SEARCH_QUERIES


@dataclass
class ExaResult:
    """Represents a result from Exa search"""
    url: str
    title: str
    summary: str
    published_date: Optional[str] = None
    author: Optional[str] = None
    score: float = 0.0  # Relevance score


class ExaClient:
    """Client for Exa API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("EXA_API_KEY")
        if not self.api_key:
            raise ValueError("EXA_API_KEY environment variable required")
        self.base_url = "https://api.exa.ai"
        self.headers = {
            "x-api-key": self.api_key,
            "Content-Type": "application/json",
        }
    
    def search(
        self,
        query: str,
        num_results: int = 10,
        start_published_date: Optional[str] = None,
        end_published_date: Optional[str] = None,
        category: Optional[str] = None,
    ) -> List[ExaResult]:
        """
        Search for URLs using Exa
        
        Args:
            query: Search query
            num_results: Number of results to return
            start_published_date: Start date (YYYY-MM-DD)
            end_published_date: End date (YYYY-MM-DD)
            category: Content category filter
        
        Returns:
            List of ExaResult objects
        """
        payload = {
            "query": query,
            "num_results": num_results,
            "use_autoprompt": True,  # Let Exa optimize the query
        }
        
        if start_published_date:
            payload["start_published_date"] = start_published_date
        if end_published_date:
            payload["end_published_date"] = end_published_date
        if category:
            payload["category"] = category
        
        try:
            response = requests.post(
                f"{self.base_url}/search",
                json=payload,
                headers=self.headers,
                timeout=30,
            )
            response.raise_for_status()
            data = response.json()
            
            results = []
            for item in data.get("results", []):
                results.append(ExaResult(
                    url=item.get("url", ""),
                    title=item.get("title", ""),
                    summary=item.get("text", ""),  # Exa provides summary text
                    published_date=item.get("published_date"),
                    author=item.get("author"),
                    score=item.get("score", 0.0),
                ))
            
            return results
            
        except requests.exceptions.RequestException as e:
            print(f"Exa API error for query '{query}': {e}")
            return []
    
    def get_contents(self, urls: List[str]) -> Dict[str, str]:
        """
        Get full content for URLs (bypasses paywalls via Exa)
        
        Args:
            urls: List of URLs to fetch
        
        Returns:
            Dict mapping URL to content text
        """
        payload = {
            "urls": urls,
            "text": {"max_characters": 10000},  # Limit content size
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/contents",
                json=payload,
                headers=self.headers,
                timeout=60,
            )
            response.raise_for_status()
            data = response.json()
            
            contents = {}
            for item in data.get("results", []):
                url = item.get("url", "")
                text = item.get("text", "")
                contents[url] = text
            
            return contents
            
        except requests.exceptions.RequestException as e:
            print(f"Exa contents API error: {e}")
            return {}
    
    def search_deal_candidates(
        self,
        days_back: int = 7,
        num_results_per_query: int = 5,
    ) -> List[ExaResult]:
        """
        Search for deal candidates using all predefined queries
        
        Args:
            days_back: How many days back to search
            num_results_per_query: Results per query
        
        Returns:
            Deduplicated list of results
        """
        from datetime import datetime, timedelta
        
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days_back)
        
        start_str = start_date.strftime("%Y-%m-%d")
        end_str = end_date.strftime("%Y-%m-%d")
        
        all_results = []
        seen_urls = set()
        
        for query in EXA_SEARCH_QUERIES:
            print(f"Searching Exa for: {query}")
            results = self.search(
                query=query,
                num_results=num_results_per_query,
                start_published_date=start_str,
                end_published_date=end_str,
            )
            
            for result in results:
                if result.url not in seen_urls:
                    seen_urls.add(result.url)
                    all_results.append(result)
        
        # Sort by score (relevance)
        all_results.sort(key=lambda x: x.score, reverse=True)
        
        return all_results


if __name__ == "__main__":
    # Example usage
    client = ExaClient()
    results = client.search_deal_candidates(days_back=30)
    print(f"Found {len(results)} unique URLs")
    for result in results[:5]:
        print(f"\n{result.title}")
        print(f"  URL: {result.url}")
        print(f"  Score: {result.score:.2f}")
        print(f"  Summary: {result.summary[:200]}...")

