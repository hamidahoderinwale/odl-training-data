"""
Monitoring and Update Pipeline
Scheduled pipeline for discovering and updating deals
"""

import os
import sys
import json
from datetime import datetime, timedelta
from typing import List, Dict, Any
from pathlib import Path

sys.path.append(str(Path(__file__).parent))

from pipeline.extraction_pipeline import ExtractionPipeline
from pipeline.deal_radar import DealRadar
from pipeline.token_inference import DealTokenInference
from pipeline.versioning import DealVersioning, ProvenanceTracker
from pipeline.db_integration import DealDBWriter
from scrapers.rss_scraper import RSSScraper
from scrapers.news_api_scraper import NewsAPIScraper
from scrapers.sec_scraper import SECScraper
from scrapers.perplexity_feed_scraper import PerplexityFeedScraper
from discovery.exa_deal_discovery import ExaDealDiscovery
import asyncio


class DealMonitor:
    """Monitor and update deals pipeline"""
    
    def __init__(self):
        self.extraction_pipeline = ExtractionPipeline()
        self.deal_radar = DealRadar()
        self.rss_scraper = RSSScraper()
        self.news_scraper = NewsAPIScraper()
        self.sec_scraper = SECScraper()
        self.perplexity_scraper = PerplexityFeedScraper() if os.getenv("PERPLEXITY_API_KEY") else None
        self.exa_discovery = ExaDealDiscovery() if os.getenv("EXA_API_KEY") else None
        self.token_inference = DealTokenInference()
        self.versioning = DealVersioning()
        self.provenance = ProvenanceTracker()
        # Try to initialize DB writer (may not be available if Prisma not set up)
        try:
            self.db_writer = DealDBWriter()
        except Exception as e:
            print(f"Note: Database writer not available: {e}")
            print("  Run 'npm run db:generate' to enable database operations")
            self.db_writer = None
    
    def discover_urls(self, days_back: int = 1, source_filter: str = 'all') -> List[Dict[str, Any]]:
        """
        Discover URLs from all sources
        
        Args:
            days_back: How many days back to search
            source_filter: 'all', 'exa', 'rss', 'news', 'sec', 'perplexity'
        
        Returns:
            List of URL dicts with metadata
        """
        all_urls = []
        
        print("Discovering URLs from sources...")
        
        # RSS feeds
        if source_filter in ['all', 'rss']:
            print("  📰 Fetching RSS feeds...")
            rss_articles = self.rss_scraper.fetch_all_feeds()
            all_urls.extend([
                {
                    "text": f"{a.get('title', '')} {a.get('summary', '')}",
                    "url": a.get("url", ""),
                    "title": a.get("title", ""),
                    "published_date": a.get("published_date"),
                    "source": "rss",
                }
                for a in rss_articles
            ])
            print(f"    Found {len(rss_articles)} RSS articles")
        else:
            rss_articles = []
        
        # News API
        if source_filter in ['all', 'news'] and self.news_scraper.api_key:
            print("  📰 Searching News API...")
            news_articles = self.news_scraper.search_deal_queries(days_back)
            all_urls.extend([
                {
                    "text": f"{a.get('title', '')} {a.get('summary', '')} {a.get('content', '')}",
                    "url": a.get("url", ""),
                    "title": a.get("title", ""),
                    "published_date": a.get("published_date"),
                    "source": "news_api",
                }
                for a in news_articles
            ])
            print(f"    Found {len(news_articles)} news articles")
        else:
            news_articles = []
        
        # Perplexity feed (similar to briefing.commonknowled.ge)
        if source_filter in ['all', 'perplexity'] and self.perplexity_scraper:
            print("  🤖 Fetching Perplexity feed...")
            try:
                perplexity_items = self.perplexity_scraper.fetch_feed()
                all_urls.extend([
                    {
                        "text": f"{item.get('title', '')} {item.get('summary', '')}",
                        "url": item.get("url", ""),
                        "title": item.get("title", ""),
                        "published_date": item.get("published_date"),
                        "source": "perplexity_feed",
                        "query": item.get("query", ""),
                        "raw_content": item.get("raw_content", ""),
                    }
                    for item in perplexity_items
                ])
                print(f"    Found {len(perplexity_items)} Perplexity feed items")
            except Exception as e:
                print(f"    Error fetching Perplexity feed: {e}")
        
        # Exa discovery
        if source_filter in ['all', 'exa'] and self.exa_discovery:
            print("  🔍 Running Exa discovery...")
            exa_results = self.exa_discovery.run_discovery_queries()
            all_urls.extend([
                {
                    "text": f"{r.get('title', '')} {r.get('summary', '')}",
                    "url": r.get("url", ""),
                    "title": r.get("title", ""),
                    "published_date": r.get("published_date"),
                    "source": "exa",
                    "discovered_via": "exa",
                    "exa_score": r.get("exa_rank"),
                    "exa_query": r.get("exa_query"),
                    "exa_retrieved_at": r.get("retrieved_at"),
                }
                for r in exa_results
            ])
            print(f"    Found {len(exa_results)} Exa results")
        
        print(f"Total URLs discovered: {len(all_urls)}")
        return all_urls
    
    def extract_deals(self, urls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Extract deals from URLs
        
        Args:
            urls: List of URL dicts
        
        Returns:
            List of extracted deals
        """
        print("\nExtracting deals from URLs...")
        
        # Get content for each URL
        texts = []
        for url_data in urls:
            url = url_data.get("url", "")
            if not url:
                continue
            
            # Get text content (simplified - in production use proper scraper)
            try:
                import requests
                response = requests.get(url, timeout=30, headers={
                    "User-Agent": "Mozilla/5.0 (compatible; DealTracker/1.0)"
                })
                text = response.text
                
                # Preserve all metadata including Exa fields
                text_metadata = {
                    "text": text,
                    "url": url,
                    "title": url_data.get("title", ""),
                    "published_date": url_data.get("published_date"),
                    "source": url_data.get("source", "unknown"),
                }
                
                # Preserve Exa-specific metadata if present
                if url_data.get("discovered_via") == "exa" or url_data.get("source") == "exa":
                    text_metadata["discovered_via"] = "exa"
                    if url_data.get("exa_query"):
                        text_metadata["exa_query"] = url_data.get("exa_query")
                    if url_data.get("exa_score"):
                        text_metadata["exa_score"] = url_data.get("exa_score")
                    if url_data.get("exa_retrieved_at"):
                        text_metadata["exa_retrieved_at"] = url_data.get("exa_retrieved_at")
                
                texts.append(text_metadata)
            except Exception as e:
                print(f"  Error fetching {url}: {e}")
                continue
        
        # Run extraction pipeline
        deals = self.extraction_pipeline.process_batch(texts)
        
        print(f"Extracted {len(deals)} deals")
        return deals
    
    async def run_monitoring_cycle(self, days_back: int = 1, source_filter: str = 'all') -> Dict[str, Any]:
        """
        Run complete monitoring cycle
        
        Args:
            days_back: How many days back to search
            source_filter: 'all', 'exa', 'rss', 'news', 'sec', 'perplexity'
        
        Returns:
            Summary dict
        """
        print(f"\n🚀 Starting monitoring cycle (last {days_back} days) from source: {source_filter}")
        print(f"   Started at: {datetime.now().isoformat()}\n")
        
        # Step 1: Discover URLs
        urls = self.discover_urls(days_back, source_filter)
        
        # Step 2: Extract deals
        deals = self.extract_deals(urls)
        
        # Step 3: Enrich with token inference
        enriched_deals = []
        for deal in deals:
            enriched = self.token_inference.enrich_deal(deal)
            enriched_deals.append(enriched)
        
        # Step 4: Version and track provenance
        versioned_deals = []
        for deal in enriched_deals:
            # Create provenance record
            sources = deal.get("sources", [])
            if not isinstance(sources, list):
                sources = [sources] if sources else []
            
            provenance_record = self.provenance.create_provenance_record(
                deal=deal,
                sources=sources,
                extraction_method=deal.get("method", "hybrid"),
                extraction_confidence=deal.get("extraction_confidence", "medium")
            )
            
            # Create version
            versioned = self.versioning.create_version(deal, change_reason="automated_extraction")
            versioned["provenance"] = provenance_record
            versioned_deals.append(versioned)
        
        # Step 5: Save to database
        if self.db_writer and hasattr(self.db_writer, 'prisma') and self.db_writer.prisma:
            print("\nSaving deals to database...")
            try:
                await self.db_writer.connect()
                results = await self.db_writer.upsert_deals_batch(versioned_deals)
                await self.db_writer.disconnect()
                print(f"   Created: {results['created']}")
                print(f"   Updated: {results['updated']}")
                print(f"   Errors: {results['errors']}")
            except Exception as e:
                print(f"   Database error: {e}")
        else:
            print("\nDatabase writer not available (Prisma not configured)")
        
        deals = versioned_deals
        
        summary = {
            "cycle_started_at": datetime.now().isoformat(),
            "urls_discovered": len(urls),
            "deals_extracted": len(deals),
            "new_deals": len(deals),  # Would be calculated after comparison
            "updated_deals": 0,  # Would be calculated
        }
        
        print(f"\nMonitoring cycle complete")
        print(f"   URLs: {summary['urls_discovered']}")
        print(f"   Deals: {summary['deals_extracted']}")
        
        return summary


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Run deal discovery and ingestion pipeline')
    parser.add_argument('--days-back', type=int, default=7, help='Number of days to search back (default: 7)')
    parser.add_argument('--source', type=str, default='all', choices=['all', 'exa', 'rss', 'news', 'sec', 'perplexity'], 
                       help='Source to use for discovery (default: all)')
    args = parser.parse_args()
    
    async def main():
        monitor = DealMonitor()
        summary = await monitor.run_monitoring_cycle(days_back=args.days_back, source_filter=args.source)
        print(f"\nSummary: {json.dumps(summary, indent=2)}")
    
    asyncio.run(main())

