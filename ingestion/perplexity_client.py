"""
Perplexity API Client - For content summarization and structured extraction
"""

import os
from typing import Dict, Optional, Any
import requests
import json


class PerplexityClient:
    """Client for Perplexity API"""
    
    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv("PERPLEXITY_API_KEY")
        if not self.api_key:
            raise ValueError("PERPLEXITY_API_KEY environment variable required")
        self.base_url = "https://api.perplexity.ai"
        self.headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
    
    def chat(
        self,
        messages: list,
        model: str = "llama-3.1-sonar-large-128k-online",
        temperature: float = 0.2,
    ) -> Dict[str, Any]:
        """
        Send chat request to Perplexity
        
        Args:
            messages: List of message dicts (role, content)
            model: Model to use
            temperature: Sampling temperature
        
        Returns:
            Response dict with content and citations
        """
        payload = {
            "model": model,
            "messages": messages,
            "temperature": temperature,
        }
        
        try:
            response = requests.post(
                f"{self.base_url}/chat/completions",
                json=payload,
                headers=self.headers,
                timeout=60,
            )
            response.raise_for_status()
            return response.json()
            
        except requests.exceptions.RequestException as e:
            print(f"Perplexity API error: {e}")
            return {}
    
    def extract_deal_info(self, text: str) -> Dict[str, Any]:
        """
        Extract structured deal information from text
        
        Args:
            text: Article or filing text
        
        Returns:
            Dict with extracted fields
        """
        prompt = """Please extract structured information about an AI training data deal from the following text.

Extract:
- provider (company/organization providing data)
- buyer (company/organization buying/licensing data)
- modality (text, image, audio, video, satellite, biotech, etc.)
- data_type (brief description of the data)
- pricing_mechanism (e.g., "Access / aggregate licensing", "Per-unit licensing", etc.)
- price_usd (numeric value if mentioned, or null)
- price_range_min_usd (if range given)
- price_range_max_usd (if range given)
- reported_terms (headline terms as mentioned)
- exclusivity (true/false/null if mentioned)
- creators_compensated (true/false/null if mentioned)
- creator_split_percentage (if mentioned)
- revenue_share (true/false if mentioned)
- start_date (if mentioned)
- end_date (if mentioned)
- duration_years (if mentioned)
- rights_granted (training, fine-tuning, inference, etc.)
- deal_type (aggregate, per-unit, commissioning, settlement, etc.)

Return ONLY valid JSON, no markdown formatting. If a field cannot be determined, use null."""

        messages = [
            {
                "role": "system",
                "content": "You are a data extraction assistant. Extract structured information from text and return only valid JSON.",
            },
            {
                "role": "user",
                "content": f"{prompt}\n\nText:\n{text[:8000]}",  # Limit text size
            },
        ]
        
        response = self.chat(messages, temperature=0.1)
        
        try:
            content = response.get("choices", [{}])[0].get("message", {}).get("content", "{}")
            # Remove markdown code blocks if present
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            content = content.strip()
            
            extracted = json.loads(content)
            return extracted
            
        except (json.JSONDecodeError, KeyError, IndexError) as e:
            print(f"Error parsing Perplexity response: {e}")
            print(f"Response: {response}")
            return {}
    
    def summarize_article(self, text: str) -> str:
        """
        Generate a summary of an article
        
        Args:
            text: Article text
        
        Returns:
            Summary string
        """
        messages = [
            {
                "role": "system",
                "content": "You are a summarization assistant. Provide concise summaries.",
            },
            {
                "role": "user",
                "content": f"Summarize the following article in 2-3 sentences:\n\n{text[:6000]}",
            },
        ]
        
        response = self.chat(messages)
        
        try:
            return response.get("choices", [{}])[0].get("message", {}).get("content", "")
        except (KeyError, IndexError):
            return ""


if __name__ == "__main__":
    # Example usage
    client = PerplexityClient()
    
    sample_text = """
    OpenAI announced a multi-year licensing agreement with News Corp worth over $250 million.
    The deal grants OpenAI access to content from The Wall Street Journal, The Times, and NY Post
    for training AI models. The agreement is exclusive and spans 5 years.
    """
    
    extracted = client.extract_deal_info(sample_text)
    print("Extracted deal info:")
    print(json.dumps(extracted, indent=2))

