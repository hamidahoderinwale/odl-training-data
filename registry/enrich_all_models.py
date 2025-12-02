"""
Batch enrichment script for all existing models
Enriches all models in the database with comprehensive metadata
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import List, Optional
from datetime import datetime
import json

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from registry.enrichment.comprehensive_enrichment import ComprehensiveModelEnricher
from dotenv import load_dotenv

# Prisma imports
try:
    from prisma import Prisma
    PRISMA_AVAILABLE = True
except ImportError:
    PRISMA_AVAILABLE = False
    print("Warning: Prisma not available. Install with: npm run db:generate")

load_dotenv()


async def enrich_all_models(
    limit: Optional[int] = None,
    use_web_search: bool = True,
    use_llm_extraction: bool = True
):
    """
    Enrich all models in the database
    
    Args:
        limit: Limit number of models to enrich (for testing)
        use_web_search: Enable web search enrichment
        use_llm_extraction: Enable LLM extraction
    """
    if not PRISMA_AVAILABLE:
        raise RuntimeError("Prisma not available. Run: npm run db:generate")
    
    # Connect to database
    prisma = Prisma()
    await prisma.connect()
    
    try:
        # Get all models
        models = await prisma.modelregistry.find_many(
            take=limit
        )
        
        print(f"🚀 Starting enrichment of {len(models)} models")
        print(f"   Started at: {datetime.now().isoformat()}\n")
        
        # Initialize enricher
        enricher = ComprehensiveModelEnricher(
            use_web_search=use_web_search,
            use_llm_extraction=use_llm_extraction
        )
        
        success_count = 0
        error_count = 0
        
        for i, model in enumerate(models, 1):
            print(f"\n[{i}/{len(models)}] Enriching: {model.modelId} ({model.provider})")
            
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
                
                # Enrich model
                enriched = await enricher.enrich_model(
                    model_id=model.modelId,
                    provider=model.provider,
                    family=model.family,
                    existing_data=existing_data
                )
                
                # Prepare update data
                update_data = {}
                
                # Release date
                if enriched.get("releaseDate"):
                    if isinstance(enriched["releaseDate"], str):
                        update_data["releaseDate"] = datetime.fromisoformat(enriched["releaseDate"])
                    else:
                        update_data["releaseDate"] = enriched["releaseDate"]
                
                # Architecture
                if enriched.get("architectureType"):
                    update_data["architectureType"] = enriched["architectureType"]
                if enriched.get("isMoe") is not None:
                    update_data["isMoe"] = enriched["isMoe"]
                if enriched.get("numExperts"):
                    update_data["numExperts"] = enriched["numExperts"]
                if enriched.get("multimodal") is not None:
                    update_data["multimodal"] = enriched["multimodal"]
                
                # Parameters (only if not already set)
                if not model.params and enriched.get("params"):
                    update_data["params"] = enriched["params"]
                
                # Token estimates
                if enriched.get("tokensEstMin"):
                    update_data["tokensEstMin"] = enriched["tokensEstMin"]
                if enriched.get("tokensEstMax"):
                    update_data["tokensEstMax"] = enriched["tokensEstMax"]
                if enriched.get("tokensEstMid"):
                    update_data["tokensEstMid"] = enriched["tokensEstMid"]
                if enriched.get("tokensRangeGeneratedAt"):
                    update_data["tokensRangeGeneratedAt"] = enriched["tokensRangeGeneratedAt"]
                
                # Evidence profile
                if enriched.get("evidenceTypes"):
                    update_data["evidenceTypes"] = enriched["evidenceTypes"]
                if enriched.get("evidenceStrength"):
                    update_data["evidenceStrength"] = enriched["evidenceStrength"]
                if enriched.get("uncertaintySources"):
                    update_data["uncertaintySources"] = enriched["uncertaintySources"]
                if enriched.get("evidenceProfileGeneratedAt"):
                    update_data["evidenceProfileGeneratedAt"] = enriched["evidenceProfileGeneratedAt"]
                
                # Sources
                if enriched.get("sources"):
                    update_data["sources"] = enriched["sources"]
                
                # Raw evidence snippets
                if enriched.get("rawEvidenceSnippets"):
                    update_data["rawEvidenceSnippets"] = enriched["rawEvidenceSnippets"]
                
                # Composition estimates
                if enriched.get("compositionEstimates"):
                    update_data["compositionEstimates"] = enriched["compositionEstimates"]
                
                # Training period
                if enriched.get("trainingPeriodStart"):
                    if isinstance(enriched["trainingPeriodStart"], str):
                        update_data["trainingPeriodStart"] = datetime.fromisoformat(enriched["trainingPeriodStart"])
                    else:
                        update_data["trainingPeriodStart"] = enriched["trainingPeriodStart"]
                if enriched.get("trainingPeriodEnd"):
                    if isinstance(enriched["trainingPeriodEnd"], str):
                        update_data["trainingPeriodEnd"] = datetime.fromisoformat(enriched["trainingPeriodEnd"])
                    else:
                        update_data["trainingPeriodEnd"] = enriched["trainingPeriodEnd"]
                
                # Update model
                if update_data:
                    update_data["updatedAt"] = datetime.now()
                    await prisma.modelregistry.update(
                        where={"id": model.id},
                        data=update_data
                    )
                    print(f"  ✅ Updated {len(update_data)} fields")
                    success_count += 1
                else:
                    print(f"  ⚠️  No new data to update")
                    success_count += 1
                    
            except Exception as e:
                print(f"  ❌ Error: {e}")
                error_count += 1
                continue
        
        print(f"\n✅ Enrichment complete!")
        print(f"   Successfully enriched: {success_count}/{len(models)}")
        print(f"   Errors: {error_count}")
        print(f"   Completed at: {datetime.now().isoformat()}")
        
    finally:
        await prisma.disconnect()


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Enrich all models in database")
    parser.add_argument("--limit", type=int, help="Limit number of models to enrich")
    parser.add_argument("--no-web", action="store_true", help="Disable web search enrichment")
    parser.add_argument("--no-llm", action="store_true", help="Disable LLM extraction")
    
    args = parser.parse_args()
    
    await enrich_all_models(
        limit=args.limit,
        use_web_search=not args.no_web,
        use_llm_extraction=not args.no_llm
    )


if __name__ == "__main__":
    asyncio.run(main())

