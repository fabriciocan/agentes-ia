import { QdrantClient } from '@qdrant/js-client-rest'

const globalForQdrant = globalThis as unknown as { qdrant: QdrantClient | undefined }

export const qdrant =
  globalForQdrant.qdrant ??
  new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForQdrant.qdrant = qdrant

// Uma collection por agent_config. Convenção: knowledge_{agentConfigId com _ no lugar de -}
export function knowledgeCollectionName(agentConfigId: string): string {
  return `knowledge_${agentConfigId.replace(/-/g, '_')}`
}

// Garante que a collection existe no Qdrant com payload indexes para filtragem eficiente
export async function ensureKnowledgeCollection(agentConfigId: string): Promise<void> {
  const name = knowledgeCollectionName(agentConfigId)
  const { collections } = await qdrant.getCollections()
  const exists = collections.some((c) => c.name === name)

  if (!exists) {
    await qdrant.createCollection(name, {
      vectors: {
        size: 1536,
        distance: 'Cosine',
        on_disk: false,
      },
      optimizers_config: {
        default_segment_number: 2,
      },
      replication_factor: 1,
    })

    // Criar payload indexes para filtragem eficiente
    await Promise.all([
      qdrant.createPayloadIndex(name, {
        field_name: 'agent_config_id',
        field_schema: 'keyword',
      }),
      qdrant.createPayloadIndex(name, {
        field_name: 'content_type',
        field_schema: 'keyword',
      }),
      qdrant.createPayloadIndex(name, {
        field_name: 'language',
        field_schema: 'keyword',
      }),
      qdrant.createPayloadIndex(name, {
        field_name: 'chunk_index',
        field_schema: 'integer',
      }),
      qdrant.createPayloadIndex(name, {
        field_name: 'keywords',
        field_schema: 'keyword',
      }),
    ])
  }
}
