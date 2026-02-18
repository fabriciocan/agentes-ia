import OpenAI from 'openai'
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters'
import { createLogger } from '../utils/logger'

const logger = createLogger('embedding')

let openai: OpenAI | null = null

function getOpenAI(): OpenAI {
  if (!openai) {
    const config = useRuntimeConfig()
    openai = new OpenAI({ apiKey: config.openaiApiKey })
  }
  return openai
}

/**
 * Generate text embedding using OpenAI text-embedding-3-small
 * Returns a 1536-dimensional vector
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const maxChars = 8000
    const truncatedText = text.length > maxChars ? text.slice(0, maxChars) : text

    const response = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: truncatedText
    })

    const embedding = response.data[0]!.embedding

    logger.debug({ textLength: text.length, embeddingDim: embedding.length }, 'Generated embedding')
    return embedding
  } catch (error) {
    logger.error({ error }, 'Failed to generate embedding')
    throw error
  }
}

/**
 * Generate embeddings for multiple texts in a single API call (batch)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  try {
    const maxChars = 8000
    const truncated = texts.map(t => t.length > maxChars ? t.slice(0, maxChars) : t)

    const response = await getOpenAI().embeddings.create({
      model: 'text-embedding-3-small',
      input: truncated
    })

    const embeddings = response.data
      .sort((a, b) => a.index - b.index)
      .map(d => d.embedding)

    logger.debug({ count: texts.length, embeddingDim: embeddings[0]?.length }, 'Generated batch embeddings')
    return embeddings
  } catch (error) {
    logger.error({ error }, 'Failed to generate batch embeddings')
    throw error
  }
}

/**
 * Calculate cosine similarity between two embedding vectors
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) return 0

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i]! * vecB[i]!
    normA += vecA[i]! * vecA[i]!
    normB += vecB[i]! * vecB[i]!
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

/**
 * Chunk large text into smaller pieces for embedding using LangChain's RecursiveCharacterTextSplitter
 * This provides better chunking with intelligent separators and proper overlap
 */
export async function chunkText(text: string, maxChunkSize = 800, overlap = 200): Promise<string[]> {
  try {
    const textSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: maxChunkSize,
      chunkOverlap: overlap,
      separators: [
        '\n\n\n', // Section breaks
        '\n\n',   // Paragraph breaks
        '\n',     // Line breaks
        '. ',     // Sentences
        '! ',
        '? ',
        '; ',
        ', ',
        ' ',      // Words
        ''        // Characters (fallback)
      ]
    })

    const chunks = await textSplitter.splitText(text)

    logger.debug(
      {
        textLength: text.length,
        chunkCount: chunks.length,
        avgChunkSize: Math.round(text.length / chunks.length),
        chunkSize: maxChunkSize,
        overlap
      },
      'Text chunked using RecursiveCharacterTextSplitter'
    )

    return chunks.filter(chunk => chunk.trim().length > 0)
  } catch (error) {
    logger.error({ error }, 'Failed to chunk text')
    throw error
  }
}
