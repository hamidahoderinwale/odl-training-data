"""
Hugging Face Model Card Collector
Fetches model metadata from Hugging Face
"""

from huggingface_hub import HfApi, ModelCard
from typing import List, Dict, Any, Optional
import re


class HuggingFaceCollector:
    """Collect model data from Hugging Face"""
    
    def __init__(self):
        self.api = HfApi()
    
    def fetch_model_card(self, model_id: str) -> Optional[Dict[str, Any]]:
        """
        Fetch model card and extract metadata
        
        Args:
            model_id: Hugging Face model ID
        
        Returns:
            Extracted metadata dict
        """
        try:
            model_info = self.api.model_info(model_id)
            card_data = model_info.card_data if hasattr(model_info, 'card_data') else {}
            
            # Extract token counts if mentioned
            tokens = self._extract_token_count(card_data)
            
            # Extract parameter count
            params = self._extract_params(model_info)
            
            # Extract dataset links
            datasets = self._extract_datasets(card_data)
            
            return {
                "model_id": model_id,
                "provider": self._extract_provider(model_id),
                "params": params,
                "tokens_disclosed": tokens,
                "datasets": datasets,
                "card_data": card_data,
                "source": f"https://huggingface.co/{model_id}",
            }
        except Exception as e:
            print(f"Error fetching {model_id}: {e}")
            return None
    
    def _extract_token_count(self, card_data: Dict) -> Optional[float]:
        """Extract token count from model card"""
        # Look for patterns like "15T tokens", "2 trillion tokens", etc.
        text = str(card_data).lower()
        
        patterns = [
            r'(\d+\.?\d*)\s*t\s*tokens?',  # "15T tokens"
            r'(\d+\.?\d*)\s*trillion\s*tokens?',  # "2 trillion tokens"
            r'trained\s+on\s+(\d+\.?\d*)\s*t\s*tokens?',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                value = float(match.group(1))
                return value * 1e12  # Convert to absolute number
        
        return None
    
    def _extract_params(self, model_info) -> Optional[float]:
        """Extract parameter count"""
        # Check various fields where params might be stored
        if hasattr(model_info, 'config') and model_info.config:
            config = model_info.config
            if isinstance(config, dict):
                # Look for common param fields
                for key in ['num_parameters', 'params', 'num_params', 'model_size']:
                    if key in config:
                        val = config[key]
                        if isinstance(val, (int, float)):
                            return float(val) / 1e9  # Convert to billions
        
        return None
    
    def _extract_datasets(self, card_data: Dict) -> List[str]:
        """Extract dataset links/names"""
        datasets = []
        text = str(card_data).lower()
        
        # Look for dataset mentions
        # This is simplified - could be more sophisticated
        dataset_patterns = [
            r'dataset[:\s]+([a-z0-9\-_/]+)',
            r'trained on ([a-z0-9\-_/]+)',
        ]
        
        for pattern in dataset_patterns:
            matches = re.findall(pattern, text)
            datasets.extend(matches)
        
        return list(set(datasets))
    
    def _extract_provider(self, model_id: str) -> str:
        """Extract provider from model ID"""
        # Usually the first part of the ID
        parts = model_id.split('/')
        if len(parts) > 0:
            return parts[0]
        return "unknown"
    
    def search_models(self, query: str) -> List[Dict[str, Any]]:
        """
        Search for models on HuggingFace
        
        Args:
            query: Search query (model name)
        
        Returns:
            List of matching model records
        """
        try:
            models = self.api.list_models(search=query, limit=5)
            results = []
            for model in models:
                try:
                    model_info = self.api.model_info(model.id)
                    results.append({
                        "model_id": model.id,
                        "url": f"https://huggingface.co/{model.id}",
                        "params": self._extract_params(model_info),
                    })
                except:
                    continue
            return results
        except Exception as e:
            print(f"Error searching HF for {query}: {e}")
            return []
    
    def fetch_open_llm_leaderboard(self) -> List[Dict[str, Any]]:
        """
        Fetch models from Open LLM Leaderboard
        
        Returns:
            List of model records
        """
        # TODO: Implement Open LLM Leaderboard scraping
        # This would involve fetching from the leaderboard page
        return []

