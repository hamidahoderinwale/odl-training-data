"""
Complete Extraction Pipeline
Orchestrates all stages (A-E) for deal extraction
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import sys
from pathlib import Path

# Add parent directory to path for imports
parent_dir = Path(__file__).parent.parent
sys.path.insert(0, str(parent_dir))

from pipeline.preprocessor import DealPreprocessor
from pipeline.regex_extractor import RegexExtractor
from pipeline.llm_normalizer import LLMNormalizer
from pipeline.canonicalizer import DealCanonicalizer
from pipeline.deduplicator import DealDeduplicator
from pipeline.deal_radar import DealRadar


class ExtractionPipeline:
    """Complete extraction pipeline for deals"""
    
    def __init__(self, llm_client=None):
        self.preprocessor = DealPreprocessor()
        self.regex_extractor = RegexExtractor()
        self.llm_normalizer = LLMNormalizer(llm_client)
        self.canonicalizer = DealCanonicalizer()
        self.deduplicator = DealDeduplicator()
        self.deal_radar = DealRadar()
    
    def extract_deal(self, text: str, source_url: str, metadata: Optional[Dict[str, Any]] = None) -> Optional[Dict[str, Any]]:
        """
        Extract deal from text through all pipeline stages
        
        Args:
            text: Raw text to extract from
            source_url: URL where text came from
            metadata: Optional metadata (title, published_date, etc.)
        
        Returns:
            Extracted deal dict or None
        """
        # Stage A: Preprocessing
        preprocessed = self.preprocessor.preprocess(text)
        
        # Stage B: Regex extraction
        regex_extracted = self.regex_extractor.extract_all(text)
        
        # Stage C: LLM normalization
        llm_extracted = self.llm_normalizer.normalize(text, regex_extracted)
        
        # Merge regex and LLM results
        merged = {**regex_extracted, **llm_extracted}
        
        # Stage D: Canonicalization
        canonical = self.canonicalizer.canonicalize_deal(merged)
        
        # Add source metadata
        canonical["source_url"] = source_url
        canonical["extracted_at"] = datetime.now().isoformat()
        
        if metadata:
            canonical.update(metadata)
        
        # Add raw text snippets for auditability
        canonical["raw_text_snippets"] = [
            {
                "snippet": text[:500],  # First 500 chars
                "source": source_url,
                "extracted_at": datetime.now().isoformat(),
            }
        ]
        
        # Validate required fields - be more lenient
        # If we have at least one of provider/buyer, try to infer the other from context
        provider = canonical.get("provider") or ""
        buyer = canonical.get("buyer") or ""
        
        # If we have classification metadata, try to extract from there
        if metadata and metadata.get("classification"):
            classification = metadata.get("classification", {})
            # Try to infer from AI companies or data providers found
            if not provider and classification.get("data_providers_found"):
                # Use first data provider as provider
                provider_match = classification.get("data_providers_found", [])
                if provider_match:
                    # Extract company name from pattern
                    provider = provider_match[0].replace("\\b", "").replace("\\", "").strip()
            if not buyer and classification.get("ai_companies_found"):
                # Use first AI company as buyer
                buyer_match = classification.get("ai_companies_found", [])
                if buyer_match:
                    buyer = buyer_match[0].replace("\\b", "").replace("\\", "").strip()
        
        # Still require at least one to be present
        if not provider and not buyer:
            return None
        
        # Set inferred values
        if provider:
            canonical["provider"] = provider
        if buyer:
            canonical["buyer"] = buyer
        
        return canonical
    
    def process_batch(self, texts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Process batch of texts through pipeline
        
        Args:
            texts: List of dicts with 'text', 'url', and optional metadata
        
        Returns:
            List of extracted deals
        """
        # First, filter with deal radar
        candidates = self.deal_radar.filter_candidates(texts)
        
        print(f"Deal Radar: {len(candidates)}/{len(texts)} candidates identified")
        
        # Extract deals
        deals = []
        for candidate in candidates:
            text = candidate.get("text", "")
            url = candidate.get("url", "")
            metadata = {
                "title": candidate.get("title"),
                "published_date": candidate.get("published_date"),
                "classification": candidate.get("classification"),
            }
            
            # Preserve Exa metadata if present
            if candidate.get("discovered_via") == "exa" or candidate.get("source") == "exa":
                metadata["discovered_via"] = "exa"
                if candidate.get("exa_query"):
                    metadata["exa_query"] = candidate.get("exa_query")
                if candidate.get("exa_score"):
                    metadata["exa_score"] = candidate.get("exa_score")
                if candidate.get("exa_retrieved_at"):
                    metadata["exa_retrieved_at"] = candidate.get("exa_retrieved_at")
                    metadata["discovery_date"] = candidate.get("exa_retrieved_at")
            
            deal = self.extract_deal(text, url, metadata)
            if deal:
                deals.append(deal)
        
        # Stage E: Deduplication
        if len(deals) > 1:
            deals = self.deduplicator.deduplicate(deals)
            print(f"Deduplication: {len(deals)} unique deals after merging")
        
        return deals

