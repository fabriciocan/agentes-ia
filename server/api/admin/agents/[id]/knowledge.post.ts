import { knowledgeBaseCreateSchema } from '../../../../utils/validation'
import { getAgentConfig } from '../../../../services/agent-config.service'
import { addKnowledgeEntry } from '../../../../services/knowledge.service'
import { knowledgeCollectionName, ensureKnowledgeCollection } from '../../../../lib/qdrant'

export default defineEventHandler(async (event) => {
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

  const body = await readBody(event)
  const parsed = knowledgeBaseCreateSchema.safeParse(body)
  if (!parsed.success) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid input', data: parsed.error.issues })
  }

  const { title, content } = parsed.data
  const collectionName = knowledgeCollectionName(agentId)

  // Garante collection antes do N8N tentar escrever
  await ensureKnowledgeCollection(agentId)

  // Salva no Postgres para listagem na UI
  const entry = await addKnowledgeEntry(agentId, parsed.data)

  // Envia ao N8N como arquivo .txt (mesmo fluxo do upload)
  const runtimeConfig = useRuntimeConfig()
  const webhookUrl = (runtimeConfig.n8nUploadWebhookUrl as string)
    || 'https://webhook.agenciacomo.com.br/webhook/upload-base'

  const filename = `${title}.txt`
  const n8nForm = new FormData()
  n8nForm.append('file', new Blob([content], { type: 'text/plain' }), filename)
  n8nForm.append('collectionName', collectionName)
  n8nForm.append('agentConfigId', agentId)
  n8nForm.append('knowledgeEntryId', entry.id)

  const webhookResp = await fetch(webhookUrl, {
    method: 'POST',
    body: n8nForm,
  })

  if (!webhookResp.ok) {
    const errText = await webhookResp.text().catch(() => webhookResp.statusText)
    console.error(`N8N webhook error for text entry: ${errText}`)
    // Não reverte o registro do Postgres — o texto já está salvo para retry
  }

  console.log(`✅ Text entry forwarded to N8N: "${title}" → collection "${collectionName}"`)

  return { data: entry }
})
