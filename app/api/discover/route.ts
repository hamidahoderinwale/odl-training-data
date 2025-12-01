import { NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'
export const maxDuration = 600 // 10 minutes for long-running discovery

/**
 * Trigger deal discovery pipeline
 * POST /api/discover
 * 
 * Optional query params:
 * - source: 'exa' | 'all' (default: 'all')
 * - days_back: number (default: 7)
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const source = searchParams.get('source') || 'all'
    const daysBack = parseInt(searchParams.get('days_back') || '7')

    // Path to the monitor script
    const monitorScript = path.join(process.cwd(), 'ingestion', 'monitor.py')
    // Use virtual environment Python if it exists, otherwise fall back to system python3
    const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python3')
    const pythonPath = process.env.PYTHON_PATH || (existsSync(venvPython) ? venvPython : 'python3')

    console.log(`Starting deal discovery: source=${source}, days_back=${daysBack}`)

    // Run the monitoring cycle
    // Note: In production, you'd want to use a job queue (e.g., Bull, Celery)
    // For now, we'll run it synchronously but with a timeout
    const command = `${pythonPath} ${monitorScript} --days-back ${daysBack} --source ${source}`

    const { stdout, stderr } = await execAsync(command, {
      cwd: process.cwd(),
      timeout: 540000, // 9 minutes timeout (slightly less than maxDuration)
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
      },
    })

    // Parse output to extract summary
    const summary: {
      success: boolean
      source: string
      days_back: number
      output: string
      errors: string
      timestamp: string
      urls_discovered?: number
      deals_extracted?: number
      deals_created?: number
      deals_updated?: number
    } = {
      success: true,
      source,
      days_back: daysBack,
      output: stdout,
      errors: stderr,
      timestamp: new Date().toISOString(),
    }

    // Try to extract numbers from output
    const urlMatch = stdout.match(/Total URLs discovered: (\d+)/)
    const dealsMatch = stdout.match(/Extracted (\d+) deals/)
    const createdMatch = stdout.match(/Created: (\d+)/)
    const updatedMatch = stdout.match(/Updated: (\d+)/)

    if (urlMatch) summary.urls_discovered = parseInt(urlMatch[1])
    if (dealsMatch) summary.deals_extracted = parseInt(dealsMatch[1])
    if (createdMatch) summary.deals_created = parseInt(createdMatch[1])
    if (updatedMatch) summary.deals_updated = parseInt(updatedMatch[1])

    return NextResponse.json(summary)
  } catch (error: any) {
    console.error('Discovery error:', error)
    
    // Check if it's a timeout
    if (error.signal === 'SIGTERM' || error.code === 'ETIMEDOUT') {
      return NextResponse.json(
        {
          success: false,
          error: 'Discovery timed out. It may still be running in the background.',
          message: 'Discovery process exceeded time limit. Check server logs for progress.',
        },
        { status: 504 }
      )
    }

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run discovery',
        details: error.stderr || error.stdout,
      },
      { status: 500 }
    )
  }
}

/**
 * Get discovery status
 * GET /api/discover
 */
export async function GET() {
  return NextResponse.json({
    message: 'Deal discovery endpoint',
    usage: {
      POST: 'Trigger discovery',
      query_params: {
        source: "'exa' | 'all' (default: 'all')",
        days_back: 'number (default: 7)',
      },
    },
  })
}

