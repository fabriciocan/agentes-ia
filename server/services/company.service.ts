import { prisma } from '../lib/prisma'
import { cacheGet, cacheSet, cacheDel } from './redis.service'
import { createLogger } from '../utils/logger'
import type { Company } from '../types/database.types'

const logger = createLogger('company-service')

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL = 300 // 5 minutes
const CACHE_PREFIX = 'company:'

// ============================================================================
// Get Company by ID
// ============================================================================

export async function getCompanyById(companyId: string): Promise<Company | null> {
  const cacheKey = `${CACHE_PREFIX}${companyId}`

  // Try cache first
  const cached = await cacheGet<Company>(cacheKey)
  if (cached) {
    return cached
  }

  // Load from database
  const result = await prisma.companies.findFirst({
    where: { id: companyId, deleted_at: null }
  })

  if (!result) {
    return null
  }

  const company = result as unknown as Company

  // Cache the company
  await cacheSet(cacheKey, company, CACHE_TTL)

  return company
}

// ============================================================================
// Get Company by Slug
// ============================================================================

export async function getCompanyBySlug(
  clientId: string,
  slug: string
): Promise<Company | null> {
  const result = await prisma.companies.findFirst({
    where: { client_id: clientId, slug, deleted_at: null }
  })

  return result ? (result as unknown as Company) : null
}

// ============================================================================
// List Companies for Client
// ============================================================================

export async function listCompanies(clientId: string): Promise<Company[]> {
  const result = await prisma.companies.findMany({
    where: { client_id: clientId, deleted_at: null },
    orderBy: { created_at: 'desc' }
  })

  return result as unknown as Company[]
}

// ============================================================================
// Update Company Settings
// ============================================================================

export async function updateCompanySettings(
  companyId: string,
  updates: {
    name?: string
    slug?: string
    logo_url?: string | null
    settings?: Record<string, unknown>
  }
): Promise<Company> {
  const data: Record<string, unknown> = {}

  if (updates.name !== undefined) {
    data.name = updates.name
  }

  if (updates.slug !== undefined) {
    data.slug = updates.slug
  }

  if (updates.logo_url !== undefined) {
    data.logo_url = updates.logo_url
  }

  if (updates.settings !== undefined) {
    data.settings = updates.settings
  }

  if (Object.keys(data).length === 0) {
    throw new Error('No updates provided')
  }

  data.updated_at = new Date()

  // Verify company exists before updating
  const existing = await prisma.companies.findFirst({
    where: { id: companyId, deleted_at: null }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      message: 'Company not found'
    })
  }

  const result = await prisma.companies.update({
    where: { id: companyId },
    data
  })

  const company = result as unknown as Company

  // Invalidate cache
  await invalidateCompanyCache(companyId)

  logger.info({ companyId, updates: Object.keys(updates) }, 'Updated company settings')

  return company
}

// ============================================================================
// Update Company Status
// ============================================================================

export async function updateCompanyStatus(
  companyId: string,
  status: 'active' | 'suspended' | 'deleted'
): Promise<void> {
  if (status === 'deleted') {
    // Soft delete
    await prisma.companies.update({
      where: { id: companyId },
      data: {
        status: 'deleted',
        deleted_at: new Date(),
        updated_at: new Date()
      }
    })
  } else {
    // Update status
    await prisma.companies.update({
      where: { id: companyId },
      data: {
        status,
        updated_at: new Date()
      }
    })
  }

  // Invalidate cache
  await invalidateCompanyCache(companyId)

  logger.info({ companyId, status }, 'Updated company status')
}

// ============================================================================
// Get Company Stats
// ============================================================================

export interface CompanyStats {
  user_count: number
  agent_count: number
  conversation_count: number
  conversation_count_this_month: number
  knowledge_document_count: number
}

export async function getCompanyStats(companyId: string): Promise<CompanyStats> {
  const cacheKey = `${CACHE_PREFIX}${companyId}:stats`

  // Try cache first (shorter TTL for stats)
  const cached = await cacheGet<CompanyStats>(cacheKey)
  if (cached) {
    return cached
  }

  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const [
    userCount,
    agentCount,
    conversationCount,
    conversationCountThisMonth,
    knowledgeDocumentCount
  ] = await Promise.all([
    prisma.users.count({
      where: { company_id: companyId, deleted_at: null }
    }),
    prisma.agent_configs.count({
      where: { company_id: companyId }
    }),
    prisma.conversations.count({
      where: { company_id: companyId }
    }),
    prisma.conversations.count({
      where: {
        company_id: companyId,
        created_at: { gte: startOfMonth }
      }
    }),
    prisma.knowledge_base.count({
      where: {
        agent_configs: { company_id: companyId }
      }
    })
  ])

  const stats: CompanyStats = {
    user_count: userCount,
    agent_count: agentCount,
    conversation_count: conversationCount,
    conversation_count_this_month: conversationCountThisMonth,
    knowledge_document_count: knowledgeDocumentCount
  }

  // Cache for 2 minutes
  await cacheSet(cacheKey, stats, 120)

  return stats
}

// ============================================================================
// Cache Management
// ============================================================================

export async function invalidateCompanyCache(companyId: string): Promise<void> {
  await cacheDel(`${CACHE_PREFIX}${companyId}`)
  await cacheDel(`${CACHE_PREFIX}${companyId}:stats`)
  logger.debug({ companyId }, 'Invalidated company cache')
}

// ============================================================================
// Create Company (for admin use)
// ============================================================================

export async function createCompany(
  clientId: string,
  data: {
    name: string
    slug: string
    logo_url?: string
    settings?: Record<string, unknown>
  }
): Promise<Company> {
  const result = await prisma.companies.create({
    data: {
      client_id: clientId,
      name: data.name,
      slug: data.slug,
      logo_url: data.logo_url || null,
      settings: data.settings || {}
    }
  })

  const company = result as unknown as Company

  logger.info({ companyId: company.id, clientId, name: data.name }, 'Created company')

  return company
}
