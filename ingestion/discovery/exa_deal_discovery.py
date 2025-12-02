"""
Exa-based Deal Discovery
Enhanced discovery pipeline with temporal metadata and provenance tracking
"""

import os
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
from .exa_client import ExaClient, ExaResult


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
        
        # Comprehensive query set for deal discovery with strong, specific prompts
        self.deal_queries = [
            # Major AI Companies - Specific Deal Announcements
            ExaQueryConfig(
                query="OpenAI licensing agreement training data partnership announcement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Anthropic Claude training data licensing deal partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Google DeepMind Gemini training data licensing agreement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Meta LLaMA training data licensing partnership announcement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Microsoft AI training data licensing deal partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Cohere training data licensing agreement partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Mistral AI training data licensing deal announcement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Stability AI training data licensing partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Inflection AI training data licensing agreement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="xAI Grok training data licensing deal partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            
            # News & Media Publishers
            ExaQueryConfig(
                query="news publisher AI training data licensing deal exclusive agreement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Reuters Bloomberg AP news AI training data licensing partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="Wall Street Journal New York Times AI training data deal",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="publisher archive AI model training data licensing agreement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="magazine publisher AI training data licensing deal",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            
            # Image & Video Content
            ExaQueryConfig(
                query="Getty Images Shutterstock AI training data licensing deal",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="stock photo AI training data licensing agreement partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="video content AI training data licensing deal YouTube",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="image dataset AI training licensing agreement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            
            # Music & Audio
            ExaQueryConfig(
                query="Universal Music Group Warner Music AI training data licensing deal",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="music label AI training data licensing agreement partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="podcast audio AI training data licensing deal",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            
            # Social Media & User-Generated Content
            ExaQueryConfig(
                query="Reddit Twitter X social media AI training data licensing deal",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="user-generated content AI training data licensing agreement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            
            # Code & Technical Data
            ExaQueryConfig(
                query="GitHub Stack Overflow code AI training data licensing deal",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="code repository AI training data licensing agreement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            
            # Healthcare & Scientific Data
            ExaQueryConfig(
                query="medical health data AI training licensing agreement partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="scientific research data AI training licensing deal",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            
            # Legal & Books
            ExaQueryConfig(
                query="book publisher author AI training data licensing deal lawsuit",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="legal case law AI training data licensing agreement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            
            # Specific Deal Types
            ExaQueryConfig(
                query="exclusive AI training data licensing agreement announcement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="revenue share AI training data licensing agreement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="multi-year AI training data licensing agreement partnership",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            ExaQueryConfig(
                query="million dollar AI training data licensing deal announcement",
                query_type="deal_discovery",
                recency_filter_days=90,
            ),
            
            # Historical Deals (extended range)
            ExaQueryConfig(
                query="AI training data licensing deal 2020 2021 2022 2023",
                query_type="deal_discovery",
                recency_filter_days=365,
            ),
            ExaQueryConfig(
                query="large language model training data licensing agreement historical",
                query_type="deal_discovery",
                recency_filter_days=365,
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
                    num_results=25,  # Increased from 10 to get more results
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

