"""
MCP Client Example: Upsert Deal
Demonstrates how to call the MCP Database Server's upsert_deal tool
"""

import asyncio
import json
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

try:
    from mcp import ClientSession, StdioServerParameters
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    print("MCP SDK not installed. Install with: pip install mcp")
    sys.exit(1)


async def upsert_deal_via_mcp(deal_data: dict) -> dict:
    """
    Upsert a deal using the MCP Database Server
    
    Args:
        deal_data: Dictionary containing deal information
        
    Returns:
        Dictionary with result from MCP server
    """
    if not MCP_AVAILABLE:
        return {"error": "MCP SDK not available"}
    
    # Configure MCP server parameters
    server_params = StdioServerParameters(
        command="python3",
        args=[str(project_root / "mcp-servers" / "database" / "server.py")],
        env=None,
    )
    
    try:
        async with ClientSession(server_params) as session:
            # Initialize the session
            await session.initialize()
            
            # Call the upsert_deal tool
            result = await session.call_tool(
                "upsert_deal",
                {"deal_data": deal_data}
            )
            
            return result
    except Exception as e:
        return {"error": str(e)}


async def query_deals_via_mcp(
    provider: str = None,
    buyer: str = None,
    modality: str = None,
    limit: int = 100,
    offset: int = 0
) -> dict:
    """
    Query deals using the MCP Database Server
    
    Args:
        provider: Filter by provider name
        buyer: Filter by buyer name
        modality: Filter by modality
        limit: Maximum number of results
        offset: Pagination offset
        
    Returns:
        Dictionary with deals array and metadata
    """
    if not MCP_AVAILABLE:
        return {"error": "MCP SDK not available"}
    
    server_params = StdioServerParameters(
        command="python3",
        args=[str(project_root / "mcp-servers" / "database" / "server.py")],
        env=None,
    )
    
    try:
        async with ClientSession(server_params) as session:
            await session.initialize()
            
            result = await session.call_tool(
                "query_deals",
                {
                    "provider": provider,
                    "buyer": buyer,
                    "modality": modality,
                    "limit": limit,
                    "offset": offset,
                }
            )
            
            return result
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    # Example usage: upsert a deal from command line
    if len(sys.argv) < 2:
        print("Usage: python client_upsert.py <deal_json_file>")
        print("   or: python client_upsert.py --query [--provider X] [--buyer Y] [--modality Z]")
        sys.exit(1)
    
    if sys.argv[1] == "--query":
        # Query mode
        import argparse
        parser = argparse.ArgumentParser()
        parser.add_argument("--provider")
        parser.add_argument("--buyer")
        parser.add_argument("--modality")
        parser.add_argument("--limit", type=int, default=100)
        parser.add_argument("--offset", type=int, default=0)
        args = parser.parse_args(sys.argv[2:])
        
        result = asyncio.run(query_deals_via_mcp(
            provider=args.provider,
            buyer=args.buyer,
            modality=args.modality,
            limit=args.limit,
            offset=args.offset,
        ))
        print(json.dumps(result, indent=2))
    else:
        # Upsert mode
        deal_file = sys.argv[1]
        with open(deal_file, 'r') as f:
            deal_data = json.load(f)
        
        result = asyncio.run(upsert_deal_via_mcp(deal_data))
        print(json.dumps(result, indent=2))

