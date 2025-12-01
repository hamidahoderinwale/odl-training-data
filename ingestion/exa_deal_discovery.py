"""
Exa-based Deal Discovery
Enhanced discovery pipeline with temporal metadata and provenance tracking
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from exa_client import ExaClient, ExaResult


@dataclass
class ExaQueryConfig:
    """Configuration for Exa query with temporal metadata"""
    query: str
    query_type: str  # deal_discovery, model_discovery, etc.
    recency_filter_days: int = 30
    run_at: Optional[str] = None
    enabled: bool = True


class ExaDealDiscovery:
    """Enhanced deal discovery using Exa with temporal tracking"""
    
    def __init__(self, exa_client: Optional[ExaClient] = None):
        self.exa = exa_client or ExaClient() if os.getenv("EXA_API_KEY") else None
        
        # Rotating query set for deal discovery
        self.deal_queries = [
            ExaQueryConfig(
                query="AI licensing deal site:reuters.com",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
            ExaQueryConfig(
                query="OpenAI licensing agreement",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
            ExaQueryConfig(
                query="Google AI data partnership",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
            ExaQueryConfig(
                query="Anthropic training data deal",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
            ExaQueryConfig(
                query="Meta AI content licensing",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
            ExaQueryConfig(
                query="Microsoft AI data agreement",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
            ExaQueryConfig(
                query="publisher AI model agreement",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
            ExaQueryConfig(
                query="news media AI training data",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
            ExaQueryConfig(
                query="music AI licensing deal",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
            ExaQueryConfig(
                query="image AI training data deal",
                query_type="deal_discovery",
                recency_filter_days=30,
            ),
        ]
    
    def run_discovery_queries(self) -> List[Dict[str, Any]]:
        """
        Run all discovery queries and return results with temporal metadata
        
        Returns:
            List of discovered URLs with metadata
        """
        if not self.exa:
            print("Exa API key not configured")
            return []
        
        all_results = []
        now = datetime.now()
        
        for query_config in self.deal_queries:
            if not query_config.enabled:
                continue
            
            print(f"Querying Exa: {query_config.query}")
            
            # Calculate date range
            end_date = now
            start_date = now - timedelta(days=query_config.recency_filter_days)
            
            try:
                results = self.exa.search(
                    query=query_config.query,
                    num_results=10,
                    start_published_date=start_date.strftime("%Y-%m-%d"),
                    end_published_date=end_date.strftime("%Y-%m-%d"),
                )
                
                for result in results:
                    all_results.append({
                        "url": result.url,
                        "title": result.title,
                        "summary": result.summary,
                        "retrieved_at": now.isoformat(),
                        "via": "exa",
                        "exa_rank": result.score,
                        "exa_query": query_config.query,
                        "query_type": query_config.query_type,
                        "published_date": result.published_date,
                    })
            
            except Exception as e:
                print(f"Error querying Exa for '{query_config.query}': {e}")
                continue
        
        # Deduplicate by URL
        seen_urls = set()
        deduplicated = []
        for result in all_results:
            if result["url"] not in seen_urls:
                seen_urls.add(result["url"])
                deduplicated.append(result)
        
        # Sort by Exa rank
        deduplicated.sort(key=lambda x: x["exa_rank"], reverse=True)
        
        print(f"Discovered {len(deduplicated)} unique URLs")
        return deduplicated
    
    def get_url_contents(self, urls: List[str]) -> Dict[str, str]:
        """
        Get full content for URLs via Exa (bypasses paywalls)
        
        Args:
            urls: List of URLs to fetch
        
        Returns:
            Dict mapping URL to content text
        """
        if not self.exa:
            return {}
        
        return self.exa.get_contents(urls)


if __name__ == "__main__":
    # Example usage
    discovery = ExaDealDiscovery()
    results = discovery.run_discovery_queries()
    
    print(f"\nDiscovery Summary:")
    print(f"   Total URLs: {len(results)}")
    print(f"\nTop 5 results:")
    for i, result in enumerate(results[:5], 1):
        print(f"\n{i}. {result['title']}")
        print(f"   URL: {result['url']}")
        print(f"   Score: {result['exa_rank']:.2f}")
        print(f"   Retrieved: {result['retrieved_at']}")

