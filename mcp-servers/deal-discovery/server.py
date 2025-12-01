"""
Deal Discovery MCP Server
Unifies discovery from RSS, News API, SEC, and Exa sources
"""

import os
import sys
from typing import Any, Dict, List, Optional
from pathlib import Path

project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from mcp.server import Server
    MCP_AVAILABLE = True
except ImportError:
    try:
        from mcp.server.stdio import stdio_server
        MCP_AVAILABLE = True
    except ImportError:
        MCP_AVAILABLE = False
        print("MCP SDK not installed. Install with: pip install mcp")

from ingestion.scrapers.rss_scraper import RSSScraper
from ingestion.scrapers.news_api_scraper import NewsAPIScraper
from ingestion.scrapers.sec_scraper import SECScraper
from ingestion.exa_deal_discovery import ExaDealDiscovery


class DealDiscoveryMCPServer:
    """MCP server for deal discovery from multiple sources"""
    
    def __init__(self):
        self.server = None
        self.rss_scraper = RSSScraper()
        self.news_scraper = NewsAPIScraper()
        self.sec_scraper = SECScraper()
        self.exa_discovery = ExaDealDiscovery() if os.getenv("EXA_API_KEY") else None
        
        if MCP_AVAILABLE:
            self.server = Server("deal-discovery")
            self._register_tools()
    
    def _register_tools(self):
        """Register MCP tools"""
        if not self.server:
            return
        
        @self.server.tool()
        async def discover_rss_feeds() -> dict:
            """
            Discover deals from RSS feeds.
            
            Returns:
                Dictionary with urls array and metadata
            """
            articles = self.rss_scraper.fetch_all_feeds()
            urls = [
                {
                    "url": a.get("url", ""),
                    "title": a.get("title", ""),
                    "summary": a.get("summary", ""),
                    "published_date": a.get("published_date"),
                    "source": "rss",
                }
                for a in articles
            ]
            return {
                "urls": urls,
                "count": len(urls),
                "source": "rss"
            }
        
        @self.server.tool()
        async def discover_news_api(days_back: int = 7) -> dict:
            """
            Discover deals from News API.
            
            Args:
                days_back: Number of days to search back
                
            Returns:
                Dictionary with urls array and metadata
            """
            if not self.news_scraper.api_key:
                return {"error": "News API key not configured", "urls": []}
            
            articles = self.news_scraper.search_deal_queries(days_back)
            urls = [
                {
                    "url": a.get("url", ""),
                    "title": a.get("title", ""),
                    "summary": a.get("summary", ""),
                    "published_date": a.get("published_date"),
                    "source": "news_api",
                }
                for a in articles
            ]
            return {
                "urls": urls,
                "count": len(urls),
                "source": "news_api"
            }
        
        @self.server.tool()
        async def discover_sec_filings(days_back: int = 30) -> dict:
            """
            Discover deals from SEC filings.
            
            Args:
                days_back: Number of days to search back
                
            Returns:
                Dictionary with urls array and metadata
            """
            filings = self.sec_scraper.fetch_recent_filings(days_back)
            urls = [
                {
                    "url": f.get("url", ""),
                    "title": f.get("title", ""),
                    "published_date": f.get("published_date"),
                    "source": "sec_filing",
                }
                for f in filings
            ]
            return {
                "urls": urls,
                "count": len(urls),
                "source": "sec"
            }
        
        @self.server.tool()
        async def discover_exa() -> dict:
            """
            Discover deals using Exa API.
            
            Returns:
                Dictionary with urls array and metadata
            """
            if not self.exa_discovery:
                return {"error": "Exa API key not configured", "urls": []}
            
            results = self.exa_discovery.run_discovery_queries()
            urls = [
                {
                    "url": r.get("url", ""),
                    "title": r.get("title", ""),
                    "summary": r.get("summary", ""),
                    "published_date": r.get("published_date"),
                    "source": "exa",
                    "exa_score": r.get("exa_rank"),
                }
                for r in results
            ]
            return {
                "urls": urls,
                "count": len(urls),
                "source": "exa"
            }
        
        @self.server.tool()
        async def discover_all(days_back: int = 7) -> dict:
            """
            Discover deals from all available sources.
            
            Args:
                days_back: Number of days to search back
                
            Returns:
                Dictionary with combined urls from all sources
            """
            all_urls = []
            sources_used = []
            
            # RSS
            rss_articles = self.rss_scraper.fetch_all_feeds()
            rss_urls = [
                {
                    "url": a.get("url", ""),
                    "title": a.get("title", ""),
                    "summary": a.get("summary", ""),
                    "published_date": a.get("published_date"),
                    "source": "rss",
                }
                for a in rss_articles
            ]
            all_urls.extend(rss_urls)
            sources_used.append("rss")
            
            # News API
            if self.news_scraper.api_key:
                news_articles = self.news_scraper.search_deal_queries(days_back)
                news_urls = [
                    {
                        "url": a.get("url", ""),
                        "title": a.get("title", ""),
                        "summary": a.get("summary", ""),
                        "published_date": a.get("published_date"),
                        "source": "news_api",
                    }
                    for a in news_articles
                ]
                all_urls.extend(news_urls)
                sources_used.append("news_api")
            
            # SEC
            sec_filings = self.sec_scraper.fetch_recent_filings(days_back)
            sec_urls = [
                {
                    "url": f.get("url", ""),
                    "title": f.get("title", ""),
                    "published_date": f.get("published_date"),
                    "source": "sec_filing",
                }
                for f in sec_filings
            ]
            all_urls.extend(sec_urls)
            sources_used.append("sec")
            
            # Exa
            if self.exa_discovery:
                exa_results = self.exa_discovery.run_discovery_queries()
                exa_urls = [
                    {
                        "url": r.get("url", ""),
                        "title": r.get("title", ""),
                        "summary": r.get("summary", ""),
                        "published_date": r.get("published_date"),
                        "source": "exa",
                        "exa_score": r.get("exa_rank"),
                    }
                    for r in exa_results
                ]
                all_urls.extend(exa_urls)
                sources_used.append("exa")
            
            # Deduplicate by URL
            seen = set()
            unique_urls = []
            for url_data in all_urls:
                url = url_data.get("url", "")
                if url and url not in seen:
                    seen.add(url)
                    unique_urls.append(url_data)
            
            return {
                "urls": unique_urls,
                "count": len(unique_urls),
                "sources": sources_used,
                "total_before_dedup": len(all_urls)
            }
    
    async def run(self):
        """Run the MCP server"""
        if not self.server:
            raise RuntimeError("MCP server not initialized")
        
        try:
            from mcp.server.stdio import stdio_server
            
            async with stdio_server() as (read_stream, write_stream):
                await self.server.run(
                    read_stream,
                    write_stream,
                    self.server.create_initialization_options()
                )
        except ImportError:
            print("MCP stdio server not available. Server tools are registered but cannot run standalone.")
            print("Use MCP client to connect to this server.")


if __name__ == "__main__":
    import asyncio
    server = DealDiscoveryMCPServer()
    asyncio.run(server.run())

