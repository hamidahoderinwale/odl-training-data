"""
Deal-to-Token Inference System
Convert deals into token-scale estimates and data composition signals
"""

from typing import Dict, Any, Optional, List
from datetime import datetime


class DealTokenInference:
    """Infer token counts and data composition from deals"""
    
    # Token estimates per deal type (in tokens)
    TOKEN_LOOKUP = {
        "News Corp": {
            "tokens_est": 40e9,  # ~40-70B tokens
            "tokens_range": (30e9, 80e9),
            "description": "WSJ + Dow Jones + NY Post archives",
        },
        "Reddit": {
            "tokens_est": 50e9,  # Per year
            "tokens_range": (30e9, 100e9),
            "description": "500M+ posts/year + comments",
            "is_streaming": True,
        },
        "Shutterstock": {
            "tokens_est": 100e9,  # Multimodal tokens
            "tokens_range": (50e9, 200e9),
            "description": "Hundreds of millions images",
            "modality": "image",
        },
        "Dotdash Meredith": {
            "tokens_est": 5e9,
            "tokens_range": (3e9, 10e9),
            "description": "Magazine archives",
        },
        "Associated Press": {
            "tokens_est": 10e9,
            "tokens_range": (5e9, 20e9),
            "description": "News archives",
        },
    }
    
    def infer_tokens(self, deal: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Infer token count from deal
        
        Args:
            deal: Deal dict
        
        Returns:
            Token inference dict
        """
        provider = deal.get("provider", "")
        
        # Check lookup table
        if provider in self.TOKEN_LOOKUP:
            lookup = self.TOKEN_LOOKUP[provider]
            
            return {
                "tokens_est": lookup.get("tokens_est"),
                "tokens_min": lookup.get("tokens_range", (0, 0))[0],
                "tokens_max": lookup.get("tokens_range", (0, 0))[1],
                "description": lookup.get("description"),
                "is_streaming": lookup.get("is_streaming", False),
                "modality": lookup.get("modality", deal.get("modality", "Text")),
                "inferred_at": datetime.now().isoformat(),
                "method": "lookup_table",
            }
        
        # Fallback: estimate based on price and modality
        price = deal.get("price_usd")
        modality = deal.get("modality", "Text")
        duration = deal.get("duration_years", 1)
        
        if price:
            # Rough heuristic: $1M ≈ 1B tokens for text
            # Adjust for modality
            modality_multipliers = {
                "Text": 1.0,
                "Image": 0.1,  # Images are smaller in token terms
                "Audio": 0.5,
                "Video": 0.2,
            }
            
            multiplier = modality_multipliers.get(modality, 1.0)
            tokens_per_million = 1e9 * multiplier
            
            tokens_est = (price / 1e6) * tokens_per_million * duration
            
            return {
                "tokens_est": tokens_est,
                "tokens_min": tokens_est * 0.5,
                "tokens_max": tokens_est * 2.0,
                "description": f"Estimated from price ({price:,.0f} USD) and {modality} modality",
                "is_streaming": deal.get("update_frequency") == "streaming",
                "modality": modality,
                "inferred_at": datetime.now().isoformat(),
                "method": "price_heuristic",
                "confidence": "low",
            }
        
        return None
    
    def infer_composition_impact(self, deal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Infer data composition impact from deal
        
        Args:
            deal: Deal dict
        
        Returns:
            Composition impact dict
        """
        provider = deal.get("provider", "")
        modality = deal.get("modality", "Text")
        content_type = deal.get("content_type", "")
        exclusive = deal.get("exclusive", False)
        
        # Map to composition weights
        composition_weights = {}
        
        if "news" in content_type.lower() or "news" in provider.lower():
            composition_weights["news_weight"] = "high" if exclusive else "medium"
        
        if "social" in content_type.lower() or "ugc" in content_type.lower():
            composition_weights["web_weight"] = "very high"
        
        if "image" in modality.lower():
            composition_weights["multimodal_weight"] = "high"
        
        if "code" in content_type.lower():
            composition_weights["code_weight"] = "medium"
        
        return {
            "composition_weights": composition_weights,
            "exclusivity_impact": "high" if exclusive else "low",
            "token_implication": self._generate_implication(deal),
            "inferred_at": datetime.now().isoformat(),
        }
    
    def _generate_implication(self, deal: Dict[str, Any]) -> str:
        """Generate human-readable implication"""
        provider = deal.get("provider", "")
        modality = deal.get("modality", "Text")
        exclusive = deal.get("exclusive", False)
        
        exclusive_text = "exclusive " if exclusive else ""
        
        if "news" in provider.lower() or "news" in deal.get("content_type", "").lower():
            return f"increases {exclusive_text}high-quality news-text coverage"
        elif "social" in deal.get("content_type", "").lower():
            return f"increases {exclusive_text}social-text coverage"
        elif "image" in modality.lower():
            return f"increases {exclusive_text}image data coverage"
        else:
            return f"increases {exclusive_text}{modality.lower()} coverage"
    
    def enrich_deal(self, deal: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enrich deal with token and composition inferences
        
        Args:
            deal: Deal dict
        
        Returns:
            Enriched deal dict
        """
        enriched = deal.copy()
        
        # Infer tokens
        token_inference = self.infer_tokens(deal)
        if token_inference:
            enriched["token_inference"] = token_inference
        
        # Infer composition
        composition_impact = self.infer_composition_impact(deal)
        enriched["composition_impact"] = composition_impact
        
        enriched["enriched_at"] = datetime.now().isoformat()
        
        return enriched

