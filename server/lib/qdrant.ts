import { QdrantClient } from '@qdrant/js-client-rest'

const globalForQdrant = globalThis as unknown as { qdrant: QdrantClient | undefined }

export const qdrant =
  globalForQdrant.qdrant ??
  new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY!,
  })

if (process.env.NODE_ENV !== 'production') globalForQdrant.qdrant = qdrant

// Uma collection por agent_config. Convenção: knowledge_{agentConfigId com _ no lugar de -}
export function knowledgeCollectionName(agentConfigId: string): string {
  return `knowledge_${agentConfigId.replace(/-/g, '_')}`
}

// Garante que a collection existe no Qdrant antes de inserir pontos
export async function ensureKnowledgeCollection(agentConfigId: string): Promise<void> {
  const name = knowledgeCollectionName(agentConfigId)
  const { collections } = await qdrant.getCollections()
  const exists = collections.some((c) => c.name === name)
  if (!exists) {
    await qdrant.createCollection(name, {
      vectors: { size: 1536, distance: 'Cosine' },
    })
  }
}
