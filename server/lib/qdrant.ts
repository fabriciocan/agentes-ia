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

// Cria collection com vetor padrão sem nome — formato nativo LangChain/N8N
// O N8N não precisa de nenhuma configuração extra para escrever/ler
export async function ensureKnowledgeCollection(agentConfigId: string): Promise<void> {
  const name = knowledgeCollectionName(agentConfigId)
  const { collections } = await qdrant.getCollections()
  const existing = collections.find((c) => c.name === name)

  if (existing) {
    const info = await qdrant.getCollection(name)
    const vectorConfig = info.config?.params?.vectors as Record<string, unknown> | undefined
    // Vetor padrão (sem nome) tem `size` diretamente na raiz do objeto
    const isUnnamed = typeof vectorConfig?.size === 'number'
    if (isUnnamed) {
      // Collection já no formato correto
      await prisma.agent_configs.update({
        where: { id: agentConfigId },
        data: { qdrant_collection: name },
      })
      return
    }
    // Formato antigo (vetores nomeados) → recria
    await qdrant.deleteCollection(name)
    await prisma.knowledge_base.deleteMany({ where: { agent_config_id: agentConfigId } })
  }

  // Vetor padrão sem nome — LangChain insere e busca sem configuração extra
  await qdrant.createCollection(name, {
    vectors: {
      size: 1536,       // text-embedding-3-small
      distance: 'Cosine',
      on_disk: false,
    },
    optimizers_config: {
      default_segment_number: 2,
    },
    replication_factor: 1,
  })

  // Payload indexes para filtragem eficiente
  await Promise.all([
    qdrant.createPayloadIndex(name, { field_name: 'agent_config_id',          field_schema: 'keyword' }),
    qdrant.createPayloadIndex(name, { field_name: 'metadata.agent_config_id', field_schema: 'keyword' }),
    qdrant.createPayloadIndex(name, { field_name: 'metadata.language',        field_schema: 'keyword' }),
    qdrant.createPayloadIndex(name, { field_name: 'metadata.blobType',        field_schema: 'keyword' }),
  ])

  await prisma.agent_configs.update({
    where: { id: agentConfigId },
    data: { qdrant_collection: name },
  })
}
