"""
Add Deal Script
Can be called from Next.js API routes to add deals to the database
Uses the same logic as the MCP Database Server but without MCP protocol overhead
"""

import sys
import json
import asyncio
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from ingestion.pipeline.db_integration import DealDBWriter
from prisma import Prisma


async def add_deal(deal_data: dict) -> dict:
    """
    Add or update a deal in the database
    
    Args:
        deal_data: Dictionary containing deal information
        
    Returns:
        Dictionary with result
    """
    prisma = Prisma()
    await prisma.connect()
    
    try:
        # Map deal data to schema
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
            from datetime import datetime
            result = await prisma.deal.update(
                where={"id": existing.id},
                data={**mapped, "updatedAt": datetime.now()}
            )
            action = "updated"
        else:
            result = await prisma.deal.create(data=mapped)
            action = "created"
        
        return {
            "success": True,
            "deal_id": result.id,
            "action": action,
            "version": result.version or "1.0",
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
        }
    finally:
        await prisma.disconnect()


if __name__ == "__main__":
    # Read deal data from stdin (JSON)
    if len(sys.argv) > 1:
        # Deal data passed as command line argument (JSON string)
        deal_data = json.loads(sys.argv[1])
    else:
        # Deal data passed via stdin
        deal_data = json.load(sys.stdin)
    
    result = asyncio.run(add_deal(deal_data))
    print(json.dumps(result))

