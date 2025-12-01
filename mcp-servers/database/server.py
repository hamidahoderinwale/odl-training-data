"""
Database MCP Server
Provides MCP tools for database operations via Prisma
"""

import asyncio
import json
from typing import Any, Dict, List, Optional
from datetime import datetime
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

try:
    from mcp.server import Server
    from mcp.types import Tool, TextContent
    MCP_AVAILABLE = True
except ImportError:
    try:
        from mcp.server.stdio import stdio_server
        from mcp.types import Tool
        MCP_AVAILABLE = True
    except ImportError:
        MCP_AVAILABLE = False
        print("MCP SDK not installed. Install with: pip install mcp")

try:
    from prisma import Prisma
    PRISMA_AVAILABLE = True
except ImportError:
    PRISMA_AVAILABLE = False
    print("Prisma not available. Run: npm run db:generate")


class DatabaseMCPServer:
    """MCP server for database operations"""
    
    def __init__(self):
        self.server = None
        self.prisma = None
        if MCP_AVAILABLE:
            self.server = Server("database")
            self._register_tools()
    
    def _register_tools(self):
        """Register MCP tools"""
        if not self.server:
            return
        
        @self.server.tool()
        async def upsert_deal(deal_data: dict) -> dict:
            """
            Upsert a deal to the database with provenance tracking.
            
            Args:
                deal_data: Dictionary containing deal information
                
            Returns:
                Dictionary with deal_id, version, and provenance metadata
            """
            if not PRISMA_AVAILABLE:
                return {"error": "Prisma not available"}
            
            prisma = Prisma()
            await prisma.connect()
            
            try:
                # Map deal_data to schema (reuse existing mapping logic)
                from ingestion.pipeline.db_integration import DealDBWriter
                writer = DealDBWriter()
                mapped = writer.map_deal_to_schema(deal_data)
                
                # Check if deal exists
                existing = await prisma.deal.find_first(
                    where={
                        "provider": mapped.get("provider"),
                        "buyer": mapped.get("buyer"),
                        "date": mapped.get("date"),
                    }
                )
                
                if existing:
                    result = await prisma.deal.update(
                        where={"id": existing.id},
                        data={**mapped, "updatedAt": datetime.now()}
                    )
                    action = "updated"
                else:
                    result = await prisma.deal.create(data=mapped)
                    action = "created"
                
                return {
                    "deal_id": result.id,
                    "version": result.version or "1.0",
                    "action": action,
                    "provenance": {
                        "source": deal_data.get("source_url"),
                        "extracted_at": datetime.now().isoformat(),
                        "discovered_via": deal_data.get("discovered_via", "unknown")
                    }
                }
            except Exception as e:
                return {"error": str(e)}
            finally:
                await prisma.disconnect()
        
        @self.server.tool()
        async def query_deals(
            provider: Optional[str] = None,
            buyer: Optional[str] = None,
            modality: Optional[str] = None,
            limit: int = 100,
            offset: int = 0
        ) -> dict:
            """
            Query deals from the database with filters.
            
            Args:
                provider: Filter by provider name
                buyer: Filter by buyer name
                modality: Filter by modality (Text, Image, etc.)
                limit: Maximum number of results
                offset: Pagination offset
                
            Returns:
                Dictionary with deals array and total count
            """
            if not PRISMA_AVAILABLE:
                return {"error": "Prisma not available"}
            
            prisma = Prisma()
            await prisma.connect()
            
            try:
                where: Dict[str, Any] = {}
                if provider:
                    where["provider"] = {"contains": provider}
                if buyer:
                    where["buyer"] = {"contains": buyer}
                if modality:
                    where["modality"] = modality
                
                deals = await prisma.deal.find_many(
                    where=where,
                    take=limit,
                    skip=offset,
                    orderBy={"date": "desc"}
                )
                
                total = await prisma.deal.count(where=where)
                
                return {
                    "deals": [self._deal_to_dict(d) for d in deals],
                    "total": total,
                    "limit": limit,
                    "offset": offset
                }
            except Exception as e:
                return {"error": str(e)}
            finally:
                await prisma.disconnect()
        
        @self.server.tool()
        async def get_provenance_chain(deal_id: str) -> dict:
            """
            Get provenance chain for a deal.
            
            Args:
                deal_id: UUID of the deal
                
            Returns:
                Dictionary with provenance information
            """
            if not PRISMA_AVAILABLE:
                return {"error": "Prisma not available"}
            
            prisma = Prisma()
            await prisma.connect()
            
            try:
                deal = await prisma.deal.find_unique(where={"id": deal_id})
                if not deal:
                    return {"error": "Deal not found"}
                
                sources = json.loads(deal.sources) if deal.sources else []
                extraction_metadata = json.loads(deal.extractionMetadata) if deal.extractionMetadata else {}
                
                return {
                    "deal_id": deal.id,
                    "sources": sources,
                    "discovered_via": deal.discoveredVia,
                    "exa_query": deal.exaQuery,
                    "exa_score": deal.exaScore,
                    "extraction_metadata": extraction_metadata,
                    "discovery_date": deal.discoveryDate.isoformat() if deal.discoveryDate else None,
                    "last_verified": deal.lastVerified.isoformat() if deal.lastVerified else None,
                }
            except Exception as e:
                return {"error": str(e)}
            finally:
                await prisma.disconnect()
    
    def _deal_to_dict(self, deal) -> dict:
        """Convert Prisma deal to dictionary"""
        return {
            "id": deal.id,
            "provider": deal.provider,
            "buyer": deal.buyer,
            "modality": deal.modality,
            "priceUsd": deal.priceUsd,
            "date": deal.date,
            "exclusive": deal.exclusive,
            "creatorsCompensated": deal.creatorsCompensated,
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
    server = DatabaseMCPServer()
    asyncio.run(server.run())

