import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'
export const maxDuration = 600 // 10 minutes for web enrichment

/**
 * POST /api/models/enrich-web - Enrich models using web search and LLM extraction
 * 
 * Optional query params:
 * - limit: number of models to enrich (default: all)
 * - no_web: disable web search (default: false)
 * - no_llm: disable LLM extraction (default: false)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = searchParams.get('limit')
    const noWeb = searchParams.get('no_web') === 'true'
    const noLlm = searchParams.get('no_llm') === 'true'

    // Path to the enrichment script
    const enrichScript = path.join(process.cwd(), 'registry', 'enrich_all_models.py')
    const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python3')
    const pythonPath = process.env.PYTHON_PATH || (existsSync(venvPython) ? venvPython : 'python3')

    console.log(`Starting web enrichment: limit=${limit || 'all'}, web=${!noWeb}, llm=${!noLlm}`)

    // Build command
    let command = `${pythonPath} ${enrichScript}`
    if (limit) {
      command += ` --limit ${limit}`
    }
    if (noWeb) {
      command += ` --no-web`
    }
    if (noLlm) {
      command += ` --no-llm`
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
      limit?: number
      no_web: boolean
      no_llm: boolean
      output: string
      errors: string
      timestamp: string
      models_enriched?: number
      errors_count?: number
    } = {
      success: true,
      no_web: noWeb,
      no_llm: noLlm,
      output: stdout,
      errors: stderr,
      timestamp: new Date().toISOString(),
    }

    if (limit) {
      summary.limit = parseInt(limit)
    }

    // Try to extract numbers from output
    const enrichedMatch = stdout.match(/Successfully enriched: (\d+)\/(\d+)/)
    const errorsMatch = stdout.match(/Errors: (\d+)/)

    if (enrichedMatch) {
      summary.models_enriched = parseInt(enrichedMatch[1])
    }
    if (errorsMatch) {
      summary.errors_count = parseInt(errorsMatch[1])
    }

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('Web enrichment error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to enrich models with web search',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

