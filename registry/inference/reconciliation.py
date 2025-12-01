"""
Token Inference Reconciliation Engine
Combines multiple inference methods into final token estimate
"""

from typing import Dict, Any, Optional, List
from datetime import datetime


class TokenInferenceReconciler:
    """Reconciles multiple token inference methods into final estimate"""
    
    def __init__(self):
        pass
    
    def reconcile(self, model_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Reconcile token estimates from multiple methods
        
        Args:
            model_data: Dictionary with model metadata (params, flops, architecture, etc.)
        
        Returns:
            Dictionary with min, max, mid estimates and evidence metadata
        """
        estimates = []
        evidence_types = []
        
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
                    "confidence": 0.5,
                })
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
            }
        
        # Find intersection if overlapping, otherwise union envelope
        min_vals = [e["min"] for e in estimates]
        max_vals = [e["max"] for e in estimates]
        
        overall_min = max(min_vals)
        overall_max = min(max_vals)
        
        if overall_min <= overall_max:
            # Intervals overlap - use intersection
            tokens_min = overall_min
            tokens_max = overall_max
            strength = "S-High" if len(estimates) >= 2 else "S-Medium"
        else:
            # No overlap - use union envelope
            tokens_min = min(min_vals)
            tokens_max = max(max_vals)
            strength = "S-Medium" if len(estimates) >= 2 else "S-Low"
        
        tokens_mid = (tokens_min + tokens_max) / 2
        
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
        }
