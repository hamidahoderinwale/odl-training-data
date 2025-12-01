"""
Standalone script to create linkages between all deals and models in the database
"""

import asyncio
import os
import sys
from pathlib import Path
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from registry.linkage import create_deal_model_linkages
from dotenv import load_dotenv

# Prisma imports
try:
    from prisma import Prisma
    PRISMA_AVAILABLE = True
except ImportError:
    PRISMA_AVAILABLE = False
    print("Error: Prisma not available. Install with: npm run db:generate")
    sys.exit(1)

load_dotenv()


async def create_all_linkages():
    """Create linkages between all deals and models"""
    prisma = Prisma()
    await prisma.connect()
    
    try:
        # Get all deals
        print("📊 Fetching all deals...")
        deals = await prisma.deal.find_many({
            select: {
                id: True,
                buyer: True,
                provider: True,
                date: True,
                modality: True,
                exclusive: True,
            }
        })
        print(f"   Found {len(deals)} deals")
        
        # Get all models
        print("🤖 Fetching all models...")
        models = await prisma.modelregistry.find_many({
            select: {
                id: True,
                modelId: True,
                provider: True,
                releaseDate: True,
            }
        })
        print(f"   Found {len(models)} models")
        
        if len(deals) == 0:
            print("⚠️  No deals found. Please seed the database first.")
            return
        
        if len(models) == 0:
            print("⚠️  No models found. Please run the registry ingestion pipeline first.")
            return
        
        # Convert Prisma models to dicts
        deals_dict = []
        for deal in deals:
            deals_dict.append({
                "id": deal.id,
                "buyer": deal.buyer or "",
                "provider": deal.provider or "",
                "date": deal.date.isoformat() if deal.date else None,
                "modality": deal.modality or "",
                "exclusive": deal.exclusive,
            })
        
        models_dict = []
        for model in models:
            models_dict.append({
                "id": model.id,
                "modelId": model.modelId or "",
                "provider": model.provider or "",
                "releaseDate": model.releaseDate.isoformat() if model.releaseDate else None,
            })
        
        # Create linkages
        print("\n🔗 Creating linkages...")
        linkages = create_deal_model_linkages(deals_dict, models_dict)
        print(f"   Generated {len(linkages)} linkages")
        
        # Store linkages
        created_count = 0
        updated_count = 0
        error_count = 0
        
        for linkage in linkages:
            try:
                # Check if linkage already exists
                existing = await prisma.dealmodellinkage.find_unique({
                    where: {
                        dealId_modelId: {
                            dealId: linkage["deal_id"],
                            modelId: linkage["model_id"],
                        }
                    }
                })
                
                if existing:
                    # Update existing linkage
                    await prisma.dealmodellinkage.update({
                        where: { id: existing.id },
                        data: {
                            linkageType: linkage["linkage_type"],
                            linkageStrength: linkage["linkage_strength"],
                            impactInference: linkage.get("impact_inference"),
                            analysisTimestamp: datetime.now(),
                        }
                    })
                    updated_count += 1
                else:
                    # Create new linkage
                    await prisma.dealmodellinkage.create({
                        data: {
                            dealId: linkage["deal_id"],
                            modelId: linkage["model_id"],
                            linkageType: linkage["linkage_type"],
                            linkageStrength: linkage["linkage_strength"],
                            impactInference: linkage.get("impact_inference"),
                            analysisTimestamp: datetime.now(),
                        }
                    })
                    created_count += 1
            except Exception as e:
                print(f"   ⚠️  Error creating linkage: {e}")
                error_count += 1
                continue
        
        print(f"\n✅ Linkage creation complete!")
        print(f"   Created: {created_count}")
        print(f"   Updated: {updated_count}")
        print(f"   Errors: {error_count}")
        print(f"   Total linkages: {created_count + updated_count}")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await prisma.disconnect()


if __name__ == "__main__":
    asyncio.run(create_all_linkages())

