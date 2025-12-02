import { prisma } from '@/lib/prisma'
import AutoIngest from '@/app/components/models/AutoIngest'
import AutoEnrich from '@/app/components/models/AutoEnrich'
import ModelsClient from './ModelsClient'

async function getModels() {
  const models = await prisma.modelRegistry.findMany({
    orderBy: { releaseDate: 'desc' },
    select: {
      id: true,
      modelId: true,
      provider: true,
      family: true,
      releaseDate: true,
      params: true,
      tokensEstMin: true,
      tokensEstMax: true,
      tokensEstMid: true,
      evidenceStrength: true,
      architectureType: true,
      isMoe: true,
      multimodal: true,
    },
  })
  return models
}

export default async function ModelsPage() {
  const models = await getModels()

  // Convert Date objects to strings for client component
  const modelsWithStringDates = models.map(model => ({
    ...model,
    releaseDate: model.releaseDate instanceof Date ? model.releaseDate.toISOString() : model.releaseDate,
  }))

  return (
    <main className="min-h-screen bg-background">
      <div className="container-content section-padding">
        {/* Auto-ingest notification */}
        <AutoIngest modelCount={models.length} />
        
        {/* Auto-enrich notification */}
        <AutoEnrich 
          modelCount={models.length} 
          modelsWithTokens={models.filter(m => m.tokensEstMid).length}
          modelsWithDates={models.filter(m => m.releaseDate).length}
        />
        
        {/* Header */}
        <div className="mb-4">
          <h1 className="text-3xl font-semibold mb-1">Model Registry</h1>
          <p className="text-text-muted text-sm">
            Training data scale estimates for major AI models
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          <div className="stat-card py-3">
            <div className="text-2xl font-semibold mb-1">{models.length}</div>
            <div className="text-xs text-text-muted">Total Models</div>
          </div>
          <div className="stat-card py-3">
            <div className="text-2xl font-semibold mb-1">
              {new Set(models.map(m => m.provider)).size}
            </div>
            <div className="text-xs text-text-muted">Providers</div>
          </div>
          <div className="stat-card py-3">
            <div className="text-2xl font-semibold mb-1">
              {models.filter(m => m.multimodal).length}
            </div>
            <div className="text-xs text-text-muted">Multimodal</div>
          </div>
          <div className="stat-card py-3">
            <div className="text-2xl font-semibold mb-1">
              {models.filter(m => m.releaseDate).length}
            </div>
            <div className="text-xs text-text-muted">
              With Release Dates
              {models.filter(m => !m.releaseDate).length > 0 && (
                <span className="text-text-muted/60 ml-1">
                  ({models.filter(m => !m.releaseDate).length} missing)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Models Table with Filtering, Sorting, and Grouping */}
        <ModelsClient initialModels={modelsWithStringDates} />
      </div>
    </main>
  )
}

