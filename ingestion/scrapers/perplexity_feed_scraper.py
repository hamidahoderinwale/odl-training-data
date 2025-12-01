"""
Perplexity Feed Scraper
Uses Perplexity API (similar to briefing.commonknowled.ge) to intelligently search
for AI training data deals and related content.
"""

import os
import json
from typing import List, Dict, Any, Optional
from datetime import datetime
import requests
from dotenv import load_dotenv

load_dotenv()


class PerplexityFeedScraper:
    """
    Scraper that uses Perplexity-style search to find deal-related content.
    Similar to how briefing.commonknowled.ge acquires its feed.
    """
    
    def __init__(self, api_key: Optional[str] = None, base_url: Optional[str] = None):
        """
        Initialize Perplexity feed scraper
        
        Args:
            api_key: Perplexity API key (optional, can use env var)
            base_url: Base URL for Perplexity API (defaults to public endpoint)
        """
        self.api_key = api_key or os.getenv("PERPLEXITY_API_KEY")
        # Use the same endpoint pattern as briefing.commonknowled.ge
        self.base_url = base_url or "https://perplexity-backend.vercel.app/search"
        # Alternative: "https://api.perplexity.ai/chat/completions"
    
    def search(self, query: str, model: str = "llama-3.1-sonar-large-128k-online") -> Dict[str, Any]:
        """
        Search using Perplexity-style API
        
        Args:
            query: Search query
            model: Model to use (for official Perplexity API)
        
        Returns:
            Response dict with items containing title and body
        """
        try:
            # Check if using the public endpoint (like briefing.commonknowled.ge)
            if "vercel.app" in self.base_url:
                # Public endpoint format (similar to briefing.commonknowled.ge)
                response = requests.post(
                    self.base_url,
                    json={"query": query},
                    headers={
                        "Content-Type": "application/json",
                    },
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                
                # Parse the response format
                if "response" in data:
                    # Response is JSON string, parse it
                    parsed = json.loads(data["response"])
                    return parsed
                return data
            
            # Official Perplexity API format
            elif self.api_key:
                response = requests.post(
                    "https://api.perplexity.ai/chat/completions",
                    json={
                        "model": model,
                        "messages": [
                            {
                                "role": "system",
                                "content": "You are a helpful assistant that searches for and summarizes information about AI training data deals, content licensing agreements, and data partnerships."
                            },
                            {
                                "role": "user",
                                "content": query
                            }
                        ],
                        "max_tokens": 1000,
                        "temperature": 0.2,
                        "top_p": 0.9,
                    },
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json",
                    },
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                
                # Format response similar to briefing.commonknowled.ge
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                citations = data.get("citations", [])
                
                return {
                    "items": [
                        {
                            "title": query,
                            "body": content,
                            "citations": citations,
                            "model": model,
                        }
                    ]
                }
            
            else:
                print("No API key configured for Perplexity")
                return {"items": []}
        
        except requests.exceptions.RequestException as e:
            print(f"Error calling Perplexity API: {e}")
            return {"items": []}
        except json.JSONDecodeError as e:
            print(f"Error parsing Perplexity response: {e}")
            return {"items": []}
        except Exception as e:
            print(f"Unexpected error in Perplexity search: {e}")
            return {"items": []}
    
    def search_deal_queries(self, queries: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """
        Search multiple deal-related queries and combine results
        
        Args:
            queries: List of queries to search. If None, uses default queries.
        
        Returns:
            Combined list of articles/items
        """
        if queries is None:
            queries = [
                "OpenAI licensing deal training data",
                "Google AI content partnership",
                "Meta training data acquisition",
                "Anthropic data licensing agreement",
                "Reddit API deal AI training",
                "news publisher AI model agreement",
                "Shutterstock AI training data",
                "Getty Images AI licensing",
                "publisher AI content deal",
                "data partnership AI model",
            ]
        
        all_items = []
        seen_titles = set()
        
        for query in queries:
            print(f"Searching: {query}")
            result = self.search(query)
            
            items = result.get("items", [])
            for item in items:
                title = item.get("title", "")
                # Deduplicate by title
                if title and title not in seen_titles:
                    seen_titles.add(title)
                    # Add metadata
                    item["query"] = query
                    item["discovered_at"] = datetime.now().isoformat()
                    item["source_type"] = "perplexity_feed"
                    all_items.append(item)
            
            # Rate limiting - be respectful
            import time
            time.sleep(1)
        
        return all_items
    
    def extract_deal_candidates(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract potential deal candidates from search results
        
        Args:
            items: List of items from search results
        
        Returns:
            List of deal candidate dicts
        """
        deal_candidates = []
        
        for item in items:
            title = item.get("title", "")
            body = item.get("body", "")
            url = item.get("url", "")
            citations = item.get("citations", [])
            
            # Look for deal indicators in the content
            deal_keywords = [
                "deal", "agreement", "partnership", "licensing", "acquisition",
                "million", "billion", "contract", "settlement", "exclusive"
            ]
            
            content_lower = (title + " " + body).lower()
            has_deal_keywords = any(keyword in content_lower for keyword in deal_keywords)
            
            if has_deal_keywords:
                # Extract URLs from citations if available
                sources = citations if citations else []
                if url:
                    sources.insert(0, url)
                
                deal_candidates.append({
                    "title": title,
                    "summary": body[:500] if body else "",  # First 500 chars
                    "url": url or (sources[0] if sources else ""),
                    "sources": sources,
                    "published_date": item.get("published_date"),
                    "discovered_at": item.get("discovered_at"),
                    "source_type": "perplexity_feed",
                    "raw_content": body,
                    "query": item.get("query", ""),
                })
        
        return deal_candidates
    
    def fetch_feed(self) -> List[Dict[str, Any]]:
        """
        Main method to fetch feed of deal-related content
        Similar to how briefing.commonknowled.ge acquires its feed
        
        Returns:
            List of deal candidate articles
        """
        print("Fetching Perplexity feed...")
        items = self.search_deal_queries()
        deal_candidates = self.extract_deal_candidates(items)
        
        print(f"Found {len(deal_candidates)} potential deal candidates")
        return deal_candidates


if __name__ == "__main__":
    # Test the scraper
    scraper = PerplexityFeedScraper()
    feed = scraper.fetch_feed()
    
    print(f"\n=== Feed Results ({len(feed)} items) ===")
    for i, item in enumerate(feed[:5], 1):  # Show first 5
        print(f"\n{i}. {item.get('title', 'No title')}")
        print(f"   URL: {item.get('url', 'No URL')}")
        print(f"   Summary: {item.get('summary', '')[:200]}...")

