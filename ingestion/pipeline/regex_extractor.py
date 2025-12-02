"""
Stage B: Regex & Pattern Matching
Extract structured fields using regex patterns
"""

import re
from typing import Dict, Any, Optional, List
from datetime import datetime


class RegexExtractor:
    """Extract deal fields using regex patterns"""
    
    def __init__(self):
        # Price patterns
        self.price_patterns = [
            r'\$[\d,]+(?:\.\d+)?\s*(?:million|M|billion|B)',
            r'[\d,]+(?:\.\d+)?\s*(?:million|M|billion|B)\s*(?:USD|dollars?)',
            r'USD\s*[\d,]+(?:\.\d+)?',
            r'over\s+\$[\d,]+(?:\.\d+)?',
            r'worth\s+\$[\d,]+(?:\.\d+)?',
        ]
        
        # Duration patterns
        self.duration_patterns = [
            r'(\d+)\s+years?',
            r'multi-year',
            r'(\d+)\s+year\s+agreement',
            r'(\d+)\s+year\s+deal',
        ]
        
        # Exclusivity patterns
        self.exclusive_patterns = [
            r'\bexclusive\b',
            r'\bnon-exclusive\b',
            r'\bexclusively\b',
        ]
        
        # API/volume patterns
        self.api_patterns = [
            r'per\s+[\d,]+\s+API\s+calls?',
            r'per\s+[\d,]+\s+calls?',
            r'API\s+volume',
            r'API\s+access',
        ]
        
        # Modality patterns
        self.modality_patterns = {
            'text': [r'\bnews\b', r'\barchives?\b', r'\barticles?\b', r'\bcontent\b'],
            'image': [r'\bimages?\b', r'\bphotos?\b', r'\bpictures?\b', r'\bphotography\b'],
            'audio': [r'\baudio\b', r'\bmusic\b', r'\bsongs?\b', r'\btracks?\b'],
            'video': [r'\bvideo\b', r'\bvideos?\b', r'\bfootage\b'],
            'code': [r'\bcode\b', r'\brepositories?\b', r'\bsoftware\b'],
        }
    
    def extract_price(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract price information
        
        Returns:
            Dict with price, currency, and confidence
        """
        for pattern in self.price_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                price_str = match.group(0)
                value = self._parse_price(price_str)
                
                if value:
                    return {
                        "price": value,
                        "currency": "USD",
                        "text": price_str,
                        "confidence": "high" if "$" in price_str else "medium",
                    }
        
        return None
    
    def extract_duration(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract duration in years
        
        Returns:
            Dict with duration_years
        """
        for pattern in self.duration_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                if 'multi-year' in match.group(0).lower():
                    return {
                        "duration_years": None,  # Unknown but multi-year
                        "is_multi_year": True,
                        "text": match.group(0),
                        "confidence": "medium",
                    }
                else:
                    years = int(match.group(1))
                    return {
                        "duration_years": years,
                        "is_multi_year": False,
                        "text": match.group(0),
                        "confidence": "high",
                    }
        
        return None
    
    def extract_exclusivity(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract exclusivity information
        
        Returns:
            Dict with exclusive boolean
        """
        text_lower = text.lower()
        
        for pattern in self.exclusive_patterns:
            match = re.search(pattern, text_lower)
            if match:
                exclusive_text = match.group(0).lower()
                is_exclusive = 'non-exclusive' not in exclusive_text
                
                return {
                    "exclusive": is_exclusive,
                    "text": match.group(0),
                    "confidence": "high",
                }
        
        return None
    
    def extract_pricing_mechanism(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract pricing mechanism
        
        Returns:
            Dict with pricing_mechanism
        """
        text_lower = text.lower()
        
        # Check for API patterns
        for pattern in self.api_patterns:
            if re.search(pattern, text_lower):
                return {
                    "pricing_mechanism": "API volume licensing",
                    "text": pattern,
                    "confidence": "high",
                }
        
        # Check for other mechanisms
        if 'royalty' in text_lower:
            return {"pricing_mechanism": "royalty", "confidence": "high"}
        elif 'fixed fee' in text_lower or 'one-time' in text_lower:
            return {"pricing_mechanism": "fixed fee", "confidence": "high"}
        elif 'subscription' in text_lower:
            return {"pricing_mechanism": "subscription", "confidence": "high"}
        elif 'access' in text_lower and 'license' in text_lower:
            return {"pricing_mechanism": "access / aggregate licensing", "confidence": "medium"}
        
        return None
    
    def extract_modality(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract data modality
        
        Returns:
            Dict with modality and content_type
        """
        text_lower = text.lower()
        found_modalities = []
        
        for modality, patterns in self.modality_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    found_modalities.append(modality)
                    break
        
        if found_modalities:
            # Return most specific or first
            primary_modality = found_modalities[0]
            
            # Map to standard modality names
            modality_map = {
                'text': 'Text',
                'image': 'Image',
                'audio': 'Audio',
                'video': 'Video',
                'code': 'Text',  # Code is text
            }
            
            return {
                "modality": modality_map.get(primary_modality, 'Text'),
                "content_type": primary_modality,
                "confidence": "medium",
            }
        
        return None
    
    def extract_all(self, text: str) -> Dict[str, Any]:
        """
        Extract all fields using regex
        
        Returns:
            Dict with all extracted fields
        """
        extracted = {
            "extracted_at": datetime.now().isoformat(),
            "method": "regex",
        }
        
        # Extract each field
        price = self.extract_price(text)
        if price:
            extracted["price"] = price
        
        duration = self.extract_duration(text)
        if duration:
            extracted["duration"] = duration
        
        exclusivity = self.extract_exclusivity(text)
        if exclusivity:
            extracted["exclusivity"] = exclusivity
        
        pricing_mechanism = self.extract_pricing_mechanism(text)
        if pricing_mechanism:
            extracted["pricing_mechanism"] = pricing_mechanism
        
        modality = self.extract_modality(text)
        if modality:
            extracted["modality"] = modality
        
        return extracted
    
    def _parse_price(self, price_str: str) -> Optional[float]:
        """Parse price string to float"""
        # Remove $ and commas
        cleaned = re.sub(r'[$,]', '', price_str)
        
        # Extract number
        number_match = re.search(r'[\d.]+', cleaned)
        if not number_match:
            return None
        
        number = float(number_match.group(0))
        
        # Check for multipliers
        if 'billion' in cleaned.lower() or 'B' in cleaned.upper():
            number *= 1e9
        elif 'million' in cleaned.lower() or 'M' in cleaned.upper():
            number *= 1e6
        elif 'trillion' in cleaned.lower() or 'T' in cleaned.upper():
            number *= 1e12
        
        return number

