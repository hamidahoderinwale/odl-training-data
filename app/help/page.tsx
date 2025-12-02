import Link from 'next/link'
import Tooltip from '@/app/components/ui/Tooltip'

export default function HelpPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container-content section-padding">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold mb-1">Help & Documentation</h1>
          <p className="text-text-muted text-sm">
            Learn how to use the AI Training Data Deals Dashboard
          </p>
        </div>

        {/* Getting Started */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
          <div className="space-y-4 text-sm text-text-muted">
            <div>
              <h3 className="font-semibold text-text mb-2">1. Explore Deals</h3>
              <p>
                Start at the <Link href="/" className="text-accent hover:underline">Deals page</Link> to browse all training data deals. 
                Use the search bar to find specific deals by provider, buyer, or modality. Click column headers to sort.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">2. View Deal Details</h3>
              <p>
                Click any deal row to open a detailed modal with complete information, source links, and provenance metadata.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">3. Discover New Deals</h3>
              <p>
                Click the "Discover Deals" button to trigger automated discovery from multiple sources (RSS, News API, SEC filings, Exa API). 
                This process runs in the background and may take several minutes.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">4. Explore Models & Linkages</h3>
              <p>
                Visit the <Link href="/models" className="text-accent hover:underline">Models page</Link> to see AI models with token estimates, 
                and the <Link href="/linkages" className="text-accent hover:underline">Linkages page</Link> to see connections between deals and models.
              </p>
            </div>
          </div>
        </div>

        {/* Key Concepts */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Key Concepts</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-text mb-2">What is a Training Data Deal?</h3>
              <p className="text-text-muted">
                A licensing, acquisition, or commissioning agreement where an AI company (buyer) obtains rights to use data 
                for training AI models. Deals can be exclusive (only one buyer) or non-exclusive (multiple buyers).
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Modality</h3>
              <p className="text-text-muted">
                The type of data being licensed: Text (articles, books), Image (photos, illustrations), Audio (music, podcasts), 
                Video (video content), Satellite (satellite imagery), or combinations thereof.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Pricing Normalization</h3>
              <p className="text-text-muted">
                Prices are normalized to common units (per token, per image, per minute) to enable comparison across different deal types. 
                Click on any price in the deals table to see normalized costs. Expand the "Pricing Normalizations" info bar for detailed methodology.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Creator Compensation</h3>
              <p className="text-text-muted">
                Whether original creators (authors, artists, musicians) are compensated for their work being used in AI training. 
                This can include direct payments, revenue sharing, or royalties.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Usage Rights</h3>
              <p className="text-text-muted">
                Deals specify what the buyer can do with the data:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1 text-text-muted">
                <li><strong>Training Allowed:</strong> Can use data to train new AI models</li>
                <li><strong>Finetuning Allowed:</strong> Can use data to fine-tune existing models</li>
                <li><strong>Inference Allowed:</strong> Can use trained models for inference</li>
                <li><strong>Redistribution Allowed:</strong> Can share or redistribute the training data</li>
                <li><strong>Deletion Required:</strong> Must delete data upon request (right to be forgotten)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Deal Types</h3>
              <p className="text-text-muted">
                <strong>Aggregate:</strong> Bulk licensing of existing data<br/>
                <strong>Per-unit:</strong> Pay per item (e.g., per article, per image)<br/>
                <strong>Commissioning:</strong> Custom data creation for the buyer<br/>
                <strong>Acquisition:</strong> Company purchase or major stake
              </p>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Features</h2>
          <div className="space-y-4 text-sm">
            <div>
              <h3 className="font-semibold text-text mb-2">Auto-Enrichment</h3>
              <p className="text-text-muted">
                The system automatically enriches deals with missing metadata when you visit the main page. 
                It infers deal type, pricing mechanism, duration, and usage rights from existing data. 
                Only runs if less than 80% of deals have complete metadata.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Tooltips</h3>
              <p className="text-text-muted">
                Hover over any underlined term (with dotted underlines) to see helpful tooltips explaining technical terms, 
                metrics, and features. Tooltips are available throughout the app on stats, column headers, and field labels.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Search & Filter</h3>
              <p className="text-text-muted">
                Use the search bar to find deals by provider, buyer, or any text. Filter by modality, date range, 
                or other criteria. Click column headers to sort ascending/descending.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Timeline View</h3>
              <p className="text-text-muted">
                The <Link href="/timeline" className="text-accent hover:underline">Timeline page</Link> shows deals chronologically, 
                organized by year (2020-2023, 2024, 2025). Useful for understanding market evolution over time.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Model Registry</h3>
              <p className="text-text-muted">
                The <Link href="/models" className="text-accent hover:underline">Models page</Link> tracks major AI models with:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1 text-text-muted">
                <li>Parameter counts and architecture details</li>
                <li>Token estimates (click to see calculation methodology)</li>
                <li>Evidence strength for training data estimates</li>
                <li>Multimodal capabilities and MoE architecture indicators</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Linkages</h3>
              <p className="text-text-muted">
                The <Link href="/linkages" className="text-accent hover:underline">Linkages page</Link> shows connections between deals and models, 
                indicating which models may have been trained using data from specific deals. Linkages are inferred based on:
              </p>
              <ul className="list-disc ml-6 mt-2 space-y-1 text-text-muted">
                <li><strong>Temporal Overlap:</strong> Deal and model within 1 year</li>
                <li><strong>Company Match:</strong> Buyer matches model provider</li>
                <li><strong>Explicit:</strong> Directly stated in sources</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="card mb-6">
          <h2 className="text-xl font-semibold mb-4">Data Sources & Methodology</h2>
          <div className="space-y-4 text-sm text-text-muted">
            <div>
              <h3 className="font-semibold text-text mb-2">Deal Sources</h3>
              <p>Deals are discovered and extracted from multiple sources:</p>
              <ul className="list-disc ml-6 mt-2 space-y-1">
                <li>Company filings (SEC, SEDAR, LSE)</li>
                <li>Press releases and news articles (Reuters, Bloomberg, TechCrunch, etc.)</li>
                <li>RSS feeds from major AI companies</li>
                <li>Exa API for intelligent content discovery</li>
                <li>Perplexity API for feed acquisition</li>
                <li>Industry trackers (CB Insights, Appen)</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Extraction Pipeline</h3>
              <p>The system uses a 5-stage extraction pipeline:</p>
              <ol className="list-decimal ml-6 mt-2 space-y-1">
                <li><strong>Preprocessing:</strong> Text normalization and keyword detection</li>
                <li><strong>Regex Extraction:</strong> Pattern-based field extraction (price, duration, exclusivity)</li>
                <li><strong>Normalization:</strong> Field normalization and validation</li>
                <li><strong>Canonicalization:</strong> Entity and field normalization</li>
                <li><strong>Deduplication:</strong> Merge duplicate deals from multiple sources</li>
              </ol>
            </div>
            <div>
              <h3 className="font-semibold text-text mb-2">Provenance Tracking</h3>
              <p>
                Each deal includes source links, discovery metadata, extraction confidence scores, and temporal tracking. 
                Click on any deal to view full provenance information.
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Tips & Tricks</h2>
          <div className="space-y-3 text-sm text-text-muted">
            <div className="flex items-start gap-2">
              <span className="text-accent font-bold">💡</span>
              <p>Click prices to see normalized per-unit costs for easy comparison across deals</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-accent font-bold">💡</span>
              <p>Expand the "Pricing Normalizations" info bar on the main page for detailed methodology</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-accent font-bold">💡</span>
              <p>Hover over underlined terms throughout the app for contextual help</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-accent font-bold">💡</span>
              <p>Use the Timeline view to see how the market has evolved over time</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-accent font-bold">💡</span>
              <p>Check Linkages to understand which models may have used which training data</p>
            </div>
            <div className="flex items-start gap-2">
              <span className="text-accent font-bold">💡</span>
              <p>Click token estimates on the Models page to see calculation methodology</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

