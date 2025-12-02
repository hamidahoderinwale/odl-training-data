"""
Comprehensive Model Enrichment Pipeline
Orchestrates all enrichment sources and merges data
"""

import sys
import asyncio
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import json

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

from registry.collectors.epoch_collector import EpochCollector
from registry.collectors.hf_collector import HuggingFaceCollector
from registry.enrichment.web_enrichment import WebModelEnricher
from registry.evidence_profile import EvidenceProfileManager
from registry.inference.reconciliation import TokenInferenceReconciler


class ComprehensiveModelEnricher:
    """Orchestrates all enrichment sources for comprehensive model metadata"""
    
    def __init__(
        self,
        use_web_search: bool = True,
        use_llm_extraction: bool = True,
        exa_api_key: Optional[str] = None,
        llm_provider: str = "openai",
        llm_api_key: Optional[str] = None
    ):
        """
        Initialize comprehensive enricher
        
        Args:
            use_web_search: Enable web search enrichment
            use_llm_extraction: Enable LLM extraction
            exa_api_key: Exa API key
            llm_provider: LLM provider ("openai" or "anthropic")
            llm_api_key: LLM API key
        """
        self.epoch_collector = EpochCollector()
        self.hf_collector = HuggingFaceCollector()
        self.inference_reconciler = TokenInferenceReconciler()
        self.evidence_manager = EvidenceProfileManager()
        
        if use_web_search:
            try:
                self.web_enricher = WebModelEnricher(
                    exa_api_key=exa_api_key,
                    llm_provider=llm_provider,
                    llm_api_key=llm_api_key
                )
            except Exception as e:
                print(f"Warning: Web enricher initialization failed: {e}")
                self.web_enricher = None
        else:
            self.web_enricher = None
    
    async def enrich_model(
        self,
        model_id: str,
        provider: str,
        family: Optional[str] = None,
        existing_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Enrich model with data from all sources
        
        Args:
            model_id: Model identifier
            provider: Model provider
            family: Model family
            existing_data: Existing model data
        
        Returns:
            Comprehensive enriched metadata
        """
        # Start with existing data or empty dict
        enriched = existing_data.copy() if existing_data else {}
        enriched["modelId"] = model_id
        enriched["provider"] = provider
        enriched["family"] = family or provider
        
        # Source 1: Epoch AI
        epoch_data = None
        try:
            # Epoch collector may be async or sync, handle both
            if hasattr(self.epoch_collector, 'fetch_notable_models'):
                epoch_models = self.epoch_collector.fetch_notable_models()
                if asyncio.iscoroutine(epoch_models):
                    epoch_models = await epoch_models
                for model in epoch_models:
                    if self._matches_model(model.get("model_name", ""), model_id, provider):
                        epoch_data = model
                        break
        except Exception as e:
            print(f"Epoch collection error: {e}")
        
        # Source 2: HuggingFace
        hf_data = None
        try:
            # HF collector may be async or sync, handle both
            if hasattr(self.hf_collector, 'search_models'):
                hf_result = self.hf_collector.search_models(model_id)
                if asyncio.iscoroutine(hf_result):
                    hf_result = await hf_result
                if hf_result:
                    hf_data = hf_result[0] if isinstance(hf_result, list) else hf_result
        except Exception as e:
            print(f"HF collection error: {e}")
        
        # Source 3: Web search (if enabled)
        web_data = None
        if self.web_enricher:
            try:
                web_data = self.web_enricher.enrich_model(
                    model_id=model_id,
                    provider=provider,
                    existing_data=enriched
                )
            except Exception as e:
                print(f"Web enrichment error: {e}")
        
        # Merge all sources with priority
        merged = self._merge_sources(
            enriched,
            epoch_data,
            hf_data,
            web_data
        )
        
        # Run token inference if we have params
        if merged.get("params"):
            try:
                inference_input = {
                    "params": merged.get("params"),
                    "flops": merged.get("flopsReported"),
                    "architecture": {
                        "is_moe": merged.get("isMoe", False),
                        "num_experts": merged.get("numExperts"),
                    },
                    "provider": provider,
                    "model_id": model_id,
                    "openDataTokensReported": merged.get("openDataTokensReported"),
                    "sources": merged.get("sources"),
                }
                inference_result = self.inference_reconciler.reconcile(inference_input)
                
                # Add token estimates
                merged["tokensEstMin"] = inference_result.get("min")
                merged["tokensEstMax"] = inference_result.get("max")
                merged["tokensEstMid"] = inference_result.get("mid")
                merged["tokensRangeGeneratedAt"] = datetime.now()
                
                # Add estimation metadata
                if inference_result.get("estimation_methods"):
                    merged["estimationMethod"] = json.dumps(inference_result.get("estimation_methods"))
                if inference_result.get("estimation_confidence") is not None:
                    merged["estimationConfidence"] = inference_result.get("estimation_confidence")
                merged["estimationDate"] = datetime.now()
                merged["estimationVersion"] = "2.0"
            except Exception as e:
                print(f"Token inference error: {e}")
        
        # Generate evidence profile
        evidence_profile = self._generate_evidence_profile(
            epoch_data,
            hf_data,
            web_data,
            merged
        )
        
        # Add evidence profile fields
        merged["evidenceTypes"] = json.dumps(evidence_profile.get("evidence_types", []))
        merged["evidenceStrength"] = evidence_profile.get("strength")
        merged["uncertaintySources"] = json.dumps(evidence_profile.get("uncertainty", []))
        merged["evidenceProfileGeneratedAt"] = datetime.now()
        
        # Combine sources
        sources = []
        if epoch_data and epoch_data.get("source_url"):
            sources.append({
                "type": "epoch",
                "url": epoch_data.get("source_url"),
                "retrieved_at": datetime.now().isoformat(),
            })
        if hf_data and hf_data.get("url"):
            sources.append({
                "type": "huggingface",
                "url": hf_data.get("url"),
                "retrieved_at": datetime.now().isoformat(),
            })
        if web_data:
            sources.extend(web_data.get("sources", []))
        
        if sources:
            merged["sources"] = json.dumps(sources)
        
        # Add raw evidence snippets
        raw_snippets = []
        if web_data:
            raw_snippets.extend(web_data.get("raw_evidence_snippets", []))
        
        if raw_snippets:
            merged["rawEvidenceSnippets"] = json.dumps(raw_snippets)
        
        # Add composition estimates if training data info found
        if web_data and web_data.get("training_data_composition"):
            composition = {
                "description": web_data.get("training_data_composition"),
                "sources": web_data.get("training_data_sources", []),
            }
            merged["compositionEstimates"] = json.dumps(composition)
        
        return merged
    
    def _matches_model(self, name: str, model_id: str, provider: str) -> bool:
        """Check if model name matches"""
        name_lower = name.lower()
        model_lower = model_id.lower()
        provider_lower = provider.lower()
        
        # Exact match
        if model_lower in name_lower or name_lower in model_lower:
            return True
        
        # Provider match + partial model match
        if provider_lower in name_lower:
            # Check for common model patterns
            if any(pattern in model_lower for pattern in ["gpt", "claude", "gemini", "llama", "mistral"]):
                if any(pattern in name_lower for pattern in ["gpt", "claude", "gemini", "llama", "mistral"]):
                    return True
        
        return False
    
    def _merge_sources(
        self,
        base: Dict[str, Any],
        epoch_data: Optional[Dict[str, Any]],
        hf_data: Optional[Dict[str, Any]],
        web_data: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Merge data from all sources with priority"""
        merged = base.copy()
        
        # Priority: Direct disclosures > Third-party analysis > Inferred
        
        # From Epoch (high priority - curated dataset)
        if epoch_data:
            if not merged.get("params") and epoch_data.get("parameter_count"):
                merged["params"] = epoch_data.get("parameter_count") / 1e9
            if not merged.get("releaseDate") and epoch_data.get("release_date"):
                merged["releaseDate"] = self._parse_date(epoch_data.get("release_date"))
            if not merged.get("architectureType") and epoch_data.get("architecture_type"):
                merged["architectureType"] = epoch_data.get("architecture_type")
            if epoch_data.get("architecture_type", "").lower() == "moe":
                merged["isMoe"] = True
            if not merged.get("multimodal"):
                modality = epoch_data.get("modality", "").lower()
                merged["multimodal"] = modality in ["multimodal", "vision", "image"]
            if not merged.get("flopsReported") and epoch_data.get("compute_PF_days"):
                merged["flopsReported"] = epoch_data.get("compute_PF_days")
        
        # From HuggingFace (medium priority)
        if hf_data:
            if not merged.get("params") and hf_data.get("params"):
                merged["params"] = hf_data.get("params") / 1e9
            if not merged.get("releaseDate") and hf_data.get("created_at"):
                merged["releaseDate"] = self._parse_date(hf_data.get("created_at"))
        
        # From Web search (lower priority but comprehensive)
        if web_data:
            if not merged.get("releaseDate") and web_data.get("release_date"):
                merged["releaseDate"] = self._parse_date(web_data.get("release_date"))
            if not merged.get("architectureType") and web_data.get("architecture_type"):
                merged["architectureType"] = web_data.get("architecture_type")
            if web_data.get("is_moe") is not None:
                merged["isMoe"] = web_data.get("is_moe")
            if web_data.get("num_experts"):
                merged["numExperts"] = web_data.get("num_experts")
            if web_data.get("active_experts"):
                merged["activeExperts"] = web_data.get("active_experts")
            if web_data.get("multimodal") is not None:
                merged["multimodal"] = web_data.get("multimodal")
            # Parameters from web search (only if not already set)
            if not merged.get("params") and web_data.get("params"):
                merged["params"] = web_data.get("params")
            if web_data.get("params_active"):
                merged["paramsActive"] = web_data.get("params_active")
            # FLOPs from web search
            if not merged.get("flopsReported") and web_data.get("flops_reported"):
                merged["flopsReported"] = web_data.get("flops_reported")
            if not merged.get("flopsEstimated") and web_data.get("flops_estimated"):
                merged["flopsEstimated"] = web_data.get("flops_estimated")
            # Training period
            if web_data.get("training_period_start"):
                merged["trainingPeriodStart"] = self._parse_date(web_data.get("training_period_start"))
            if web_data.get("training_period_end"):
                merged["trainingPeriodEnd"] = self._parse_date(web_data.get("training_period_end"))
        
        return merged
    
    def _generate_evidence_profile(
        self,
        epoch_data: Optional[Dict[str, Any]],
        hf_data: Optional[Dict[str, Any]],
        web_data: Optional[Dict[str, Any]],
        merged: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Generate evidence profile from all sources"""
        evidence_types = set()
        sources_count = 0
        
        # Epoch data - usually E4 (third-party analysis)
        if epoch_data:
            sources_count += 1
            evidence_types.add("E4")
            if epoch_data.get("parameter_count"):
                evidence_types.add("E3")  # Architecture evidence
        
        # HuggingFace - E4 (third-party)
        if hf_data:
            sources_count += 1
            evidence_types.add("E4")
        
        # Web data - can be E1-E5 depending on source
        if web_data:
            sources_count += len(web_data.get("sources", []))
            web_evidence = web_data.get("evidence_types", [])
            evidence_types.update(web_evidence)
        
        # Direct disclosure if we have official sources
        if web_data:
            for source in web_data.get("sources", []):
                url = source.get("url", "").lower()
                if any(domain in url for domain in ["openai.com", "anthropic.com", "google.com", "meta.com"]):
                    evidence_types.add("E1")  # Direct disclosure
        
        # Compute evidence
        if merged.get("flopsReported"):
            evidence_types.add("E2")
        
        # Architecture evidence
        if merged.get("params") or merged.get("architectureType"):
            evidence_types.add("E3")
        
        # Calculate strength
        if sources_count >= 3 and "E1" in evidence_types:
            strength = "S-High"
        elif sources_count >= 2 or "E1" in evidence_types:
            strength = "S-Medium"
        else:
            strength = "S-Low"
        
        # Identify uncertainties
        uncertainty = []
        if not merged.get("releaseDate"):
            uncertainty.append("U5")
        if not merged.get("architectureType"):
            uncertainty.append("U3")
        if not merged.get("trainingPeriodStart"):
            uncertainty.append("U2")
        
        return {
            "evidence_types": list(evidence_types),
            "strength": strength,
            "uncertainty": uncertainty,
        }
    
    def _parse_date(self, date_value: Any) -> Optional[datetime]:
        """Parse date from various formats"""
        if not date_value:
            return None
        
        if isinstance(date_value, datetime):
            return date_value
        
        if isinstance(date_value, str):
            try:
                return datetime.fromisoformat(date_value.replace("Z", "+00:00"))
            except (ValueError, AttributeError):
                if len(date_value) == 4 and date_value.isdigit():
                    return datetime(int(date_value), 1, 1)
        
        if isinstance(date_value, int):
            return datetime(date_value, 1, 1)
        
        return None

