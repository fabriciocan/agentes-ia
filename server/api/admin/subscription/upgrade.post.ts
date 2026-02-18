import { updateSubscriptionPlan, getCurrentSubscription } from '../../../services/subscription.service'
import { logAuditFromEvent, AuditActions } from '../../../services/audit.service'
import { requirePermission } from '../../../utils/authorization'
import { subscriptionUpgradeSchema } from '../../../utils/validation'
import { createLogger } from '../../../utils/logger'

const logger = createLogger('api:admin:subscription:upgrade')

/**
 * POST /api/admin/subscription/upgrade
 *
 * Upgrade or downgrade subscription plan
 *
 * @body {plan_id, billing_period?}
 * @returns {subscription: SubscriptionWithPlan}
 */
export default defineEventHandler(async (event) => {
  // Check permission
  requirePermission(event, 'billing.manage')

  const companyId = event.context.user?.company_id

  if (!companyId) {
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  try {
    // Parse and validate request body
    const body = await readBody(event)
    const data = subscriptionUpgradeSchema.parse(body)

    // Get current subscription for audit
    const oldSubscription = await getCurrentSubscription(companyId)

    // Update subscription
    const subscription = await updateSubscriptionPlan(
      companyId,
      data.plan_id,
      data.billing_period
    )

    // Log audit event
    const action = oldSubscription && subscription.plan.price_monthly > oldSubscription.plan.price_monthly
      ? AuditActions.SUBSCRIPTION_UPGRADED
      : AuditActions.SUBSCRIPTION_DOWNGRADED

    await logAuditFromEvent(
      event,
      action,
      'subscription',
      subscription.id,
      {
        old: oldSubscription ? {
          plan: oldSubscription.plan.slug,
          billing_period: oldSubscription.billing_period
        } : undefined,
        new: {
          plan: subscription.plan.slug,
          billing_period: subscription.billing_period
        }
      }
    )

    logger.info(
      {
        companyId,
        oldPlan: oldSubscription?.plan.slug,
        newPlan: subscription.plan.slug,
        billingPeriod: data.billing_period
      },
      'Subscription updated'
    )

    return { subscription }
  } catch (error) {
    // If it's already an H3Error, rethrow it
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    // If it's a Zod validation error
    if (error && typeof error === 'object' && 'issues' in error) {
      throw createError({
        statusCode: 400,
        message: 'Validation error',
        data: error
      })
    }

    logger.error({ err: error, companyId }, 'Failed to update subscription')
    throw createError({
      statusCode: 500,
      message: 'Failed to update subscription'
    })
  }
})
