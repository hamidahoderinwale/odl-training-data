"""
Stage D: Canonicalization Layer
Normalize entity names, standardize fields, convert to canonical format
"""

from typing import Dict, Any, Optional
from datetime import datetime


class DealCanonicalizer:
    """Canonicalize deal entities and fields"""
    
    # Provider canonicalization map
    PROVIDER_MAP = {
        "news corp": "News Corp",
        "newscorp": "News Corp",
        "dow jones": "News Corp",
        "wsj": "News Corp",
        "wall street journal": "News Corp",
        "ny post": "News Corp",
        "new york post": "News Corp",
        "associated press": "Associated Press",
        "ap": "Associated Press",
        "dotdash meredith": "Dotdash Meredith",
        "dotdash": "Dotdash Meredith",
        "meredith": "Dotdash Meredith",
        "shutterstock": "Shutterstock",
        "getty images": "Getty Images",
        "getty": "Getty Images",
        "harpercollins": "HarperCollins",
        "wiley": "Wiley",
        "springer": "Springer Nature",
        "elsevier": "Elsevier",
        "reuters": "Reuters",
        "bloomberg": "Bloomberg",
        "financial times": "Financial Times",
        "ft": "Financial Times",
    }
    
    # Buyer canonicalization map
    BUYER_MAP = {
        "openai": "OpenAI",
        "google": "Google",
        "alphabet": "Google",
        "anthropic": "Anthropic",
        "meta": "Meta",
        "facebook": "Meta",
        "microsoft": "Microsoft",
        "msft": "Microsoft",
        "amazon": "Amazon",
        "aws": "Amazon",
        "apple": "Apple",
        "cohere": "Cohere",
    }
    
    # Content type canonicalization
    CONTENT_TYPE_MAP = {
        "news": "news",
        "news archives": "news",
        "articles": "news",
        "social": "UGC",
        "ugc": "UGC",
        "user generated content": "UGC",
        "social feed": "UGC",
        "reddit": "UGC",
        "images": "images",
        "photos": "images",
        "photography": "images",
        "books": "books",
        "magazines": "magazines",
        "code": "code",
        "software": "code",
        "audio": "audio",
        "music": "audio",
        "video": "video",
    }
    
    # Pricing mechanism canonicalization
    PRICING_MECHANISM_MAP = {
        "api volume": "API volume licensing",
        "api per call": "API volume licensing",
        "per api call": "API volume licensing",
        "aggregate": "Access / aggregate licensing",
        "access license": "Access / aggregate licensing",
        "licensing": "Access / aggregate licensing",
        "royalty": "royalty",
        "fixed fee": "fixed fee",
        "one-time": "fixed fee",
        "subscription": "subscription",
    }
    
    def canonicalize_provider(self, provider: str) -> str:
        """Canonicalize provider name"""
        provider_lower = provider.lower().strip()
        return self.PROVIDER_MAP.get(provider_lower, provider)
    
    def canonicalize_buyer(self, buyer: str) -> str:
        """Canonicalize buyer name"""
        buyer_lower = buyer.lower().strip()
        return self.BUYER_MAP.get(buyer_lower, buyer)
    
    def canonicalize_content_type(self, content_type: str) -> str:
        """Canonicalize content type"""
        content_lower = content_type.lower().strip()
        return self.CONTENT_TYPE_MAP.get(content_lower, content_type)
    
    def canonicalize_pricing_mechanism(self, mechanism: Any) -> str:
        """Canonicalize pricing mechanism"""
        # Handle dict case (from regex extractor)
        if isinstance(mechanism, dict):
            mechanism = mechanism.get("pricing_mechanism", "")
        # Handle None or empty
        if not mechanism:
            return ""
        # Convert to string and canonicalize
        mechanism_str = str(mechanism).lower().strip()
        return self.PRICING_MECHANISM_MAP.get(mechanism_str, mechanism_str)
    
    def canonicalize_deal(self, deal_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Canonicalize all fields in deal data
        
        Args:
            deal_data: Raw deal data from extraction
        
        Returns:
            Canonicalized deal data
        """
        canonical = deal_data.copy()
        canonical["canonicalized_at"] = datetime.now().isoformat()
        
        # Canonicalize provider
        if "provider" in canonical:
            canonical["provider"] = self.canonicalize_provider(canonical["provider"])
        
        # Canonicalize buyer
        if "buyer" in canonical:
            canonical["buyer"] = self.canonicalize_buyer(canonical["buyer"])
        
        # Canonicalize content type
        if "content_type" in canonical:
            canonical["content_type"] = self.canonicalize_content_type(canonical["content_type"])
        
        # Canonicalize pricing mechanism
        if "pricing_mechanism" in canonical:
            canonical["pricing_mechanism"] = self.canonicalize_pricing_mechanism(
                canonical["pricing_mechanism"]
            )
        
        # Normalize price
        if "price" in canonical and isinstance(canonical["price"], dict):
            price_data = canonical["price"]
            canonical["price_usd"] = price_data.get("price")
            canonical["currency"] = price_data.get("currency", "USD")
        elif "price" in canonical:
            canonical["price_usd"] = canonical["price"]
            canonical["currency"] = "USD"
        
        # Normalize duration
        if "duration" in canonical and isinstance(canonical["duration"], dict):
            duration_data = canonical["duration"]
            canonical["duration_years"] = duration_data.get("duration_years")
        
        # Normalize exclusivity
        if "exclusivity" in canonical and isinstance(canonical["exclusivity"], dict):
            exclusivity_data = canonical["exclusivity"]
            canonical["exclusive"] = exclusivity_data.get("exclusive")
        
        return canonical

