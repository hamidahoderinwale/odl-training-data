import { prisma } from '@/lib/prisma'
import AutoCreate from '@/app/components/linkages/AutoCreate'
import LinkagesClient from './LinkagesClient'

async function getLinkages() {
  const linkages = await prisma.dealModelLinkage.findMany({
    include: {
      deal: {
        select: {
          id: true,
          provider: true,
          buyer: true,
          modality: true,
          priceUsd: true,
          date: true,
        },
      },
      model: {
        select: {
          id: true,
          modelId: true,
          provider: true,
          family: true,
          tokensEstMid: true,
        },
      },
    },
    orderBy: [
      { linkageStrength: 'desc' },
      { analysisTimestamp: 'desc' },
    ],
  })
  return linkages
}


async function getDealCount() {
  return await prisma.deal.count()
}

async function getModelCount() {
  return await prisma.modelRegistry.count()
}

export default async function LinkagesPage() {
  const linkages = await getLinkages()
  const dealCount = await getDealCount()
  const modelCount = await getModelCount()

  return (
    <main className="min-h-screen bg-background">
      <div className="container-content section-padding">
        {/* Auto-create notification */}
        <AutoCreate 
          linkageCount={linkages.length} 
          dealCount={dealCount}
          modelCount={modelCount}
        />
        
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-semibold mb-1">Deal-Model Linkages</h1>
          <p className="text-text-muted text-sm">
            Connections between training data deals and AI models
          </p>
        </div>

        {/* Detailed Explanation - Above table, collapsible */}
        {linkages.length > 0 && (
          <div className="card mb-6">
            <details className="group">
              <summary className="cursor-pointer list-none flex items-center justify-between">
                <h2 className="text-lg font-semibold">How Linkages Work</h2>
                <span className="text-text-muted text-sm group-open:hidden">Click to expand</span>
                <span className="text-text-muted text-sm hidden group-open:inline">Click to collapse</span>
              </summary>
              <div className="mt-3 pt-3 border-t border-border-subtle space-y-3 text-sm text-text-muted">
                <div>
                  <h3 className="font-semibold text-text mb-2">Example:</h3>
                  <p className="leading-relaxed">
                    If you see a linkage: <strong className="text-text">News Corp → OpenAI</strong> connected to <strong className="text-text">GPT-4</strong>, 
                    it means OpenAI signed a deal with News Corp, and because GPT-4 is an OpenAI model, there's a potential connection. 
                    If the deal happened in 2023 and GPT-4 was released in 2023, that's a stronger connection (temporal overlap).
                  </p>
                </div>
                
                <div className="pt-2 border-t border-border-subtle">
                  <h3 className="font-semibold text-text mb-2">Connection Types:</h3>
                  <ul className="space-y-2">
                    <li>
                      <strong className="text-text">Same Time Period:</strong> Deal and model release are within 1 year. 
                      Suggests the deal's data may have been used in training.
                    </li>
                    <li>
                      <strong className="text-text">Same Company:</strong> Deal buyer matches model provider, but different time periods. 
                      Shows organizational relationship but less direct connection.
                    </li>
                  </ul>
                </div>
                
                <div className="pt-2 border-t border-border-subtle">
                  <h3 className="font-semibold text-text mb-2">Confidence Levels:</h3>
                  <p className="leading-relaxed">
                    Currently all linkages are marked as <strong className="text-text">High</strong> confidence because they require 
                    a clear match between the deal buyer and model provider. The system automatically creates these connections 
                    when it finds matching company names (e.g., "OpenAI" in both the deal and model).
                  </p>
                </div>
              </div>
            </details>
          </div>
        )}

        {/* Linkages Table with Filtering, Sorting, and Grouping */}
        {linkages.length === 0 ? (
          <div className="card">
            <div className="text-center py-12 text-text-muted">
              {dealCount === 0 || modelCount === 0 
                ? `No ${dealCount === 0 ? 'deals' : 'models'} found. Please seed the database first.`
                : 'No linkages found. Linkage creation will start automatically.'}
            </div>
          </div>
        ) : (
          <LinkagesClient initialLinkages={linkages.filter(l => l && l.deal && l.model)} />
        )}
      </div>
    </main>
  )
}
