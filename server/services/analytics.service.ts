import { prisma } from '../lib/prisma'
import { cacheGet, cacheSet } from './redis.service'
import { createLogger } from '../utils/logger'

const logger = createLogger('analytics-service')

// ============================================================================
// Dashboard Overview Stats
// ============================================================================

export interface DashboardStats {
  total_agents: number
  active_agents: number
  total_conversations: number
  conversations_this_month: number
  total_users: number
  active_users_this_month: number
  total_knowledge_documents: number
  avg_response_time_ms: number | null
}

export async function getDashboardStats(companyId: string): Promise<DashboardStats> {
  const cacheKey = `analytics:dashboard:${companyId}`

  // Try cache first (2 min TTL)
  const cached = await cacheGet<DashboardStats>(cacheKey)
  if (cached) {
    return cached
  }

  const result = await prisma.$queryRaw<[DashboardStats]>`
    SELECT
      (SELECT COUNT(*) FROM agent_configs WHERE company_id = ${companyId} AND deleted_at IS NULL) as total_agents,
      (SELECT COUNT(*) FROM agent_configs WHERE company_id = ${companyId} AND is_active = TRUE AND deleted_at IS NULL) as active_agents,
      (SELECT COUNT(*) FROM conversations WHERE company_id = ${companyId}) as total_conversations,
      (SELECT COUNT(*) FROM conversations WHERE company_id = ${companyId} AND created_at >= DATE_TRUNC('month', NOW())) as conversations_this_month,
      (SELECT COUNT(*) FROM users WHERE company_id = ${companyId} AND deleted_at IS NULL) as total_users,
      (SELECT COUNT(DISTINCT user_id) FROM audit_logs WHERE company_id = ${companyId} AND created_at >= DATE_TRUNC('month', NOW())) as active_users_this_month,
      (SELECT COUNT(*) FROM knowledge_base kb JOIN agent_configs ac ON ac.id = kb.agent_config_id WHERE ac.company_id = ${companyId}) as total_knowledge_documents,
      (SELECT AVG(duration_ms) FROM usage_logs WHERE company_id = ${companyId} AND event_type = 'conversation_message' AND created_at >= NOW() - INTERVAL '7 days') as avg_response_time_ms
  `

  const stats = result[0]!

  // Cache for 2 minutes
  await cacheSet(cacheKey, stats, 120)

  return stats
}

// ============================================================================
// Usage Over Time (Time Series)
// ============================================================================

export interface UsageOverTime {
  date: string
  conversations: number
  api_calls: number
  messages: number
}

export async function getUsageOverTime(
  companyId: string,
  startDate: Date,
  endDate: Date,
  granularity: 'day' | 'week' | 'month' = 'day'
): Promise<UsageOverTime[]> {
  const truncFunction = granularity === 'month' ? 'month' : granularity === 'week' ? 'week' : 'day'

  const result = await prisma.$queryRaw<UsageOverTime[]>`
    SELECT
      DATE_TRUNC(${truncFunction}, created_at)::date as date,
      COUNT(*) FILTER (WHERE event_type = 'conversation_created') as conversations,
      COUNT(*) FILTER (WHERE event_type = 'api_call') as api_calls,
      COUNT(*) FILTER (WHERE event_type = 'conversation_message') as messages
    FROM usage_logs
    WHERE company_id = ${companyId}
      AND created_at >= ${startDate}
      AND created_at < ${endDate}
    GROUP BY DATE_TRUNC(${truncFunction}, created_at)
    ORDER BY date ASC
  `

  return result
}

// ============================================================================
// Agent Performance Metrics
// ============================================================================

export interface AgentPerformance {
  agent_id: string
  agent_name: string
  total_conversations: number
  total_messages: number
  avg_response_time_ms: number | null
  avg_conversation_length: number | null
}

export async function getAgentPerformance(companyId: string): Promise<AgentPerformance[]> {
  const result = await prisma.$queryRaw<AgentPerformance[]>`
    SELECT
      ac.id as agent_id,
      ac.name as agent_name,
      COUNT(DISTINCT c.id) as total_conversations,
      COUNT(m.id) as total_messages,
      AVG(ul.duration_ms) as avg_response_time_ms,
      AVG(msg_counts.message_count) as avg_conversation_length
    FROM agent_configs ac
    LEFT JOIN conversations c ON c.agent_config_id = ac.id
    LEFT JOIN messages m ON m.conversation_id = c.id
    LEFT JOIN usage_logs ul ON ul.resource_id = c.id::text
      AND ul.event_type = 'conversation_message'
      AND ul.created_at >= NOW() - INTERVAL '30 days'
    LEFT JOIN LATERAL (
      SELECT COUNT(*) as message_count
      FROM messages
      WHERE conversation_id = c.id
    ) msg_counts ON TRUE
    WHERE ac.company_id = ${companyId}
      AND ac.deleted_at IS NULL
    GROUP BY ac.id, ac.name
    ORDER BY total_conversations DESC
  `

  return result
}

// ============================================================================
// Conversation Metrics
// ============================================================================

export interface ConversationMetrics {
  total_conversations: number
  active_conversations: number
  closed_conversations: number
  avg_messages_per_conversation: number
  total_messages: number
  conversations_by_status: {
    active: number
    closed: number
    archived: number
  }
}

export async function getConversationMetrics(companyId: string): Promise<ConversationMetrics> {
  const cacheKey = `analytics:conversations:${companyId}`

  // Try cache first (5 min TTL)
  const cached = await cacheGet<ConversationMetrics>(cacheKey)
  if (cached) {
    return cached
  }

  const result = await prisma.$queryRaw<[any]>`
    SELECT
      COUNT(*) as total_conversations,
      COUNT(*) FILTER (WHERE status = 'active') as active_conversations,
      COUNT(*) FILTER (WHERE status = 'closed') as closed_conversations,
      (SELECT COALESCE(AVG(msg_count), 0) FROM (
        SELECT COUNT(*) as msg_count
        FROM messages m
        JOIN conversations c ON c.id = m.conversation_id
        WHERE c.company_id = ${companyId}
        GROUP BY m.conversation_id
      ) counts) as avg_messages_per_conversation,
      (SELECT COUNT(*) FROM messages m
       JOIN conversations c ON c.id = m.conversation_id
       WHERE c.company_id = ${companyId}) as total_messages
    FROM conversations
    WHERE company_id = ${companyId}
  `

  const statusResult = await prisma.$queryRaw<{ status: string; count: number }[]>`
    SELECT status, COUNT(*) as count
    FROM conversations
    WHERE company_id = ${companyId}
    GROUP BY status
  `

  const metrics: ConversationMetrics = {
    ...result[0],
    conversations_by_status: {
      active: 0,
      closed: 0,
      archived: 0
    }
  }

  // Fill in status counts
  for (const row of statusResult) {
    if (row.status === 'active' || row.status === 'closed' || row.status === 'archived') {
      metrics.conversations_by_status[row.status] = Number(row.count)
    }
  }

  // Cache for 5 minutes
  await cacheSet(cacheKey, metrics, 300)

  return metrics
}

// ============================================================================
// Top Agents by Usage
// ============================================================================

export interface TopAgent {
  agent_id: string
  agent_name: string
  conversation_count: number
  message_count: number
  percentage: number
}

export async function getTopAgents(
  companyId: string,
  limit: number = 5
): Promise<TopAgent[]> {
  const result = await prisma.$queryRaw<TopAgent[]>`
    WITH agent_counts AS (
      SELECT
        ac.id as agent_id,
        ac.name as agent_name,
        COUNT(DISTINCT c.id) as conversation_count,
        COUNT(m.id) as message_count
      FROM agent_configs ac
      LEFT JOIN conversations c ON c.agent_config_id = ac.id
      LEFT JOIN messages m ON m.conversation_id = c.id
      WHERE ac.company_id = ${companyId} AND ac.deleted_at IS NULL
      GROUP BY ac.id, ac.name
    ),
    total_counts AS (
      SELECT SUM(conversation_count) as total_conversations
      FROM agent_counts
    )
    SELECT
      ac.agent_id,
      ac.agent_name,
      ac.conversation_count,
      ac.message_count,
      ROUND((ac.conversation_count::numeric / NULLIF(tc.total_conversations, 0) * 100)::numeric, 2) as percentage
    FROM agent_counts ac
    CROSS JOIN total_counts tc
    ORDER BY ac.conversation_count DESC
    LIMIT ${limit}
  `

  return result
}

// ============================================================================
// User Activity
// ============================================================================

export interface UserActivity {
  user_id: string
  user_email: string
  user_name: string | null
  last_login_at: Date | null
  last_active_at: Date | null
  total_actions: number
  actions_this_week: number
}

export async function getUserActivity(companyId: string): Promise<UserActivity[]> {
  const result = await prisma.$queryRaw<UserActivity[]>`
    SELECT
      u.id as user_id,
      u.email as user_email,
      u.name as user_name,
      u.last_login_at,
      u.last_active_at,
      (SELECT COUNT(*) FROM audit_logs WHERE user_id = u.id) as total_actions,
      (SELECT COUNT(*) FROM audit_logs
       WHERE user_id = u.id
       AND created_at >= NOW() - INTERVAL '7 days') as actions_this_week
    FROM users u
    WHERE u.company_id = ${companyId} AND u.deleted_at IS NULL
    ORDER BY u.last_active_at DESC NULLS LAST
  `

  return result
}

// ============================================================================
// Export Analytics Data
// ============================================================================

export interface AnalyticsExport {
  company_id: string
  generated_at: Date
  period: {
    start: Date
    end: Date
  }
  summary: DashboardStats
  usage_over_time: UsageOverTime[]
  agent_performance: AgentPerformance[]
  conversation_metrics: ConversationMetrics
  top_agents: TopAgent[]
}

export async function exportAnalytics(
  companyId: string,
  startDate: Date,
  endDate: Date
): Promise<AnalyticsExport> {
  const [summary, usageOverTime, agentPerformance, conversationMetrics, topAgents] =
    await Promise.all([
      getDashboardStats(companyId),
      getUsageOverTime(companyId, startDate, endDate),
      getAgentPerformance(companyId),
      getConversationMetrics(companyId),
      getTopAgents(companyId, 10)
    ])

  return {
    company_id: companyId,
    generated_at: new Date(),
    period: {
      start: startDate,
      end: endDate
    },
    summary,
    usage_over_time: usageOverTime,
    agent_performance: agentPerformance,
    conversation_metrics: conversationMetrics,
    top_agents: topAgents
  }
}
