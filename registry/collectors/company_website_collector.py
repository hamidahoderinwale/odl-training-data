"""
Company Website Collector
Searches company websites for model release dates and announcements
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import re

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from ingestion.exa_client import ExaClient
except ImportError:
    ExaClient = None


class CompanyWebsiteCollector:
    """Collects model release dates from company websites"""
    
    # Company website mappings
    COMPANY_DOMAINS = {
        "OpenAI": ["openai.com", "openai.com/research", "openai.com/blog"],
        "Anthropic": ["anthropic.com", "anthropic.com/news", "anthropic.com/research"],
        "Google": ["deepmind.com", "ai.googleblog.com", "blog.google"],
        "Google DeepMind": ["deepmind.com", "deepmind.google"],
        "Meta": ["ai.meta.com", "about.meta.com", "ai.facebook.com"],
        "Microsoft": ["microsoft.com", "blogs.microsoft.com", "microsoft.com/research"],
        "Mistral AI": ["mistral.ai", "mistral.ai/news"],
        "Cohere": ["cohere.com", "cohere.com/blog"],
        "xAI": ["x.ai", "x.ai/blog"],
        "AI21 Labs": ["ai21.com", "ai21.com/blog"],
    }
    
    def __init__(self, exa_api_key: Optional[str] = None):
        """Initialize collector"""
        if ExaClient:
            try:
                self.exa_client = ExaClient(api_key=exa_api_key)
            except Exception as e:
                print(f"Warning: Exa client initialization failed: {e}")
                self.exa_client = None
        else:
            self.exa_client = None
    
    def search_company_site(
        self,
        model_id: str,
        provider: str,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search company website for model release information
        
        Args:
            model_id: Model identifier
            provider: Model provider
            max_results: Maximum number of results
        
        Returns:
            List of search results with release date information
        """
        if not self.exa_client:
            return []
        
        # Get company domains
        domains = self.COMPANY_DOMAINS.get(provider, [])
        if not domains:
            # Try to infer domain from provider name
            domain = provider.lower().replace(" ", "").replace(".", "") + ".com"
            domains = [domain]
        
        all_results = []
        
        # Build queries targeting company sites
        queries = self._build_queries(model_id, provider, domains)
        
        for query in queries:
            try:
                results = self.exa_client.search(
                    query=query,
                    num_results=max_results
                )
                all_results.extend(results)
            except Exception as e:
                print(f"Error searching for '{query}': {e}")
                continue
        
        # Deduplicate by URL
        seen_urls = set()
        unique_results = []
        for result in all_results:
            if result.url not in seen_urls:
                seen_urls.add(result.url)
                unique_results.append(result)
        
        # Sort by relevance
        unique_results.sort(key=lambda r: self._relevance_score(r, model_id, provider), reverse=True)
        
        return unique_results[:max_results]
    
    def _build_queries(
        self,
        model_id: str,
        provider: str,
        domains: List[str]
    ) -> List[str]:
        """Build search queries targeting company websites"""
        queries = []
        
        # Site-specific queries
        for domain in domains[:2]:  # Limit to top 2 domains
            queries.append(f'site:{domain} "{model_id}" release announcement')
            queries.append(f'site:{domain} "{model_id}" launch date')
            queries.append(f'site:{domain} "{model_id}" technical report')
            queries.append(f'site:{domain} "{provider}" "{model_id}"')
        
        # General queries with company context
        queries.append(f'"{provider}" "{model_id}" release date announcement')
        queries.append(f'"{provider}" "{model_id}" launch blog post')
        
        return queries
    
    def _relevance_score(
        self,
        result: Any,
        model_id: str,
        provider: str
    ) -> float:
        """Calculate relevance score"""
        score = result.score if hasattr(result, 'score') else 0.0
        
        title = (result.title or "").lower()
        summary = (result.summary or "").lower()
        text = f"{title} {summary}"
        
        model_lower = model_id.lower()
        provider_lower = provider.lower()
        
        # Boost for exact matches
        if model_lower in title:
            score += 5.0
        if provider_lower in title:
            score += 2.0
        
        # Boost for release-related keywords
        if any(kw in text for kw in ["release", "launch", "announce", "introduce"]):
            score += 3.0
        
        # Boost for date mentions
        if re.search(r'\b(20\d{2}|january|february|march|april|may|june|july|august|september|october|november|december)', text, re.IGNORECASE):
            score += 2.0
        
        return score
    
    def extract_release_date(
        self,
        results: List[Any],
        model_id: str,
        provider: str
    ) -> Optional[datetime]:
        """
        Extract release date from search results
        
        Args:
            results: List of search results
            model_id: Model identifier
            provider: Model provider
        
        Returns:
            Release date if found, None otherwise
        """
        if not results:
            return None
        
        # Try to extract date from top results
        for result in results[:3]:  # Check top 3 results
            # Get full content if available
            content = ""
            if hasattr(result, 'summary') and result.summary:
                content = result.summary
            
            # Try to fetch full content via Exa
            if self.exa_client and hasattr(result, 'url'):
                try:
                    contents = self.exa_client.get_contents([result.url])
                    if result.url in contents:
                        content = contents[result.url]
                except Exception:
                    pass
            
            # Extract date from content
            date = self._parse_date_from_text(content, model_id)
            if date:
                return date
        
        # Fallback: use published_date from result
        if results and hasattr(results[0], 'published_date') and results[0].published_date:
            try:
                return datetime.fromisoformat(results[0].published_date.replace('Z', '+00:00'))
            except (ValueError, AttributeError):
                pass
        
        return None
    
    def _parse_date_from_text(self, text: str, model_id: str) -> Optional[datetime]:
        """Parse date from text content"""
        if not text:
            return None
        
        # Common date patterns
        patterns = [
            # ISO format: 2024-03-14
            r'\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b',
            # Month name: March 14, 2024 or 14 March 2024
            r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2}),?\s+(20\d{2})\b',
            r'\b(\d{1,2})\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(20\d{2})\b',
            # Year only: 2024
            r'\b(20\d{2})\b',
        ]
        
        month_names = {
            'january': 1, 'february': 2, 'march': 3, 'april': 4,
            'may': 5, 'june': 6, 'july': 7, 'august': 8,
            'september': 9, 'october': 10, 'november': 11, 'december': 12
        }
        
        # Look for dates near model mentions
        model_positions = [m.start() for m in re.finditer(re.escape(model_id.lower()), text.lower())]
        
        for pattern in patterns:
            for match in re.finditer(pattern, text, re.IGNORECASE):
                try:
                    if model_positions:
                        # Check if date is near a model mention (within 200 chars)
                        date_pos = match.start()
                        if any(abs(date_pos - pos) < 200 for pos in model_positions):
                            date_str = match.group(0)
                            date = self._parse_date_string(date_str, month_names)
                            if date:
                                return date
                    else:
                        # No model mention, but try to parse anyway
                        date_str = match.group(0)
                        date = self._parse_date_string(date_str, month_names)
                        if date:
                            return date
                except Exception:
                    continue
        
        return None
    
    def _parse_date_string(self, date_str: str, month_names: Dict[str, int]) -> Optional[datetime]:
        """Parse a date string into datetime"""
        try:
            # ISO format
            if re.match(r'^\d{4}-\d{2}-\d{2}$', date_str):
                return datetime.fromisoformat(date_str)
            
            # Month name format
            parts = date_str.lower().split()
            if len(parts) >= 3:
                month_name = None
                day = None
                year = None
                
                for part in parts:
                    if part in month_names:
                        month_name = part
                    elif part.isdigit():
                        if len(part) == 4:
                            year = int(part)
                        else:
                            day = int(part)
                
                if month_name and day and year:
                    return datetime(year, month_names[month_name], day)
            
            # Year only
            if re.match(r'^20\d{2}$', date_str):
                return datetime(int(date_str), 1, 1)
                
        except:
            pass
        
        return None


if __name__ == "__main__":
    collector = CompanyWebsiteCollector()
    
    # Test with Claude 3.5
    results = collector.search_company_site("Claude 3.5", "Anthropic", max_results=5)
    print(f"\nFound {len(results)} results for Claude 3.5")
    for result in results:
        print(f"\n{result.title}")
        print(f"  URL: {result.url}")
        if hasattr(result, 'published_date'):
            print(f"  Published: {result.published_date}")
    
    release_date = collector.extract_release_date(results, "Claude 3.5", "Anthropic")
    print(f"\nExtracted release date: {release_date}")


