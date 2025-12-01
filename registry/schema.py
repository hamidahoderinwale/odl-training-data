"""
Schema definitions for Training Data Scale Registry
"""

from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime


class EvidenceType(str, Enum):
    """Evidence types for token estimation"""
    E1 = "E1"  # Direct disclosure
    E2 = "E2"  # Quantitative compute
    E3 = "E3"  # Architectural
    E4 = "E4"  # Third-party analysis
    E5 = "E5"  # Qualitative hints


class EvidenceStrength(str, Enum):
    """Evidence strength levels"""
    HIGH = "S-High"
    MEDIUM = "S-Medium"
    LOW = "S-Low"


class UncertaintySource(str, Enum):
    """Uncertainty sources"""
    U1 = "U1"  # Compute unknown
    U2 = "U2"  # Data composition unknown
    U3 = "U3"  # Architecture unclear
    U4 = "U4"  # Synthetic/RLHF unknown
    U5 = "U5"  # Intentional opacity


@dataclass
class RawEvidenceSnippet:
    """Raw evidence snippet from source documents"""
    snippet: str
    source: str
    type: str  # token_hint, flops_hint, architectural_hint, etc.
    confidence: float = 0.5  # 0-1
    extracted_at: str = field(default_factory=lambda: datetime.now().isoformat())


@dataclass
class Architecture:
    """Model architecture details"""
    type: Optional[str] = None  # transformer, etc.
    is_moe: bool = False
    num_experts: Optional[int] = None
    active_experts: Optional[int] = None
    long_context: Optional[int] = None
    multimodal: bool = False


@dataclass
class TrainingCompute:
    """Training compute information"""
    flops_reported: Optional[float] = None
    flops_estimated: Optional[float] = None
    compute_sources: List[str] = field(default_factory=list)


@dataclass
class TrainingTokensEst:
    """Token estimate with temporal metadata"""
    min: Optional[float] = None
    max: Optional[float] = None
    mid: Optional[float] = None
    range_generated_at: Optional[str] = None


@dataclass
class EvidenceProfile:
    """Evidence profile with temporal metadata"""
    evidence_types: List[str] = field(default_factory=list)
    strength: Optional[str] = None
    uncertainty_sources: List[str] = field(default_factory=list)
    profile_generated_at: Optional[str] = None
    evidence_set_id: Optional[str] = None
    evidence_version: str = "1.0"
    generated_at: Optional[str] = None  # Alias for profile_generated_at
    applied_models: List[str] = field(default_factory=list)


@dataclass
class CompositionEstimates:
    """Data composition estimates"""
    news_weight: Optional[str] = None
    web_weight: Optional[str] = None
    code_weight: Optional[str] = None
    multimodal_weight: Optional[str] = None


@dataclass
class ModelRecord:
    """Complete model record for the registry with full temporal metadata"""
    # Core identifiers (required fields first)
    model_id: str
    provider: str
    # Optional fields
    family: Optional[str] = None
    year: Optional[int] = None
    domain: Optional[str] = None
    
    # Temporal metadata
    release_date: Optional[str] = None
    last_updated: Optional[str] = None
    training_period_start: Optional[str] = None
    training_period_end: Optional[str] = None
    inference_generated_at: Optional[str] = None
    evidence_profile_generated_at: Optional[str] = None
    
    # Parameters
    params: Optional[float] = None  # in billions
    params_active: Optional[float] = None  # for MoE models
    
    # Architecture (structured)
    architecture: Optional[Architecture] = None
    
    # Training compute (structured)
    training_compute: Optional[TrainingCompute] = None
    
    # Compute (legacy fields for compatibility)
    flops: Optional[float] = None  # in FLOPs
    num_chips: Optional[int] = None
    chip_type: Optional[str] = None  # H100, TPUv5, etc.
    training_duration_days: Optional[float] = None
    
    # Token estimates (structured)
    training_tokens_est: Optional[TrainingTokensEst] = None
    
    # Token estimates (legacy for compatibility)
    tokens_est_min: Optional[float] = None
    tokens_est_max: Optional[float] = None
    tokens_est_mid: Optional[float] = None
    
    # Open data tokens
    open_data_tokens_reported: Optional[float] = None
    
    # Evidence profile (structured)
    evidence_profile: Optional[EvidenceProfile] = None
    
    # Evidence profile (legacy)
    evidence_types: List[str] = field(default_factory=list)  # E1-E5
    evidence_strength: Optional[str] = None  # S-High/Medium/Low
    uncertainty_sources: List[str] = field(default_factory=list)  # U1-U5
    
    # Data composition
    composition_estimates: Optional[CompositionEstimates] = None
    
    # Raw evidence
    raw_evidence_snippets: List[Dict[str, Any]] = field(default_factory=list)
    
    # Data composition hints
    data_composition_hints: List[str] = field(default_factory=list)
    synthetic_fraction_est: Optional[float] = None  # 0-1
    
    # Sources (structured)
    sources: List[Dict[str, Any]] = field(default_factory=list)  # [{type, url, retrieved_at}]
    epoch_large_scale: bool = False
    epoch_notable: bool = False
    
    # Linked deals
    linked_deals: List[Dict[str, Any]] = field(default_factory=list)  # [{deal_id, link_strength, impact_inference}]
    
    # Metadata
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = field(default_factory=lambda: datetime.now().isoformat())
    version: str = "1.0"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for Hugging Face Datasets"""
        # Convert structured objects to dicts
        arch_dict = None
        if self.architecture:
            arch_dict = {
                "type": self.architecture.type,
                "is_moe": self.architecture.is_moe,
                "num_experts": self.architecture.num_experts,
                "active_experts": self.architecture.active_experts,
                "long_context": self.architecture.long_context,
                "multimodal": self.architecture.multimodal,
            }
        
        compute_dict = None
        if self.training_compute:
            compute_dict = {
                "flops_reported": self.training_compute.flops_reported,
                "flops_estimated": self.training_compute.flops_estimated,
                "compute_sources": self.training_compute.compute_sources,
            }
        
        tokens_dict = None
        if self.training_tokens_est:
            tokens_dict = {
                "min": self.training_tokens_est.min,
                "max": self.training_tokens_est.max,
                "mid": self.training_tokens_est.mid,
                "range_generated_at": self.training_tokens_est.range_generated_at,
            }
        
        evidence_dict = None
        if self.evidence_profile:
            evidence_dict = {
                "evidence_types": self.evidence_profile.evidence_types,
                "strength": self.evidence_profile.strength,
                "uncertainty_sources": self.evidence_profile.uncertainty_sources,
                "profile_generated_at": self.evidence_profile.profile_generated_at,
                "generated_at": self.evidence_profile.profile_generated_at,
                "evidence_set_id": self.evidence_profile.evidence_set_id,
                "evidence_version": self.evidence_profile.evidence_version,
                "applied_models": self.evidence_profile.applied_models,
            }
        
        composition_dict = None
        if self.composition_estimates:
            composition_dict = {
                "news_weight": self.composition_estimates.news_weight,
                "web_weight": self.composition_estimates.web_weight,
                "code_weight": self.composition_estimates.code_weight,
                "multimodal_weight": self.composition_estimates.multimodal_weight,
            }
        
        return {
            "model_id": self.model_id,
            "family": self.family,
            "provider": self.provider,
            "year": self.year,
            "domain": self.domain,
            "release_date": self.release_date,
            "last_updated": self.last_updated,
            "params": self.params,
            "params_active": self.params_active,
            "architecture": arch_dict,
            "training_compute": compute_dict,
            "flops": self.flops,
            "num_chips": self.num_chips,
            "chip_type": self.chip_type,
            "training_duration_days": self.training_duration_days,
            "training_tokens_est": tokens_dict,
            "tokens_est_min": self.tokens_est_min,
            "tokens_est_max": self.tokens_est_max,
            "tokens_est_mid": self.tokens_est_mid,
            "open_data_tokens_reported": self.open_data_tokens_reported,
            "evidence_profile": evidence_dict,
            "evidence_types": self.evidence_types,
            "evidence_strength": self.evidence_strength,
            "uncertainty_sources": self.uncertainty_sources,
            "composition_estimates": composition_dict,
            "raw_evidence_snippets": self.raw_evidence_snippets,
            "data_composition_hints": self.data_composition_hints,
            "synthetic_fraction_est": self.synthetic_fraction_est,
            "sources": self.sources,
            "linked_deals": self.linked_deals,
            "epoch_large_scale": self.epoch_large_scale,
            "epoch_notable": self.epoch_notable,
            "training_period_start": self.training_period_start,
            "training_period_end": self.training_period_end,
            "inference_generated_at": self.inference_generated_at,
            "evidence_profile_generated_at": self.evidence_profile_generated_at,
            "created_at": self.created_at,
            "updated_at": self.updated_at,
            "version": self.version,
        }


@dataclass
class InferenceConstraint:
    """A single constraint from inference method"""
    method: str  # chinchilla, hardware, param_ratio, textual, third_party
    tokens_min: float
    tokens_max: float
    evidence_type: str  # E1-E5
    confidence: float = 0.5
    notes: Optional[str] = None

