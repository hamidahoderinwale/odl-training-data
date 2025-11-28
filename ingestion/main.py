"""
Main Ingestion Pipeline - Orchestrates the full scraping and ingestion process
"""

import os
import sys
from datetime import datetime
from typing import List
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import clients and modules
try:
    from exa_client import ExaClient, ExaResult
    from perplexity_client import PerplexityClient
    from deal_parser import DealParser
    from validator import DealValidator, DealData
    from source_registry import get_all_sources, EXA_SEARCH_QUERIES
except ImportError as e:
    print(f"Import error: {e}")
    print("Make sure all dependencies are installed: pip install -r requirements.txt")
    sys.exit(1)


class IngestionPipeline:
    """Main pipeline orchestrator"""
    
    def __init__(self):
        self.exa = ExaClient() if os.getenv("EXA_API_KEY") else None
        self.perplexity = PerplexityClient() if os.getenv("PERPLEXITY_API_KEY") else None
        self.parser = DealParser(self.perplexity) if self.perplexity else None
        self.validator = DealValidator()
    
    def run_exa_search(self, days_back: int = 7) -> List[ExaResult]:
        """Run Exa search for deal candidates"""
        if not self.exa:
            print("Exa API key not configured, skipping Exa search")
            return []
        
        print(f"🔍 Searching Exa for deals from last {days_back} days...")
        results = self.exa.search_deal_candidates(
            days_back=days_back,
            num_results_per_query=5,
        )
        print(f"✅ Found {len(results)} unique URLs from Exa")
        return results
    
    def process_urls(self, urls: List[str]) -> List[DealData]:
        """Process URLs and extract deals"""
        if not self.parser:
            print("Perplexity API key not configured, cannot parse deals")
            return []
        
        deals = []
        
        for url in urls:
            print(f"\n📄 Processing: {url}")
            
            # Get content (simplified - in production, use html_scraper.py)
            try:
                import requests
                response = requests.get(url, timeout=30, headers={
                    "User-Agent": "Mozilla/5.0 (compatible; DealTracker/1.0)"
                })
                text = response.text
                
                # Extract deal
                deal = self.parser.parse(text, url)
                
                if deal:
                    print(f"  ✅ Extracted deal: {deal.provider} → {deal.buyer}")
                    deals.append(deal)
                else:
                    print(f"  ⚠️  No deal found in this URL")
                    
            except Exception as e:
                print(f"  ❌ Error processing URL: {e}")
                continue
        
        return deals
    
    def save_deals(self, deals: List[DealData]):
        """Save deals to database"""
        # This would connect to your database
        # For now, just print
        print(f"\n💾 Saving {len(deals)} deals to database...")
        
        # TODO: Implement database writer
        # from db_writer import DBWriter
        # writer = DBWriter()
        # for deal in deals:
        #     writer.upsert_deal(deal)
        
        print("✅ Deals saved (database writer not yet implemented)")


def main():
    """Main entry point"""
    print("=" * 60)
    print("AI Training Data Deals - Ingestion Pipeline")
    print("=" * 60)
    print(f"Started at: {datetime.now().isoformat()}\n")
    
    pipeline = IngestionPipeline()
    
    # Step 1: Search for deal candidates
    exa_results = pipeline.run_exa_search(days_back=7)
    
    if not exa_results:
        print("\n⚠️  No URLs found. Exiting.")
        return
    
    # Step 2: Process URLs
    urls = [r.url for r in exa_results]
    deals = pipeline.process_urls(urls)
    
    # Step 3: Save to database
    if deals:
        pipeline.save_deals(deals)
        print(f"\n✅ Pipeline complete: {len(deals)} deals extracted")
    else:
        print("\n⚠️  No deals extracted")
    
    print(f"\nFinished at: {datetime.now().isoformat()}")


if __name__ == "__main__":
    main()

