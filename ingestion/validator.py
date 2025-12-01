"""
Deal Validator - Pydantic models for validation
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class Modality(str, Enum):
    TEXT = "Text"
    IMAGE = "Image"
    AUDIO = "Audio"
    VIDEO = "Video"
    SATELLITE = "Satellite"
    HEALTH_BIOTECH = "Health / Biotech"
    CORPORATE_INFRA = "Corporate / data infra"
    LEGAL_BOOKS = "Legal / Books"
    COMMISSIONING = "Commissioning"
    MIXED = "Mixed"


class DealType(str, Enum):
    AGGREGATE = "aggregate"
    PER_UNIT = "per-unit"
    COMMISSIONING = "commissioning"
    SETTLEMENT = "settlement"
    ACQUISITION = "acquisition"
    COMMONS = "commons"
    IMPLICIT = "implicit"
    HYBRID = "hybrid"


class DealStage(str, Enum):
    ANNOUNCED = "announced"
    RUMORED = "rumored"
    CONFIRMED = "confirmed"
    SETTLED = "settled"


class DealData(BaseModel):
    """Validated deal data structure"""
    
    # Core fields (required)
    provider: str = Field(..., min_length=1)
    buyer: str = Field(..., min_length=1)
    modality: str = Field(default="Text")
    data_type: Optional[str] = None
    
    # Pricing
    price_usd: Optional[float] = Field(None, ge=0)
    price_range_min_usd: Optional[float] = Field(None, ge=0)
    price_range_max_usd: Optional[float] = Field(None, ge=0)
    price_currency: str = Field(default="USD")
    reported_terms: Optional[str] = None
    pricing_mechanism: Optional[str] = None
    deal_type: Optional[str] = None
    
    # Dates
    date: Optional[str] = None  # YYYY-MM-DD or YYYY or YYYY-MM
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    duration_years: Optional[float] = Field(None, ge=0)
    
    # Rights
    exclusive: Optional[bool] = None
    creators_compensated: Optional[bool] = None
    creator_split_percentage: Optional[float] = Field(None, ge=0, le=100)
    revenue_share: Optional[bool] = None
    
    # Rights granted
    training_allowed: Optional[bool] = None
    finetuning_allowed: Optional[bool] = None
    inference_allowed: Optional[bool] = None
    redistribution_allowed: Optional[bool] = None
    deletion_required: Optional[bool] = None
    
    # Provenance
    sources: List[str] = Field(default_factory=list)
    source_primary: Optional[str] = None
    discovered_via: Optional[str] = None
    exa_query: Optional[str] = None
    exa_score: Optional[float] = None
    exa_retrieved_at: Optional[str] = None
    
    # Extraction metadata
    extraction_metadata: Optional[Dict[str, Any]] = None
    raw_text_snippets: List[str] = Field(default_factory=list)
    regex_confidence: Optional[str] = None
    llm_confidence: Optional[str] = None
    last_extracted: Optional[str] = None
    
    # Linkages
    linkages_metadata: Optional[Dict[str, Any]] = None
    
    notes: Optional[str] = None
    deal_stage: str = Field(default="announced")
    confidence_score: float = Field(default=0.5, ge=0, le=1)
    version: Optional[str] = None
    
    @validator("modality")
    def validate_modality(cls, v):
        """Normalize modality"""
        if v in [m.value for m in Modality]:
            return v
        return "Text"  # Default
    
    @validator("deal_type")
    def validate_deal_type(cls, v):
        """Normalize deal type"""
        if not v:
            return None
        if v in [d.value for d in DealType]:
            return v
        return None
    
    @validator("deal_stage")
    def validate_deal_stage(cls, v):
        """Normalize deal stage"""
        if v in [s.value for s in DealStage]:
            return v
        return "announced"
    
    @validator("price_range_max_usd")
    def validate_price_range(cls, v, values):
        """Ensure max >= min"""
        if v and values.get("price_range_min_usd"):
            if v < values["price_range_min_usd"]:
                raise ValueError("price_range_max_usd must be >= price_range_min_usd")
        return v
    
    @validator("end_date")
    def validate_end_date(cls, v, values):
        """Ensure end_date >= start_date"""
        if v and values.get("start_date"):
            if v < values["start_date"]:
                raise ValueError("end_date must be >= start_date")
        return v
    
    class Config:
        use_enum_values = True


class DealValidator:
    """Validator for deal data"""
    
    @staticmethod
    def validate(deal_dict: dict) -> tuple[bool, Optional[DealData], Optional[str]]:
        """
        Validate deal data
        
        Returns:
            (is_valid, DealData object, error_message)
        """
        try:
            deal_data = DealData(**deal_dict)
            return True, deal_data, None
        except Exception as e:
            return False, None, str(e)
    
    @staticmethod
    def is_valid_deal(deal_dict: dict) -> bool:
        """Check if deal is valid"""
        is_valid, _, _ = DealValidator.validate(deal_dict)
        return is_valid

