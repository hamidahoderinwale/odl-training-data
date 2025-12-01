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
        """Build extraction prompt"""
        context_str = ""
        if context:
            context_str = f"\n\nExisting known information:\n{json.dumps(context, indent=2)}"
        
        prompt = f"""Extract structured information about the AI model "{model_id}" by {provider} from the following text.

Text content:
{web_content[:8000]}  # Limit content size
{context_str}

Extract the following information and return as JSON:
{{
  "release_date": "YYYY-MM-DD or null if not found",
  "architecture_type": "Transformer, MoE, or null",
  "is_moe": true/false/null,
  "num_experts": number or null,
  "multimodal": true/false/null,
  "training_data_sources": ["source1", "source2"] or [],
  "training_data_composition": "description or null",
  "training_period_start": "YYYY-MM-DD or null",
  "training_period_end": "YYYY-MM-DD or null",
  "evidence_types": ["E1", "E2", "E3", "E4", "E5"] based on disclosure level,
  "confidence": "high/medium/low",
  "raw_snippets": ["relevant quote 1", "relevant quote 2"]
}}

Evidence type mapping:
- E1: Direct disclosure (company blog, paper, official announcement)
- E2: Compute evidence (FLOPs, hardware mentioned)
- E3: Architecture evidence (parameters, MoE details)
- E4: Third-party analysis (research paper, news article)
- E5: Qualitative hints (vague mentions, speculation)

Return only valid JSON, no additional text."""
        
        return prompt
    
    def _validate_extraction(
        self,
        extracted: Dict[str, Any],
        model_id: str,
        provider: str
    ) -> Dict[str, Any]:
        """Validate and normalize extracted data"""
        validated = {
            "release_date": self._parse_date(extracted.get("release_date")),
            "architecture_type": extracted.get("architecture_type"),
            "is_moe": extracted.get("is_moe"),
            "num_experts": extracted.get("num_experts"),
            "multimodal": extracted.get("multimodal"),
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
            if "moe" in arch or "mixture" in arch:
                validated["architecture_type"] = "MoE"
                validated["is_moe"] = True
            elif "transformer" in arch:
                validated["architecture_type"] = "Transformer"
            else:
                validated["architecture_type"] = "Transformer"  # Default
        
        return validated
    
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
        """Return empty extraction result"""
        return {
            "release_date": None,
            "architecture_type": None,
            "is_moe": None,
            "num_experts": None,
            "multimodal": None,
            "training_data_sources": [],
            "training_data_composition": None,
            "training_period_start": None,
            "training_period_end": None,
            "evidence_types": [],
            "confidence": "low",
            "raw_snippets": [],
        }

