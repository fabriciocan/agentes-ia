import { getAgentConfig } from '../../../../../services/agent-config.service'
import { addKnowledgeChunks } from '../../../../../services/knowledge.service'
import { extractTextFromFile, validateFileSize, validateFileType } from '../../../../../utils/document-parser'
import { detectLanguage, hasNumericalData, hasTableStructure, estimatePages } from '../../../../../utils/text-analysis'
import { requirePermission } from '../../../../../utils/authorization'

export default defineEventHandler(async (event) => {
  // Check permission (RBAC)
  if (event.context.can) {
    requirePermission(event, 'knowledge.create')
  }

  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const agentId = getRouterParam(event, 'id')
  if (!agentId) {
    throw createError({ statusCode: 400, statusMessage: 'Missing agent id' })
  }

  const config = await getAgentConfig(agentId)
  if (!config || config.client_id !== adminUser.clientId) {
    throw createError({ statusCode: 404, statusMessage: 'Agent not found' })
  }

  const formData = await readMultipartFormData(event)
  if (!formData || formData.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No file uploaded' })
  }

  const fileData = formData.find(item => item.name === 'file')
  if (!fileData || !fileData.data) {
    throw createError({ statusCode: 400, statusMessage: 'File data missing' })
  }

  const filename = fileData.filename || 'unknown'
  const mimeType = fileData.type || 'application/octet-stream'

  try {
    // Validate file
    validateFileSize(fileData.data.length, 10) // 10MB limit
    validateFileType(mimeType, filename)

    // Extract text content
    const content = await extractTextFromFile(fileData.data, filename, mimeType)

    if (!content || content.trim().length === 0) {
      throw createError({ statusCode: 400, statusMessage: 'No text content found in file' })
    }

    console.log(`📄 Processing: ${filename} (${content.length} characters)`)

    // Analyze content
    const language = detectLanguage(content)
    const hasNumbers = hasNumericalData(content)
    const hasTables = hasTableStructure(content)
    const estimatedPageCount = estimatePages(content)

    // Prepare metadata for storage
    const uploadMetadata = {
      originalFilename: filename,
      uploadedAt: new Date().toISOString(),
      uploadedBy: adminUser.clientId,
      mimeType,
      fileSize: fileData.data.length,
      language,
      hasNumbers,
      hasTables,
      estimatedPages: estimatedPageCount,
      contentLength: content.length
    }

    // Save to knowledge base with chunking and embeddings
    const entries = await addKnowledgeChunks(
      agentId,
      filename,
      content.trim(),
      'document',
      fileData.data.length,
      mimeType,
      uploadMetadata
    )

    console.log(`✅ Successfully processed ${filename}: ${entries.length} chunks created`)

    // Return detailed response
    return {
      data: {
        filename,
        fileSize: fileData.data.length,
        mimeType,
        chunks: entries.length,
        totalChars: content.length,
        avgChunkSize: Math.round(content.length / entries.length),
        analysis: {
          language,
          hasNumericalData: hasNumbers,
          hasTableStructure: hasTables,
          estimatedPages: estimatedPageCount
        },
        processing: {
          chunking: 'recursive-character-text-splitter',
          chunkSize: 800,
          overlap: 200,
          embeddingModel: 'text-embedding-3-small',
          embeddingDimensions: 1536
        },
        metadata: {
          contextAdded: true,
          keywordExtraction: true,
          languageDetection: true,
          richMetadata: true
        }
      }
    }
  } catch (error) {
    const err = error as Error
    console.error('❌ Error processing document:', err.message)
    throw createError({
      statusCode: 400,
      statusMessage: err.message || 'Failed to process document'
    })
  }
})
