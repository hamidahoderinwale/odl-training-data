import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'
export const maxDuration = 600 // 10 minutes for long-running ingestion

/**
 * POST /api/models/ingest - Trigger model registry ingestion
 * 
 * Optional query params:
 * - limit: number (default: all models)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')

    // Path to the ingestion script (use wrapper that generates Prisma client)
    const ingestScript = path.join(process.cwd(), 'registry', 'ingest_with_prisma.py')
    // Use virtual environment Python if it exists
    const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python3')
    const pythonPath = process.env.PYTHON_PATH || (existsSync(venvPython) ? venvPython : 'python3')

    console.log(`Starting model registry ingestion${limit ? ` (limit: ${limit})` : ''}`)

    // First, ensure Prisma Python client is generated
    try {
      console.log('Generating Prisma Python client...')
      await execAsync(`${pythonPath} -m prisma generate`, {
        cwd: process.cwd(),
        timeout: 60000, // 1 minute
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      })
    } catch (error: any) {
      console.warn('Prisma generation warning (may already be generated):', error.message)
      // Continue anyway - client might already be generated
    }

    // Build command
    let command = `${pythonPath} ${ingestScript}`
    if (limit) {
      command += ` --limit ${limit}`
    }

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 540000, // 9 minutes timeout
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    })

    // Parse output to extract summary
    const summary: {
      success: boolean
      output: string
      errors: string
      timestamp: string
      models_ingested?: number
    } = {
      success: true,
      output: stdout,
      errors: stderr,
      timestamp: new Date().toISOString(),
    }

    // Try to extract numbers from output
    const successMatch = stdout.match(/Successfully ingested: (\d+)\/(\d+)/)
    if (successMatch) {
      summary.models_ingested = parseInt(successMatch[1])
    }

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('Model ingestion error:', error)
    
    // Check if it's a timeout
    if (error.signal === 'SIGTERM' || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Ingestion timed out. It may still be running in the background.',
          message: 'Model ingestion process exceeded time limit. Check server logs for progress.',
        },
        { status: 504 }
      )
    }

    // Check if it's a Prisma client generation error
    const errorMessage = error.message || ''
    const errorDetails = error.stderr || error.stdout || ''
    
    if (errorMessage.includes('hasn\'t been generated') || errorDetails.includes('hasn\'t been generated')) {
      return NextResponse.json(
        {
          success: false,
          error: 'Prisma Python client not generated',
          message: 'The Prisma Python client needs to be generated manually. Run: cd registry && python3 -m prisma generate',
          details: 'This is a known limitation of the Prisma Python package. The client must be generated before running the ingestion script.',
        },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run model ingestion',
        details: errorDetails,
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/models/ingest - Get ingestion status
 */
export async function GET() {
  return NextResponse.json({
    message: 'Model registry ingestion endpoint',
    usage: {
      POST: 'Trigger model ingestion',
      query_params: {
        limit: 'number (optional, limits number of models to ingest)',
      },
    },
  })
}

