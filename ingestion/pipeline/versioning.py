"""
Versioning & Governance System
Track changes, maintain provenance, enable PKL-style audit trails
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import json
import hashlib
from pathlib import Path


class DealVersioning:
    """Version control for deals"""
    
    def __init__(self, storage_path: Optional[Path] = None):
        self.storage_path = storage_path or Path("data/deal_versions")
        self.storage_path.mkdir(parents=True, exist_ok=True)
    
    def create_version(self, deal: Dict[str, Any], change_reason: str = "extraction") -> Dict[str, Any]:
        """
        Create versioned deal record
        
        Args:
            deal: Deal dict
            change_reason: Reason for this version
        
        Returns:
            Versioned deal with metadata
        """
        # Generate version ID
        version_id = self._generate_version_id(deal)
        
        # Create version record
        versioned = deal.copy()
        versioned["version_id"] = version_id
        versioned["version_created_at"] = datetime.now().isoformat()
        versioned["change_reason"] = change_reason
        versioned["version"] = self._increment_version(deal.get("version", "1.0"))
        
        # Store version
        self._store_version(versioned)
        
        return versioned
    
    def compare_versions(self, deal1: Dict[str, Any], deal2: Dict[str, Any]) -> Dict[str, Any]:
        """
        Compare two versions of a deal
        
        Args:
            deal1: First version
            deal2: Second version
        
        Returns:
            Comparison dict with changes
        """
        changes = []
        
        # Compare key fields
        key_fields = [
            "price_usd", "duration_years", "exclusive", "pricing_mechanism",
            "provider", "buyer", "modality", "content_type"
        ]
        
        for field in key_fields:
            val1 = deal1.get(field)
            val2 = deal2.get(field)
            
            if val1 != val2:
                changes.append({
                    "field": field,
                    "old_value": val1,
                    "new_value": val2,
                })
        
        return {
            "has_changes": len(changes) > 0,
            "changes": changes,
            "compared_at": datetime.now().isoformat(),
        }
    
    def get_version_history(self, deal_id: str) -> List[Dict[str, Any]]:
        """
        Get version history for a deal
        
        Args:
            deal_id: Deal identifier
        
        Returns:
            List of version records
        """
        # Load from storage
        version_file = self.storage_path / f"{deal_id}_versions.json"
        
        if version_file.exists():
            with open(version_file, 'r') as f:
                return json.load(f)
        
        return []
    
    def _generate_version_id(self, deal: Dict[str, Any]) -> str:
        """Generate unique version ID"""
        # Use deal content hash + timestamp
        deal_str = json.dumps(deal, sort_keys=True)
        content_hash = hashlib.md5(deal_str.encode()).hexdigest()[:8]
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        return f"{content_hash}_{timestamp}"
    
    def _increment_version(self, current_version: str) -> str:
        """Increment version number"""
        try:
            parts = current_version.split(".")
            if len(parts) >= 3:
                # Format: YYYY.MM.DD.XXX
                date_parts = parts[:3]
                counter = int(parts[3]) if len(parts) > 3 else 0
                counter += 1
                return f"{'.'.join(date_parts)}.{counter:03d}"
            else:
                # Simple increment
                return f"{current_version}.001"
        except:
            # Default version
            return datetime.now().strftime("%Y.%m.%d.001")
    
    def _store_version(self, versioned_deal: Dict[str, Any]):
        """Store version to disk"""
        deal_id = versioned_deal.get("deal_id") or versioned_deal.get("id", "unknown")
        version_file = self.storage_path / f"{deal_id}_versions.json"
        
        # Load existing versions
        versions = []
        if version_file.exists():
            with open(version_file, 'r') as f:
                versions = json.load(f)
        
        # Add new version
        versions.append(versioned_deal)
        
        # Save
        with open(version_file, 'w') as f:
            json.dump(versions, f, indent=2)


class ProvenanceTracker:
    """Track provenance for deals"""
    
    def __init__(self):
        pass
    
    def create_provenance_record(
        self,
        deal: Dict[str, Any],
        sources: List[Dict[str, Any]],
        extraction_method: str,
        extraction_confidence: str
    ) -> Dict[str, Any]:
        """
        Create provenance record
        
        Args:
            deal: Deal dict
            sources: List of source dicts
            extraction_method: Method used (regex, llm, hybrid)
            extraction_confidence: Confidence level
        
        Returns:
            Provenance record
        """
        return {
            "deal_id": deal.get("deal_id") or deal.get("id"),
            "sources": sources,
            "extraction_method": extraction_method,
            "extraction_confidence": extraction_confidence,
            "extraction_timestamp": datetime.now().isoformat(),
            "extraction_rationale": deal.get("extraction_rationale"),
            "raw_text_snippets": deal.get("raw_text_snippets", []),
            "provenance_chain": self._build_provenance_chain(sources),
        }
    
    def _build_provenance_chain(self, sources: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Build provenance chain from sources"""
        chain = []
        
        for source in sources:
            chain.append({
                "type": source.get("type", "unknown"),
                "url": source.get("url", ""),
                "retrieved_at": source.get("retrieved_at", datetime.now().isoformat()),
                "via": source.get("via", "unknown"),
            })
        
        return chain

