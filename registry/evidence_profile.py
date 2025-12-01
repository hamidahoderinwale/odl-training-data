"""
Evidence Profile System
Manages E/S/U profiles with temporal metadata
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from enum import Enum
from schema import EvidenceType, EvidenceStrength, UncertaintySource


class EvidenceProfileManager:
    """Manages evidence profiles with temporal tracking"""
    
    @staticmethod
    def create_evidence_set(
        model_id: str,
        evidence_types: List[str],
        strength: str,
        uncertainty_sources: List[str],
        applied_models: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Create a complete evidence set with temporal metadata
        
        Args:
            model_id: Model identifier
            evidence_types: List of evidence types (E1-E5)
            strength: Evidence strength (S-High/Medium/Low)
            uncertainty_sources: List of uncertainty sources (U1-U5)
            applied_models: Models this evidence applies to
        
        Returns:
            Complete evidence set dict
        """
        now = datetime.now()
        date_str = now.strftime("%Y_%m_%d")
        
        evidence_set_id = f"EV_{model_id.replace('-', '_').upper()}_{date_str}"
        
        return {
            "evidence_set_id": evidence_set_id,
            "evidence_types": evidence_types,
            "strength": strength,
            "uncertainty": uncertainty_sources,
            "generated_at": now.isoformat(),
            "applied_models": applied_models or [model_id],
            "evidence_version": "1.0",
        }
    
    @staticmethod
    def update_evidence_set(
        existing_set: Dict[str, Any],
        new_evidence_types: Optional[List[str]] = None,
        new_strength: Optional[str] = None,
        new_uncertainties: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Update evidence set with new information
        
        Args:
            existing_set: Existing evidence set
            new_evidence_types: New evidence types to add
            new_strength: Updated strength
            new_uncertainties: New uncertainty sources
        
        Returns:
            Updated evidence set
        """
        updated = existing_set.copy()
        
        if new_evidence_types:
            # Merge evidence types
            existing_types = set(existing_set.get("evidence_types", []))
            existing_types.update(new_evidence_types)
            updated["evidence_types"] = list(existing_types)
        
        if new_strength:
            updated["strength"] = new_strength
        
        if new_uncertainties:
            # Merge uncertainties
            existing_unc = set(existing_set.get("uncertainty", []))
            existing_unc.update(new_uncertainties)
            updated["uncertainty"] = list(existing_unc)
        
        # Update version and timestamp
        version_parts = existing_set.get("evidence_version", "1.0").split(".")
        if len(version_parts) >= 2:
            minor = int(version_parts[-1]) + 1
            updated["evidence_version"] = f"{version_parts[0]}.{minor}"
        else:
            updated["evidence_version"] = "1.1"
        
        updated["generated_at"] = datetime.now().isoformat()
        updated["last_updated"] = datetime.now().isoformat()
        
        return updated
    
    @staticmethod
    def explain_evidence_profile(profile: Dict[str, Any]) -> str:
        """
        Generate human-readable explanation of evidence profile
        
        Args:
            profile: Evidence profile dict
        
        Returns:
            Explanation string
        """
        evidence_types = profile.get("evidence_types", [])
        strength = profile.get("strength", "Unknown")
        uncertainties = profile.get("uncertainty", [])
        
        type_explanations = {
            "E1": "Direct disclosure",
            "E2": "Compute evidence (FLOPs, hardware)",
            "E3": "Architecture evidence (parameters, MoE)",
            "E4": "Third-party analysis",
            "E5": "Qualitative hints",
        }
        
        strength_explanations = {
            "S-High": "tightly constrained",
            "S-Medium": "moderately constrained",
            "S-Low": "loosely constrained",
        }
        
        uncertainty_explanations = {
            "U1": "Compute unknown",
            "U2": "Data composition unknown",
            "U3": "Architecture unclear",
            "U4": "Synthetic/RLHF unknown",
            "U5": "Intentional opacity",
        }
        
        evidence_desc = ", ".join([type_explanations.get(et, et) for et in evidence_types])
        strength_desc = strength_explanations.get(strength, strength)
        unc_desc = ", ".join([uncertainty_explanations.get(u, u) for u in uncertainties])
        
        explanation = f"Evidence: {evidence_desc}. Strength: {strength_desc}"
        if uncertainties:
            explanation += f". Uncertainties: {unc_desc}"
        
        return explanation

