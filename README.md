# AI Training Data Deals Dashboard

A system for tracking AI training data licensing deals with automated discovery and extraction.

## Overview

This project provides:
- **Training Data Deals Dashboard** - Track licensing, acquisition, and commissioning deals
- **Automated Discovery Pipeline** - Multi-source deal discovery with extraction
- **Database Storage** - Prisma-based storage with temporal and provenance metadata

## Features

### Deals Dashboard
- Searchable, filterable deals table with 24 baseline deals
- Modal view for detailed deal information
- Pricing normalization page (per-unit comparisons)
- Analytics dashboard with market statistics
- Sortable by all columns (provider, buyer, date, price, etc.)

### Discovery & Ingestion Pipeline
- **Multi-source discovery**: RSS feeds, News APIs, SEC filings, Exa API, Perplexity feed (optional)
- **5-stage extraction pipeline**: Preprocessing, regex extraction, normalization, canonicalization, deduplication
- **Deal classification**: Keyword-based filtering to detect AI data licensing deals
- **Token inference**: Convert deals into token estimates using lookup tables
- **Database integration**: Automatic storage with Prisma ORM
- **Provenance tracking**: Source URLs, extraction metadata, temporal tracking
- **Perplexity Feed**: AI-powered feed acquisition (similar to briefing.commonknowled.ge)

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + React Server Components
- **Database**: SQLite (MVP) via Prisma ORM
- **Styling**: Tailwind CSS + Public Sans font
- **Ingestion**: Python pipeline with Exa API integration

## Quick Start

### Option 1: Docker (Recommended)

The easiest way to get started is using Docker:

```bash
# Development with hot reload
docker-compose -f docker-compose.dev.yml up --build

# Access at http://localhost:3000
```

### Option 2: Local Setup

### Prerequisites
- Node.js 18+
- Python 3.10+

### Setup (5 minutes)

1. **Install dependencies:**
   ```bash
   npm install
   cd ingestion && pip install -r requirements.txt && cd ..
   cd registry && pip install -r requirements.txt && cd ..
   ```
   
2. **Setup project (generates Prisma clients automatically):**
   ```bash
   npm run setup  # Generates both Node.js and Python Prisma clients
   ```
   
   Or manually:
   ```bash
   npm run db:generate  # Generate Node.js Prisma client
   npm run setup:python  # Generate Python Prisma client (optional)
   ```
   
   **Note**: The Python Prisma client is optional. Model ingestion works automatically via direct Prisma access.

3. **Initialize database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Configure API keys** (create `.env` file):
   ```bash
   EXA_API_KEY=your_key_here         # Optional but recommended
   NEWS_API_KEY=your_key_here        # Optional
   PERPLEXITY_API_KEY=your_key_here   # Optional (for Perplexity feed)
   DATABASE_URL=file:./dev.db
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open**: http://localhost:3000

## Model Registry

The Model Registry tracks training data scale estimates for major AI models. 

### Automatic Ingestion

**Model ingestion happens automatically** when you navigate to the `/models` page:
- The system checks if models exist
- If none exist, it automatically creates basic model records (no Python required)
- A loading indicator shows progress
- The page refreshes when complete

**Linkage creation also happens automatically** when you navigate to `/linkages`:
- If no linkages exist but deals and models are present, linkages are created automatically
- The page refreshes when complete

### Manual Ingestion (Optional)

You can also manually trigger ingestion:
- Go to `/models` page and click "Ingest Models" button
- Or run from command line: `npm run registry:ingest`

To manually create linkages:
- Go to `/linkages` page and click "Create Linkages" button
   - Or run from command line: `npm run registry:linkages`

**Troubleshooting**: If you get "Prisma client hasn't been generated" errors:
- Run `npm run db:generate` first (generates Node.js client)
- Then run `cd registry && python3 -m prisma generate && cd ..`
- The Python Prisma client requires the Node.js client to be generated first

### Run the Pipeline

```bash
# Run monitoring cycle
npm run pipeline:monitor
```

## Project Structure

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes (deals, models, linkages)
│   ├── deals/             # Deals pages and components
│   ├── analytics/         # Analytics dashboard
│   └── normalization/     # Pricing normalization tool
├── prisma/                # Database schema and migrations
├── ingestion/             # Python scraping pipeline
│   ├── pipeline/          # Extraction pipeline stages
│   │   ├── preprocessor.py      # Stage A: Text preprocessing
│   │   ├── regex_extractor.py   # Stage B: Regex extraction
│   │   ├── llm_normalizer.py    # Stage C: Normalization
│   │   ├── canonicalizer.py     # Stage D: Canonicalization
│   │   ├── deduplicator.py      # Stage E: Deduplication
│   │   ├── deal_radar.py        # Deal classification
│   │   ├── token_inference.py   # Deal-to-token conversion
│   │   ├── versioning.py        # Version control
│   │   └── extraction_pipeline.py # Main orchestrator
│   ├── scrapers/          # Source scrapers
│   │   ├── rss_scraper.py
│   │   ├── news_api_scraper.py
│   │   ├── sec_scraper.py
│   │   └── perplexity_feed_scraper.py  # AI-powered feed (like briefing.commonknowled.ge)
│   ├── exa_deal_discovery.py
│   ├── deal_parser.py
│   ├── monitor.py         # Monitoring pipeline
│   └── main.py
├── mcp-servers/           # MCP servers (optional)
│   ├── database/          # Database operations
│   ├── deal-discovery/    # Multi-source discovery
│   └── entity-resolution/ # Entity normalization
└── lib/                   # Utilities
```

## Database Schema

### Deals Table
- Core deal information (provider, buyer, modality, price)
- Temporal metadata (announcement, effective dates, discovery)
- Provenance (Exa tracking, extraction metadata, source URLs)
- Pricing normalizations
- Rights and restrictions


## Development

### Frontend
- `npm run dev` - Start development server
- `npm run db:studio` - Open Prisma Studio
- `npm run db:seed` - Re-seed database
- `npm run db:generate` - Generate Prisma client (required for Python DB operations)

### Backend Pipelines
- `python ingestion/monitor.py` - Run monitoring cycle (discovery + extraction)
- `npm run registry:ingest` - Ingest priority models into the Model Registry
- `npm run registry:linkages` - Create linkages between deals and models

### Setup for Automation
1. **Install Python dependencies**: 
   ```bash
   cd ingestion
   pip install -r requirements.txt
   ```
2. **Generate Prisma client** (required for database operations):
   ```bash
   npm run db:generate
   ```
3. **Configure API keys** in `.env`:
   - `EXA_API_KEY` (optional but recommended)
   - `NEWS_API_KEY` (optional)
   - `PERPLEXITY_API_KEY` (optional, for Perplexity feed scraper)
   - `DATABASE_URL=file:./dev.db`
4. **Set up cron job** for daily monitoring: 
   ```bash
   0 2 * * * cd /path/to/project && python ingestion/monitor.py
   ```

## Automation Pipeline

The system includes a complete automated deal discovery and extraction pipeline:

### Extraction Pipeline (5 Stages)
1. **Preprocessing**: Text normalization and keyword detection
2. **Regex Extraction**: Pattern-based field extraction (price, duration, exclusivity)
3. **Normalization**: Field normalization and validation
4. **Canonicalization**: Entity and field normalization
5. **Deduplication**: Merge duplicate deals from multiple sources

### Discovery Sources
- **RSS Feeds**: Press releases, company blogs
- **News APIs**: NewsAPI integration
- **SEC Filings**: SEC EDGAR framework
- **Exa Discovery**: AI-powered URL discovery
- **Perplexity Feed**: AI-powered feed acquisition (similar to [briefing.commonknowled.ge](https://briefing.commonknowled.ge/)) - uses Perplexity API to intelligently search for deal-related content

### Features
- **Deal Classification**: Keyword-based filtering to detect AI data licensing deals
- **Token Inference**: Convert deals to token estimates using lookup tables
- **Provenance Tracking**: Source URLs, extraction metadata, temporal tracking
- **Database Integration**: Automatic storage with Prisma ORM and deduplication

### Usage
```python
from ingestion.monitor import DealMonitor
import asyncio

async def main():
    monitor = DealMonitor()
    summary = await monitor.run_monitoring_cycle(days_back=7)
    print(summary)

asyncio.run(main())
```

## MCP Servers (Optional)

The project includes Model Context Protocol (MCP) servers that expose pipeline operations as tools for AI assistants. These are optional and wrap existing functionality.

### Available Servers

1. **Database Server** (`mcp-servers/database/`)
   - `upsert_deal` - Save deals with provenance tracking
   - `query_deals` - Query deals with filters
   - `get_provenance_chain` - Get deal provenance information

2. **Deal Discovery Server** (`mcp-servers/deal-discovery/`)
   - `discover_rss_feeds` - Discover from RSS feeds
   - `discover_news_api` - Discover from News API
   - `discover_sec_filings` - Discover from SEC filings
   - `discover_exa` - Discover using Exa API
   - `discover_all` - Discover from all sources

3. **Entity Resolution Server** (`mcp-servers/entity-resolution/`)
   - `normalize_company_name` - Normalize company names
   - `resolve_company_aliases` - Get company aliases
   - `match_entities` - Check if entities match
   - `canonicalize_deal` - Canonicalize all entities in a deal

**Note**: MCP servers require the MCP SDK (`pip install mcp`). The standard Python pipeline works without MCP.

### Installation

```bash
pip install mcp
```

### Usage

Servers can be run as stdio servers or used with MCP clients. See `mcp-servers/client_example.py` for an example of using MCP servers in the ingestion pipeline.

```python
from mcp import ClientSession, StdioServerParameters
import asyncio

async def main():
    server_params = StdioServerParameters(
        command="python",
        args=["mcp-servers/database/server.py"]
    )
    
    async with ClientSession(server_params) as session:
        result = await session.call_tool(
            "upsert_deal",
            {"deal_data": {...}}
        )
        print(result)

asyncio.run(main())
```

## License

MIT

