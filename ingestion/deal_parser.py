"""
Deal Parser - Extract structured deal information from text
"""

from typing import Dict, Any, Optional
from datetime import datetime
import re
from perplexity_client import PerplexityClient
from validator import DealValidator, DealData


class DealParser:
    """Parse deals from text using LLM + regex validation"""
    
    def __init__(self, perplexity_client: Optional[PerplexityClient] = None):
        self.perplexity = perplexity_client or PerplexityClient()
        self.validator = DealValidator()
    
    def parse(self, text: str, source_url: str) -> Optional[DealData]:
        """
        Parse deal information from text
        
        Args:
            text: Article or filing text
            source_url: URL where text came from
        
        Returns:
            DealData object if valid deal found, None otherwise
        """
        # Step 1: LLM extraction
        extracted = self.perplexity.extract_deal_info(text)
        
        if not extracted:
            return None
        
        # Step 2: Regex validation and normalization
        normalized = self._normalize_extracted(extracted)
        
        # Step 3: Add metadata
        normalized["sources"] = [source_url]
        normalized["deal_stage"] = "announced"  # Default, can be updated
        normalized["confidence_score"] = self._calculate_confidence(normalized)
        
        # Step 4: Validate with Pydantic
        try:
            deal_data = DealData(**normalized)
            return deal_data
        except Exception as e:
            print(f"Validation error: {e}")
            return None
    
    def _normalize_extracted(self, extracted: Dict[str, Any]) -> Dict[str, Any]:
        """Normalize and clean extracted data"""
        normalized = {}
        
        # Provider and buyer
        normalized["provider"] = self._clean_string(extracted.get("provider"))
        normalized["buyer"] = self._clean_string(extracted.get("buyer"))
        
        # Modality - normalize to standard values
        modality = self._normalize_modality(extracted.get("modality"))
        normalized["modality"] = modality
        
        # Data type
        normalized["data_type"] = self._clean_string(extracted.get("data_type"))
        
        # Pricing
        normalized["price_usd"] = self._parse_price(extracted.get("price_usd"))
        normalized["price_range_min_usd"] = self._parse_price(extracted.get("price_range_min_usd"))
        normalized["price_range_max_usd"] = self._parse_price(extracted.get("price_range_max_usd"))
        normalized["reported_terms"] = self._clean_string(extracted.get("reported_terms"))
        
        # Pricing mechanism and deal type
        normalized["pricing_mechanism"] = self._clean_string(extracted.get("pricing_mechanism"))
        normalized["deal_type"] = self._normalize_deal_type(extracted.get("deal_type"))
        
        # Dates
        normalized["date"] = self._parse_date(extracted.get("start_date"))
        normalized["start_date"] = self._parse_datetime(extracted.get("start_date"))
        normalized["end_date"] = self._parse_datetime(extracted.get("end_date"))
        normalized["duration_years"] = self._parse_duration(extracted.get("duration_years"))
        
        # Boolean fields
        normalized["exclusive"] = self._parse_boolean(extracted.get("exclusivity"))
        normalized["creators_compensated"] = self._parse_boolean(extracted.get("creators_compensated"))
        normalized["revenue_share"] = self._parse_boolean(extracted.get("revenue_share"))
        
        # Compensation
        normalized["creator_split_percentage"] = self._parse_float(extracted.get("creator_split_percentage"))
        
        # Rights
        rights = extracted.get("rights_granted", "")
        normalized["training_allowed"] = self._parse_rights(rights, ["training", "train"])
        normalized["finetuning_allowed"] = self._parse_rights(rights, ["fine-tuning", "finetuning", "fine-tune"])
        normalized["inference_allowed"] = self._parse_rights(rights, ["inference", "infer"])
        normalized["redistribution_allowed"] = self._parse_rights(rights, ["redistribution", "redistribute"])
        
        # Source
        normalized["source_primary"] = self._clean_string(extracted.get("source"))
        
        return normalized
    
    def _clean_string(self, value: Any) -> Optional[str]:
        """Clean and normalize string values"""
        if not value:
            return None
        if isinstance(value, str):
            return value.strip() or None
        return str(value).strip() or None
    
    def _normalize_modality(self, modality: Any) -> str:
        """Normalize modality to standard values"""
        if not modality:
            return "Text"  # Default
        
        modality_lower = str(modality).lower()
        
        modality_map = {
            "text": "Text",
            "image": "Image",
            "audio": "Audio",
            "video": "Video",
            "satellite": "Satellite",
            "biotech": "Health / Biotech",
            "health": "Health / Biotech",
            "corporate": "Corporate / data infra",
            "infra": "Corporate / data infra",
            "legal": "Legal / Books",
            "books": "Legal / Books",
            "commissioning": "Commissioning",
        }
        
        for key, value in modality_map.items():
            if key in modality_lower:
                return value
        
        return "Text"  # Default
    
    def _normalize_deal_type(self, deal_type: Any) -> Optional[str]:
        """Normalize deal type"""
        if not deal_type:
            return None
        
        deal_type_lower = str(deal_type).lower()
        
        type_map = {
            "aggregate": "aggregate",
            "per-unit": "per-unit",
            "per unit": "per-unit",
            "commissioning": "commissioning",
            "settlement": "settlement",
            "acquisition": "acquisition",
            "commons": "commons",
            "open": "commons",
        }
        
        for key, value in type_map.items():
            if key in deal_type_lower:
                return value
        
        return None
    
    def _parse_price(self, value: Any) -> Optional[float]:
        """Parse price from various formats"""
        if value is None:
            return None
        
        if isinstance(value, (int, float)):
            return float(value)
        
        if isinstance(value, str):
            # Remove currency symbols and commas
            cleaned = re.sub(r'[$,€£¥]', '', value.replace(',', ''))
            # Extract number
            match = re.search(r'(\d+\.?\d*)', cleaned)
            if match:
                return float(match.group(1))
        
        return None
    
    def _parse_date(self, value: Any) -> Optional[str]:
        """Parse date string to YYYY-MM-DD format"""
        if not value:
            return None
        
        # Try common date formats
        formats = [
            "%Y-%m-%d",
            "%Y/%m/%d",
            "%m/%d/%Y",
            "%d/%m/%Y",
            "%B %d, %Y",
            "%b %d, %Y",
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(str(value), fmt)
                return dt.strftime("%Y-%m-%d")
            except ValueError:
                continue
        
        # Try to extract year if full date fails
        year_match = re.search(r'20\d{2}', str(value))
        if year_match:
            return f"{year_match.group()}-01-01"
        
        return None
    
    def _parse_datetime(self, value: Any) -> Optional[datetime]:
        """Parse datetime"""
        date_str = self._parse_date(value)
        if date_str:
            try:
                return datetime.strptime(date_str, "%Y-%m-%d")
            except ValueError:
                pass
        return None
    
    def _parse_duration(self, value: Any) -> Optional[float]:
        """Parse duration in years"""
        if value is None:
            return None
        
        if isinstance(value, (int, float)):
            return float(value)
        
        if isinstance(value, str):
            # Extract number
            match = re.search(r'(\d+\.?\d*)', str(value))
            if match:
                return float(match.group(1))
        
        return None
    
    def _parse_boolean(self, value: Any) -> Optional[bool]:
        """Parse boolean from various formats"""
        if value is None:
            return None
        
        if isinstance(value, bool):
            return value
        
        if isinstance(value, str):
            lower = value.lower()
            if lower in ["true", "yes", "1"]:
                return True
            if lower in ["false", "no", "0"]:
                return False
        
        return None
    
    def _parse_float(self, value: Any) -> Optional[float]:
        """Parse float"""
        if value is None:
            return None
        
        try:
            return float(value)
        except (ValueError, TypeError):
            return None
    
    def _parse_rights(self, rights_text: Any, keywords: list) -> Optional[bool]:
        """Parse rights from text"""
        if not rights_text:
            return None
        
        text_lower = str(rights_text).lower()
        for keyword in keywords:
            if keyword in text_lower:
                return True
        return None
    
    def _calculate_confidence(self, data: Dict[str, Any]) -> float:
        """Calculate confidence score (0-1)"""
        score = 0.0
        
        # Required fields
        if data.get("provider"):
            score += 0.2
        if data.get("buyer"):
            score += 0.2
        if data.get("modality"):
            score += 0.1
        
        # Price information
        if data.get("price_usd") or data.get("price_range_min_usd"):
            score += 0.2
        
        # Dates
        if data.get("date") or data.get("start_date"):
            score += 0.1
        
        # Terms
        if data.get("reported_terms"):
            score += 0.1
        
        # Rights/compensation info
        if data.get("exclusive") is not None or data.get("creators_compensated") is not None:
            score += 0.1
        
        return min(score, 1.0)

