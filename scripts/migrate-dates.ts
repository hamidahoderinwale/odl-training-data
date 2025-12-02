/**
 * Data migration script to fix and normalize dates in the database
 * Based on formats from: Open_Problems_in_AI_Data_Economics-33.pdf (Table 4)
 * 
 * Usage:
 *   npx tsx scripts/migrate-dates.ts [--dry-run]
 */

import { PrismaClient } from '@prisma/client'
import { validateAndNormalizeDate } from '../lib/utils/date-validation'

const prisma = new PrismaClient()

interface MigrationStats {
  total: number
  fixed: number
  invalid: number
  unchanged: number
  errors: Array<{ id: string; date: string; error: string }>
}

async function migrateDates(dryRun: boolean = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    total: 0,
    fixed: 0,
    invalid: 0,
    unchanged: 0,
    errors: []
  }

  console.log(`\n${dryRun ? '🔍 DRY RUN: ' : '🚀 '}Starting date migration...\n`)

  try {
    // Get all deals
    const deals = await prisma.deal.findMany({
      select: {
        id: true,
        date: true,
        provider: true,
        buyer: true,
      },
      orderBy: {
        date: 'asc'
      }
    })

    stats.total = deals.length
    console.log(`Found ${deals.length} deals to check\n`)

    for (const deal of deals) {
      if (!deal.date) {
        stats.unchanged++
        continue
      }

      const validation = validateAndNormalizeDate(deal.date)

      if (!validation.isValid) {
        stats.invalid++
        stats.errors.push({
          id: deal.id,
          date: deal.date,
          error: validation.error || 'Invalid format'
        })
        console.log(`❌ Invalid: Deal ${deal.id} (${deal.provider} → ${deal.buyer})`)
        console.log(`   Date: "${deal.date}"`)
        console.log(`   Error: ${validation.error}\n`)
        continue
      }

      if (validation.normalized === deal.date) {
        stats.unchanged++
        continue
      }

      // Date needs to be fixed
      stats.fixed++
      console.log(`🔧 Fixing: Deal ${deal.id} (${deal.provider} → ${deal.buyer})`)
      console.log(`   Old: "${deal.date}"`)
      console.log(`   New: "${validation.normalized}" (${validation.format})\n`)

      if (!dryRun) {
        try {
          await prisma.deal.update({
            where: { id: deal.id },
            data: { date: validation.normalized }
          })
        } catch (error: any) {
          stats.errors.push({
            id: deal.id,
            date: deal.date,
            error: error.message || 'Update failed'
          })
          console.log(`   ⚠️  Update failed: ${error.message}\n`)
        }
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(60))
    console.log('Migration Summary')
    console.log('='.repeat(60))
    console.log(`Total deals:     ${stats.total}`)
    console.log(`Fixed:           ${stats.fixed}`)
    console.log(`Unchanged:       ${stats.unchanged}`)
    console.log(`Invalid:         ${stats.invalid}`)
    console.log(`Errors:          ${stats.errors.length}`)
    console.log('='.repeat(60))

    if (stats.errors.length > 0) {
      console.log('\n⚠️  Errors encountered:')
      stats.errors.forEach(err => {
        console.log(`   Deal ${err.id}: "${err.date}" - ${err.error}`)
      })
    }

    if (dryRun) {
      console.log('\n💡 This was a dry run. Run without --dry-run to apply changes.')
    } else {
      console.log('\n✅ Migration complete!')
    }

  } catch (error) {
    console.error('Migration failed:', error)
    throw error
  }

  return stats
}

async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run') || args.includes('-d')

  try {
    await migrateDates(dryRun)
  } catch (error) {
    console.error('Error:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

main()


