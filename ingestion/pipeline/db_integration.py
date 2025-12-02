"""
Database Integration for Deals Pipeline
Writes extracted deals to database with proper schema mapping
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent.parent))

# Note: Prisma Python client needs to be generated first
# Run: npx prisma generate
# Prisma Python client must be generated first: npx prisma generate
try:
    from prisma import Prisma
    PRISMA_AVAILABLE = True
except ImportError:
    PRISMA_AVAILABLE = False
    # Will use alternative storage or skip DB writes
    # Note: Run 'npm run db:generate' to enable database operations


class DealDBWriter:
    """Write deals to database"""
    
    def __init__(self):
        self.prisma = None
        if PRISMA_AVAILABLE:
            try:
                self.prisma = Prisma()
            except Exception as e:
                # Prisma may not be initialized yet
                # User needs to run: npx prisma generate
                pass
    
    async def connect(self):
        """Connect to database"""
        if self.prisma:
            await self.prisma.connect()
    
    async def disconnect(self):
        """Disconnect from database"""
        if self.prisma:
            await self.prisma.disconnect()
    
    def map_deal_to_schema(self, deal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Map extracted deal to Prisma schema format
        
        Args:
            deal: Extracted deal dict
        
        Returns:
            Dict in Prisma schema format
        """
        # Parse dates
        announcement_date = self._parse_date(deal.get("date_announced") or deal.get("announcement_date"))
        effective_start = self._parse_date(deal.get("effective_start_date") or deal.get("start_date"))
        effective_end = self._parse_date(deal.get("effective_end_date") or deal.get("end_date"))
        discovery_date = self._parse_date(deal.get("discovery_date"))
        last_verified = self._parse_date(deal.get("last_verified"))
        source_pub_date = self._parse_date(deal.get("source_publication_date") or deal.get("published_date"))
        exa_retrieved = self._parse_date(deal.get("exa_retrieved_at"))
        last_extracted = self._parse_date(deal.get("last_extracted"))
        
        # Parse sources
        sources = deal.get("sources", [])
        if isinstance(sources, str):
            try:
                sources = json.loads(sources)
            except:
                sources = [sources] if sources else []
        elif not isinstance(sources, list):
            sources = [sources] if sources else []
        
        # Format sources as JSON string
        sources_json = json.dumps(sources)
        
        # Parse extraction metadata
        extraction_metadata = deal.get("extraction_metadata", {})
        if isinstance(extraction_metadata, dict):
            extraction_metadata_json = json.dumps(extraction_metadata)
        else:
            extraction_metadata_json = extraction_metadata
        
        # Parse raw text snippets
        raw_snippets = deal.get("raw_text_snippets", [])
        if isinstance(raw_snippets, list):
            raw_snippets_json = json.dumps(raw_snippets)
        else:
            raw_snippets_json = raw_snippets
        
        # Map to schema
        mapped = {
            "date": deal.get("date") or deal.get("date_announced"),
            "announcementDate": announcement_date,
            "effectiveStartDate": effective_start,
            "effectiveEndDate": effective_end,
            "discoveryDate": discovery_date,
            "lastVerified": last_verified,
            "sourcePublicationDate": source_pub_date,
            "modality": deal.get("modality", "Text"),
            "provider": deal.get("provider", ""),
            "buyer": deal.get("buyer", ""),
            "dataType": deal.get("data_type_short") or deal.get("data_type") or deal.get("content_type", ""),
            "reportedTerms": deal.get("deal_terms_raw") or deal.get("reported_terms"),
            "creatorsCompensated": deal.get("creator_compensation") == "yes" if deal.get("creator_compensation") else None,
            "exclusive": deal.get("exclusive"),
            "pricingMechanism": deal.get("pricing_mechanism", ""),
            "dealType": deal.get("deal_type"),
            "priceUsd": deal.get("price_usd") or deal.get("price"),
            "priceRangeMinUsd": deal.get("price_range_min_usd"),
            "priceRangeMaxUsd": deal.get("price_range_max_usd"),
            "priceCurrency": deal.get("currency", "USD"),
            "durationYears": deal.get("duration_years"),
            "startDate": effective_start,
            "endDate": effective_end,
            "contentType": deal.get("content_type"),
            "volumeDescription": deal.get("volume_description"),
            "updateFrequency": deal.get("update_frequency"),
            "historicalArchiveAccess": deal.get("historical_archive_access"),
            "sources": sources_json,
            "sourcePrimary": deal.get("source_primary"),
            "discoveredVia": deal.get("discovered_via") or deal.get("source", "unknown"),
            "exaQuery": deal.get("exa_query"),
            "exaScore": deal.get("exa_score"),
            "exaRetrievedAt": exa_retrieved,
            "extractionMetadata": extraction_metadata_json,
            "rawTextSnippets": raw_snippets_json,
            "regexConfidence": deal.get("regex_confidence"),
            "llmConfidence": deal.get("llm_confidence") or deal.get("extraction_confidence"),
            "lastExtracted": last_extracted,
            "notes": deal.get("notes"),
            "dealStage": deal.get("deal_stage", "announced"),
            "confidenceScore": deal.get("confidence_score", 0.5),
            "version": deal.get("version", "1.0"),
        }
        
        # Remove None values for optional fields
        return {k: v for k, v in mapped.items() if v is not None}
    
    async def upsert_deal(self, deal: Dict[str, Any]) -> Optional[str]:
        """
        Upsert deal to database
        
        Args:
            deal: Deal dict
        
        Returns:
            Deal ID if successful
        """
        if not self.prisma:
            return None
        
        try:
            mapped = self.map_deal_to_schema(deal)
            
            # Create unique identifier for matching
            # Use provider + buyer + date as key
            match_key = {
                "provider": mapped["provider"],
                "buyer": mapped["buyer"],
                "date": mapped.get("date"),
            }
            
            # Try to find existing deal
            existing = await self.prisma.deal.find_first(
                where={
                    "provider": mapped["provider"],
                    "buyer": mapped["buyer"],
                    "date": mapped.get("date"),
                }
            )
            
            if existing:
                # Update existing
                updated = await self.prisma.deal.update(
                    where={"id": existing.id},
                    data=mapped
                )
                return updated.id
            else:
                # Create new
                created = await self.prisma.deal.create(data=mapped)
                return created.id
        
        except Exception as e:
            print(f"Error upserting deal: {e}")
            return None
    
    async def upsert_deals_batch(self, deals: List[Dict[str, Any]]) -> Dict[str, int]:
        """
        Upsert multiple deals
        
        Args:
            deals: List of deal dicts
        
        Returns:
            Dict with counts
        """
        if not self.prisma:
            return {"created": 0, "updated": 0, "errors": len(deals)}
        
        results = {"created": 0, "updated": 0, "errors": 0}
        seen_ids = set()
        
        for deal in deals:
            try:
                # Check if deal already exists
                provider = deal.get("provider", "")
                buyer = deal.get("buyer", "")
                date = deal.get("date") or deal.get("date_announced")
                
                if not provider or not buyer:
                    results["errors"] += 1
                    continue
                
                # Try to find existing
                existing = await self.prisma.deal.find_first(
                    where={
                        "provider": provider,
                        "buyer": buyer,
                        "date": date,
                    }
                )
                
                mapped = self.map_deal_to_schema(deal)
                
                if existing:
                    # Update
                    await self.prisma.deal.update(
                        where={"id": existing.id},
                        data=mapped
                    )
                    results["updated"] += 1
                    seen_ids.add(existing.id)
                else:
                    # Create
                    created = await self.prisma.deal.create(data=mapped)
                    results["created"] += 1
                    seen_ids.add(created.id)
            except Exception as e:
                print(f"Error processing deal: {e}")
                results["errors"] += 1
        
        return results
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime"""
        if not date_str:
            return None
        
        if isinstance(date_str, datetime):
            return date_str
        
        try:
            # Try ISO format
            if 'T' in date_str:
                return datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            # Try date only
            return datetime.strptime(date_str, "%Y-%m-%d")
        except:
            try:
                # Try other formats
                return datetime.strptime(date_str, "%Y-%m-%d %H:%M:%S")
            except:
                return None

