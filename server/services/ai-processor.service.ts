import OpenAI from 'openai'
import { getOrCreateConversation, addMessage, getConversationHistory } from './conversation.service'
import { generateEmbedding } from './embedding.service'
import { searchKnowledgeByEmbedding } from './knowledge.service'
import { createLogger } from '../utils/logger'

const logger = createLogger('ai-processor')

function getOpenAI(): OpenAI {
  const config = useRuntimeConfig()
  return new OpenAI({ apiKey: config.openaiApiKey })
}

export interface AgentConfigForProcessing {
  id: string
  client_id: string
  name: string
  system_prompt: string
  personality: string
  tone: string
  language: string
  model: string
  temperature: number | string
  max_tokens: number
}

/**
 * Processa uma mensagem de WhatsApp diretamente no backend (sem n8n):
 * 1. Cria/recupera conversa e end_user
 * 2. Salva mensagem do usuário
 * 3. Busca histórico + knowledge base (RAG)
 * 4. Chama OpenAI
 * 5. Salva resposta e retorna o texto
 */
export async function processWhatsAppMessage(
  agentConfig: AgentConfigForProcessing,
  fromPhone: string,
  messageText: string
): Promise<string> {
  // 1. Conversa (usa o telefone como external_id)
  const conversation = await getOrCreateConversation(
    agentConfig.client_id,
    agentConfig.id,
    fromPhone,
    'whatsapp'
  )

  // 2. Salvar mensagem do usuário
  await addMessage(conversation.id, 'user', messageText)

  // 3. Histórico de mensagens (últimas 20)
  const history = await getConversationHistory(conversation.id, 20)

  // 4. RAG — busca trechos relevantes da knowledge base via embedding
  let knowledgeContext = ''
  try {
    const queryEmbedding = await generateEmbedding(messageText)
    const kbResults = await searchKnowledgeByEmbedding(agentConfig.id, queryEmbedding, 5)
    if (kbResults.length > 0) {
      knowledgeContext = kbResults
        .map(kb => `[${kb.title}]\n${kb.content}`)
        .join('\n\n---\n\n')
    }
  } catch (err) {
    logger.warn({ err, agentId: agentConfig.id }, 'Knowledge search failed, proceeding without RAG')
  }

  // 5. Montar system prompt
  const systemPrompt = buildSystemPrompt(agentConfig, knowledgeContext)

  // 6. Montar histórico para OpenAI (exclui última mensagem pois vamos passar como user)
  const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: 'system', content: systemPrompt }
  ]

  // Adiciona histórico (excluindo a mensagem que acabou de ser salva — última)
  const historyWithoutLast = history.slice(0, -1)
  for (const msg of historyWithoutLast) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      openaiMessages.push({ role: msg.role, content: msg.content })
    }
  }

  // Adiciona a mensagem atual do usuário
  openaiMessages.push({ role: 'user', content: messageText })

  // 7. Chamar OpenAI
  const openai = getOpenAI()
  const temperature = typeof agentConfig.temperature === 'string'
    ? parseFloat(agentConfig.temperature)
    : agentConfig.temperature

  const completion = await openai.chat.completions.create({
    model: agentConfig.model.startsWith('gpt') ? agentConfig.model : 'gpt-4o-mini',
    messages: openaiMessages,
    temperature: isNaN(temperature) ? 0.7 : temperature,
    max_tokens: agentConfig.max_tokens || 1024
  })

  const responseText = completion.choices[0]?.message?.content?.trim() ?? ''

  // 8. Salvar resposta do assistente
  await addMessage(conversation.id, 'assistant', responseText, {
    model: completion.model,
    usage: completion.usage
  })

  logger.info({
    agentId: agentConfig.id,
    conversationId: conversation.id,
    fromPhone,
    tokens: completion.usage?.total_tokens
  }, 'WhatsApp message processed')

  return responseText
}

function buildSystemPrompt(agent: AgentConfigForProcessing, knowledgeContext: string): string {
  let prompt = agent.system_prompt || ''

  if (!prompt) {
    prompt = `Você é ${agent.name}, um assistente virtual.`
    prompt += ` Personalidade: ${agent.personality}.`
    prompt += ` Tom: ${agent.tone}.`
    prompt += ` Idioma preferido: ${agent.language}.`
  }

  if (knowledgeContext) {
    prompt += '\n\n---\nUse as informações abaixo para responder quando relevante:\n\n'
    prompt += knowledgeContext
    prompt += '\n---'
  }

  // Instrução específica para WhatsApp
  prompt += '\n\nVocê está respondendo via WhatsApp. Seja direto e objetivo. Evite formatação markdown complexa.'

  return prompt
}
