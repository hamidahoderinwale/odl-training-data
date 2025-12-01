"""
Stage C: LLM-Assisted Normalization
Placeholder for future LLM integration - currently returns regex results
"""

from typing import Dict, Any, Optional
from datetime import datetime


class LLMNormalizer:
    """Normalize deal information - placeholder for future LLM integration"""
    
    def __init__(self, llm_client=None):
        # Placeholder for future LLM client integration
        pass
    
    def normalize(self, text: str, regex_extracted: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Normalize deal information - currently returns regex results
        
        Args:
            text: Text to extract from
            regex_extracted: Optional regex extraction results for context
        
        Returns:
            Normalized deal data with confidence
        """
        # For now, just return regex results with metadata
        result = regex_extracted or {}
        result["normalized_at"] = datetime.now().isoformat()
        result["method"] = "regex_only"
        result["extraction_confidence"] = "medium"
        
        return result

