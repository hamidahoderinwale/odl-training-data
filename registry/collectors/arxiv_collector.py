"""
arXiv Collector
Searches arXiv for technical reports and extracts release dates
"""

import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime
import re
import requests
from urllib.parse import quote

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


class ArxivCollector:
    """Collects model information from arXiv technical reports"""
    
    ARXIV_API_BASE = "http://export.arxiv.org/api/query"
    
    # Model name mappings to help find papers
    MODEL_PAPER_MAPPINGS = {
        "GPT-4": ["GPT-4", "gpt-4", "GPT4"],
        "GPT-3": ["GPT-3", "gpt-3", "GPT3", "Language Models are Few-Shot Learners"],
        "GPT-3.5": ["GPT-3.5", "gpt-3.5", "GPT3.5"],
        "Claude": ["Claude", "claude", "Anthropic"],
        "Claude 2": ["Claude 2", "claude-2", "Claude2"],
        "Claude 3": ["Claude 3", "claude-3", "Claude3"],
        "Claude 3.5": ["Claude 3.5", "claude-3.5", "Claude3.5"],
        "Gemini": ["Gemini", "gemini"],
        "PaLM": ["PaLM", "palm", "Pathways Language Model"],
        "LLaMA": ["LLaMA", "llama", "Large Language Model Meta AI"],
        "LLaMA 2": ["LLaMA 2", "llama-2", "llama2"],
        "LLaMA 3": ["LLaMA 3", "llama-3", "llama3"],
        "Mistral": ["Mistral", "mistral"],
        "Mixtral": ["Mixtral", "mixtral"],
        "Grok": ["Grok", "grok", "xAI"],
        "Command": ["Command", "command", "Cohere"],
        "Jurassic": ["Jurassic", "jurassic", "AI21"],
    }
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            "User-Agent": "AI-Training-Data-Deals-Bot/1.0 (contact@example.com)"
        })
    
    def search_arxiv(
        self,
        model_id: str,
        provider: str,
        max_results: int = 10
    ) -> List[Dict[str, Any]]:
        """
        Search arXiv for papers related to a model
        
        Args:
            model_id: Model identifier (e.g., "GPT-4", "Claude 3.5")
            provider: Model provider (e.g., "OpenAI", "Anthropic")
            max_results: Maximum number of results to return
        
        Returns:
            List of paper metadata dicts
        """
        # Build search query
        queries = self._build_queries(model_id, provider)
        
        all_papers = []
        seen_ids = set()
        
        for query in queries:
            try:
                papers = self._query_arxiv(query, max_results)
                for paper in papers:
                    arxiv_id = paper.get("id")
                    if arxiv_id and arxiv_id not in seen_ids:
                        seen_ids.add(arxiv_id)
                        all_papers.append(paper)
            except Exception as e:
                print(f"Error querying arXiv with '{query}': {e}")
                continue
        
        # Sort by relevance (prefer exact matches)
        all_papers.sort(key=lambda p: self._relevance_score(p, model_id, provider), reverse=True)
        
        return all_papers[:max_results]
    
    def _build_queries(self, model_id: str, provider: str) -> List[str]:
        """Build arXiv search queries"""
        queries = []
        
        # Direct model name search
        queries.append(f'all:"{model_id}"')
        
        # Provider + model
        queries.append(f'all:"{provider}" AND all:"{model_id}"')
        
        # Check for known paper mappings
        for key, variants in self.MODEL_PAPER_MAPPINGS.items():
            if key.lower() in model_id.lower():
                for variant in variants[:2]:  # Use first 2 variants
                    queries.append(f'all:"{variant}"')
        
        # Technical report keywords
        queries.append(f'all:"{model_id}" AND (all:"technical report" OR all:"system card" OR all:"model card")')
        
        return queries
    
    def _query_arxiv(self, search_query: str, max_results: int = 10) -> List[Dict[str, Any]]:
        """Query arXiv API"""
        params = {
            "search_query": search_query,
            "start": 0,
            "max_results": max_results,
            "sortBy": "relevance",
            "sortOrder": "descending"
        }
        
        try:
            response = self.session.get(self.ARXIV_API_BASE, params=params, timeout=30)
            response.raise_for_status()
            
            # Parse XML response
            import xml.etree.ElementTree as ET
            root = ET.fromstring(response.content)
            
            # Namespace handling
            ns = {'atom': 'http://www.w3.org/2005/Atom'}
            
            papers = []
            for entry in root.findall('atom:entry', ns):
                paper = self._parse_entry(entry, ns)
                if paper:
                    papers.append(paper)
            
            return papers
            
        except Exception as e:
            print(f"arXiv API error: {e}")
            return []
    
    def _parse_entry(self, entry, ns) -> Optional[Dict[str, Any]]:
        """Parse an arXiv entry"""
        try:
            # Extract ID
            arxiv_id_elem = entry.find('atom:id', ns)
            arxiv_id = arxiv_id_elem.text if arxiv_id_elem is not None else None
            if arxiv_id:
                # Extract just the ID part (e.g., "2303.08774" from "http://arxiv.org/abs/2303.08774v1")
                arxiv_id = arxiv_id.split('/')[-1].split('v')[0]
            
            # Extract title
            title_elem = entry.find('atom:title', ns)
            title = title_elem.text.strip() if title_elem is not None and title_elem.text else None
            
            # Extract published date
            published_elem = entry.find('atom:published', ns)
            published_date = None
            if published_elem is not None and published_elem.text:
                try:
                    published_date = datetime.fromisoformat(published_elem.text.replace('Z', '+00:00'))
                except (ValueError, AttributeError):
                    pass
            
            # Extract summary
            summary_elem = entry.find('atom:summary', ns)
            summary = summary_elem.text.strip() if summary_elem is not None and summary_elem.text else None
            
            # Extract authors
            authors = []
            for author in entry.findall('atom:author', ns):
                name_elem = author.find('atom:name', ns)
                if name_elem is not None and name_elem.text:
                    authors.append(name_elem.text.strip())
            
            # Extract categories
            categories = []
            for category in entry.findall('atom:category', ns):
                term = category.get('term')
                if term:
                    categories.append(term)
            
            # Build URL
            url = f"https://arxiv.org/abs/{arxiv_id}" if arxiv_id else None
            
            return {
                "arxiv_id": arxiv_id,
                "title": title,
                "published_date": published_date,
                "summary": summary,
                "authors": authors,
                "categories": categories,
                "url": url,
                "source": "arxiv"
            }
            
        except Exception as e:
            print(f"Error parsing arXiv entry: {e}")
            return None
    
    def _relevance_score(self, paper: Dict[str, Any], model_id: str, provider: str) -> float:
        """Calculate relevance score for a paper"""
        score = 0.0
        title = (paper.get("title") or "").lower()
        summary = (paper.get("summary") or "").lower()
        text = f"{title} {summary}"
        
        model_lower = model_id.lower()
        provider_lower = provider.lower()
        
        # Exact model name match
        if model_lower in title:
            score += 10.0
        elif model_lower in text:
            score += 5.0
        
        # Provider match
        if provider_lower in text:
            score += 3.0
        
        # Technical report keywords
        if any(kw in text for kw in ["technical report", "system card", "model card", "paper"]):
            score += 2.0
        
        # Recency (newer papers are more relevant)
        published = paper.get("published_date")
        if published:
            days_ago = (datetime.now(published.tzinfo) - published).days
            if days_ago < 365:
                score += 1.0
        
        return score
    
    def extract_release_date(self, papers: List[Dict[str, Any]]) -> Optional[datetime]:
        """
        Extract release date from arXiv papers
        
        Args:
            papers: List of paper metadata
        
        Returns:
            Release date if found, None otherwise
        """
        if not papers:
            return None
        
        # Use the most relevant paper's published date
        top_paper = papers[0]
        published_date = top_paper.get("published_date")
        
        if published_date:
            return published_date
        
        return None


if __name__ == "__main__":
    collector = ArxivCollector()
    
    # Test with GPT-4
    papers = collector.search_arxiv("GPT-4", "OpenAI", max_results=5)
    print(f"\nFound {len(papers)} papers for GPT-4")
    for paper in papers:
        print(f"\n{paper['title']}")
        print(f"  Published: {paper.get('published_date')}")
        print(f"  URL: {paper.get('url')}")
    
    release_date = collector.extract_release_date(papers)
    print(f"\nExtracted release date: {release_date}")


