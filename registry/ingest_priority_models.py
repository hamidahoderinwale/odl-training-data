"""
Programmatic ingestion pipeline for priority models
Takes the priority model list and automatically:
1. Fetches metadata from Epoch AI dataset
2. Enriches from HuggingFace, system cards, etc.
3. Runs token inference
4. Creates deal-model linkages
5. Stores in database
"""

import asyncio
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from registry.priority_models import get_all_priority_models
from registry.collectors.epoch_collector import EpochCollector
from registry.collectors.hf_collector import HuggingFaceCollector
from registry.inference.reconciliation import TokenInferenceReconciler
from registry.linkage import create_deal_model_linkages
from dotenv import load_dotenv

# Prisma imports
try:
    from prisma import Prisma
    PRISMA_AVAILABLE = True
except ImportError:
    PRISMA_AVAILABLE = False
    print("Warning: Prisma not available. Install with: npm run db:generate")

load_dotenv()


class PriorityModelIngester:
    """Programmatic ingester for priority models"""
    
    def __init__(self):
        self.epoch_collector = EpochCollector()
        self.hf_collector = HuggingFaceCollector()
        self.inference_reconciler = TokenInferenceReconciler()
        self.prisma = None
        
    async def connect_db(self):
        """Connect to Prisma database"""
        if not PRISMA_AVAILABLE:
            raise RuntimeError("Prisma not available. Run: npm run db:generate")
        
        self.prisma = Prisma()
        await self.prisma.connect()
    
    async def disconnect_db(self):
        """Disconnect from database"""
        if self.prisma:
            await self.prisma.disconnect()
    
    def normalize_model_name(self, model_id: str, provider: str) -> str:
        """
        Normalize model name for matching against Epoch dataset
        Handles variations like GPT-4 vs GPT4, Llama-3-70B vs Llama 3 70B
        """
        # Basic normalization
        normalized = model_id.strip()
        
        # Remove common separators and normalize
        normalized = normalized.replace(" ", "-").replace("_", "-")
        normalized = normalized.replace("--", "-")
        
        # Handle specific patterns
        if "GPT" in normalized:
            normalized = normalized.replace("GPT", "GPT")
        if "Llama" in normalized:
            normalized = normalized.replace("Llama", "LLaMA")
        if "Claude" in normalized:
            normalized = normalized.replace("Claude", "Claude")
        
        return normalized
    
    async def fetch_epoch_data(self, model_id: str, provider: str) -> Optional[Dict[str, Any]]:
        """Fetch model data from Epoch AI dataset"""
        try:
            # Try exact match first
            epoch_models = self.epoch_collector.fetch_notable_models()
            normalized_id = self.normalize_model_name(model_id, provider)
            
            # Search for matching model
            for model in epoch_models:
                if model.get("model_name", "").lower() == normalized_id.lower():
                    return model
                if model.get("model_name", "").lower() == model_id.lower():
                    return model
                # Try partial match
                if normalized_id.lower() in model.get("model_name", "").lower():
                    return model
            
            return None
        except Exception as e:
            print(f"Error fetching Epoch data for {model_id}: {e}")
            return None
    
    async def fetch_hf_data(self, model_id: str, provider: str) -> Optional[Dict[str, Any]]:
        """Fetch model data from HuggingFace"""
        try:
            # Try to find model on HuggingFace
            hf_models = self.hf_collector.search_models(model_id)
            if hf_models:
                return hf_models[0]  # Return first match
            return None
        except Exception as e:
            print(f"Error fetching HF data for {model_id}: {e}")
            return None
    
    def merge_metadata(self, priority_model: Dict, epoch_data: Optional[Dict], hf_data: Optional[Dict]) -> Dict[str, Any]:
        """Merge metadata from multiple sources"""
        merged = {
            "modelId": priority_model["model_id"],
            "provider": priority_model["provider"],
            "family": priority_model.get("family") or priority_model["provider"],
            "tier": priority_model["tier"],
            "sourcePrimary": "priority_list",
        }
        
        # Merge from Epoch
        if epoch_data:
            merged.update({
                "params": epoch_data.get("parameter_count") / 1e9 if epoch_data.get("parameter_count") else None,
                "flopsReported": epoch_data.get("compute_PF_days"),
                "releaseDate": self._parse_date(epoch_data.get("release_date") or epoch_data.get("release_year")),
                "architectureType": epoch_data.get("architecture_type"),
                "isMoe": epoch_data.get("architecture_type", "").lower() == "moe",
                "multimodal": epoch_data.get("modality", "").lower() in ["multimodal", "vision", "image"],
                "sources": json.dumps([{
                    "type": "epoch",
                    "url": epoch_data.get("source_url", ""),
                    "retrieved_at": datetime.now().isoformat(),
                }]),
            })
            merged["sourcePrimary"] = "epoch"
        
        # Merge from HuggingFace
        if hf_data:
            hf_sources = json.loads(merged.get("sources", "[]"))
            hf_sources.append({
                "type": "huggingface",
                "url": hf_data.get("url", ""),
                "retrieved_at": datetime.now().isoformat(),
            })
            merged["sources"] = json.dumps(hf_sources)
            
            # Add HF-specific fields if not already set
            if not merged.get("params") and hf_data.get("params"):
                merged["params"] = hf_data["params"] / 1e9
        
        return merged
    
    def _parse_date(self, date_value: Any) -> Optional[datetime]:
        """Parse date from various formats"""
        if not date_value:
            return None
        
        if isinstance(date_value, datetime):
            return date_value
        
        if isinstance(date_value, str):
            try:
                # Try ISO format
                return datetime.fromisoformat(date_value.replace("Z", "+00:00"))
            except:
                try:
                    # Try year only
                    if len(date_value) == 4 and date_value.isdigit():
                        return datetime(int(date_value), 1, 1)
                except:
                    pass
        
        if isinstance(date_value, int):
            # Assume it's a year
            return datetime(date_value, 1, 1)
        
        return None
    
    async def run_token_inference(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """Run multi-method token inference"""
        try:
            # Convert to format expected by inference reconciler
            inference_input = {
                "params": model_data.get("params"),
                "flops": model_data.get("flopsReported"),
                "architecture": {
                    "is_moe": model_data.get("isMoe", False),
                    "num_experts": model_data.get("numExperts"),
                },
                "provider": model_data.get("provider"),
                "model_id": model_data.get("modelId"),
            }
            
            result = self.inference_reconciler.reconcile(inference_input)
            
            # Convert to Prisma field names
            return {
                "tokensEstMin": result.get("min"),
                "tokensEstMax": result.get("max"),
                "tokensEstMid": result.get("mid"),
                "tokensRangeGeneratedAt": datetime.now(),
                "evidenceTypes": json.dumps(result.get("evidence_types", [])),
                "evidenceStrength": result.get("strength"),
                "uncertaintySources": json.dumps(result.get("uncertainty_sources", [])),
                "evidenceProfileGeneratedAt": datetime.now(),
            }
        except Exception as e:
            print(f"    Warning: Token inference error: {e}")
            return {}
    
    async def upsert_model(self, model_data: Dict[str, Any]) -> str:
        """Upsert model to database"""
        model_id = model_data["modelId"]
        
        # Check if exists
        existing = await self.prisma.modelregistry.find_unique(
            where={"modelId": model_id}
        )
        
        if existing:
            # Update
            updated = await self.prisma.modelregistry.update(
                where={"id": existing.id},
                data={
                    **{k: v for k, v in model_data.items() if k != "modelId"},
                    "updatedAt": datetime.now(),
                }
            )
            return updated.id
        else:
            # Create
            created = await self.prisma.modelregistry.create(
                data=model_data
            )
            return created.id
    
    async def create_linkages(self, model_id: str):
        """Create deal-model linkages for this model"""
        try:
            # Get all deals
            deals = await self.prisma.deal.find_many({
                select: {
                    id: True,
                    buyer: True,
                    provider: True,
                    date: True,
                    modality: True,
                    exclusive: True,
                }
            })
            
            # Get model
            model = await self.prisma.modelregistry.find_unique(
                where={"modelId": model_id},
                select={
                    id: True,
                    provider: True,
                    releaseDate: True,
                    modelId: True,
                }
            )
            
            if not model:
                return
            
            # Convert Prisma models to dicts for linkage function
            deals_dict = [dict(d) for d in deals]
            model_dict = dict(model)
            
            # Create linkages
            linkages = create_deal_model_linkages(deals_dict, [model_dict])
            
            # Store linkages
            for linkage in linkages:
                try:
                    await self.prisma.dealmodellinkage.upsert({
                        where: {
                            dealId_modelId: {
                                dealId: linkage["deal_id"],
                                modelId: linkage["model_id"],
                            }
                        },
                        update: {
                            linkageType: linkage["linkage_type"],
                            linkageStrength: linkage["linkage_strength"],
                            impactInference: linkage.get("impact_inference"),
                            analysisTimestamp: datetime.now(),
                        },
                        create: {
                            dealId: linkage["deal_id"],
                            modelId: linkage["model_id"],
                            linkageType: linkage["linkage_type"],
                            linkageStrength: linkage["linkage_strength"],
                            impactInference: linkage.get("impact_inference"),
                            analysisTimestamp: datetime.now(),
                        }
                    })
                except Exception as link_error:
                    print(f"    Warning: Could not create linkage: {link_error}")
                    continue
        except Exception as e:
            print(f"Error creating linkages for {model_id}: {e}")
    
    async def ingest_model(self, priority_model: Dict) -> bool:
        """Ingest a single priority model"""
        model_id = priority_model["model_id"]
        provider = priority_model["provider"]
        
        print(f"\n📦 Processing: {model_id} ({provider})")
        
        # Step 1: Fetch metadata
        print(f"  🔍 Fetching metadata...")
        epoch_data = await self.fetch_epoch_data(model_id, provider)
        hf_data = await self.fetch_hf_data(model_id, provider)
        
        # Step 2: Merge metadata
        model_data = self.merge_metadata(priority_model, epoch_data, hf_data)
        
        # Step 3: Run token inference
        print(f"  🧠 Running token inference...")
        inference_results = await self.run_token_inference(model_data)
        model_data.update(inference_results)
        
        # Step 4: Store in database
        print(f"  💾 Storing in database...")
        await self.upsert_model(model_data)
        
        # Step 5: Create linkages
        print(f"  🔗 Creating deal linkages...")
        await self.create_linkages(model_id)
        
        print(f"  ✅ Complete: {model_id}")
        return True
    
    async def ingest_all_priority_models(self, limit: Optional[int] = None):
        """Ingest all priority models"""
        priority_models = get_all_priority_models()
        
        if limit:
            priority_models = priority_models[:limit]
        
        print(f"🚀 Starting ingestion of {len(priority_models)} priority models")
        print(f"   Started at: {datetime.now().isoformat()}\n")
        
        await self.connect_db()
        
        try:
            success_count = 0
            for i, model in enumerate(priority_models, 1):
                print(f"\n[{i}/{len(priority_models)}]")
                try:
                    success = await self.ingest_model(model)
                    if success:
                        success_count += 1
                except Exception as e:
                    print(f"  ❌ Error: {e}")
                    continue
            
            print(f"\n✅ Ingestion complete!")
            print(f"   Successfully ingested: {success_count}/{len(priority_models)}")
            print(f"   Completed at: {datetime.now().isoformat()}")
        finally:
            await self.disconnect_db()


async def main():
    """Main entry point"""
    import argparse
    
    parser = argparse.ArgumentParser(description="Ingest priority models programmatically")
    parser.add_argument("--limit", type=int, help="Limit number of models to ingest (for testing)")
    parser.add_argument("--model", type=str, help="Ingest single model by ID")
    
    args = parser.parse_args()
    
    ingester = PriorityModelIngester()
    
    if args.model:
        # Ingest single model
        priority_models = get_all_priority_models()
        model = next((m for m in priority_models if m["model_id"] == args.model), None)
        if not model:
            print(f"Model {args.model} not found in priority list")
            return
        await ingester.connect_db()
        try:
            await ingester.ingest_model(model)
        finally:
            await ingester.disconnect_db()
    else:
        # Ingest all
        await ingester.ingest_all_priority_models(limit=args.limit)


if __name__ == "__main__":
    asyncio.run(main())

