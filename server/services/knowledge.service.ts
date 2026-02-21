import { prisma } from '../lib/prisma'
import { qdrant, knowledgeCollectionName, ensureKnowledgeCollection } from '../lib/qdrant'
import { createLogger } from '../utils/logger'
import { generateEmbedding, generateEmbeddings, chunkText } from './embedding.service'
import {
  extractKeywords,
  detectLanguage,
  hasNumericalData,
  hasTableStructure,
  estimatePages
} from '../utils/text-analysis'
import type { PdfMetadata } from '../utils/document-parser'
import type { KnowledgeBase, KnowledgeFile, KnowledgeListItem } from '../types'

const logger = createLogger('knowledge')


// Formato LangChain — compatível com os nós nativos do N8N/Qdrant
interface QdrantPayload {
  // Mantido no top-level para filtros Qdrant diretos
  agent_config_id: string
  // Campos LangChain
  content: string
  metadata: {
    source: string          // nome do arquivo ou "text"
    blobType: string        // MIME type
    loc: {
      lines: { from: number; to: number }
    }
    pdf?: {
      version: string
      info: Record<string, unknown>
      metadata: { _metadata: Record<string, unknown> }
      totalPages: number
    }
    // Campos extras para filtragem e RAG
    agent_config_id: string
    title: string
    language: string
    chunkIndex: number
    totalChunks: number
    keywords: string[]
    hasNumbers: boolean
    hasTable: boolean
    estimatedPages: number
    fileSize: number | null
    createdAt: string
  }
  [key: string]: unknown
}

// --- Helpers para rastreamento de linha por chunk ---

function buildLineOffsets(text: string): number[] {
  const offsets: number[] = [0]
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') offsets.push(i + 1)
  }
  return offsets
}

function charPosToLineNum(lineOffsets: number[], pos: number): number {
  let lo = 0, hi = lineOffsets.length - 1
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (lineOffsets[mid]! <= pos) lo = mid
    else hi = mid - 1
  }
  return lo + 1  // 1-indexed
}

function getChunkLines(
  lineOffsets: number[],
  originalText: string,
  chunk: string,
  searchFrom: number
): { from: number; to: number; nextOffset: number } {
  const probe = chunk.substring(0, Math.min(80, chunk.length))
  const pos = originalText.indexOf(probe, searchFrom)
  if (pos === -1) {
    const fallback = charPosToLineNum(lineOffsets, searchFrom)
    return { from: fallback, to: fallback, nextOffset: searchFrom }
  }
  const from = charPosToLineNum(lineOffsets, pos)
  const to   = charPosToLineNum(lineOffsets, pos + chunk.length - 1)
  return { from, to, nextOffset: pos + 1 }
}

// --- Builder de payload ---

function buildPayload(params: {
  agentConfigId: string
  title: string
  content: string
  source: string
  blobType: string
  lineFrom: number
  lineTo: number
  chunkIndex: number
  totalChunks: number
  language: string
  keywords: string[]
  hasNumbers: boolean
  hasTable: boolean
  estimatedPages: number
  fileSize?: number | null
  createdAt: string
  pdfMetadata?: PdfMetadata
}): QdrantPayload {
  return {
    agent_config_id: params.agentConfigId,
    content: params.content,
    metadata: {
      source: params.source,
      blobType: params.blobType,
      loc: {
        lines: { from: params.lineFrom, to: params.lineTo },
      },
      ...(params.pdfMetadata && {
        pdf: {
          version: params.pdfMetadata.version,
          info: params.pdfMetadata.info,
          metadata: { _metadata: params.pdfMetadata.metadata },
          totalPages: params.pdfMetadata.totalPages,
        },
      }),
      agent_config_id: params.agentConfigId,
      title: params.title,
      language: params.language,
      chunkIndex: params.chunkIndex,
      totalChunks: params.totalChunks,
      keywords: params.keywords,
      hasNumbers: params.hasNumbers,
      hasTable: params.hasTable,
      estimatedPages: params.estimatedPages,
      fileSize: params.fileSize || null,
      createdAt: params.createdAt,
    },
  }
}

export async function getKnowledgeEntries(agentConfigId: string): Promise<KnowledgeListItem[]> {
  // 1. Arquivos enviados (cada um agrupa N chunks ocultos)
  const files = await prisma.knowledge_files.findMany({
    where: { agent_config_id: agentConfigId },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      file_name: true,
      file_size: true,
      file_type: true,
      content_type: true,
      chunk_count: true,
      created_at: true,
      updated_at: true,
    }
  })

  // 2. Entradas standalone (texto/FAQ sem arquivo associado)
  const standaloneEntries = await prisma.knowledge_base.findMany({
    where: { agent_config_id: agentConfigId, knowledge_file_id: null },
    orderBy: { created_at: 'desc' },
    select: {
      id: true,
      title: true,
      content: true,
      content_type: true,
      created_at: true,
      updated_at: true,
    }
  })

  const fileItems: KnowledgeListItem[] = files.map((f: (typeof files)[number]) => ({
    kind: 'file' as const,
    id: f.id,
    title: f.title,
    file_name: f.file_name,
    file_size: f.file_size,
    file_type: f.file_type,
    content_type: f.content_type,
    chunk_count: f.chunk_count,
    created_at: f.created_at,
    updated_at: f.updated_at,
  }))

  const entryItems: KnowledgeListItem[] = standaloneEntries.map((e: (typeof standaloneEntries)[number]) => ({
    kind: 'entry' as const,
    id: e.id,
    title: e.title,
    content: e.content,
    content_type: e.content_type,
    created_at: e.created_at,
    updated_at: e.updated_at,
  }))

  return [...fileItems, ...entryItems].sort(
    (a, b) => b.created_at.getTime() - a.created_at.getTime()
  )
}

export async function createKnowledgeFile(
  agentConfigId: string,
  data: {
    title: string
    file_name: string
    file_size: number
    file_type: string
    content_type?: string
    metadata?: Record<string, unknown>
  }
): Promise<KnowledgeFile> {
  const record = await prisma.knowledge_files.create({
    data: {
      agent_config_id: agentConfigId,
      title: data.title,
      file_name: data.file_name,
      file_size: data.file_size,
      file_type: data.file_type,
      content_type: data.content_type ?? 'document',
      chunk_count: 0,
      metadata: (data.metadata ?? {}) as any,
    }
  })
  return record as unknown as KnowledgeFile
}

export async function deleteKnowledgeFile(
  fileId: string,
  agentConfigId: string
): Promise<boolean> {
  const file = await prisma.knowledge_files.findFirst({
    where: { id: fileId, agent_config_id: agentConfigId }
  })
  if (!file) return false

  // Coletar IDs dos chunks do Postgres (entradas criadas pela app diretamente)
  const chunks = await prisma.knowledge_base.findMany({
    where: { knowledge_file_id: fileId },
    select: { id: true }
  })
  const chunkIds = chunks.map((c: (typeof chunks)[number]) => c.id)

  const collectionName = knowledgeCollectionName(agentConfigId)

  // Deleta o arquivo e chunks do Postgres (cascade)
  await prisma.knowledge_files.delete({ where: { id: fileId } })

  // Remover vetores do Qdrant:
  // 1) por IDs (chunks criados diretamente pela app)
  if (chunkIds.length > 0) {
    try {
      await qdrant.delete(collectionName, { wait: true, points: chunkIds })
    } catch (err) {
      logger.warn({ err, fileId }, 'Falha ao deletar vetores por ID')
    }
  }

  // 2) por filtro (chunks criados pelo N8N via LangChain — metadata.source = filename)
  try {
    await qdrant.delete(collectionName, {
      wait: true,
      filter: {
        must: [
          { key: 'metadata.source',           match: { value: file.file_name } },
          { key: 'metadata.agent_config_id',   match: { value: agentConfigId } },
        ],
      },
    })
  } catch (err) {
    logger.warn({ err, fileId, fileName: file.file_name }, 'Falha ao deletar vetores por filtro (N8N)')
  }

  logger.info({ fileId, agentConfigId, chunkCount: chunkIds.length }, 'Arquivo de conhecimento deletado')
  return true
}

// Salva apenas no Postgres — o N8N cuida do embedding e do Qdrant
export async function addKnowledgeEntry(
  agentConfigId: string,
  data: { title: string; content: string; content_type: string; file_size?: number; file_type?: string }
): Promise<KnowledgeBase> {
  const entry = await prisma.knowledge_base.create({
    data: {
      agent_config_id: agentConfigId,
      title: data.title,
      content: data.content,
      content_type: data.content_type || 'text',
      file_size: data.file_size || null,
      file_type: data.file_type || null,
      chunk_index: 0,
      metadata: { processedAt: new Date().toISOString() }
    }
  })
  logger.info({ agentConfigId, title: data.title }, 'Knowledge entry saved to Postgres')
  return entry as unknown as KnowledgeBase
}

export async function addKnowledgeChunks(
  agentConfigId: string,
  title: string,
  content: string,
  contentType: string,
  fileSize?: number,
  fileType?: string,
  additionalMetadata?: Record<string, any>,
  knowledgeFileId?: string,
  pdfMetadata?: PdfMetadata
): Promise<KnowledgeBase[]> {
  try {
    const language = detectLanguage(content)
    const pages = estimatePages(content)
    const contentHasNumbers = hasNumericalData(content)
    const contentHasTable = hasTableStructure(content)

    logger.info({ agentConfigId, title, language, contentLength: content.length }, 'Starting document processing')

    const chunks = await chunkText(content, 500, 100)
    const entries: KnowledgeBase[] = []

    await ensureKnowledgeCollection(agentConfigId)

    logger.info({ agentConfigId, title, chunkCount: chunks.length }, 'Chunked — generating embeddings (batch)')

    // Rastreamento de posição de linha para o campo loc.lines (formato LangChain)
    const lineOffsets = buildLineOffsets(content)
    let searchOffset = 0

    // 1. Pre-compute per-chunk data
    const chunkData = chunks.map((chunk, i) => {
      const chunkTitle = chunks.length === 1 ? title : `${title} - Parte ${i + 1}`
      const contextualContent = `Document: ${title}\n\nPart ${i + 1}/${chunks.length}\n\n${chunk}`
      const allKeywords = extractKeywords(chunk).slice(0, 15)
      const { from: lineFrom, to: lineTo, nextOffset } = getChunkLines(lineOffsets, content, chunk, searchOffset)
      searchOffset = nextOffset
      return { chunk, chunkTitle, contextualContent, allKeywords, lineFrom, lineTo }
    })

    // 2. Save all chunks to Postgres
    const dbEntries = await Promise.all(
      chunkData.map((d, i) =>
        prisma.knowledge_base.create({
          data: {
            agent_config_id: agentConfigId,
            title: d.chunkTitle,
            content: d.chunk,
            content_type: contentType,
            file_size: fileSize || null,
            file_type: fileType || null,
            chunk_index: i,
            knowledge_file_id: knowledgeFileId ?? null,
            metadata: {
              ...additionalMetadata,
              chunkIndex: i,
              totalChunks: chunks.length,
              chunkSize: d.chunk.length,
              language,
              keywords: d.allKeywords,
              hasNumbers: contentHasNumbers,
              hasTable: contentHasTable,
              estimatedPages: pages,
              processedAt: new Date().toISOString()
            } as any
          }
        })
      )
    )

    // 3. Batch generate all embeddings in a single OpenAI API call
    const embeddings = await generateEmbeddings(chunkData.map(d => d.contextualContent))

    // 4. Batch upsert all points to Qdrant em uma única request
    await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
      wait: true,
      points: dbEntries.map((entry: { id: string; created_at: Date }, i: number) => ({
        id: entry.id,
        vector: embeddings[i]!,
        payload: buildPayload({
          agentConfigId,
          title: chunkData[i]!.chunkTitle,
          content: chunkData[i]!.chunk,
          source: title,
          blobType: fileType || 'text/plain',
          lineFrom: chunkData[i]!.lineFrom,
          lineTo: chunkData[i]!.lineTo,
          chunkIndex: i,
          totalChunks: chunks.length,
          language,
          keywords: chunkData[i]!.allKeywords,
          hasNumbers: contentHasNumbers,
          hasTable: contentHasTable,
          estimatedPages: pages,
          fileSize: fileSize,
          createdAt: entry.created_at.toISOString(),
          pdfMetadata,
        }),
      }))
    })

    // Atualizar chunk_count no registro pai (knowledge_files)
    if (knowledgeFileId) {
      await prisma.knowledge_files.update({
        where: { id: knowledgeFileId },
        data: { chunk_count: chunks.length }
      })
    }

    dbEntries.forEach((e: unknown) => entries.push(e as unknown as KnowledgeBase))

    logger.info({ agentConfigId, title, chunkCount: chunks.length, language }, 'Chunks saved to Postgres + Qdrant')
    return entries
  } catch (error) {
    logger.error({ error, agentConfigId, title }, 'Failed to add knowledge chunks')
    throw error
  }
}

export async function updateKnowledgeEntry(
  entryId: string,
  agentConfigId: string,
  data: { title?: string; content?: string; content_type?: string }
): Promise<KnowledgeBase | null> {
  const existing = await prisma.knowledge_base.findFirst({
    where: { id: entryId, agent_config_id: agentConfigId }
  })
  if (!existing) return null

  const updated = await prisma.knowledge_base.update({
    where: { id: entryId },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.content !== undefined && { content: data.content }),
      ...(data.content_type !== undefined && { content_type: data.content_type }),
    }
  })

  if (data.content !== undefined || data.title !== undefined) {
    try {
      const newContent = data.content ?? existing.content
      const newTitle = data.title ?? existing.title
      const language = detectLanguage(newContent)
      const keywords = extractKeywords(newContent)
      const existingMeta = (existing.metadata as any) || {}

      const embedding = await generateEmbedding(newContent)
      await ensureKnowledgeCollection(agentConfigId)

      const updLineOffsets = buildLineOffsets(newContent)
      const payload = buildPayload({
        agentConfigId,
        title: newTitle,
        content: newContent,
        source: newTitle,
        blobType: (existing.file_type as string) || 'text/plain',
        lineFrom: 1,
        lineTo: updLineOffsets.length,
        chunkIndex: existing.chunk_index ?? 0,
        totalChunks: existingMeta.totalChunks ?? 1,
        language,
        keywords,
        hasNumbers: hasNumericalData(newContent),
        hasTable: hasTableStructure(newContent),
        estimatedPages: estimatePages(newContent),
        fileSize: existing.file_size as number | null,
        createdAt: existing.created_at.toISOString(),
      })

      await qdrant.upsert(knowledgeCollectionName(agentConfigId), {
        wait: true,
        points: [{ id: entryId, vector: embedding, payload }]
      })
    } catch (error) {
      logger.warn({ error, entryId }, 'Failed to update Qdrant on knowledge update')
    }
  }

  logger.info({ entryId, agentConfigId }, 'Knowledge entry updated')
  return updated as unknown as KnowledgeBase
}

export async function deleteKnowledgeEntry(
  entryId: string,
  agentConfigId: string
): Promise<boolean> {
  const deleted = await prisma.knowledge_base.deleteMany({
    where: { id: entryId, agent_config_id: agentConfigId }
  })
  if (deleted.count === 0) return false

  try {
    await qdrant.delete(knowledgeCollectionName(agentConfigId), {
      wait: true,
      points: [entryId]
    })
  } catch (_) {}

  logger.info({ entryId, agentConfigId }, 'Knowledge entry deleted')
  return true
}

export async function searchKnowledgeByEmbedding(
  agentConfigId: string,
  queryEmbedding: number[],
  limit = 5
): Promise<Array<KnowledgeBase & { similarity: number }>> {
  try {
    const collectionName = knowledgeCollectionName(agentConfigId)
    const { collections } = await qdrant.getCollections()
    if (!collections.some(c => c.name === collectionName)) return []

    const searchResults = await qdrant.query(collectionName, {
      query: queryEmbedding,
      limit,
      with_payload: true,
      filter: {
        must: [{ key: 'agent_config_id', match: { value: agentConfigId } }]
      }
    })

    if (!searchResults.points || searchResults.points.length === 0) return []

    const results = searchResults.points.map(r => {
      const p = r.payload as unknown as QdrantPayload
      return {
        id: r.id as string,
        agent_config_id: p.agent_config_id,
        title: p.metadata.title,
        content: p.content,
        content_type: p.metadata.blobType,
        chunk_index: p.metadata.chunkIndex,
        file_type: p.metadata.blobType,
        file_size: p.metadata.fileSize,
        metadata: p.metadata,
        created_at: new Date(p.metadata.createdAt),
        updated_at: new Date(p.metadata.createdAt),
        similarity: r.score,
      }
    })

    logger.debug({ agentConfigId, resultCount: results.length, topSimilarity: results[0]?.similarity }, 'RAG search done')
    return results as unknown as Array<KnowledgeBase & { similarity: number }>
  } catch (error) {
    logger.error({ error, agentConfigId }, 'Vector similarity search failed')
    throw error
  }
}
