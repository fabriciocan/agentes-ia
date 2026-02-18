import { prisma } from '../lib/prisma'
import { cacheGet, cacheSet, cacheDel } from './redis.service'
import { createLogger } from '../utils/logger'
import type { Subscription, SubscriptionPlan } from '../types/database.types'

const logger = createLogger('subscription-service')

// ============================================================================
// Cache Configuration
// ============================================================================

const CACHE_TTL = 600 // 10 minutes
const CACHE_PREFIX = 'subscription:'

// ============================================================================
// Get Current Subscription
// ============================================================================

export interface SubscriptionWithPlan extends Subscription {
  plan: SubscriptionPlan
}

export async function getCurrentSubscription(
  companyId: string
): Promise<SubscriptionWithPlan | null> {
  const cacheKey = `${CACHE_PREFIX}${companyId}`

  // Try cache first
  const cached = await cacheGet<SubscriptionWithPlan>(cacheKey)
  if (cached) {
    return cached
  }

  // Load from database
  const result = await prisma.subscriptions.findFirst({
    where: { company_id: companyId },
    include: { subscription_plans: true }
  })

  if (!result) {
    return null
  }

  const { subscription_plans, ...sub } = result

  // Restructure: rename subscription_plans relation to plan, cast Decimal fields
  const plan = {
    ...subscription_plans,
    price_monthly: Number(subscription_plans.price_monthly),
    price_yearly: Number(subscription_plans.price_yearly)
  } as unknown as SubscriptionPlan

  const subscription = {
    ...sub,
    plan
  } as unknown as SubscriptionWithPlan

  // Cache the subscription
  await cacheSet(cacheKey, subscription, CACHE_TTL)

  return subscription
}

// ============================================================================
// Get All Available Plans
// ============================================================================

export async function getAvailablePlans(): Promise<SubscriptionPlan[]> {
  const cacheKey = 'subscription:plans'

  // Try cache first
  const cached = await cacheGet<SubscriptionPlan[]>(cacheKey)
  if (cached) {
    return cached
  }

  const result = await prisma.subscription_plans.findMany({
    where: { is_active: true, is_visible: true },
    orderBy: { price_monthly: 'asc' }
  })

  const plans = result.map((p) => ({
    ...p,
    price_monthly: Number(p.price_monthly),
    price_yearly: Number(p.price_yearly)
  })) as unknown as SubscriptionPlan[]

  // Cache for 1 hour
  await cacheSet(cacheKey, plans, 3600)

  return plans
}

// ============================================================================
// Get Plan by Slug
// ============================================================================

export async function getPlanBySlug(slug: string): Promise<SubscriptionPlan | null> {
  const result = await prisma.subscription_plans.findFirst({
    where: { slug, is_active: true }
  })

  if (!result) return null

  return {
    ...result,
    price_monthly: Number(result.price_monthly),
    price_yearly: Number(result.price_yearly)
  } as unknown as SubscriptionPlan
}

// ============================================================================
// Upgrade/Downgrade Subscription
// ============================================================================

export async function updateSubscriptionPlan(
  companyId: string,
  newPlanId: string,
  billingPeriod: 'monthly' | 'yearly' = 'monthly'
): Promise<SubscriptionWithPlan> {
  // Get current subscription
  const currentSub = await getCurrentSubscription(companyId)
  if (!currentSub) {
    throw createError({
      statusCode: 404,
      message: 'No active subscription found'
    })
  }

  // Get new plan
  const newPlan = await prisma.subscription_plans.findFirst({
    where: { id: newPlanId, is_active: true }
  })

  if (!newPlan) {
    throw createError({
      statusCode: 404,
      message: 'Plan not found'
    })
  }

  // Calculate new period
  const now = new Date()
  const periodEnd = new Date(now)
  if (billingPeriod === 'yearly') {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1)
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1)
  }

  // Update subscription
  await prisma.subscriptions.update({
    where: { company_id: companyId },
    data: {
      plan_id: newPlanId,
      billing_period: billingPeriod,
      status: 'active',
      current_period_start: now,
      current_period_end: periodEnd,
      trial_ends_at: null,
      updated_at: new Date()
    }
  })

  // Invalidate cache
  await invalidateSubscriptionCache(companyId)

  logger.info(
    {
      companyId,
      oldPlan: currentSub.plan.slug,
      newPlan: newPlan.slug,
      billingPeriod
    },
    'Updated subscription plan'
  )

  // Return updated subscription
  return (await getCurrentSubscription(companyId))!
}

// ============================================================================
// Cancel Subscription
// ============================================================================

export async function cancelSubscription(companyId: string): Promise<void> {
  const subscription = await getCurrentSubscription(companyId)
  if (!subscription) {
    throw createError({
      statusCode: 404,
      message: 'No active subscription found'
    })
  }

  // Cancel at end of period
  await prisma.subscriptions.update({
    where: { company_id: companyId },
    data: {
      status: 'cancelled',
      cancelled_at: new Date(),
      expires_at: subscription.current_period_end,
      updated_at: new Date()
    }
  })

  // Invalidate cache
  await invalidateSubscriptionCache(companyId)

  logger.info({ companyId, expiresAt: subscription.current_period_end }, 'Cancelled subscription')
}

// ============================================================================
// Check Usage Limit
// ============================================================================

export interface LimitCheckResult {
  allowed: boolean
  limit: number
  current: number
  remaining: number
}

export async function checkUsageLimit(
  companyId: string,
  limitKey: keyof SubscriptionPlan['limits']
): Promise<LimitCheckResult> {
  const subscription = await getCurrentSubscription(companyId)
  if (!subscription) {
    return { allowed: false, limit: 0, current: 0, remaining: 0 }
  }

  const limit = subscription.plan.limits[limitKey] || 0

  // -1 means unlimited
  if (limit === -1) {
    return { allowed: true, limit: -1, current: 0, remaining: -1 }
  }

  // Get current usage based on limit type
  let current = 0

  switch (limitKey) {
    case 'max_agents':
      current = await getAgentCount(companyId)
      break
    case 'max_users':
      current = await getUserCount(companyId)
      break
    case 'max_conversations_per_month':
      current = subscription.usage_current_period.conversations || 0
      break
    case 'max_knowledge_documents':
      current = await getKnowledgeDocumentCount(companyId)
      break
    case 'max_api_calls_per_month':
      current = subscription.usage_current_period.api_calls || 0
      break
    default:
      break
  }

  const remaining = Math.max(0, limit - current)
  const allowed = current < limit

  return { allowed, limit, current, remaining }
}

// ============================================================================
// Increment Usage Counter
// ============================================================================

export async function incrementUsage(
  companyId: string,
  usageType: 'conversations' | 'api_calls',
  amount: number = 1
): Promise<void> {
  await prisma.$executeRaw`
    UPDATE subscriptions
    SET
      usage_current_period = jsonb_set(
        COALESCE(usage_current_period, '{}'),
        ${'{' + usageType + '}'},
        (COALESCE(usage_current_period->>${usageType}, '0')::int + ${amount})::text::jsonb
      ),
      updated_at = NOW()
    WHERE company_id = ${companyId}::uuid
  `

  // Invalidate cache
  await invalidateSubscriptionCache(companyId)
}

// ============================================================================
// Reset Monthly Usage
// ============================================================================

export async function resetMonthlyUsage(companyId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE subscriptions
    SET
      usage_current_period = jsonb_build_object(
        'conversations', 0,
        'api_calls', 0,
        'reset_at', NOW()::text
      ),
      updated_at = NOW()
    WHERE company_id = ${companyId}::uuid
  `

  // Invalidate cache
  await invalidateSubscriptionCache(companyId)

  logger.info({ companyId }, 'Reset monthly usage')
}

// ============================================================================
// Helper: Get Current Counts
// ============================================================================

async function getAgentCount(companyId: string): Promise<number> {
  return prisma.agent_configs.count({
    where: { company_id: companyId }
  })
}

async function getUserCount(companyId: string): Promise<number> {
  return prisma.users.count({
    where: { company_id: companyId, deleted_at: null }
  })
}

async function getKnowledgeDocumentCount(companyId: string): Promise<number> {
  return prisma.knowledge_base.count({
    where: {
      agent_configs: { company_id: companyId }
    }
  })
}

// ============================================================================
// Cache Management
// ============================================================================

async function invalidateSubscriptionCache(companyId: string): Promise<void> {
  await cacheDel(`${CACHE_PREFIX}${companyId}`)
  logger.debug({ companyId }, 'Invalidated subscription cache')
}
