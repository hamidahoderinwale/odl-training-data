import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'

/**
 * POST /api/mcp/deals - Add a deal via Python script
 * 
 * This endpoint calls the Python add_deal.py script which uses the same
 * logic as the MCP Database Server but without MCP protocol overhead.
 * 
 * Alternative: Use POST /api/deals for direct Prisma access (faster)
 */
export async function POST(request: Request) {
  try {
    const dealData = await request.json()

    // Path to the add_deal script
    const addDealScript = path.join(process.cwd(), 'mcp-servers', 'add_deal.py')
    
    // Use virtual environment Python if it exists
    const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python3')
    const pythonPath = process.env.PYTHON_PATH || (existsSync(venvPython) ? venvPython : 'python3')

    // Escape JSON for command line
    const dealJson = JSON.stringify(dealData).replace(/'/g, "'\\''")

    // Call Python script
    const command = `${pythonPath} ${addDealScript} '${dealJson}'`

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 30000, // 30 seconds
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    })

    const result = JSON.parse(stdout)
    
    return NextResponse.json({
      ...result,
      method: 'python_script',
      note: 'Called via Python script (same logic as MCP server)',
    })
  } catch (error: any) {
    console.error('MCP deal upsert error:', error)
    
    // Fallback to direct API if Python script fails
    try {
      const dealData = await request.json()
      const response = await fetch(`${request.url.replace('/api/mcp/deals', '/api/deals')}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dealData),
      })
      const result = await response.json()
      return NextResponse.json({
        ...result,
        method: 'fallback_direct_api',
        note: 'Python script failed, used direct API instead',
      })
    } catch (fallbackError: any) {
      return NextResponse.json(
        {
          success: false,
          error: error.message || 'Failed to upsert deal',
          fallback_error: fallbackError.message,
        },
        { status: 500 }
      )
    }
  }
}

/**
 * GET /api/mcp/deals - Query deals via MCP Database Server
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const provider = searchParams.get('provider')
    const buyer = searchParams.get('buyer')
    const modality = searchParams.get('modality')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Redirect to main /api/deals endpoint
    const params = new URLSearchParams()
    if (provider) params.set('provider', provider)
    if (buyer) params.set('buyer', buyer)
    if (modality) params.set('modality', modality)
    params.set('limit', limit.toString())
    params.set('offset', offset.toString())

    const response = await fetch(`${request.url.replace('/api/mcp/deals', '/api/deals')}?${params}`)
    const result = await response.json()
    
    return NextResponse.json({
      ...result,
      method: 'mcp_api',
    })
  } catch (error: any) {
    console.error('MCP deal query error:', error)
    return NextResponse.json(
      {
        error: error.message || 'Failed to query deals via MCP',
      },
      { status: 500 }
    )
  }
}

