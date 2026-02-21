import { getAgentConfig } from '../../../../../services/agent-config.service'
import { createKnowledgeFile, deleteKnowledgeFile } from '../../../../../services/knowledge.service'
import { validateFileSize, validateFileType } from '../../../../../utils/document-parser'
import { requirePermission } from '../../../../../utils/authorization'
import { knowledgeCollectionName, ensureKnowledgeCollection } from '../../../../../lib/qdrant'

export default defineEventHandler(async (event) => {
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
    validateFileSize(fileData.data.length, 10)
    validateFileType(mimeType, filename)

    const collectionName = knowledgeCollectionName(agentId)

    // Garantir que a collection existe ANTES de chamar o N8N
    // → quando o nó do N8N tentar criar, ela já existe e ele só insere
    await ensureKnowledgeCollection(agentId)

    // Registrar o arquivo no Postgres (para listagem na UI)
    const knowledgeFile = await createKnowledgeFile(agentId, {
      title: filename,
      file_name: filename,
      file_size: fileData.data.length,
      file_type: mimeType,
      content_type: 'document',
      metadata: {
        uploadedAt: new Date().toISOString(),
        uploadedBy: adminUser.clientId,
      }
    })

    // Encaminhar arquivo para o N8N processar (chunking + embedding + Qdrant)
    const runtimeConfig = useRuntimeConfig()
    const webhookUrl = (runtimeConfig.n8nUploadWebhookUrl as string)
      || 'https://webhook.agenciacomo.com.br/webhook/upload-base'

    const n8nForm = new FormData()
    n8nForm.append('file', new Blob([fileData.data.buffer as ArrayBuffer], { type: mimeType }), filename)
    n8nForm.append('collectionName', collectionName)
    n8nForm.append('agentConfigId', agentId)
    n8nForm.append('knowledgeFileId', knowledgeFile.id)

    const webhookResp = await fetch(webhookUrl, {
      method: 'POST',
      body: n8nForm,
    })

    if (!webhookResp.ok) {
      // Reverter registro se o N8N não aceitou
      await deleteKnowledgeFile(knowledgeFile.id, agentId)
      const errText = await webhookResp.text().catch(() => webhookResp.statusText)
      throw createError({ statusCode: 502, statusMessage: `N8N webhook error: ${errText}` })
    }

    console.log(`✅ File forwarded to N8N: ${filename} → collection "${collectionName}"`)

    return {
      data: {
        filename,
        fileSize: fileData.data.length,
        mimeType,
        collectionName,
        knowledgeFileId: knowledgeFile.id,
        status: 'processing', // N8N processa de forma assíncrona
      }
    }
  } catch (error) {
    const err = error as Error
    console.error('❌ Error forwarding document to N8N:', err.message)
    throw createError({
      statusCode: (error as any).statusCode || 400,
      statusMessage: err.message || 'Failed to process document'
    })
  }
})
