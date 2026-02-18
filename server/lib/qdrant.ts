import { QdrantClient } from '@qdrant/js-client-rest'
import { prisma } from './prisma'

const globalForQdrant = globalThis as unknown as { qdrant: QdrantClient | undefined }

export const qdrant =
  globalForQdrant.qdrant ??
  new QdrantClient({
    url: process.env.QDRANT_URL!,
    apiKey: process.env.QDRANT_API_KEY || undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForQdrant.qdrant = qdrant

export function knowledgeCollectionName(agentConfigId: string): string {
  return `knowledge_${agentConfigId.replace(/-/g, '_')}`
}

// Cria collection com vetores nomeados compatíveis com busca híbrida do N8N
// O N8N usa: prefetch[{ query: denseVector, using: "dense" }]
export async function ensureKnowledgeCollection(agentConfigId: string): Promise<void> {
  const name = knowledgeCollectionName(agentConfigId)
  const { collections } = await qdrant.getCollections()
  const existing = collections.find((c) => c.name === name)

  if (existing) {
    // Verifica se já usa vetores nomeados — se não, recria
    const info = await qdrant.getCollection(name)
    const hasNamedDense = !!(info.config?.params?.vectors as Record<string, unknown>)?.dense
    if (!hasNamedDense) {
      await qdrant.deleteCollection(name)
      // deleta também os registros do knowledge_base para forçar re-upload
      await prisma.knowledge_base.deleteMany({ where: { agent_config_id: agentConfigId } })
    } else {
      // Collection já está no formato correto, apenas atualiza agent_configs
      await prisma.agent_configs.update({
        where: { id: agentConfigId },
        data: { qdrant_collection: name },
      })
      return
    }
  }

  // Cria collection com vetor denso nomeado "dense" (compatível com N8N)
  // e vetor esparso "sparse" para busca híbrida futura
  await qdrant.createCollection(name, {
    vectors: {
      dense: {
        size: 1536,       // text-embedding-3-small
        distance: 'Cosine',
        on_disk: false,
      },
    },
    sparse_vectors: {
      sparse: {
        index: { on_disk: false },
      },
    },
    optimizers_config: {
      default_segment_number: 2,
    },
    replication_factor: 1,
  })

  // Payload indexes para filtragem eficiente
  await Promise.all([
    qdrant.createPayloadIndex(name, { field_name: 'agent_config_id', field_schema: 'keyword' }),
    qdrant.createPayloadIndex(name, { field_name: 'content_type',    field_schema: 'keyword' }),
    qdrant.createPayloadIndex(name, { field_name: 'language',        field_schema: 'keyword' }),
  ])

  // Salva nome da collection em agent_configs
  await prisma.agent_configs.update({
    where: { id: agentConfigId },
    data: { qdrant_collection: name },
  })
}
