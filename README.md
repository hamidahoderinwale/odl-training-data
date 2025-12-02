# AI Training Data Deals Dashboard

A system for tracking AI training data licensing deals with automated discovery and extraction.

## Features

- **Deals Dashboard**: Searchable, filterable deals table with market analytics
- **Automated Discovery**: Multi-source deal discovery (RSS, News API, SEC, Exa, Perplexity)
- **5-Stage Extraction Pipeline**: Preprocessing → Regex → Normalization → Canonicalization → Deduplication
- **Model Registry**: Track AI models with token estimates and training data linkages
- **Auto-Enrichment**: Automatically infers missing metadata (deal type, pricing, duration, rights)

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React Server Components
- **Database**: SQLite via Prisma ORM
- **Styling**: Tailwind CSS
- **Ingestion**: Python pipeline with Exa API integration

## Quick Start

### Prerequisites
- Node.js 18+
- Python 3.10+

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   cd ingestion && pip install -r requirements.txt && cd ..
   cd registry && pip install -r requirements.txt && cd ..
   ```

2. **Generate Prisma client:**
   ```bash
   npm run db:generate
   ```
   Note: Python Prisma client is optional. If setup fails, just run `npm run db:generate` for Node.js client only.

3. **Initialize database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Configure API keys** (create `.env` file):
   ```bash
   DATABASE_URL=file:./prisma/dev.db
   EXA_API_KEY=your_exa_api_key_here  # Recommended - primary discovery engine
   NEWS_API_KEY=your_news_api_key_here  # Optional
   PERPLEXITY_API_KEY=your_perplexity_api_key_here  # Optional
   ```
   Note: RSS feeds work without API keys. Exa API is recommended for best results.

5. **Start development server:**
   ```bash
   npm run dev
   ```
   Open http://localhost:3000

## Using the App

### Navigation
- **Deals** (`/`) - Main dashboard with searchable deals table and market analytics
- **Timeline** (`/timeline`) - Chronological view of deals by year
- **Models** (`/models`) - Model Registry with token estimates
- **Linkages** (`/linkages`) - Connections between deals and models
- **Normalization** (`/normalization`) - Pricing normalization tool

### Key Features
- **Deal Discovery**: Click "Discover Deals" to trigger automated discovery
- **Auto-Enrichment**: Automatically enriches deals with missing metadata
- **Pricing Normalization**: Click prices to see normalized per-unit costs
- **Tooltips**: Hover over underlined terms for explanations

## Discovery & Ingestion

### Quick Start
```bash
# Discover deals from Exa API (90 days back)
npm run discover

# Discover from all sources
npm run discover:all
```

### Discovery Sources
- **RSS Feeds**: Public feeds from OpenAI, Google, Anthropic, Meta (no API key required)
- **Exa API**: AI-powered search (recommended - get key from https://exa.ai/)
- **News API**: News articles (optional - get key from https://newsapi.org/)
- **SEC Filings**: SEC EDGAR framework
- **Perplexity Feed**: AI-powered feed acquisition (optional - get key from https://www.perplexity.ai/)

### Model Registry
Model ingestion happens automatically when you visit `/models`. You can also:
- Manually ingest: `npm run registry:ingest`
- Create linkages: `npm run registry:linkages`
- Enrich dates: `npm run registry:enrich-dates`

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   ├── components/        # React components
│   │   ├── ui/           # Shared UI components
│   │   ├── deals/        # Deal-specific components
│   │   ├── models/       # Model-specific components
│   │   └── linkages/     # Linkage components
│   ├── deals/            # Deals pages
│   ├── models/           # Model Registry pages
│   └── linkages/         # Linkage pages
├── lib/                   # Shared utilities
│   ├── api/              # API client functions
│   ├── utils/            # Utility functions
│   └── types/            # TypeScript types
├── prisma/                # Database schema
├── ingestion/             # Python scraping pipeline
│   ├── pipeline/         # Extraction pipeline stages
│   ├── scrapers/         # Source scrapers
│   └── discovery/        # Discovery engines
├── registry/              # Model registry Python code
├── docker/               # Docker configuration files
└── config/                # Configuration files
```

## Development

### Frontend
- `npm run dev` - Start development server
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Re-seed database

### Backend Pipelines
- `npm run pipeline:monitor` - Run monitoring cycle
- `npm run registry:ingest` - Ingest priority models
- `npm run registry:linkages` - Create linkages
- `npm run registry:enrich-dates` - Enrich model release dates

## Docker

```bash
# Development with hot reload
docker-compose -f docker/docker-compose.dev.yml up --build

# Production
docker-compose -f docker/docker-compose.yml up --build
```

## Troubleshooting

### Python Prisma Client Generation Fails
This is expected - the Python Prisma client is optional. Run `npm run db:generate` for Node.js client only.

### Discovery Engine Not Finding Deals
- **RSS feeds**: Should work immediately without API keys
- **Exa API**: Verify `EXA_API_KEY` is set correctly in `.env`
- Check terminal output for error messages
- Ensure database is initialized: `npm run db:push`

### Database Connection Issues
- Verify `DATABASE_URL` in `.env` points to: `file:./prisma/dev.db`
- Run `npm run db:push` to sync schema
- Check file permissions on database file

## License

MIT
