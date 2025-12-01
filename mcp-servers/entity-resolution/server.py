"""
Entity Resolution MCP Server
Normalizes company names and resolves aliases
"""

import sys
from typing import Dict, Any, Optional
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

from ingestion.pipeline.canonicalizer import DealCanonicalizer


class EntityResolutionMCPServer:
    """MCP server for entity normalization and resolution"""
    
    def __init__(self):
        self.server = None
        self.canonicalizer = DealCanonicalizer()
        
        if MCP_AVAILABLE:
            self.server = Server("entity-resolution")
            self._register_tools()
    
    def _register_tools(self):
        """Register MCP tools"""
        if not self.server:
            return
        
        @self.server.tool()
        async def normalize_company_name(name: str) -> dict:
            """
            Normalize a company name to canonical form.
            
            Args:
                name: Company name to normalize
                
            Returns:
                Dictionary with normalized name and confidence
            """
            normalized = self.canonicalizer._normalize_company_name(name)
            is_canonical = normalized == name or normalized in self.canonicalizer.PROVIDER_MAP.values() or normalized in self.canonicalizer.BUYER_MAP.values()
            
            return {
                "original": name,
                "normalized": normalized,
                "is_canonical": is_canonical,
                "confidence": "high" if is_canonical else "medium"
            }
        
        @self.server.tool()
        async def resolve_company_aliases(name: str) -> dict:
            """
            Resolve all known aliases for a company name.
            
            Args:
                name: Company name
                
            Returns:
                Dictionary with canonical name and list of aliases
            """
            normalized = self.canonicalizer._normalize_company_name(name)
            
            # Find all aliases that map to this canonical name
            all_maps = {**self.canonicalizer.PROVIDER_MAP, **self.canonicalizer.BUYER_MAP}
            aliases = [k for k, v in all_maps.items() if v == normalized]
            
            return {
                "canonical_name": normalized,
                "aliases": aliases,
                "total_aliases": len(aliases)
            }
        
        @self.server.tool()
        async def match_entities(entity1: str, entity2: str) -> dict:
            """
            Check if two entity names refer to the same company.
            
            Args:
                entity1: First entity name
                entity2: Second entity name
                
            Returns:
                Dictionary with match result and confidence
            """
            norm1 = self.canonicalizer._normalize_company_name(entity1)
            norm2 = self.canonicalizer._normalize_company_name(entity2)
            
            is_match = norm1.lower() == norm2.lower()
            
            return {
                "entity1": entity1,
                "entity2": entity2,
                "normalized1": norm1,
                "normalized2": norm2,
                "is_match": is_match,
                "confidence": "high" if is_match else "low"
            }
        
        @self.server.tool()
        async def canonicalize_deal(deal_data: dict) -> dict:
            """
            Canonicalize all entities in a deal dictionary.
            
            Args:
                deal_data: Deal dictionary with provider, buyer, etc.
                
            Returns:
                Dictionary with canonicalized deal data
            """
            canonicalized = self.canonicalizer.canonicalize_deal(deal_data)
            
            return {
                "original": deal_data,
                "canonicalized": canonicalized,
                "changes": {
                    "provider": deal_data.get("provider") != canonicalized.get("provider"),
                    "buyer": deal_data.get("buyer") != canonicalized.get("buyer"),
                }
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
    server = EntityResolutionMCPServer()
    asyncio.run(server.run())

