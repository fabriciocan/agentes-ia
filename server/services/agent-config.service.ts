import { prisma } from '../lib/prisma'
import { cacheGet, cacheSet, invalidatePattern } from './redis.service'
import { createLogger } from '../utils/logger'
import type { AgentConfig } from '../types'

const logger = createLogger('agent-config')
const CACHE_TTL = 300 // 5 minutes

export async function getAgentConfig(configId: string): Promise<AgentConfig | null> {
  const cacheKey = `agent-config:${configId}`
  const cached = await cacheGet<AgentConfig>(cacheKey)
  if (cached) {
    logger.debug({ configId }, 'Agent config cache hit')
    return cached
  }

  const result = await prisma.agent_configs.findFirst({
    where: { id: configId }
  })

  if (!result) return null

  const config = result as unknown as AgentConfig
  await cacheSet(cacheKey, config, CACHE_TTL)
  return config
}

export async function getAgentConfigsByCompany(companyId: string): Promise<AgentConfig[]> {
  const cacheKey = `agent-configs:company:${companyId}`
  const cached = await cacheGet<AgentConfig[]>(cacheKey)
  if (cached) return cached

  const result = await prisma.agent_configs.findMany({
    where: { company_id: companyId },
    orderBy: { created_at: 'desc' }
  })

  const configs = result as unknown as AgentConfig[]
  await cacheSet(cacheKey, configs, CACHE_TTL)
  return configs
}

export async function getAgentConfigsByClient(clientId: string): Promise<AgentConfig[]> {
  const cacheKey = `agent-configs:client:${clientId}`
  const cached = await cacheGet<AgentConfig[]>(cacheKey)
  if (cached) return cached

  const result = await prisma.agent_configs.findMany({
    where: { client_id: clientId },
    orderBy: { created_at: 'desc' }
  })

  const configs = result as unknown as AgentConfig[]
  await cacheSet(cacheKey, configs, CACHE_TTL)
  return configs
}

export async function updateAgentConfig(
  configId: string,
  clientId: string,
  updates: Partial<AgentConfig>
): Promise<AgentConfig | null> {
  const allowedFields = [
    'name', 'system_prompt', 'personality', 'tone', 'language',
    'model', 'temperature', 'max_tokens', 'is_active', 'widget_config'
  ] as const

  const data: Record<string, unknown> = {}

  for (const field of allowedFields) {
    if (field in updates) {
      data[field] = updates[field as keyof AgentConfig]
    }
  }

  if (Object.keys(data).length === 0) return null

  // Verify ownership before updating
  const existing = await prisma.agent_configs.findFirst({
    where: { id: configId, client_id: clientId }
  })

  if (!existing) return null

  const result = await prisma.agent_configs.update({
    where: { id: configId },
    data
  })

  const updated = result as unknown as AgentConfig

  // Invalidate cache
  await invalidatePattern(`agent-config:${configId}`)
  await invalidatePattern(`agent-configs:client:${clientId}`)

  logger.info({ configId, clientId }, 'Agent config updated')
  return updated
}

export async function createAgentConfig(
  clientId: string,
  data: {
    name: string
    system_prompt?: string
    personality?: string
    tone?: string
    language?: string
    model?: string
    temperature?: number
    max_tokens?: number
    company_id?: string | null
  }
): Promise<AgentConfig> {
  const result = await prisma.agent_configs.create({
    data: {
      client_id: clientId,
      company_id: data.company_id || null,
      name: data.name,
      system_prompt: data.system_prompt || '',
      personality: data.personality || 'professional',
      tone: data.tone || 'friendly',
      language: data.language || 'pt-BR',
      model: data.model || 'claude-sonnet-4-5-20250929',
      temperature: data.temperature ?? 0.7,
      max_tokens: data.max_tokens ?? 1024
    }
  })

  await invalidatePattern(`agent-configs:client:${clientId}`)
  if (data.company_id) await invalidatePattern(`agent-configs:company:${data.company_id}`)
  logger.info({ clientId, companyId: data.company_id, name: data.name }, 'Agent config created')
  return result as unknown as AgentConfig
}

export async function deleteAgentConfig(
  configId: string,
  clientId: string
): Promise<boolean> {
  // Verify ownership before deleting
  const existing = await prisma.agent_configs.findFirst({
    where: { id: configId, client_id: clientId }
  })

  if (!existing) return false

  await prisma.agent_configs.delete({
    where: { id: configId }
  })

  await invalidatePattern(`agent-config:${configId}`)
  await invalidatePattern(`agent-configs:client:${clientId}`)
  logger.info({ configId, clientId }, 'Agent config deleted')
  return true
}
