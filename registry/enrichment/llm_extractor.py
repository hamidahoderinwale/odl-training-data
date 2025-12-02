"""
LLM Extraction Service
Uses OpenAI or Anthropic API to extract structured data from web content
"""

import os
import json
from typing import Dict, List, Optional, Any
from datetime import datetime
import re


class LLMExtractor:
    """Extracts structured model metadata from web content using LLM"""
    
    def __init__(self, provider: str = "openai", api_key: Optional[str] = None):
        """
        Initialize LLM extractor
        
        Args:
            provider: "openai" or "anthropic"
            api_key: API key (if None, reads from env)
        """
        self.provider = provider.lower()
        self.api_key = api_key or os.getenv(
            "OPENAI_API_KEY" if self.provider == "openai" else "ANTHROPIC_API_KEY"
        )
        
        if not self.api_key:
            raise ValueError(
                f"{provider.upper()}_API_KEY environment variable required"
            )
        
        if self.provider == "openai":
            try:
                import openai
                self.client = openai.OpenAI(api_key=self.api_key)
            except ImportError:
                raise ImportError("openai package required. Install with: pip install openai")
        elif self.provider == "anthropic":
            try:
                import anthropic
                self.client = anthropic.Anthropic(api_key=self.api_key)
            except ImportError:
                raise ImportError("anthropic package required. Install with: pip install anthropic")
        else:
            raise ValueError(f"Unsupported provider: {provider}")
    
    def extract_model_metadata(
        self,
        model_id: str,
        provider: str,
        web_content: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Extract structured metadata from web content
        
        Args:
            model_id: Model identifier (e.g., "GPT-4")
            provider: Model provider (e.g., "OpenAI")
            web_content: Text content from web sources
            context: Additional context (existing model data)
        
        Returns:
            Dict with extracted metadata
        """
        # Build prompt
        prompt = self._build_extraction_prompt(model_id, provider, web_content, context)
        
        try:
            if self.provider == "openai":
                response = self.client.chat.completions.create(
                    model="gpt-4o-mini",  # Use cheaper model for extraction
                    messages=[
                        {"role": "system", "content": "You are a data extraction assistant. Extract structured information about AI models from text. Always return valid JSON."},
                        {"role": "user", "content": prompt}
                    ],
                    response_format={"type": "json_object"},
                    temperature=0.1,  # Low temperature for consistent extraction
                )
                result_text = response.choices[0].message.content
            else:  # anthropic
                response = self.client.messages.create(
                    model="claude-3-5-sonnet-20241022",
                    max_tokens=2000,
                    system="You are a data extraction assistant. Extract structured information about AI models from text. Always return valid JSON.",
                    messages=[
                        {"role": "user", "content": prompt}
                    ],
                )
                result_text = response.content[0].text
            
            # Parse JSON response
            extracted = json.loads(result_text)
            
            # Validate and normalize
            return self._validate_extraction(extracted, model_id, provider)
            
        except json.JSONDecodeError as e:
            print(f"JSON decode error: {e}")
            return self._empty_extraction()
        except Exception as e:
            print(f"LLM extraction error: {e}")
            return self._empty_extraction()
    
    def _build_extraction_prompt(
        self,
        model_id: str,
        provider: str,
        web_content: str,
        context: Optional[Dict[str, Any]] = None
    ) -> str:
        """Build enhanced extraction prompt for comprehensive model metadata"""
        context_str = ""
        if context:
            context_str = f"\n\nExisting known information:\n{json.dumps(context, indent=2)}"
        
        prompt = f"""Extract comprehensive structured information about the AI model "{model_id}" by {provider} from the following text.

Text content:
{web_content[:12000]}  # Increased content size for better extraction
{context_str}

Extract ALL available information and return as JSON with the following structure:
{{
  "release_date": "YYYY-MM-DD or null if not found",
  "architecture_type": "Transformer, MoE, or null",
  "is_moe": true/false/null,
  "num_experts": number or null,
  "active_experts": number or null,
  "multimodal": true/false/null,
  "params": number in billions (e.g., 70 for 70B) or null,
  "params_active": number in billions for MoE models or null,
  "flops_reported": number in FLOPs (e.g., 2.1e25) or null,
  "flops_estimated": number in FLOPs or null,
  "training_data_sources": ["source1", "source2", "source3"] or [],
  "training_data_composition": "detailed description of training data composition, sources, and types or null",
  "training_period_start": "YYYY-MM-DD or null",
  "training_period_end": "YYYY-MM-DD or null",
  "evidence_types": ["E1", "E2", "E3", "E4", "E5"] based on disclosure level (include ALL that apply),
  "confidence": "high/medium/low",
  "raw_snippets": ["relevant quote 1 with source context", "relevant quote 2 with source context", "relevant quote 3"]
}}

CRITICAL: Extract evidence types based on the following comprehensive mapping:
- E1: Direct disclosure (company blog post, official announcement, company website, official paper, system card from provider)
- E2: Compute evidence (FLOPs mentioned, training compute requirements, hardware specifications, compute budget)
- E3: Architecture evidence (parameter count, MoE details, number of experts, architecture specifications)
- E4: Third-party analysis (research paper analyzing the model, news article with technical details, academic analysis)
- E5: Qualitative hints (vague mentions, speculation, indirect references, rumors)

IMPORTANT EXTRACTION GUIDELINES:
1. For parameters: Extract the exact number in billions (e.g., "70 billion parameters" = 70, "1.8 trillion" = 1800)
2. For training data: Extract ALL mentioned sources (Common Crawl, books, code, images, etc.)
3. For training period: Extract start and end dates if mentioned, or at least the year
4. For evidence: Include ALL evidence types that apply - a single source may provide multiple evidence types
5. For raw snippets: Extract 3-5 most relevant quotes that support the extracted information
6. For FLOPs: Extract both reported (if explicitly stated) and estimated (if calculated from other info)
7. For multimodal: Check for mentions of vision, image, audio, video capabilities
8. For MoE: Extract number of experts, active experts, and routing details if mentioned

Return only valid JSON, no additional text or explanation."""
        
        return prompt
    
    def _validate_extraction(
        self,
        extracted: Dict[str, Any],
        model_id: str,
        provider: str
    ) -> Dict[str, Any]:
        """Validate and normalize extracted data with all fields"""
        validated = {
            "release_date": self._parse_date(extracted.get("release_date")),
            "architecture_type": extracted.get("architecture_type"),
            "is_moe": extracted.get("is_moe"),
            "num_experts": extracted.get("num_experts"),
            "active_experts": extracted.get("active_experts"),
            "multimodal": extracted.get("multimodal"),
            "params": self._normalize_params(extracted.get("params")),
            "params_active": self._normalize_params(extracted.get("params_active")),
            "flops_reported": self._normalize_flops(extracted.get("flops_reported")),
            "flops_estimated": self._normalize_flops(extracted.get("flops_estimated")),
            "training_data_sources": extracted.get("training_data_sources", []),
            "training_data_composition": extracted.get("training_data_composition"),
            "training_period_start": self._parse_date(extracted.get("training_period_start")),
            "training_period_end": self._parse_date(extracted.get("training_period_end")),
            "evidence_types": extracted.get("evidence_types", []),
            "confidence": extracted.get("confidence", "medium"),
            "raw_snippets": extracted.get("raw_snippets", []),
        }
        
        # Normalize architecture type
        if validated["architecture_type"]:
            arch = validated["architecture_type"].lower()
            if "moe" in arch or "mixture" in arch or "expert" in arch:
                validated["architecture_type"] = "MoE"
                validated["is_moe"] = True
            elif "transformer" in arch:
                validated["architecture_type"] = "Transformer"
            else:
                validated["architecture_type"] = "Transformer"  # Default
        
        # Ensure evidence_types is a list
        if not isinstance(validated["evidence_types"], list):
            validated["evidence_types"] = []
        
        # Ensure training_data_sources is a list
        if not isinstance(validated["training_data_sources"], list):
            validated["training_data_sources"] = []
        
        return validated
    
    def _normalize_params(self, value: Any) -> Optional[float]:
        """Normalize parameter count to billions"""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Try to extract number from string
            import re
            match = re.search(r'(\d+\.?\d*)\s*(?:billion|B|b)', value, re.IGNORECASE)
            if match:
                return float(match.group(1))
            match = re.search(r'(\d+\.?\d*)\s*(?:trillion|T|t)', value, re.IGNORECASE)
            if match:
                return float(match.group(1)) * 1000
        return None
    
    def _normalize_flops(self, value: Any) -> Optional[float]:
        """Normalize FLOPs to number"""
        if value is None:
            return None
        if isinstance(value, (int, float)):
            return float(value)
        if isinstance(value, str):
            # Try to parse scientific notation or large numbers
            import re
            # Match scientific notation like "2.1e25" or "2.1E25"
            match = re.search(r'(\d+\.?\d*)[eE](\d+)', value)
            if match:
                base = float(match.group(1))
                exp = int(match.group(2))
                return base * (10 ** exp)
            # Match large numbers with units
            match = re.search(r'(\d+\.?\d*)\s*(?:flop|FLOP)', value, re.IGNORECASE)
            if match:
                return float(match.group(1))
        return None
    
    def _parse_date(self, date_str: Optional[str]) -> Optional[str]:
        """Parse date string to ISO format"""
        if not date_str or date_str.lower() in ["null", "none", ""]:
            return None
        
        # Try to extract date from various formats
        # YYYY-MM-DD
        if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
            return date_str
        
        # Try to parse common formats
        try:
            dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
            return dt.strftime("%Y-%m-%d")
        except (ValueError, AttributeError):
            pass
        
        # Try year only
        year_match = re.search(r'\b(20\d{2})\b', date_str)
        if year_match:
            return f"{year_match.group(1)}-01-01"
        
        return None
    
    def _empty_extraction(self) -> Dict[str, Any]:
        """Return empty extraction result with all fields"""
        return {
            "release_date": None,
            "architecture_type": None,
            "is_moe": None,
            "num_experts": None,
            "active_experts": None,
            "multimodal": None,
            "params": None,
            "params_active": None,
            "flops_reported": None,
            "flops_estimated": None,
            "training_data_sources": [],
            "training_data_composition": None,
            "training_period_start": None,
            "training_period_end": None,
            "evidence_types": [],
            "confidence": "low",
            "raw_snippets": [],
        }

