import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Seed data from your provided table (24 deals)
const dealsData = [
  {
    id: '1',
    date: '2024-05-22',
    modality: 'Text',
    provider: 'News Corp',
    buyer: 'OpenAI',
    dataType: 'News archives & publisher content (WSJ, Times, NY Post)',
    reportedTerms: '>$250M over 5 years',
    creatorsCompensated: false,
    exclusive: true,
    pricingMechanism: 'Access / aggregate licensing',
    dealType: 'aggregate',
    priceUsd: 250000000,
    durationYears: 5,
    sourcePrimary: 'Reuters',
  },
  {
    id: '2',
    date: '2024-02-22',
    modality: 'Text',
    provider: 'Reddit',
    buyer: 'Google',
    dataType: 'Social-media UGC feed (API)',
    reportedTerms: '≈$60M per year',
    creatorsCompensated: false,
    exclusive: false,
    pricingMechanism: 'Volume-based API / access',
    dealType: 'aggregate',
    priceUsd: 60000000,
    durationYears: 1,
    sourcePrimary: 'Axios',
  },
  {
    id: '3',
    date: '2024-05',
    modality: 'Text',
    provider: 'Dotdash Meredith',
    buyer: 'OpenAI',
    dataType: 'Magazine & digital-media archives',
    reportedTerms: '≥$16M per year (fixed component)',
    creatorsCompensated: false,
    exclusive: false,
    pricingMechanism: 'Access / aggregate licensing',
    dealType: 'aggregate',
    priceUsd: 16000000,
    durationYears: 1,
    sourcePrimary: 'TechCrunch',
  },
  {
    id: '4',
    date: '2024-11',
    modality: 'Text',
    provider: 'HarperCollins',
    buyer: 'Microsoft',
    dataType: 'Non-fiction books (AI training rights)',
    reportedTerms: '$5K per title; 50/50 publisher–author split',
    creatorsCompensated: true,
    exclusive: false,
    pricingMechanism: 'Per-unit licensing (per book)',
    dealType: 'per-unit',
    creatorSplitPercentage: 50,
    sourcePrimary: 'Reuters',
  },
  {
    id: '5',
    date: '2023',
    modality: 'Text',
    provider: 'Taylor & Francis',
    buyer: 'Microsoft',
    dataType: 'Academic journals & textbooks',
    reportedTerms: '≈$10M',
    creatorsCompensated: null, // Unclear
    exclusive: false,
    pricingMechanism: 'Restricted access licensing',
    dealType: 'aggregate',
    priceUsd: 10000000,
    sourcePrimary: 'CB Insights',
  },
  {
    id: '6',
    date: '2024',
    modality: 'Text',
    provider: 'Wiley',
    buyer: 'Anthropic, AWS, Perplexity',
    dataType: 'Scientific content + enriched metadata',
    reportedTerms: '$23M (per 2025 proxy filing)',
    creatorsCompensated: false,
    exclusive: false,
    pricingMechanism: 'Limited-term structured license',
    dealType: 'aggregate',
    priceUsd: 23000000,
    sourcePrimary: 'SEC Filing',
  },
  {
    id: '7',
    date: '2021-2024',
    modality: 'Image / Video',
    provider: 'Shutterstock',
    buyer: 'Meta, OpenAI, Google, Apple',
    dataType: 'Stock images & video + metadata',
    reportedTerms: '≈$25–30M per deal (multi-year)',
    creatorsCompensated: true, // Partial (royalty fund)
    exclusive: false,
    pricingMechanism: 'Hybrid per-unit + access',
    dealType: 'hybrid',
    priceRangeMinUsd: 25000000,
    priceRangeMaxUsd: 30000000,
    sourcePrimary: 'CB Insights',
  },
  {
    id: '8',
    date: '2024',
    modality: 'Image',
    provider: 'Freepik',
    buyer: 'Unnamed AI firms',
    dataType: '≈200M stock images',
    reportedTerms: '≈$6M total (≈$0.02–0.04 per image)',
    creatorsCompensated: false,
    exclusive: false,
    pricingMechanism: 'Per-unit micro-licensing',
    dealType: 'per-unit',
    priceUsd: 6000000,
    sourcePrimary: 'TechCrunch',
  },
  {
    id: '9',
    date: '2020-2023',
    modality: 'Image + Text',
    provider: 'LAION / Common Crawl',
    buyer: 'Open model builders',
    dataType: 'Image–caption sets; large-scale web crawls',
    reportedTerms: 'Open data; no direct cash',
    creatorsCompensated: null, // N/A
    exclusive: false,
    pricingMechanism: 'Open commons / open-source',
    dealType: 'commons',
    priceUsd: 0,
    sourcePrimary: 'Open Source',
  },
  {
    id: '10',
    date: '2025-05',
    modality: 'Text',
    provider: 'Le Monde',
    buyer: 'OpenAI, Perplexity',
    dataType: 'News content',
    reportedTerms: 'Undisclosed; 25% AI revenue share to journalists',
    creatorsCompensated: true,
    exclusive: false,
    pricingMechanism: 'Access licensing with rev-share',
    dealType: 'aggregate',
    revenueShare: true,
    creatorSplitPercentage: 25,
    sourcePrimary: 'Reuters',
  },
  {
    id: '11',
    date: '2025-07',
    modality: 'Audio',
    provider: 'SourceAudio',
    buyer: 'ElevenLabs, Music.AI',
    dataType: 'Pre-cleared music tracks for training',
    reportedTerms: '$10M (multi-year)',
    creatorsCompensated: true,
    exclusive: false,
    pricingMechanism: 'Access / catalog licensing',
    dealType: 'aggregate',
    priceUsd: 10000000,
    sourcePrimary: 'MBW',
  },
  {
    id: '12',
    date: '2024',
    modality: 'Audio',
    provider: 'UMG, Warner',
    buyer: 'AI music startups (e.g. Suno, Mubert)',
    dataType: 'Major-label music catalogs (audio + lyrics)',
    reportedTerms: 'Undisclosed',
    creatorsCompensated: null, // Unclear
    exclusive: false,
    pricingMechanism: 'Music/audio access licensing',
    dealType: 'aggregate',
    sourcePrimary: 'MBW',
  },
  {
    id: '13',
    date: '2024',
    modality: 'Audio',
    provider: 'Audius + indie labels',
    buyer: 'EU generative-music firms',
    dataType: 'Independent tracks & stems',
    reportedTerms: '~€0.30–€2.00 per track',
    creatorsCompensated: true,
    exclusive: false,
    pricingMechanism: 'Per-unit micro-licensing',
    dealType: 'per-unit',
    priceRangeMinUsd: 0.30,
    priceRangeMaxUsd: 2.00,
    priceCurrency: 'EUR',
    sourcePrimary: 'TechCrunch',
  },
  {
    id: '14',
    date: '2025-01',
    modality: 'Video',
    provider: 'YouTube creators (individuals)',
    buyer: 'OpenAI, Meta',
    dataType: 'Unpublished creator videos',
    reportedTerms: '≈$5M total; ≈$1–4 per minute of footage',
    creatorsCompensated: true,
    exclusive: false,
    pricingMechanism: 'Per-unit licensing (per video minute)',
    dealType: 'per-unit',
    priceUsd: 5000000,
    priceRangeMinUsd: 1,
    priceRangeMaxUsd: 4,
    sourcePrimary: 'The Verge',
  },
  {
    id: '15',
    date: '2023-2024',
    modality: 'Video',
    provider: 'Independent creators',
    buyer: 'Runway, Pika Labs',
    dataType: 'Professional / unpublished video footage',
    reportedTerms: '≈$1–4 per minute (estimated)',
    creatorsCompensated: true,
    exclusive: false,
    pricingMechanism: 'Per-unit licensing',
    dealType: 'per-unit',
    priceRangeMinUsd: 1,
    priceRangeMaxUsd: 4,
    sourcePrimary: 'TechCrunch',
  },
  {
    id: '16',
    date: '2020-2024',
    modality: 'Satellite',
    provider: 'Planet Labs',
    buyer: 'Agriculture / gov / AI firms',
    dataType: 'High-frequency Earth observation imagery',
    reportedTerms: '≈$180M annual revenue (licensing)',
    creatorsCompensated: false,
    exclusive: false,
    pricingMechanism: 'Subscription-style access licensing',
    dealType: 'aggregate',
    priceUsd: 180000000,
    durationYears: 1,
    sourcePrimary: 'Company Filings',
  },
  {
    id: '17',
    date: '2024',
    modality: 'Health / Biotech',
    provider: 'Tempus',
    buyer: 'Pharma & AI firms',
    dataType: 'Anonymized patient + genomic data',
    reportedTerms: '$200M over 3 years',
    creatorsCompensated: false,
    exclusive: false,
    pricingMechanism: 'Access licensing for medical LLMs',
    dealType: 'aggregate',
    priceUsd: 200000000,
    durationYears: 3,
    sourcePrimary: 'SEC Filing',
  },
  {
    id: '18',
    date: '2025-06',
    modality: 'Corporate / data infra',
    provider: 'Scale AI',
    buyer: 'Meta',
    dataType: 'Data services + infrastructure (equity-linked)',
    reportedTerms: '$14.3B for 49% stake (corporate deal)',
    creatorsCompensated: null, // Variable
    exclusive: true,
    pricingMechanism: 'Strategic acquisition (data services)',
    dealType: 'acquisition',
    priceUsd: 14300000000,
    sourcePrimary: 'Reuters',
  },
  {
    id: '19',
    date: '2025-04',
    modality: 'Corporate / data infra',
    provider: 'Informatica',
    buyer: 'Salesforce',
    dataType: 'Cloud data integration platform',
    reportedTerms: '≈$8B acquisition',
    creatorsCompensated: null, // N/A
    exclusive: true,
    pricingMechanism: 'Full acquisition (data pipeline assets)',
    dealType: 'acquisition',
    priceUsd: 8000000000,
    sourcePrimary: 'Reuters',
  },
  {
    id: '20',
    date: '2025-09-05',
    modality: 'Legal / Books',
    provider: 'Authors & publishers (class action)',
    buyer: 'Anthropic',
    dataType: 'Books previously ingested without license',
    reportedTerms: '$1.5B settlement; ≈$3K per book',
    creatorsCompensated: true,
    exclusive: null, // N/A
    pricingMechanism: 'Legal settlement (with deletion & limits)',
    dealType: 'settlement',
    priceUsd: 1500000000,
    deletionRequired: true,
    sourcePrimary: 'Court Filing',
  },
  {
    id: '21',
    date: '2025-08',
    modality: 'Text',
    provider: 'CuriosityStream',
    buyer: 'AI partners',
    dataType: 'Factual & documentary video library (as text/video data)',
    reportedTerms: '≈$20–30M per year; ≈25% of 2025 revenue',
    creatorsCompensated: false,
    exclusive: false,
    pricingMechanism: 'Access licensing (subscription/API feed)',
    dealType: 'aggregate',
    priceRangeMinUsd: 20000000,
    priceRangeMaxUsd: 30000000,
    durationYears: 1,
    sourcePrimary: 'Company Filings',
  },
  {
    id: '22',
    date: '2025',
    modality: 'Text',
    provider: 'New York Times',
    buyer: 'Amazon',
    dataType: 'Editorial news (incl. NYT Cooking, The Athletic)',
    reportedTerms: '≈$20–25M per year',
    creatorsCompensated: false,
    exclusive: false,
    pricingMechanism: 'Access licensing for Alexa / AI uses',
    dealType: 'aggregate',
    priceRangeMinUsd: 20000000,
    priceRangeMaxUsd: 25000000,
    durationYears: 1,
    sourcePrimary: 'Axios',
  },
  {
    id: '23',
    date: '2025 H1',
    modality: 'Text / Q&A',
    provider: 'Chegg',
    buyer: 'AI partners',
    dataType: 'Expert-written Q&A pairs (homework help DB)',
    reportedTerms: '$11M in H1 2025 (data licensing revenue)',
    creatorsCompensated: null, // Unclear
    exclusive: false,
    pricingMechanism: 'Access licensing (subset of library)',
    dealType: 'aggregate',
    priceUsd: 11000000,
    durationYears: 0.5,
    sourcePrimary: 'SEC Filing',
  },
  {
    id: '24',
    date: '2022-2025',
    modality: 'Commissioning',
    provider: 'Mercor',
    buyer: 'Multiple AI labs',
    dataType: 'Domain-expert data for RLHF & fine-tuning',
    reportedTerms: '≈$450M ARR (services tied to data creation)',
    creatorsCompensated: true,
    exclusive: false,
    pricingMechanism: 'Commissioning / service-based',
    dealType: 'commissioning',
    priceUsd: 450000000,
    durationYears: 1,
    sourcePrimary: 'CB Insights',
  },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Create providers and buyers first
  const providers = new Set<string>()
  const buyers = new Set<string>()

  dealsData.forEach(deal => {
    providers.add(deal.provider)
    deal.buyer.split(',').forEach(b => buyers.add(b.trim()))
  })

  // Create providers
  for (const providerName of providers) {
    await prisma.provider.upsert({
      where: { name: providerName },
      update: {},
      create: { name: providerName },
    })
  }

  // Create buyers
  for (const buyerName of buyers) {
    await prisma.buyer.upsert({
      where: { name: buyerName },
      update: {},
      create: { name: buyerName },
    })
  }

  // Create deals
  for (const dealData of dealsData) {
    const provider = await prisma.provider.findUnique({
      where: { name: dealData.provider },
    })

    const buyerNames = dealData.buyer.split(',').map(b => b.trim())

    const deal = await prisma.deal.upsert({
      where: { id: dealData.id },
      update: {},
      create: {
        id: dealData.id,
        date: dealData.date,
        modality: dealData.modality,
        provider: dealData.provider,
        buyer: dealData.buyer,
        dataType: dealData.dataType,
        reportedTerms: dealData.reportedTerms,
        creatorsCompensated: dealData.creatorsCompensated,
        exclusive: dealData.exclusive,
        pricingMechanism: dealData.pricingMechanism,
        dealType: dealData.dealType,
        priceUsd: dealData.priceUsd,
        priceRangeMinUsd: dealData.priceRangeMinUsd,
        priceRangeMaxUsd: dealData.priceRangeMaxUsd,
        priceCurrency: dealData.priceCurrency || 'USD',
        durationYears: dealData.durationYears,
        creatorSplitPercentage: dealData.creatorSplitPercentage,
        revenueShare: dealData.revenueShare,
        deletionRequired: dealData.deletionRequired,
        sourcePrimary: dealData.sourcePrimary,
        sources: JSON.stringify([]),
        dealStage: 'confirmed',
        confidenceScore: 1.0,
        providerId: provider?.id,
      },
    })

    // Link buyers
    for (const buyerName of buyerNames) {
      const buyer = await prisma.buyer.findUnique({
        where: { name: buyerName },
      })
      if (buyer) {
        await prisma.dealBuyer.upsert({
          where: {
            dealId_buyerId: {
              dealId: deal.id,
              buyerId: buyer.id,
            },
          },
          update: {},
          create: {
            dealId: deal.id,
            buyerId: buyer.id,
          },
        })
      }
    }
  }

  console.log(`✅ Seeded ${dealsData.length} deals`)
  console.log(`✅ Seeded ${providers.size} providers`)
  console.log(`✅ Seeded ${buyers.size} buyers`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

