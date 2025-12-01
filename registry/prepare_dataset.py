"""
Prepare initial dataset for Hugging Face upload
Creates an empty dataset structure that can be populated by the pipeline
"""

import json
from pathlib import Path
from datasets import Dataset
from schema import ModelRecord

def create_empty_dataset():
    """Create an empty dataset with proper schema"""
    # Create empty dataset with schema
    empty_data = [{
        "model_id": "",
        "provider": "",
        "year": None,
        "model_family": None,
        "domain": None,
        "params": None,
        "params_active": None,
        "is_moe": False,
        "flops": None,
        "num_chips": None,
        "chip_type": None,
        "training_duration_days": None,
        "tokens_est_min": None,
        "tokens_est_max": None,
        "tokens_est_mid": None,
        "evidence_types": [],
        "evidence_strength": None,
        "uncertainty_sources": [],
        "raw_evidence_snippets": [],
        "data_composition_hints": [],
        "synthetic_fraction_est": None,
        "sources": [],
        "epoch_large_scale": False,
        "epoch_notable": False,
        "created_at": "",
        "updated_at": "",
        "version": "1.0",
    }]
    
    dataset = Dataset.from_list(empty_data)
    
    # Remove the empty row
    dataset = dataset.filter(lambda x: x["model_id"] != "")
    
    return dataset

if __name__ == "__main__":
    print("Creating empty dataset structure...")
    dataset = create_empty_dataset()
    
    # Save locally
    output_dir = Path(__file__).parent / "dataset"
    output_dir.mkdir(exist_ok=True)
    
    # Save as parquet
    dataset.to_parquet(output_dir / "data.parquet")
    print(f"✅ Created dataset at {output_dir / 'data.parquet'}")
    print(f"   Dataset has {len(dataset)} records")
    print(f"\nTo upload to Hugging Face:")
    print(f"  cd registry/dataset")
    print(f"  hf upload midah/odl-training-data . --repo-type=dataset")

