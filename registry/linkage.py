"""
Deal-Model Linkage System
Creates temporal and inferred linkages between deals and models
"""

from typing import List, Dict, Any, Optional, Union
from datetime import datetime


def create_deal_model_linkages(
    deals: List[Dict[str, Any]],
    models: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    Create linkages between deals and models programmatically
    
    Args:
        deals: List of deal dictionaries from Prisma
        models: List of model dictionaries from Prisma
    
    Returns:
        List of linkage dictionaries
    """
    linkages = []
    
    for deal in deals:
        deal_buyer = deal.get("buyer", "").lower()
        deal_provider = deal.get("provider", "").lower()
        deal_date = deal.get("date")
        deal_modality = deal.get("modality", "").lower()
        
        for model in models:
            model_provider = model.get("provider", "").lower()
            model_id = model.get("modelId", "")
            model_release_date = model.get("releaseDate")
            
            # Check buyer-provider match
            buyer_provider_map = {
                "openai": "openai",
                "google": "google",
                "meta": "meta",
                "facebook": "meta",
                "microsoft": "microsoft",
                "anthropic": "anthropic",
                "aws": "amazon",
                "amazon": "amazon",
            }
            
            # Normalize buyer name
            normalized_buyer = None
            for key, value in buyer_provider_map.items():
                if key in deal_buyer:
                    normalized_buyer = value
                    break
            
            # Create linkage if buyer matches model provider
            if normalized_buyer and normalized_buyer in model_provider:
                linkage_strength = "high"
                linkage_type = "inferred"
                
                # Check temporal overlap if dates available
                if deal_date and model_release_date:
                    try:
                        deal_year = _extract_year(deal_date)
                        model_year = _extract_year(str(model_release_date))
                        if deal_year and model_year and abs(deal_year - model_year) <= 1:
                            linkage_type = "temporal_overlap"
                            linkage_strength = "high"
                    except:
                        pass
                
                # Infer impact
                if deal.get("exclusive"):
                    impact = f"Exclusive {deal_modality} data for {model_provider} models"
                else:
                    impact = f"Increased {deal_modality} coverage for {model_provider} training"
                
                linkages.append({
                    "deal_id": deal.get("id"),
                    "model_id": model.get("id"),  # Prisma model ID, not modelId
                    "linkage_type": linkage_type,
                    "linkage_strength": linkage_strength,
                    "impact_inference": impact,
                })
    
    return linkages


def _extract_year(date_str: str) -> Optional[int]:
    """Extract year from date string"""
    try:
        # Try to parse as ISO date
        from datetime import datetime
        dt = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
        return dt.year
    except:
        # Try to extract year pattern
        import re
        match = re.search(r'\b(20\d{2})\b', date_str)
        if match:
            return int(match.group(1))
        return None


class DealModelLinkage:
    """Creates linkages between deals and models based on temporal and content analysis"""
    
    @staticmethod
    def create_temporal_linkage(
        deal: Dict[str, Any],
        model: Union[Dict[str, Any], Any]  # ModelRecord or dict
    ) -> Optional[Dict[str, Any]]:
        """
        Create linkage based on temporal overlap
        
        Args:
            deal: Deal dictionary with dates
            model: ModelRecord object
        
        Returns:
            Linkage dict or None
        """
        # Check if deal was active during model training period
        deal_start = deal.get("effective_start_date") or deal.get("announcement_date")
        deal_end = deal.get("effective_end_date")
        # Handle both dict and object
        if isinstance(model, dict):
            model_training_start = model.get("trainingPeriodStart") or model.get("training_period_start")
            model_training_end = model.get("trainingPeriodEnd") or model.get("training_period_end")
        else:
            model_training_start = getattr(model, "training_period_start", None)
            model_training_end = getattr(model, "training_period_end", None)
        
        if not (deal_start and model_training_start):
            return None
        
        # Parse dates if strings
        if isinstance(deal_start, str):
            deal_start = datetime.fromisoformat(deal_start.replace('Z', '+00:00'))
        if isinstance(model_training_start, str):
            model_training_start = datetime.fromisoformat(model_training_start.replace('Z', '+00:00'))
        
        # Check for overlap
        if deal_end and isinstance(deal_end, str):
            deal_end = datetime.fromisoformat(deal_end.replace('Z', '+00:00'))
        
        if model_training_end and isinstance(model_training_end, str):
            model_training_end = datetime.fromisoformat(model_training_end.replace('Z', '+00:00'))
        
        # Determine overlap
        if deal_end and model_training_end:
            overlap = (min(deal_end, model_training_end) - max(deal_start, model_training_start)).days
            if overlap > 0:
                linkage_strength = "high" if overlap > 180 else "medium"
            else:
                return None
        else:
            # If dates are missing, use heuristics
            linkage_strength = "low"
        
        # Infer impact based on modality and deal details
        modality = deal.get("modality", "").lower()
        volume_desc = deal.get("volume_description", "")
        
        if "streaming" in volume_desc.lower() or "continuous" in volume_desc.lower():
            impact = f"increased {modality} coverage via streaming feed"
        else:
            impact = f"increased {modality} coverage in training data"
        
        # Handle both dict and object
        if isinstance(model, dict):
            model_id = model.get("id") or model.get("modelId") or model.get("model_id")
        else:
            model_id = getattr(model, "model_id", None) or getattr(model, "id", None)
        
        return {
            "deal_id": deal.get("id"),
            "model_id": model_id,
            "linkage_type": "temporal_overlap",
            "linkage_strength": linkage_strength,
            "impact_inference": impact,
            "modality_integration": deal.get("modality", ""),
            "feed_type": "streaming" if "streaming" in volume_desc.lower() else "batch",
            "analysis_timestamp": datetime.now().isoformat(),
        }
    
    @staticmethod
    def create_inferred_linkage(
        deal: Dict[str, Any],
        model: Union[Dict[str, Any], Any]  # ModelRecord or dict
    ) -> Optional[Dict[str, Any]]:
        """
        Create linkage based on content/buyer/provider matching
        
        Args:
            deal: Deal dictionary
            model: ModelRecord object
        
        Returns:
            Linkage dict or None
        """
        # Check if buyer matches model provider
        deal_buyer = deal.get("buyer", "").lower()
        # Handle both dict and object
        if isinstance(model, dict):
            model_provider = (model.get("provider") or "").lower()
        else:
            model_provider = (getattr(model, "provider", "") or "").lower()
        
        # Common mappings
        buyer_to_provider = {
            "openai": "openai",
            "google": "google",
            "meta": "meta",
            "microsoft": "microsoft",
            "anthropic": "anthropic",
        }
        
        # Check direct match or common patterns
        if deal_buyer in buyer_to_provider and buyer_to_provider[deal_buyer] == model_provider:
            linkage_strength = "high"
        elif deal_buyer in model_provider or model_provider in deal_buyer:
            linkage_strength = "medium"
        else:
            return None
        
        # Infer impact based on modality and deal type
        modality = deal.get("modality", "").lower()
        deal_type = deal.get("deal_type", "").lower()
        
        # Handle both dict and object
        if isinstance(model, dict):
            model_provider_name = model.get("provider", "")
            model_id = model.get("id") or model.get("modelId") or model.get("model_id")
        else:
            model_provider_name = getattr(model, "provider", "")
            model_id = getattr(model, "model_id", None) or getattr(model, "id", None)
        
        if "exclusive" in deal.get("exclusive", "").lower():
            impact = f"likely exclusive {modality} coverage for {model_provider_name}"
        else:
            impact = f"likely increased {modality} coverage"
        
        return {
            "deal_id": deal.get("id"),
            "model_id": model_id,
            "linkage_type": "inferred",
            "linkage_strength": linkage_strength,
            "impact_inference": impact,
            "modality_integration": deal.get("modality", ""),
            "analysis_timestamp": datetime.now().isoformat(),
        }
    
    @staticmethod
    def link_deals_to_models(
        deals: List[Dict[str, Any]],
        models: List[Union[Dict[str, Any], Any]]  # List of ModelRecord or dict
    ) -> List[Dict[str, Any]]:
        """
        Create linkages between all deals and models
        
        Args:
            deals: List of deal dictionaries
            models: List of ModelRecord objects
        
        Returns:
            List of linkage dictionaries
        """
        linkages = []
        
        for deal in deals:
            for model in models:
                # Try temporal linkage first
                temporal_link = DealModelLinkage.create_temporal_linkage(deal, model)
                if temporal_link:
                    linkages.append(temporal_link)
                    continue
                
                # Fall back to inferred linkage
                inferred_link = DealModelLinkage.create_inferred_linkage(deal, model)
                if inferred_link:
                    linkages.append(inferred_link)
        
        return linkages

