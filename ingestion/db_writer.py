"""
Database Writer - Write deals to database using Prisma
"""

import os
import json
from typing import Optional
from validator import DealData
from prisma import Prisma
from prisma.models import Deal, Provider, Buyer, DealBuyer


class DBWriter:
    """Write deals to database"""
    
    def __init__(self, database_url: Optional[str] = None):
        self.database_url = database_url or os.getenv("DATABASE_URL")
        if not self.database_url:
            raise ValueError("DATABASE_URL environment variable required")
        self.prisma = Prisma()
    
    async def connect(self):
        """Connect to database"""
        await self.prisma.connect()
    
    async def disconnect(self):
        """Disconnect from database"""
        await self.prisma.disconnect()
    
    async def upsert_provider(self, name: str) -> Provider:
        """Create or get provider"""
        provider = await self.prisma.provider.upsert(
            where={"name": name},
            data={
                "create": {"name": name},
                "update": {},
            },
        )
        return provider
    
    async def upsert_buyer(self, name: str) -> Buyer:
        """Create or get buyer"""
        buyer = await self.prisma.buyer.upsert(
            where={"name": name},
            data={
                "create": {"name": name},
                "update": {},
            },
        )
        return buyer
    
    async def upsert_deal(self, deal_data: DealData) -> Deal:
        """
        Create or update deal
        
        Uses provider + buyer + date as unique identifier
        """
        # Ensure provider and buyer exist
        provider = await self.upsert_provider(deal_data.provider)
        
        # Handle multiple buyers (comma-separated)
        buyer_names = [b.strip() for b in deal_data.buyer.split(",")]
        
        # Create deal
        deal_dict = {
            "provider": deal_data.provider,
            "buyer": deal_data.buyer,
            "modality": deal_data.modality,
            "dataType": deal_data.data_type,
            "reportedTerms": deal_data.reported_terms,
            "creatorsCompensated": deal_data.creators_compensated,
            "exclusive": deal_data.exclusive,
            "pricingMechanism": deal_data.pricing_mechanism,
            "dealType": deal_data.deal_type,
            "priceUsd": deal_data.price_usd,
            "priceRangeMinUsd": deal_data.price_range_min_usd,
            "priceRangeMaxUsd": deal_data.price_range_max_usd,
            "priceCurrency": deal_data.price_currency,
            "date": deal_data.date,
            "startDate": deal_data.start_date,
            "endDate": deal_data.end_date,
            "durationYears": deal_data.duration_years,
            "creatorSplitPercentage": deal_data.creator_split_percentage,
            "revenueShare": deal_data.revenue_share,
            "trainingAllowed": deal_data.training_allowed,
            "finetuningAllowed": deal_data.finetuning_allowed,
            "inferenceAllowed": deal_data.inference_allowed,
            "redistributionAllowed": deal_data.redistribution_allowed,
            "deletionRequired": deal_data.deletion_required,
            "sources": json.dumps(deal_data.sources),
            "sourcePrimary": deal_data.source_primary,
            "notes": deal_data.notes,
            "dealStage": deal_data.deal_stage,
            "confidenceScore": deal_data.confidence_score,
            "providerId": provider.id,
        }
        
        # Try to find existing deal by provider + buyer + date
        existing = await self.prisma.deal.find_first(
            where={
                "provider": deal_data.provider,
                "buyer": {"contains": buyer_names[0]},
                "date": deal_data.date,
            },
        )
        
        if existing:
            # Update existing deal
            deal = await self.prisma.deal.update(
                where={"id": existing.id},
                data=deal_dict,
            )
        else:
            # Create new deal
            deal = await self.prisma.deal.create(data=deal_dict)
        
        # Link buyers
        for buyer_name in buyer_names:
            buyer = await self.upsert_buyer(buyer_name)
            
            # Check if relationship exists
            existing_relation = await self.prisma.dealbuyer.find_first(
                where={
                    "dealId": deal.id,
                    "buyerId": buyer.id,
                },
            )
            
            if not existing_relation:
                await self.prisma.dealbuyer.create(
                    data={
                        "dealId": deal.id,
                        "buyerId": buyer.id,
                    },
                )
        
        return deal
    
    async def save_deals(self, deals: list[DealData]) -> int:
        """Save multiple deals"""
        saved = 0
        for deal in deals:
            try:
                await self.upsert_deal(deal)
                saved += 1
            except Exception as e:
                print(f"Error saving deal {deal.provider} → {deal.buyer}: {e}")
        return saved


# Async context manager for easy usage
class DBWriterContext:
    """Context manager for DBWriter"""
    
    def __init__(self, database_url: Optional[str] = None):
        self.writer = DBWriter(database_url)
    
    async def __aenter__(self):
        await self.writer.connect()
        return self.writer
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.writer.disconnect()


# Example usage:
# async def main():
#     async with DBWriterContext() as writer:
#         deal_data = DealData(...)
#         await writer.upsert_deal(deal_data)

