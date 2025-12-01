"""
Textual Token Clue Quantization
Converts linguistic hints into numeric token ranges
"""

from typing import Optional, Tuple
from registry.schema import InferenceConstraint, EvidenceType
import re


def quantize_textual_hint(text: str, context: Optional[Dict] = None) -> Optional[InferenceConstraint]:
    """
    Convert textual hints to token estimates
    
    Args:
        text: Text containing token hints
        context: Optional context (model name, previous estimates, etc.)
    
    Returns:
        InferenceConstraint with token range
    """
    text_lower = text.lower()
    
    # Pattern matching for common phrases
    patterns = [
        # "several trillion tokens"
        (r'several\s+trillion\s+tokens?', (1e12, 10e12)),
        # "trillions of tokens"
        (r'trillions?\s+of\s+tokens?', (2e12, 20e12)),
        # "over X trillion tokens"
        (r'over\s+(\d+\.?\d*)\s*trillion\s+tokens?', lambda m: (float(m.group(1)) * 1e12, float(m.group(1)) * 2 * 1e12)),
        # "approximately X trillion"
        (r'approximately\s+(\d+\.?\d*)\s*trillion', lambda m: (float(m.group(1)) * 0.8 * 1e12, float(m.group(1)) * 1.2 * 1e12)),
        # "orders of magnitude more than X"
        (r'orders?\s+of\s+magnitude\s+more\s+than\s+([a-z0-9\-]+)', lambda m: _infer_from_reference(m.group(1), context)),
        # "trained on X tokens"
        (r'trained\s+on\s+(\d+\.?\d*)\s*t\s*tokens?', lambda m: (float(m.group(1)) * 0.9 * 1e12, float(m.group(1)) * 1.1 * 1e12)),
    ]
    
    for pattern, handler in patterns:
        match = re.search(pattern, text_lower)
        if match:
            if callable(handler):
                result = handler(match)
                if isinstance(result, tuple):
                    tokens_min, tokens_max = result
                else:
                    continue
            else:
                tokens_min, tokens_max = handler
            
            return InferenceConstraint(
                method="textual_quantization",
                tokens_min=tokens_min,
                tokens_max=tokens_max,
                evidence_type=EvidenceType.E5.value,
                confidence=0.4,  # Lower confidence for textual hints
                notes=f"Extracted from: '{match.group(0)}'"
            )
    
    return None


def _infer_from_reference(model_name: str, context: Optional[Dict]) -> Tuple[float, float]:
    """Infer tokens based on reference to another model"""
    # Common model token counts (in tokens)
    known_tokens = {
        "llama-2": 2e12,
        "llama-3": 15e12,
        "gpt-3": 300e9,
        "gpt-4": 13e12,
        "claude-3": 3.4e12,
    }
    
    model_lower = model_name.lower()
    base_tokens = known_tokens.get(model_lower)
    
    if base_tokens:
        # "orders of magnitude" = 10-100x
        return (base_tokens * 10, base_tokens * 100)
    
    return (1e12, 10e12)  # Default wide range


def extract_all_textual_hints(text: str) -> List[InferenceConstraint]:
    """
    Extract all textual token hints from a document
    
    Args:
        text: Full document text
    
    Returns:
        List of InferenceConstraints
    """
    constraints = []
    
    # Split into sentences
    sentences = re.split(r'[.!?]\s+', text)
    
    for sentence in sentences:
        constraint = quantize_textual_hint(sentence)
        if constraint:
            constraints.append(constraint)
    
    return constraints

