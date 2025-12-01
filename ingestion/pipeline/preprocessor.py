"""
Stage A: Preprocessing
Normalize text, extract entities, dates, currency, deal keywords
"""

import re
from typing import Dict, List, Any, Optional
from datetime import datetime
import unicodedata


class DealPreprocessor:
    """Preprocess text for deal extraction"""
    
    # Deal structure keywords
    DEAL_KEYWORDS = [
        "multi-year", "licensing", "access", "archive", "exclusive",
        "royalty", "per API call", "per volume", "training data",
        "partnership", "agreement", "contract", "deal", "acquisition",
        "data feed", "content feed", "API access", "dataset license"
    ]
    
    # Currency patterns
    CURRENCY_PATTERNS = [
        r'\$[\d,]+(?:\.\d+)?\s*(?:million|M|billion|B|trillion|T)',
        r'[\d,]+(?:\.\d+)?\s*(?:million|M|billion|B|trillion|T)\s*(?:USD|dollars?)',
        r'USD\s*[\d,]+(?:\.\d+)?',
    ]
    
    # Date patterns
    DATE_PATTERNS = [
        r'\d{4}-\d{2}-\d{2}',  # YYYY-MM-DD
        r'\d{1,2}/\d{1,2}/\d{4}',  # MM/DD/YYYY
        r'(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}',
    ]
    
    def __init__(self):
        self.currency_regex = re.compile('|'.join(self.CURRENCY_PATTERNS), re.IGNORECASE)
        self.date_regex = re.compile('|'.join(self.DATE_PATTERNS), re.IGNORECASE)
    
    def normalize_text(self, text: str) -> str:
        """
        Normalize punctuation and whitespace
        
        Args:
            text: Raw text
        
        Returns:
            Normalized text
        """
        # Normalize unicode
        text = unicodedata.normalize('NFKD', text)
        
        # Normalize whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Normalize quotes
        text = re.sub(r'["""]', '"', text)
        text = re.sub(r"[''']", "'", text)
        
        # Normalize dashes
        text = re.sub(r'[–—]', '-', text)
        
        return text.strip()
    
    def remove_boilerplate(self, text: str) -> str:
        """
        Remove common boilerplate (headers, footers, navigation)
        
        Args:
            text: Text with potential boilerplate
        
        Returns:
            Cleaned text
        """
        # Remove common header/footer patterns
        patterns = [
            r'^(?:Home|About|Contact|Privacy|Terms).*?$',
            r'Cookie.*?policy',
            r'Subscribe.*?newsletter',
            r'Follow us on.*?$',
        ]
        
        for pattern in patterns:
            text = re.sub(pattern, '', text, flags=re.IGNORECASE | re.MULTILINE)
        
        return text.strip()
    
    def extract_entities(self, text: str) -> Dict[str, List[str]]:
        """
        Extract entity names (companies, organizations)
        
        Args:
            text: Text to extract from
        
        Returns:
            Dict with entity types and names
        """
        entities = {
            "companies": [],
            "organizations": [],
        }
        
        # Common AI companies
        ai_companies = [
            "OpenAI", "Google", "Anthropic", "Meta", "Microsoft",
            "Amazon", "Apple", "Tesla", "Nvidia", "Cohere"
        ]
        
        # Common data providers
        data_providers = [
            "Reddit", "News Corp", "NewsCorp", "Dow Jones", "WSJ",
            "Associated Press", "AP", "Shutterstock", "Getty Images",
            "Dotdash Meredith", "HarperCollins", "Wiley", "Springer",
            "Elsevier", "Reuters", "Bloomberg", "Financial Times"
        ]
        
        # Extract mentions
        for company in ai_companies + data_providers:
            pattern = rf'\b{re.escape(company)}\b'
            if re.search(pattern, text, re.IGNORECASE):
                if company in ai_companies:
                    entities["companies"].append(company)
                else:
                    entities["organizations"].append(company)
        
        return entities
    
    def extract_currency_amounts(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract currency amounts
        
        Args:
            text: Text to extract from
        
        Returns:
            List of currency amount dicts
        """
        amounts = []
        
        for match in self.currency_regex.finditer(text):
            amount_str = match.group(0)
            
            # Parse amount
            value = self._parse_currency(amount_str)
            
            amounts.append({
                "text": amount_str,
                "value": value,
                "position": match.start(),
            })
        
        return amounts
    
    def extract_dates(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract dates
        
        Args:
            text: Text to extract from
        
        Returns:
            List of date dicts
        """
        dates = []
        
        for match in self.date_regex.finditer(text):
            date_str = match.group(0)
            
            # Try to parse
            try:
                parsed_date = self._parse_date(date_str)
                dates.append({
                    "text": date_str,
                    "parsed": parsed_date,
                    "position": match.start(),
                })
            except:
                continue
        
        return dates
    
    def extract_deal_keywords(self, text: str) -> List[Dict[str, Any]]:
        """
        Extract deal structure keywords
        
        Args:
            text: Text to extract from
        
        Returns:
            List of keyword matches with context
        """
        keywords_found = []
        text_lower = text.lower()
        
        for keyword in self.DEAL_KEYWORDS:
            pattern = rf'\b{re.escape(keyword)}\b'
            for match in re.finditer(pattern, text_lower):
                # Get context (50 chars before and after)
                start = max(0, match.start() - 50)
                end = min(len(text), match.end() + 50)
                context = text[start:end]
                
                keywords_found.append({
                    "keyword": keyword,
                    "position": match.start(),
                    "context": context,
                })
        
        return keywords_found
    
    def preprocess(self, text: str) -> Dict[str, Any]:
        """
        Full preprocessing pipeline
        
        Args:
            text: Raw text
        
        Returns:
            Preprocessed data dict
        """
        # Normalize
        normalized = self.normalize_text(text)
        cleaned = self.remove_boilerplate(normalized)
        
        # Extract
        entities = self.extract_entities(cleaned)
        currency_amounts = self.extract_currency_amounts(cleaned)
        dates = self.extract_dates(cleaned)
        keywords = self.extract_deal_keywords(cleaned)
        
        return {
            "original_text": text,
            "normalized_text": cleaned,
            "entities": entities,
            "currency_amounts": currency_amounts,
            "dates": dates,
            "deal_keywords": keywords,
            "preprocessed_at": datetime.now().isoformat(),
        }
    
    def _parse_currency(self, amount_str: str) -> Optional[float]:
        """Parse currency string to float"""
        # Remove $ and commas
        cleaned = re.sub(r'[$,]', '', amount_str)
        
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
    
    def _parse_date(self, date_str: str) -> Optional[str]:
        """Parse date string to ISO format"""
        # Try different formats
        formats = [
            "%Y-%m-%d",
            "%m/%d/%Y",
            "%B %d, %Y",
            "%B %d %Y",
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_str, fmt)
                return dt.isoformat()
            except:
                continue
        
        return None

