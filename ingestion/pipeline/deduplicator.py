"""
Stage E: Deduplicate Deals
Compare deals and merge duplicates with multiple sources
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from difflib import SequenceMatcher


class DealDeduplicator:
    """Deduplicate and merge deals from multiple sources"""
    
    SIMILARITY_THRESHOLD = 0.85  # 85% similarity = likely same deal
    
    def __init__(self):
        pass
    
    def compare_deals(self, deal1: Dict[str, Any], deal2: Dict[str, Any]) -> float:
        """
        Compare two deals and return similarity score
        
        Args:
            deal1: First deal
            deal2: Second deal
        
        Returns:
            Similarity score (0-1)
        """
        # Compare key fields
        scores = []
        
        # Provider match
        if deal1.get("provider") and deal2.get("provider"):
            if deal1["provider"].lower() == deal2["provider"].lower():
                scores.append(1.0)
            else:
                scores.append(0.0)
        
        # Buyer match
        if deal1.get("buyer") and deal2.get("buyer"):
            if deal1["buyer"].lower() == deal2["buyer"].lower():
                scores.append(1.0)
            else:
                scores.append(0.0)
        
        # Price similarity (within 10%)
        if deal1.get("price_usd") and deal2.get("price_usd"):
            price1 = float(deal1["price_usd"])
            price2 = float(deal2["price_usd"])
            if price1 > 0 and price2 > 0:
                ratio = min(price1, price2) / max(price1, price2)
                scores.append(ratio)
        
        # Date similarity (within 30 days)
        if deal1.get("date_announced") and deal2.get("date_announced"):
            try:
                date1 = datetime.fromisoformat(deal1["date_announced"])
                date2 = datetime.fromisoformat(deal2["date_announced"])
                days_diff = abs((date1 - date2).days)
                if days_diff <= 30:
                    scores.append(1.0 - (days_diff / 30))
                else:
                    scores.append(0.0)
            except:
                pass
        
        # Text similarity (if available)
        if deal1.get("deal_terms_raw") and deal2.get("deal_terms_raw"):
            similarity = SequenceMatcher(
                None,
                deal1["deal_terms_raw"].lower(),
                deal2["deal_terms_raw"].lower()
            ).ratio()
            scores.append(similarity)
        
        # Return weighted average score
        if scores:
            # Weight provider and buyer matches more heavily
            weighted_scores = []
            weights = []
            for i, score in enumerate(scores):
                # First two scores are provider/buyer (weight 2x)
                weight = 2.0 if i < 2 else 1.0
                weighted_scores.append(score * weight)
                weights.append(weight)
            
            return sum(weighted_scores) / sum(weights) if weights else 0.0
        return 0.0
    
    def merge_deals(self, deals: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Merge multiple deal records into one canonical deal
        
        Args:
            deals: List of deal dicts (same deal from different sources)
        
        Returns:
            Merged deal dict
        """
        if not deals:
            return {}
        
        if len(deals) == 1:
            return deals[0]
        
        # Start with first deal as base
        merged = deals[0].copy()
        
        # Collect all sources
        all_sources = merged.get("sources", [])
        if not isinstance(all_sources, list):
            all_sources = [all_sources] if all_sources else []
        
        # Merge data from other deals
        for deal in deals[1:]:
            # Merge sources
            deal_sources = deal.get("sources", [])
            if isinstance(deal_sources, list):
                all_sources.extend(deal_sources)
            elif deal_sources:
                all_sources.append(deal_sources)
            
            # Use highest confidence data
            if deal.get("extraction_confidence") == "high":
                # Prefer high confidence fields
                for key in ["price_usd", "duration_years", "exclusive", "pricing_mechanism"]:
                    if key in deal and deal[key] is not None:
                        if merged.get(key) is None or merged.get("extraction_confidence") != "high":
                            merged[key] = deal[key]
        
        # Deduplicate sources
        seen_urls = set()
        unique_sources = []
        for source in all_sources:
            if isinstance(source, dict):
                url = source.get("url", "")
            else:
                url = str(source)
            
            if url and url not in seen_urls:
                seen_urls.add(url)
                unique_sources.append(source)
        
        merged["sources"] = unique_sources
        merged["merged_at"] = datetime.now().isoformat()
        merged["source_count"] = len(deals)
        
        return merged
    
    def deduplicate(self, deals: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Deduplicate list of deals
        
        Args:
            deals: List of deal dicts
        
        Returns:
            Deduplicated list
        """
        if not deals:
            return []
        
        # Group similar deals
        groups = []
        used_indices = set()
        
        for i, deal1 in enumerate(deals):
            if i in used_indices:
                continue
            
            group = [deal1]
            used_indices.add(i)
            
            for j, deal2 in enumerate(deals[i+1:], start=i+1):
                if j in used_indices:
                    continue
                
                similarity = self.compare_deals(deal1, deal2)
                if similarity >= self.SIMILARITY_THRESHOLD:
                    group.append(deal2)
                    used_indices.add(j)
            
            groups.append(group)
        
        # Merge each group
        deduplicated = []
        for group in groups:
            if len(group) > 1:
                merged = self.merge_deals(group)
                deduplicated.append(merged)
            else:
                deduplicated.append(group[0])
        
        return deduplicated

