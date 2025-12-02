# AI Training Data Deals Dashboard

A system for tracking AI training data licensing deals with automated discovery and extraction.

## Overview

This project provides:
- **Training Data Deals Dashboard** - Track licensing, acquisition, and commissioning deals
- **Automated Discovery Pipeline** - Multi-source deal discovery with extraction
- **Database Storage** - Prisma-based storage with temporal and provenance metadata

## Features

### Deals Dashboard
- Searchable, filterable deals table with comprehensive deal tracking
- Market analytics with key statistics (total deals, spend, top buyers/providers, modality breakdown)
- Modal view for detailed deal information
- Timeline view showing deals chronologically (2020-2025)
- Pricing normalization page (per-unit comparisons)
- Sortable by all columns (provider, buyer, date, price, etc.)
- Auto-enrichment: Automatically infers missing metadata (deal type, pricing mechanism, duration, rights)

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
   
   **Troubleshooting**: If `npm run setup` fails with "prisma-client-py: command not found", this is expected. The Python Prisma client generation is optional. Just run `npm run db:generate` instead to generate the Node.js client, which is sufficient for the web application.

3. **Initialize database:**
   ```bash
   npm run db:push
   npm run db:seed
   ```

4. **Configure API keys** (create `.env` file in project root):
   
   Create a `.env` file in the project root with the following variables:
   ```bash
   # Database (required)
   DATABASE_URL=file:./prisma/dev.db
   
   # Exa API (recommended for deal discovery)
   # Get your API key from: https://exa.ai/
   # Exa provides AI-powered search for finding deal announcements
   EXA_API_KEY=your_exa_api_key_here
   
   # News API (optional)
   # Get your API key from: https://newsapi.org/
   NEWS_API_KEY=your_news_api_key_here
   
   # Perplexity API (optional)
   # Get your API key from: https://www.perplexity.ai/
   # Used for AI-powered feed acquisition
   PERPLEXITY_API_KEY=your_perplexity_api_key_here
   ```
   
   **Note**: 
   - `DATABASE_URL` is required (use `file:./prisma/dev.db` for SQLite)
   - `EXA_API_KEY` is **highly recommended** - it's the primary discovery engine
   - `NEWS_API_KEY` and `PERPLEXITY_API_KEY` are optional but enable additional discovery sources
   - RSS feeds work without any API keys (uses public RSS feeds from OpenAI, Google, Anthropic, Meta blogs)
   - You can copy `.env.example` as a template: `cp .env.example .env`

5. **Start development server:**
   ```bash
   npm run dev
   ```

6. **Open**: http://localhost:3000

## Using the App

### Navigation

The app includes several key pages accessible from the sidebar:

- **Deals** (`/`) - Main dashboard with searchable deals table, market analytics (total deals, spend, top buyers/providers, modality breakdown), and discovery tools
- **Timeline** (`/timeline`) - Chronological view of deals organized by year (2020-2023, 2024, 2025)
- **Models** (`/models`) - Model Registry showing AI models with token estimates and training data information
- **Linkages** (`/linkages`) - Connections between deals and models, showing which models may have used which training data
- **Normalization** (`/normalization`) - Pricing normalization tool for comparing deals across different units
- **Help** (`/help`) - Comprehensive documentation and user guide

### Key Features

#### Deal Discovery
- Click "Discover Deals" button on the main page to trigger automated discovery from multiple sources
- Discovery runs in the background and can take several minutes
- New deals are automatically extracted and added to the database

#### Auto-Enrichment
- The system automatically enriches deals with missing metadata when you visit the main page
- Enrichment infers: deal type, pricing mechanism, duration, and usage rights
- Only runs if less than 80% of deals have complete metadata

#### Pricing Normalization
- Click on any price in the deals table to see normalized per-unit costs
- Prices are normalized to common units (per token, per image, per minute, etc.)
- The normalization info bar (expandable) explains the methodology

#### Tooltips & Help
- Hover over underlined terms (with dotted underlines) to see tooltips
- Tooltips explain technical terms, metrics, and features throughout the app
- The normalization info bar provides detailed methodology when expanded

#### Deal Details
- Click any deal row to open a detailed modal
- Modal shows all deal information, source links, and provenance metadata
- View related content and extraction confidence scores

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

**Model Date Enrichment:**
- Enrich model release dates: `npm run registry:enrich-dates`
- Enrich all model release dates: `npm run registry:enrich-dates:all`

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
│   ├── api/               # API routes (deals, models, linkages, currency)
│   │   ├── deals/         # Deal-related endpoints
│   │   ├── models/        # Model-related endpoints
│   │   ├── linkages/      # Linkage endpoints
│   │   └── currency/      # Currency conversion
│   ├── components/        # React components
│   │   ├── ui/            # Shared UI components (Sidebar, Tooltip, ProgressBar)
│   │   ├── deals/         # Deal-specific components
│   │   ├── models/        # Model-specific components
│   │   └── linkages/      # Linkage-specific components
│   ├── deals/             # Deals pages and client components
│   ├── timeline/          # Timeline view of deals
│   ├── models/            # Model Registry pages
│   ├── linkages/          # Deal-model linkages
│   ├── normalization/     # Pricing normalization tool
│   └── help/              # Help/documentation page
├── lib/                   # Shared utilities and types
│   ├── api/               # API-related utilities
│   │   ├── deal-enrichment.ts
│   │   ├── model-enrichment.ts
│   │   ├── linkage.ts
│   │   └── priority-models.ts
│   ├── utils/             # General utilities
│   │   ├── utils.ts       # Formatting and data manipulation
│   │   ├── currency.ts    # Currency conversion
│   │   └── date-validation.ts
│   ├── types/             # TypeScript type definitions
│   │   └── deal.ts
│   └── prisma.ts          # Prisma client instance
├── prisma/                # Database schema and migrations
│   ├── schema.prisma      # Database schema
│   └── seed.ts            # Database seeding
├── ingestion/             # Python scraping pipeline
│   ├── discovery/         # Discovery engines
│   │   ├── exa_client.py
│   │   └── exa_deal_discovery.py
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
│   │   └── perplexity_feed_scraper.py
│   ├── monitor.py         # Monitoring pipeline
│   ├── source_registry.py # Source configuration
│   └── validator.py       # Data validation
├── registry/              # Model registry and enrichment
│   ├── collectors/        # Data collectors
│   ├── enrichment/        # Model enrichment
│   ├── inference/         # Token inference
│   └── storage/           # Storage utilities
├── mcp-servers/           # MCP servers (optional)
│   ├── database/          # Database operations
│   ├── deal-discovery/    # Multi-source discovery
│   └── entity-resolution/ # Entity normalization
└── scripts/               # Utility scripts
    ├── discover-deals.sh
    └── migrate-dates.ts
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
- `npm run registry:ingest:test` - Test ingestion with limit of 5 models
- `npm run registry:linkages` - Create linkages between deals and models
- `npm run registry:enrich-dates` - Enrich model release dates
- `npm run registry:enrich-dates:all` - Enrich all model release dates

### Setup for Automation

#### Getting the Exa/RSS Discovery Engine Running

**RSS Feeds (No API Key Required)**
- RSS discovery works immediately without any setup
- Uses public RSS feeds from major AI companies (OpenAI, Google, Anthropic, Meta blogs)
- Configured in `ingestion/scrapers/rss_scraper.py`

**Exa API (Recommended - Primary Discovery Engine)**
1. **Get an Exa API key:**
   - Sign up at https://exa.ai/
   - Navigate to your API settings/dashboard
   - Copy your API key

2. **Add to `.env` file** (create in project root if it doesn't exist):
   ```bash
   EXA_API_KEY=your_actual_exa_api_key_here
   DATABASE_URL=file:./prisma/dev.db
   ```

3. **Test the discovery engine:**
   ```bash
   # Discover deals from Exa (90 days back)
   npm run discover
   
   # Or discover from all sources (Exa + RSS + News API + SEC)
   npm run discover:all
   
   # Or use the script directly with custom parameters
   bash scripts/discover-deals.sh 90 exa    # 90 days, Exa only
   bash scripts/discover-deals.sh 90 all    # 90 days, all sources
   ```

4. **Verify it's working:**
   - Check the terminal output for discovery results
   - New deals will appear in the web interface at http://localhost:3000
   - You can also check the database using `npm run db:studio`

5. **Test RSS discovery (no API key required):**
   ```bash
   # Test RSS feeds only (works without any API keys)
   cd ingestion
   source ../venv/bin/activate  # or activate your Python environment
   python3 monitor.py --days-back 1 --source rss
   ```

**Other Optional APIs:**
- **News API**: Get key from https://newsapi.org/ (add `NEWS_API_KEY` to `.env`)
- **Perplexity API**: Get key from https://www.perplexity.ai/ (add `PERPLEXITY_API_KEY` to `.env`)

#### Full Automation Setup
1. **Install Python dependencies**: 
   ```bash
   cd ingestion
   pip install -r requirements.txt
   ```
2. **Generate Prisma client** (required for database operations):
   ```bash
   npm run db:generate
   ```
3. **Configure API keys** in `.env` (see above for details)
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

**Quick Start (Recommended):**
```bash
# Discover deals from Exa API (90 days back, optimized queries)
npm run discover

# Discover from all sources (Exa, RSS, News API, etc.)
npm run discover:all

# Or use the script directly
bash scripts/discover-deals.sh 90 exa
```

**Python API:**
```python
from ingestion.monitor import DealMonitor
import asyncio

async def main():
    monitor = DealMonitor()
    # Use 90 days for comprehensive discovery
    summary = await monitor.run_monitoring_cycle(days_back=90, source_filter='exa')
    print(summary)

asyncio.run(main())
```

**Enhanced Discovery Features:**
- **50+ optimized Exa queries** covering major AI companies, data providers, and deal types
- **Extended date range** (90 days default, up to 365 days for historical deals)
- **25 results per query** (increased from 10) for better coverage
- **Expanded trigger phrases** (35+ phrases) to catch more deals
- **Lower confidence threshold** (0.4 vs 0.5) to be more inclusive
- **Enhanced Exa API parameters** with highlights and more context

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

**Important**: MCP servers are designed for AI assistant integration (Claude Desktop, Cursor, etc.) via stdio protocol, not for direct HTTP API calls. The web application uses direct database access for better performance.

**For AI Assistant Integration:**

Servers can be run as stdio servers or used with MCP clients. See `mcp-servers/client_upsert.py` for an example of using MCP servers:

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

**For Web Application:**

The `/api/mcp/deals` endpoint uses Python scripts (`add_deal.py`) that provide the same functionality without MCP protocol overhead. This is intentional - direct database access is faster and simpler for web APIs.

## Troubleshooting

### Python Prisma Client Generation Fails
If you see `prisma-client-py: command not found` during setup:
- This is expected - the Python Prisma client is optional
- Run `npm run db:generate` instead (generates Node.js client only)
- The web application works fine without the Python Prisma client
- Python scripts can access the database directly via Prisma

### Discovery Engine Not Finding Deals
- **RSS feeds**: Should work immediately without API keys. Test with `python ingestion/monitor.py --source rss --days-back 1`
- **Exa API**: Verify your `EXA_API_KEY` is set correctly in `.env` file
- **Check logs**: Look at terminal output for error messages
- **Database**: Ensure database is initialized with `npm run db:push`

### Database Connection Issues
- Verify `DATABASE_URL` in `.env` points to the correct path: `file:./prisma/dev.db`
- Run `npm run db:push` to ensure schema is synced
- Check file permissions on the database file

### Module Import Errors in Python
- Ensure you're in the correct directory when running Python scripts
- Activate virtual environment: `source venv/bin/activate`
- Install dependencies: `cd ingestion && pip install -r requirements.txt`
- For scripts in `ingestion/`, run from that directory or adjust Python path

## License

MIT

