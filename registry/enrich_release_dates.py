"""
Enrich Release Dates Script
Populates model release dates from arXiv and company websites
"""

import os
import sys
import asyncio
from pathlib import Path
from datetime import datetime
from typing import Optional

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv()

try:
    from prisma import Prisma
    PRISMA_AVAILABLE = True
except ImportError:
    PRISMA_AVAILABLE = False
    print("Prisma not available. Run: npm run db:generate")

from registry.enrichment.comprehensive_enrichment import ComprehensiveModelEnricher


async def enrich_release_dates(
    limit: Optional[int] = None,
    models_without_dates_only: bool = True
):
    """
    Enrich release dates for models from arXiv and company websites
    
    Args:
        limit: Maximum number of models to process
        models_without_dates_only: Only process models without release dates
    """
    if not PRISMA_AVAILABLE:
        print("Prisma not available. Cannot enrich release dates.")
        return
    
    prisma = Prisma()
    await prisma.connect()
    
    try:
        # Get models
        where_clause = {}
        if models_without_dates_only:
            where_clause = {"releaseDate": None}
        
        models = await prisma.modelregistry.find_many(
            where=where_clause,
            take=limit
        )
        
        print(f"\n🚀 Starting release date enrichment for {len(models)} models")
        print(f"   Started at: {datetime.now().isoformat()}\n")
        
        # Initialize enricher with web search enabled
        enricher = ComprehensiveModelEnricher(
            use_web_search=True,
            use_llm_extraction=True
        )
        
        success_count = 0
        updated_count = 0
        error_count = 0
        
        for i, model in enumerate(models, 1):
            print(f"\n[{i}/{len(models)}] Processing: {model.modelId} ({model.provider})")
            
            try:
                # Get existing data
                existing_data = {
                    "params": model.params,
                    "releaseDate": model.releaseDate.isoformat() if model.releaseDate else None,
                    "architectureType": model.architectureType,
                    "isMoe": model.isMoe,
                    "multimodal": model.multimodal,
                    "tokensEstMid": model.tokensEstMid,
                }
                
                # Enrich model (this will search arXiv and company sites)
                enriched = await enricher.enrich_model(
                    model_id=model.modelId,
                    provider=model.provider,
                    family=model.family,
                    existing_data=existing_data
                )
                
                # Check if we got a new release date
                update_data = {}
                if enriched.get("releaseDate"):
                    new_date = enriched["releaseDate"]
                    if isinstance(new_date, str):
                        new_date = datetime.fromisoformat(new_date.replace('Z', '+00:00'))
                    
                    # Only update if different or if we didn't have one
                    if not model.releaseDate or new_date != model.releaseDate:
                        update_data["releaseDate"] = new_date
                        if enriched.get("releaseDateSource"):
                            print(f"  ✓ Found release date: {new_date.date()} (source: {enriched.get('releaseDateSource')})")
                        else:
                            print(f"  ✓ Found release date: {new_date.date()}")
                        updated_count += 1
                    else:
                        print(f"  → Release date unchanged: {new_date.date()}")
                
                # Update model if we have changes
                if update_data:
                    await prisma.modelregistry.update(
                        where={"id": model.id},
                        data=update_data
                    )
                    success_count += 1
                else:
                    print(f"  → No release date found")
                    success_count += 1
                    
            except Exception as e:
                print(f"  ✗ Error: {e}")
                error_count += 1
                import traceback
                traceback.print_exc()
        
        print(f"\n{'='*60}")
        print(f"Enrichment Summary")
        print(f"{'='*60}")
        print(f"Total models:     {len(models)}")
        print(f"Success:          {success_count}")
        print(f"Updated:          {updated_count}")
        print(f"Errors:           {error_count}")
        print(f"{'='*60}\n")
        
    finally:
        await prisma.disconnect()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Enrich model release dates from arXiv and company websites')
    parser.add_argument('--limit', type=int, default=None, help='Maximum number of models to process')
    parser.add_argument('--all', action='store_true', help='Process all models, not just those without dates')
    args = parser.parse_args()
    
    asyncio.run(enrich_release_dates(
        limit=args.limit,
        models_without_dates_only=not args.all
    ))


