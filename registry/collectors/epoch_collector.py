"""
Epoch AI Dataset Collector
Ingests model metadata from Epoch AI datasets
"""

import pandas as pd
from typing import List, Dict, Any, Optional
from pathlib import Path
import json
import requests
from datasets import load_dataset


class EpochCollector:
    """Collect model data from Epoch AI datasets"""
    
    def __init__(self, dataset_path: Optional[str] = None):
        """
        Initialize collector
        
        Args:
            dataset_path: Path to Epoch dataset file or URL
        """
        self.dataset_path = dataset_path
        self.cache_dir = Path(__file__).parent.parent / "cache" / "epoch"
        self.cache_dir.mkdir(parents=True, exist_ok=True)
    
    def fetch_notable_models(self) -> List[Dict[str, Any]]:
        """
        Fetch Notable Models dataset from Epoch AI
        Uses HuggingFace datasets library to load from epoch-ai/ai-models
        
        Returns:
            List of model records
        """
        try:
            # Try to load from HuggingFace
            print("  Loading Epoch AI Notable Models dataset from HuggingFace...")
            dataset = load_dataset("epoch-ai/ai-models", "notable", cache_dir=str(self.cache_dir))
            
            # Convert to list of dicts
            models = []
            for row in dataset.get("train", []):
                model_dict = {
                    "model_name": row.get("model_name", ""),
                    "provider": row.get("organization", ""),
                    "release_year": row.get("release_year"),
                    "release_date": row.get("release_date"),
                    "parameter_count": row.get("parameters"),
                    "compute_PF_days": row.get("compute"),
                    "architecture_type": row.get("architecture"),
                    "modality": row.get("modality", "text"),
                    "source_url": row.get("source", ""),
                }
                models.append(model_dict)
            
            print(f"  Loaded {len(models)} models from Epoch")
            return models
        except Exception as e:
            print(f"  Warning: Could not load Epoch dataset: {e}")
            print(f"  Falling back to empty list. Install with: pip install datasets")
            return []
    
    def fetch_large_scale_models(self) -> List[Dict[str, Any]]:
        """
        Fetch Large-scale Models dataset from Epoch
        
        Returns:
            List of model records
        """
        # TODO: Implement actual Epoch API call or file read
        return []
    
    def normalize_model_name(self, name: str) -> str:
        """
        Normalize model names (GPT-4.1 vs GPT-4-1, etc.)
        
        Args:
            name: Raw model name
        
        Returns:
            Normalized name
        """
        # Basic normalization
        name = name.strip()
        # Replace common variations
        name = name.replace("GPT-4.1", "GPT-4.1")
        name = name.replace("GPT-4-1", "GPT-4.1")
        # Add more normalization rules as needed
        return name
    
    def deduplicate_models(self, models: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Deduplicate models by name + year
        
        Args:
            models: List of model records
        
        Returns:
            Deduplicated list
        """
        seen = {}
        deduplicated = []
        
        for model in models:
            key = (self.normalize_model_name(model.get("name", "")), 
                   model.get("year"))
            
            if key not in seen:
                seen[key] = True
                deduplicated.append(model)
            else:
                # Merge additional fields if needed
                pass
        
        return deduplicated
    
    def process_epoch_data(self) -> List[Dict[str, Any]]:
        """
        Process all Epoch datasets and return normalized records
        
        Returns:
            List of normalized model records
        """
        all_models = []
        
        # Fetch from different Epoch sources
        notable = self.fetch_notable_models()
        large_scale = self.fetch_large_scale_models()
        
        all_models.extend(notable)
        all_models.extend(large_scale)
        
        # Add flags
        for model in notable:
            model["epoch_notable"] = True
        
        for model in large_scale:
            model["epoch_large_scale"] = True
        
        # Deduplicate
        deduplicated = self.deduplicate_models(all_models)
        
        return deduplicated

