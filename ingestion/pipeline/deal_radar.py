"""
Deal Radar: NER-powered classifier to detect AI data licensing deals
"""

import re
from typing import Dict, Any, List, Optional
from datetime import datetime


class DealRadar:
    """Classify text as describing an AI data licensing deal"""
    
    # Trigger phrases
    TRIGGER_PHRASES = [
        "training data",
        "licensing agreement",
        "access to archive",
        "multi-year partnership",
        "API data deal",
        "content feed for AI models",
        "LLM training",
        "AI model training",
        "machine learning data",
        "dataset license",
        "data partnership",
        "content licensing",
        "archive access",
        "data feed",
    ]
    
    # Company indicators
    AI_COMPANIES = [
        "OpenAI", "Google", "Anthropic", "Meta", "Microsoft",
        "Amazon", "Apple", "Cohere", "Mistral", "Inflection"
    ]
    
    DATA_PROVIDERS = [
        "Reddit", "News Corp", "Associated Press", "Shutterstock",
        "Getty Images", "Dotdash", "HarperCollins", "Wiley"
    ]
    
    def __init__(self):
        # Compile trigger patterns
        self.trigger_patterns = [
            re.compile(rf'\b{re.escape(phrase)}\b', re.IGNORECASE)
            for phrase in self.TRIGGER_PHRASES
        ]
        
        # Compile company patterns
        self.ai_company_patterns = [
            re.compile(rf'\b{re.escape(company)}\b', re.IGNORECASE)
            for company in self.AI_COMPANIES
        ]
        
        self.data_provider_patterns = [
            re.compile(rf'\b{re.escape(provider)}\b', re.IGNORECASE)
            for provider in self.DATA_PROVIDERS
        ]
    
    def classify(self, text: str, title: Optional[str] = None) -> Dict[str, Any]:
        """
        Classify if text describes an AI data licensing deal
        
        Args:
            text: Text to classify
            title: Optional title for additional context
        
        Returns:
            Classification result with confidence score
        """
        text_lower = text.lower()
        title_lower = title.lower() if title else ""
        combined_text = f"{title_lower} {text_lower}"
        
        # Count trigger phrase matches
        trigger_matches = 0
        matched_triggers = []
        
        for pattern in self.trigger_patterns:
            if pattern.search(combined_text):
                trigger_matches += 1
                matched_triggers.append(pattern.pattern)
        
        # Check for AI company mentions
        ai_companies_found = []
        for pattern in self.ai_company_patterns:
            if pattern.search(combined_text):
                ai_companies_found.append(pattern.pattern)
        
        # Check for data provider mentions
        data_providers_found = []
        for pattern in self.data_provider_patterns:
            if pattern.search(combined_text):
                data_providers_found.append(pattern.pattern)
        
        # Calculate confidence score
        confidence = 0.0
        
        # Base score from triggers
        if trigger_matches > 0:
            confidence += min(trigger_matches * 0.2, 0.6)
        
        # Boost if both AI company and data provider mentioned
        if ai_companies_found and data_providers_found:
            confidence += 0.3
        
        # Boost if multiple triggers
        if trigger_matches >= 2:
            confidence += 0.1
        
        # Classify
        is_deal = confidence >= 0.5
        
        return {
            "is_deal": is_deal,
            "confidence": min(confidence, 1.0),
            "trigger_matches": trigger_matches,
            "matched_triggers": matched_triggers,
            "ai_companies_found": ai_companies_found,
            "data_providers_found": data_providers_found,
            "classified_at": datetime.now().isoformat(),
        }
    
    def filter_candidates(self, texts: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Filter list of texts to only those likely describing deals
        
        Args:
            texts: List of dicts with 'text' and optionally 'title', 'url'
        
        Returns:
            Filtered list with classification results
        """
        candidates = []
        
        for item in texts:
            text = item.get("text", "")
            title = item.get("title", "")
            url = item.get("url", "")
            
            classification = self.classify(text, title)
            
            if classification["is_deal"]:
                candidates.append({
                    **item,
                    "classification": classification,
                })
        
        # Sort by confidence
        candidates.sort(key=lambda x: x["classification"]["confidence"], reverse=True)
        
        return candidates

