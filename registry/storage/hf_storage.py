"""
Hugging Face Datasets Storage
Stores and retrieves registry data using Hugging Face Datasets
"""

from datasets import Dataset, load_dataset
from huggingface_hub import HfApi, login
from typing import List, Dict, Any, Optional
import pandas as pd
from pathlib import Path
import os
import sys
from dotenv import load_dotenv

load_dotenv()

sys.path.append(str(Path(__file__).parent.parent))
from schema import ModelRecord


class HFRegistryStorage:
    """Store registry in Hugging Face Datasets"""
    
    def __init__(self, repo_id: str, token: Optional[str] = None):
        """
        Initialize storage
        
        Args:
            repo_id: Hugging Face repository ID (e.g., "username/registry-name")
            token: HF token (or use HF_TOKEN env var)
        """
        self.repo_id = repo_id
        self.token = token or os.getenv("HF_TOKEN")
        
        if self.token:
            login(token=self.token)
        
        self.api = HfApi()
    
    def create_dataset(self, records: List[ModelRecord]) -> Dataset:
        """
        Create Hugging Face Dataset from model records
        
        Args:
            records: List of ModelRecord objects
        
        Returns:
            Hugging Face Dataset
        """
        # Convert to dicts
        data = [r.to_dict() for r in records]
        
        # Create dataset
        dataset = Dataset.from_list(data)
        
        return dataset
    
    def push_to_hub(
        self,
        dataset: Dataset,
        version: Optional[str] = None,
        private: bool = False
    ) -> str:
        """
        Push dataset to Hugging Face Hub
        
        Args:
            dataset: Dataset to push
            version: Optional version tag
            private: Whether dataset should be private
        
        Returns:
            URL of pushed dataset
        """
        try:
            dataset.push_to_hub(
                repo_id=self.repo_id,
                token=self.token,
                private=private
            )
            
            url = f"https://huggingface.co/datasets/{self.repo_id}"
            return url
        except Exception as e:
            print(f"Error pushing to hub: {e}")
            raise
    
    def load_from_hub(self) -> Dataset:
        """
        Load dataset from Hugging Face Hub
        
        Returns:
            Dataset from hub
        """
        try:
            dataset = load_dataset(self.repo_id)
            # Handle DatasetDict vs Dataset
            if isinstance(dataset, dict):
                dataset = dataset.get("train", list(dataset.values())[0])
            return dataset
        except Exception as e:
            print(f"Error loading from hub: {e}")
            # Return empty dataset if not found
            return Dataset.from_list([])
    
    def append_records(
        self,
        new_records: List[ModelRecord],
        update_existing: bool = True
    ) -> Dataset:
        """
        Append new records to existing dataset
        
        Args:
            new_records: New model records to add
            update_existing: If True, update existing records with same model_id
        
        Returns:
            Updated dataset
        """
        # Load existing
        existing = self.load_from_hub()
        
        # Convert to pandas for easier manipulation
        if len(existing) > 0:
            df_existing = existing.to_pandas()
        else:
            df_existing = pd.DataFrame()
        
        # Convert new records
        df_new = pd.DataFrame([r.to_dict() for r in new_records])
        
        if update_existing and len(df_existing) > 0:
            # Update existing records
            for idx, row in df_new.iterrows():
                mask = df_existing["model_id"] == row["model_id"]
                if mask.any():
                    df_existing.loc[mask] = row
                else:
                    df_existing = pd.concat([df_existing, row.to_frame().T], ignore_index=True)
        else:
            # Just append
            df_existing = pd.concat([df_existing, df_new], ignore_index=True)
        
        # Convert back to dataset
        dataset = Dataset.from_pandas(df_existing)
        
        return dataset
    
    def get_model(self, model_id: str) -> Optional[Dict[str, Any]]:
        """
        Get single model record by ID
        
        Args:
            model_id: Model identifier
        
        Returns:
            Model record dict or None
        """
        dataset = self.load_from_hub()
        
        if len(dataset) == 0:
            return None
        
        # Filter by model_id
        filtered = dataset.filter(lambda x: x["model_id"] == model_id)
        
        if len(filtered) > 0:
            return filtered[0]
        
        return None

