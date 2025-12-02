"""
Token Inference Reconciliation Engine
Combines multiple inference methods into final token estimate
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
import json


class TokenInferenceReconciler:
    """Reconciles multiple token inference methods into final estimate"""
    
    def __init__(self):
        pass
    
    def _check_official_disclosure(self, model_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Method A: Check for official disclosure (highest confidence: 0.95)
        
        Returns estimate if official disclosure found, None otherwise
        """
        # Check for reported open data tokens
        if model_data.get("openDataTokensReported"):
            tokens = model_data["openDataTokensReported"]
            # Official disclosure has narrow range (±10%)
            return {
                "method": "official_disclosure",
                "min": tokens * 0.9,
                "max": tokens * 1.1,
                "mid": tokens,
                "confidence": 0.95,
            }
        
        # Check sources for official disclosures
        sources = model_data.get("sources")
        if sources:
            try:
                if isinstance(sources, str):
                    sources = json.loads(sources)
                # Look for official provider domains
                official_domains = ["openai.com", "anthropic.com", "google.com", "meta.com", 
                                  "deepmind.com", "mistral.ai", "cohere.com"]
                for source in sources if isinstance(sources, list) else []:
                    url = source.get("url", "").lower()
                    if any(domain in url for domain in official_domains):
                        # If we have tokens from official source, use it
                        if model_data.get("openDataTokensReported"):
                            tokens = model_data["openDataTokensReported"]
                            return {
                                "method": "official_disclosure",
                                "min": tokens * 0.9,
                                "max": tokens * 1.1,
                                "mid": tokens,
                                "confidence": 0.95,
                            }
            except (json.JSONDecodeError, TypeError):
                pass
        
        return None
    
    def reconcile(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reconcile token estimates from multiple methods
        
        Args:
            model_data: Dictionary with model metadata (params, flops, architecture, etc.)
        
        Returns:
            Dictionary with min, max, mid estimates, methods used, and confidence score
        """
        estimates = []
        evidence_types = []
        methods_used = []
        
        # Method A: Official disclosure (highest priority, confidence 0.95)
        official_est = self._check_official_disclosure(model_data)
        if official_est:
            estimates.append(official_est)
            methods_used.append("official_disclosure")
            evidence_types.append("E1")  # Direct disclosure
            # If we have official disclosure, use it as primary and return early
            # (but still check other methods for validation)
        
        # Method 1: Parameter ratio rule (5-30x params)
        if model_data.get("params"):
            params = model_data["params"]  # in billions
            params_abs = params * 1e9
            
            # Adjust ratio based on architecture
            if model_data.get("architecture", {}).get("is_moe"):
                ratio_min, ratio_max = 3, 15  # MoE models use fewer tokens per param
            else:
                ratio_min, ratio_max = 5, 30
            
            tokens_min = params_abs * ratio_min
            tokens_max = params_abs * ratio_max
            tokens_mid = (tokens_min + tokens_max) / 2
            
            estimates.append({
                "method": "param_ratio",
                "min": tokens_min,
                "max": tokens_max,
                "mid": tokens_mid,
                "confidence": 0.6,
            })
            methods_used.append("param_ratio")
            evidence_types.append("E3")  # Architectural
        
        # Method 2: Compute-based (Chinchilla-like)
        if model_data.get("flops"):
            flops = model_data["flops"]  # in FLOPs
            params = model_data.get("params", 0) * 1e9 if model_data.get("params") else None
            
            if params:
                # Rough estimate: tokens ≈ FLOPs / (6 * params) for dense models
                k = 6 if not model_data.get("architecture", {}).get("is_moe") else 8
                tokens_est = flops / (k * params)
                
                # Wide confidence band (±50%)
                tokens_min = tokens_est * 0.5
                tokens_max = tokens_est * 1.5
                tokens_mid = tokens_est
                
                estimates.append({
                    "method": "compute",
                    "min": tokens_min,
                    "max": tokens_max,
                    "mid": tokens_mid,
                    "confidence": 0.7,  # Chinchilla is more reliable
                })
                methods_used.append("chinchilla")
                evidence_types.append("E2")  # Quantitative compute
        
        # Method 3: Textual clues (if provided)
        if model_data.get("textual_hints"):
            # This would be extracted from system cards, papers, etc.
            # For now, placeholder
            evidence_types.append("E5")  # Qualitative hints
        
        # Reconcile estimates
        if not estimates:
            return {
                "min": None,
                "max": None,
                "mid": None,
                "evidence_types": ["E5"],
                "strength": "S-Low",
                "uncertainty_sources": ["U1", "U3"],
                "estimation_methods": [],
                "estimation_confidence": 0.0,
            }
        
        # If we have official disclosure, prioritize it
        if official_est:
            tokens_min = official_est["min"]
            tokens_max = official_est["max"]
            tokens_mid = official_est["mid"]
            strength = "S-High"
            confidence = 0.95
        else:
            # Weighted ensemble based on confidence
            # Higher confidence methods get more weight
            weighted_min = 0
            weighted_max = 0
            weighted_mid = 0
            total_weight = 0
            
            for est in estimates:
                weight = est["confidence"]
                weighted_min += est["min"] * weight
                weighted_max += est["max"] * weight
                weighted_mid += est["mid"] * weight
                total_weight += weight
            
            if total_weight > 0:
                tokens_min = weighted_min / total_weight
                tokens_max = weighted_max / total_weight
                tokens_mid = weighted_mid / total_weight
            else:
                # Fallback to simple intersection/union
                min_vals = [e["min"] for e in estimates]
                max_vals = [e["max"] for e in estimates]
                
                overall_min = max(min_vals)
                overall_max = min(max_vals)
                
                if overall_min <= overall_max:
                    tokens_min = overall_min
                    tokens_max = overall_max
                else:
                    tokens_min = min(min_vals)
                    tokens_max = max(max_vals)
                
                tokens_mid = (tokens_min + tokens_max) / 2
            
            # Calculate overall confidence
            # Based on: number of methods, method quality, data completeness
            num_methods = len(estimates)
            avg_method_confidence = sum(e["confidence"] for e in estimates) / num_methods if num_methods > 0 else 0
            
            # More methods = higher confidence (up to a point)
            method_bonus = min(0.15, (num_methods - 1) * 0.05)
            
            # Data completeness bonus
            has_params = bool(model_data.get("params"))
            has_flops = bool(model_data.get("flops"))
            completeness_bonus = 0.1 if (has_params and has_flops) else (0.05 if has_params else 0)
            
            confidence = min(0.95, avg_method_confidence + method_bonus + completeness_bonus)
            
            # Determine strength from confidence
            if confidence >= 0.8:
                strength = "S-High"
            elif confidence >= 0.6:
                strength = "S-Medium"
            else:
                strength = "S-Low"
        
        # Determine uncertainty sources
        uncertainty_sources = []
        if not model_data.get("flops"):
            uncertainty_sources.append("U1")  # Compute unknown
        if not model_data.get("params"):
            uncertainty_sources.append("U3")  # Architecture unclear
        if not model_data.get("textual_hints"):
            uncertainty_sources.append("U2")  # Data composition unknown
        
        return {
            "min": tokens_min,
            "max": tokens_max,
            "mid": tokens_mid,
            "evidence_types": list(set(evidence_types)) if evidence_types else ["E5"],
            "strength": strength,
            "uncertainty_sources": uncertainty_sources if uncertainty_sources else [],
            "estimation_methods": list(set(methods_used)) if methods_used else [],
            "estimation_confidence": confidence,
        }
