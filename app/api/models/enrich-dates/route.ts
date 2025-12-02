import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exec } from 'child_process'
import { promisify } from 'util'
import path from 'path'
import { existsSync } from 'fs'

const execAsync = promisify(exec)

export const dynamic = 'force-dynamic'
export const maxDuration = 600 // 10 minutes for arXiv/company site searches

/**
 * POST /api/models/enrich-dates - Enrich models with release dates from arXiv and company websites
 * 
 * Uses the comprehensive enrichment system to fetch release dates from authoritative sources
 */
export async function POST() {
  try {
    // Get models without release dates
    const models = await prisma.modelRegistry.findMany({
      where: {
        releaseDate: null,
      },
      select: {
        id: true,
        modelId: true,
        provider: true,
        family: true,
      },
      take: 20, // Process in batches to avoid timeout
    })

    if (models.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        message: 'All models already have release dates.',
      })
    }

    let updated = 0
    let errors = 0

    // Run the Python enrichment script
    try {
      const enrichScript = path.join(process.cwd(), 'registry', 'enrich_release_dates.py')
      const venvPython = path.join(process.cwd(), 'venv', 'bin', 'python3')
      const pythonPath = process.env.PYTHON_PATH || (existsSync(venvPython) ? venvPython : 'python3')
      
      const command = `${pythonPath} ${enrichScript} --limit ${models.length}`
      
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        timeout: 300000, // 5 minute timeout
        env: {
          ...process.env,
          PYTHONUNBUFFERED: '1',
        },
      })

      // Parse output to count updates
      const lines = stdout.split('\n')
      for (const line of lines) {
        if (line.includes('✓ Found release date') || line.includes('Found release date')) {
          updated++
        } else if (line.includes('✗ Error') || line.includes('Error:')) {
          errors++
        }
      }

      // If we couldn't parse updates from output, check if any models were updated
      if (updated === 0 && errors === 0) {
        // Re-query to see if any dates were added
        const updatedModels = await prisma.modelRegistry.findMany({
          where: {
            releaseDate: { not: null },
            id: { in: models.map(m => m.id) },
          },
        })
        updated = updatedModels.length
      }

      return NextResponse.json({
        success: true,
        updated,
        errors,
        total: models.length,
        message: `Enriched ${updated} models with release dates from arXiv and company websites.`,
      })
    } catch (error: any) {
      // If Python script fails, provide helpful error message
      console.error('Python enrichment failed:', error.message)
      
      return NextResponse.json({
        success: false,
        error: 'Release date enrichment requires Python environment. Install dependencies and run: npm run registry:enrich-dates',
        fallback: true,
        details: error.message,
      })
    }
  } catch (error: any) {
    console.error('Release date enrichment error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to enrich release dates',
      },
      { status: 500 }
    )
  }
}

