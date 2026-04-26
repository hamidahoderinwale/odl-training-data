// Seed Prisma from the 78-row Hugging Face dataset (midah/ai-data-deals).
//
// Source of truth: data/processed/deals.jsonl (bundled in this repo, mirrors
// the published HF dataset). Keeping a local copy rather than fetching at
// runtime so the seed stays reproducible, offline, and works inside Docker
// images on platforms with ephemeral storage (e.g. HF Spaces free tier).
//
// Wipes existing deal/provider/buyer rows before inserting — the 24-row
// hand-curated seed is replaced wholesale to avoid double-counted aggregates.

import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const prisma = new PrismaClient()

const HF_JSONL = 'data/processed/deals.jsonl'

interface HFRow {
  buyer: string
  seller: string
  date: string | null
  use_case: string
  pricing_mechanism: string
  exclusivity: string
  modality: string | null
  financial_terms: {
    value: string
    source_url: string
    source_text: string
    confidence: string
  } | null
  creator_compensated: boolean | null
  missing_reasons: { field: string; reason: string }[]
  source_url: string
  source_text: string
  ingested_from: string
  fetch_date: string
  confirmed_by: string[]
}

// Mappings ----------------------------------------------------------------

const PRICING_MECHANISM_MAP: Record<string, string> = {
  aggregate: 'Access / aggregate licensing',
  per_unit: 'Per-unit licensing',
  service: 'Commissioning / service-based',
  commissioning: 'Commissioning / service-based',
  open_commons: 'Open commons / open-source',
  unknown: 'Undisclosed',
}

const DEAL_TYPE_MAP: Record<string, string> = {
  aggregate: 'aggregate',
  per_unit: 'per-unit',
  service: 'commissioning',
  commissioning: 'commissioning',
  open_commons: 'commons',
  unknown: 'aggregate', // best guess; flagged by missing_reasons
}

function modalityToTitle(m: string | null): string {
  if (!m) return 'Text'
  const lower = m.toLowerCase().trim()
  if (lower.includes('image') && lower.includes('video')) return 'Image / Video'
  if (lower.includes('image')) return 'Image'
  if (lower.includes('video')) return 'Video'
  if (lower.includes('audio') || lower.includes('music')) return 'Audio'
  // Long descriptive strings ("Scholarly research...") and 'text' both map to Text.
  return 'Text'
}

function exclusivityToBool(e: string): boolean | null {
  if (e === 'exclusive') return true
  if (e === 'non_exclusive') return false
  return null
}

// Pull a price range out of a free-text financial_terms string.
// Matches "$60M", "$25m - $50m", "$1.5 billion", "$5,000". Conservative —
// returns null if the string isn't trivially parseable.
function parsePriceRange(text: string): { min: number | null; max: number | null } {
  if (!text) return { min: null, max: null }
  const cleaned = text.replace(/,/g, '')
  const num = '(\\d+(?:\\.\\d+)?)'
  const unit = '\\s*(million|billion|m|b|k)?'
  const range = new RegExp(`\\$\\s*${num}${unit}\\s*[-–—to]+\\s*\\$?\\s*${num}${unit}`, 'i')
  const single = new RegExp(`\\$\\s*${num}${unit}\\b`, 'i')

  const scale = (u?: string): number => {
    if (!u) return 1
    const k = u.toLowerCase()
    if (k.startsWith('b')) return 1_000_000_000
    if (k.startsWith('m')) return 1_000_000
    if (k.startsWith('k')) return 1_000
    return 1
  }

  const r = cleaned.match(range)
  if (r) {
    const minScale = scale(r[2])
    const maxScale = scale(r[4]) || minScale // "$25m - $50m" lists unit only on one side sometimes
    return {
      min: parseFloat(r[1]) * minScale,
      max: parseFloat(r[3]) * maxScale,
    }
  }
  const s = cleaned.match(single)
  if (s) {
    const v = parseFloat(s[1]) * scale(s[2])
    return { min: v, max: v }
  }
  return { min: null, max: null }
}

// Multi-buyer rows have buyers comma-separated ("Anthropic, AWS, Perplexity").
function splitBuyers(buyer: string): string[] {
  return buyer.split(',').map((b) => b.trim()).filter(Boolean)
}

// Seed --------------------------------------------------------------------

async function main() {
  const raw = readFileSync(resolve(HF_JSONL), 'utf-8')
  const rows: HFRow[] = raw
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l))

  console.log(`📥 Loaded ${rows.length} deals from HF JSONL`)

  // Cascade-deletes linkages, dealBuyer, dealSource, pricingNormalizations.
  await prisma.dealModelLinkage.deleteMany({})
  await prisma.dealBuyer.deleteMany({})
  await prisma.deal.deleteMany({})
  await prisma.buyer.deleteMany({})
  await prisma.provider.deleteMany({})
  console.log('🧹 Cleared previous deals/providers/buyers')

  const providerIds = new Map<string, string>()
  const buyerIds = new Map<string, string>()
  let withPrice = 0
  let withCreatorInfo = 0

  for (const row of rows) {
    // Provider
    if (!providerIds.has(row.seller)) {
      const p = await prisma.provider.create({
        data: { name: row.seller },
      })
      providerIds.set(row.seller, p.id)
    }
    // Buyers (1+)
    const buyerNames = splitBuyers(row.buyer)
    for (const name of buyerNames) {
      if (!buyerIds.has(name)) {
        const b = await prisma.buyer.create({ data: { name } })
        buyerIds.set(name, b.id)
      }
    }

    const priceText = row.financial_terms?.value ?? ''
    const { min, max } = parsePriceRange(priceText)
    if (min !== null) withPrice += 1
    if (row.creator_compensated !== null) withCreatorInfo += 1

    const extractionMetadata = {
      use_case: row.use_case,
      missing_reasons: row.missing_reasons,
      confirmed_by: row.confirmed_by,
      financial_terms_source_text: row.financial_terms?.source_text ?? null,
      financial_terms_source_url: row.financial_terms?.source_url ?? null,
    }

    const deal = await prisma.deal.create({
      data: {
        date: row.date,
        provider: row.seller,
        buyer: row.buyer, // Display string; many-to-many lives on dealBuyer
        modality: modalityToTitle(row.modality),
        dataType: row.source_text.slice(0, 200),
        reportedTerms: row.financial_terms?.value ?? null,
        creatorsCompensated: row.creator_compensated,
        exclusive: exclusivityToBool(row.exclusivity),
        pricingMechanism: PRICING_MECHANISM_MAP[row.pricing_mechanism] ?? 'Undisclosed',
        dealType: DEAL_TYPE_MAP[row.pricing_mechanism] ?? 'aggregate',
        priceUsd: min !== null && min === max ? min : null,
        priceRangeMinUsd: min,
        priceRangeMaxUsd: max,
        priceCurrency: 'USD',
        sources: JSON.stringify([row.source_url]),
        sourcePrimary: row.ingested_from,
        discoveredVia: row.ingested_from,
        lastVerified: row.fetch_date ? new Date(row.fetch_date) : null,
        extractionMetadata: JSON.stringify(extractionMetadata),
        llmConfidence: row.financial_terms?.confidence ?? null,
        notes: row.source_text,
        dealStage: 'confirmed',
        confidenceScore: row.financial_terms?.confidence === 'high' ? 1.0
          : row.financial_terms?.confidence === 'medium' ? 0.7
          : row.financial_terms?.confidence === 'low' ? 0.4
          : 0.5,
        providerId: providerIds.get(row.seller),
      },
    })

    for (const name of buyerNames) {
      await prisma.dealBuyer.create({
        data: { dealId: deal.id, buyerId: buyerIds.get(name)! },
      })
    }
  }

  console.log(`✅ Seeded ${rows.length} deals`)
  console.log(`✅ ${providerIds.size} providers, ${buyerIds.size} buyers`)
  console.log(`📊 ${withPrice} deals with parseable price; ${withCreatorInfo} with explicit creator info`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
