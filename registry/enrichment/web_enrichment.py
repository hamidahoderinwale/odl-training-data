"""
Web Search Enrichment Service
Uses Exa API to search for model information and extract metadata
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta
import json

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from ingestion.exa_client import ExaClient
except ImportError:
    # Fallback if exa_client not available
    ExaClient = None

from .llm_extractor import LLMExtractor


class WebModelEnricher:
    """Enriches model metadata using web search via Exa API"""
    
    def __init__(
        self,
        exa_api_key: Optional[str] = None,
        llm_provider: str = "openai",
        llm_api_key: Optional[str] = None
    ):
        """
        Initialize web enricher
        
        Args:
            exa_api_key: Exa API key (if None, reads from env)
            llm_provider: LLM provider ("openai" or "anthropic")
            llm_api_key: LLM API key (if None, reads from env)
        """
        # Initialize Exa client
        if ExaClient:
            try:
                self.exa_client = ExaClient(api_key=exa_api_key)
            except Exception as e:
                print(f"Warning: Exa client initialization failed: {e}")
                self.exa_client = None
        else:
            self.exa_client = None
        
        # Initialize LLM extractor
        try:
            self.llm_extractor = LLMExtractor(provider=llm_provider, api_key=llm_api_key)
        except Exception as e:
            print(f"Warning: LLM extractor initialization failed: {e}")
            self.llm_extractor = None
    
    def enrich_model(
        self,
        model_id: str,
        provider: str,
        existing_data: Optional[Dict[str, Any]] = None,
        num_search_results: int = 5
    ) -> Dict[str, Any]:
        """
        Enrich model metadata using web search
        
        Args:
            model_id: Model identifier
            provider: Model provider
            existing_data: Existing model data (for context)
            num_search_results: Number of search results to fetch
        
        Returns:
            Dict with enriched metadata
        """
        if not self.exa_client:
            return self._empty_enrichment()
        
        # Build search queries
        queries = self._build_search_queries(model_id, provider)
        
        # Search for information
        all_results = []
        for query in queries:
            try:
                results = self.exa_client.search(
                    query=query,
                    num_results=num_search_results
                )
                all_results.extend(results)
            except Exception as e:
                print(f"Exa search error for query '{query}': {e}")
                continue
        
        if not all_results:
            return self._empty_enrichment()
        
        # Deduplicate by URL
        seen_urls = set()
        unique_results = []
        for result in all_results:
            if result.url not in seen_urls:
                seen_urls.add(result.url)
                unique_results.append(result)
        
        # Sort by score
        unique_results.sort(key=lambda x: x.score, reverse=True)
        
        # Fetch content from top results
        top_urls = [r.url for r in unique_results[:num_search_results]]
        contents = {}
        if self.exa_client:
            try:
                contents = self.exa_client.get_contents(top_urls)
            except Exception as e:
                print(f"Error fetching contents: {e}")
        
        # Combine all content
        combined_content = self._combine_content(unique_results, contents)
        
        # Extract structured data using LLM
        extracted = {}
        if self.llm_extractor and combined_content:
            try:
                extracted = self.llm_extractor.extract_model_metadata(
                    model_id=model_id,
                    provider=provider,
                    web_content=combined_content,
                    context=existing_data
                )
            except Exception as e:
                print(f"LLM extraction error: {e}")
        
        # Build enrichment result
        enrichment = {
            "release_date": extracted.get("release_date"),
            "architecture_type": extracted.get("architecture_type"),
            "is_moe": extracted.get("is_moe"),
            "num_experts": extracted.get("num_experts"),
            "multimodal": extracted.get("multimodal"),
            "training_data_sources": extracted.get("training_data_sources", []),
            "training_data_composition": extracted.get("training_data_composition"),
            "training_period_start": extracted.get("training_period_start"),
            "training_period_end": extracted.get("training_period_end"),
            "evidence_types": extracted.get("evidence_types", []),
            "confidence": extracted.get("confidence", "medium"),
            "sources": [
                {
                    "type": "web_search",
                    "url": result.url,
                    "title": result.title,
                    "score": result.score,
                    "published_date": result.published_date,
                }
                for result in unique_results[:num_search_results]
            ],
            "raw_evidence_snippets": [
                {
                    "text": snippet,
                    "source_url": unique_results[0].url if unique_results else None,
                }
                for snippet in extracted.get("raw_snippets", [])
            ],
        }
        
        return enrichment
    
    def _build_search_queries(self, model_id: str, provider: str) -> List[str]:
        """Build search queries for model information"""
        queries = [
            # Prioritize arXiv and company sites
            f'site:arxiv.org "{model_id}" {provider} technical report',
            f'site:arxiv.org "{model_id}" {provider} paper',
            f"{model_id} {provider} release date architecture training data",
            f"{model_id} {provider} system card technical details",
            f"{model_id} {provider} training dataset sources",
            f"{model_id} {provider} model card paper",
        ]
        
        # Add provider-specific queries targeting company sites
        company_domains = {
            "OpenAI": "openai.com",
            "Anthropic": "anthropic.com",
            "Google": "deepmind.com",
            "Google DeepMind": "deepmind.com",
            "Meta": "ai.meta.com",
            "Microsoft": "microsoft.com",
            "Mistral AI": "mistral.ai",
            "Cohere": "cohere.com",
            "xAI": "x.ai",
        }
        
        domain = company_domains.get(provider)
        if domain:
            queries.insert(0, f'site:{domain} "{model_id}" release announcement')
            queries.insert(1, f'site:{domain} "{model_id}" launch date')
        
        # Add provider-specific queries
        if provider.lower() in ["openai", "anthropic", "google", "meta"]:
            queries.append(f"{provider} {model_id} official announcement blog")
        
        return queries
    
    def _combine_content(
        self,
        results: List[Any],
        contents: Dict[str, str]
    ) -> str:
        """Combine content from search results"""
        combined = []
        
        for result in results:
            # Prefer full content, fallback to summary
            if result.url in contents:
                combined.append(f"--- Content from {result.url} ---\n{contents[result.url]}")
            elif result.summary:
                combined.append(f"--- Summary from {result.url} ---\n{result.title}\n{result.summary}")
        
        return "\n\n".join(combined)
    
    def _empty_enrichment(self) -> Dict[str, Any]:
        """Return empty enrichment result"""
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
            "sources": [],
            "raw_evidence_snippets": [],
        }


