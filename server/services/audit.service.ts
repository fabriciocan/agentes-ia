import { prisma } from '../lib/prisma'
import { createLogger } from '../utils/logger'
import type { AuditLog } from '../types/database.types'
import type { H3Event } from 'h3'

const logger = createLogger('audit-service')

// ============================================================================
// Log Audit Event
// ============================================================================

export interface LogAuditEventParams {
  companyId: string
  userId: string | null
  action: string
  resourceType: string
  resourceId?: string
  changes?: {
    old?: Record<string, unknown>
    new?: Record<string, unknown>
  }
  ipAddress?: string
  userAgent?: string
  requestId?: string
  status?: 'success' | 'failure' | 'error'
  errorMessage?: string
  metadata?: Record<string, unknown>
}

export async function logAuditEvent(params: LogAuditEventParams): Promise<string> {
  const log = await prisma.audit_logs.create({
    data: {
      company_id: params.companyId,
      user_id: params.userId || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      changes: params.changes ? (params.changes as any) : null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      request_id: params.requestId || null,
      status: params.status || 'success',
      error_message: params.errorMessage || null,
      metadata: params.metadata ? (params.metadata as any) : {}
    }
  })

  const auditId = log.id

  logger.debug(
    {
      auditId,
      action: params.action,
      resourceType: params.resourceType,
      userId: params.userId
    },
    'Audit event logged'
  )

  return auditId
}

// ============================================================================
// Helper: Log from H3 Event
// ============================================================================

export async function logAuditFromEvent(
  event: H3Event,
  action: string,
  resourceType: string,
  resourceId?: string,
  changes?: LogAuditEventParams['changes'],
  status: 'success' | 'failure' | 'error' = 'success',
  errorMessage?: string
): Promise<string> {
  const companyId = event.context.user?.company_id
  if (!companyId) {
    throw new Error('Cannot log audit event: No company_id in context')
  }

  // Extract request metadata
  const headers = getHeaders(event)
  const ipAddress = headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                   headers['x-real-ip'] ||
                   event.node.req.socket.remoteAddress

  const userAgent = headers['user-agent']
  const requestId = headers['x-request-id'] || crypto.randomUUID()

  return await logAuditEvent({
    companyId,
    userId: event.context.user?.id || null,
    action,
    resourceType,
    resourceId,
    changes,
    ipAddress,
    userAgent,
    requestId,
    status,
    errorMessage
  })
}

// ============================================================================
// Query Audit Logs
// ============================================================================

export interface QueryAuditLogsParams {
  companyId: string
  userId?: string
  action?: string
  resourceType?: string
  resourceId?: string
  startDate?: Date
  endDate?: Date
  status?: 'success' | 'failure' | 'error'
  limit?: number
  offset?: number
}

export interface AuditLogWithUser extends AuditLog {
  user_name: string | null
  user_email: string | null
}

export async function queryAuditLogs(
  params: QueryAuditLogsParams
): Promise<{ logs: AuditLogWithUser[]; total: number }> {
  const where: Record<string, unknown> = {
    company_id: params.companyId
  }

  if (params.userId) {
    where.user_id = params.userId
  }

  if (params.action) {
    where.action = params.action
  }

  if (params.resourceType) {
    where.resource_type = params.resourceType
  }

  if (params.resourceId) {
    where.resource_id = params.resourceId
  }

  if (params.startDate || params.endDate) {
    const createdAt: Record<string, Date> = {}
    if (params.startDate) {
      createdAt.gte = params.startDate
    }
    if (params.endDate) {
      createdAt.lt = params.endDate
    }
    where.created_at = createdAt
  }

  if (params.status) {
    where.status = params.status
  }

  const limit = params.limit || 50
  const offset = params.offset || 0

  const [logsResult, total] = await Promise.all([
    prisma.audit_logs.findMany({
      where,
      include: {
        users: {
          select: { name: true, email: true }
        }
      },
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset
    }),
    prisma.audit_logs.count({ where })
  ])

  const logs = logsResult.map((row) => {
    const { users, ...rest } = row
    return {
      ...rest,
      user_name: users?.name || null,
      user_email: users?.email || null
    } as unknown as AuditLogWithUser
  })

  return {
    logs,
    total
  }
}

// ============================================================================
// Get Recent Activity
// ============================================================================

export async function getRecentActivity(
  companyId: string,
  limit: number = 20
): Promise<AuditLogWithUser[]> {
  const result = await prisma.audit_logs.findMany({
    where: { company_id: companyId },
    include: {
      users: {
        select: { name: true, email: true }
      }
    },
    orderBy: { created_at: 'desc' },
    take: limit
  })

  return result.map((row) => {
    const { users, ...rest } = row
    return {
      ...rest,
      user_name: users?.name || null,
      user_email: users?.email || null
    } as unknown as AuditLogWithUser
  })
}

// ============================================================================
// Get User Activity History
// ============================================================================

export async function getUserActivityHistory(
  companyId: string,
  userId: string,
  limit: number = 50
): Promise<AuditLog[]> {
  const result = await prisma.audit_logs.findMany({
    where: { company_id: companyId, user_id: userId },
    orderBy: { created_at: 'desc' },
    take: limit
  })

  return result as unknown as AuditLog[]
}

// ============================================================================
// Get Resource History
// ============================================================================

export async function getResourceHistory(
  companyId: string,
  resourceType: string,
  resourceId: string
): Promise<AuditLogWithUser[]> {
  const result = await prisma.audit_logs.findMany({
    where: {
      company_id: companyId,
      resource_type: resourceType,
      resource_id: resourceId
    },
    include: {
      users: {
        select: { name: true, email: true }
      }
    },
    orderBy: { created_at: 'desc' }
  })

  return result.map((row) => {
    const { users, ...rest } = row
    return {
      ...rest,
      user_name: users?.name || null,
      user_email: users?.email || null
    } as unknown as AuditLogWithUser
  })
}

// ============================================================================
// Get Failed Actions (Security Monitoring)
// ============================================================================

export async function getFailedActions(
  companyId: string,
  hours: number = 24,
  limit: number = 100
): Promise<AuditLogWithUser[]> {
  const sinceDate = new Date(Date.now() - hours * 3600000)

  const result = await prisma.audit_logs.findMany({
    where: {
      company_id: companyId,
      status: { in: ['failure', 'error'] },
      created_at: { gte: sinceDate }
    },
    include: {
      users: {
        select: { name: true, email: true }
      }
    },
    orderBy: { created_at: 'desc' },
    take: limit
  })

  return result.map((row) => {
    const { users, ...rest } = row
    return {
      ...rest,
      user_name: users?.name || null,
      user_email: users?.email || null
    } as unknown as AuditLogWithUser
  })
}

// ============================================================================
// Audit Action Constants
// ============================================================================

export const AuditActions = {
  // User actions
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_INVITED: 'user.invited',
  USER_INVITATION_ACCEPTED: 'user.invitation_accepted',
  USER_ROLE_ASSIGNED: 'user.role_assigned',
  USER_LOGIN: 'user.login',
  USER_LOGOUT: 'user.logout',

  // Agent actions
  AGENT_CREATED: 'agent.created',
  AGENT_UPDATED: 'agent.updated',
  AGENT_DELETED: 'agent.deleted',
  AGENT_PUBLISHED: 'agent.published',

  // Knowledge actions
  KNOWLEDGE_UPLOADED: 'knowledge.uploaded',
  KNOWLEDGE_UPDATED: 'knowledge.updated',
  KNOWLEDGE_DELETED: 'knowledge.deleted',

  // Role actions
  ROLE_CREATED: 'role.created',
  ROLE_UPDATED: 'role.updated',
  ROLE_DELETED: 'role.deleted',

  // Company actions
  COMPANY_UPDATED: 'company.updated',
  COMPANY_SETTINGS_CHANGED: 'company.settings_changed',

  // Subscription actions
  SUBSCRIPTION_UPGRADED: 'subscription.upgraded',
  SUBSCRIPTION_DOWNGRADED: 'subscription.downgraded',
  SUBSCRIPTION_CANCELLED: 'subscription.cancelled',

  // Conversation actions
  CONVERSATION_CREATED: 'conversation.created',
  CONVERSATION_DELETED: 'conversation.deleted'
} as const
