import type { H3Event } from 'h3'
import { prisma } from '../lib/prisma'
import { Prisma } from '#prisma'
import { cacheGet, cacheSet, cacheDel } from '../services/redis.service'
import { createLogger } from './logger'
import type { Permission } from '../types/database.types'

const logger = createLogger('authorization')

// ============================================================================
// Permission Cache Configuration
// ============================================================================

const PERMISSION_CACHE_TTL = 60 // 1 minute
const PERMISSION_CACHE_PREFIX = 'permissions:user:'

// ============================================================================
// Get User Permissions (with Redis caching)
// ============================================================================

export async function getUserPermissions(userId: string): Promise<string[]> {
  const cacheKey = `${PERMISSION_CACHE_PREFIX}${userId}`

  logger.info({ userId, cacheKey }, 'Getting user permissions')

  // Try cache first
  const cached = await cacheGet<string[]>(cacheKey)
  if (cached) {
    logger.info({ userId, cached: true, count: cached.length }, 'Loaded user permissions from cache')
    return cached
  }

  // Load from database
  logger.info({ userId }, 'Loading permissions from database')

  const userRoles = await prisma.user_roles.findMany({
    where: { user_id: userId },
    include: {
      roles: {
        include: {
          role_permissions: {
            include: { permissions: true }
          }
        }
      }
    }
  })

  const permissions = [...new Set(
    userRoles
      .filter(ur => ur.roles && !ur.roles.deleted_at)
      .flatMap(ur => ur.roles!.role_permissions.map(rp => rp.permissions.slug))
  )]

  logger.info({ userId, count: permissions.length, first5: permissions.slice(0, 5) }, 'Loaded user permissions from database')

  // Cache the permissions
  await cacheSet(cacheKey, permissions, PERMISSION_CACHE_TTL)

  return permissions
}

// ============================================================================
// Check Permission
// ============================================================================

/**
 * Check if user has a specific permission
 * Supports wildcard (*) permissions for admin access
 */
export function checkPermission(
  userPermissions: string[],
  requiredPermission: string
): boolean {
  // Check for wildcard (admin) permission
  if (userPermissions.includes('*')) {
    return true
  }

  // Check for exact permission match
  if (userPermissions.includes(requiredPermission)) {
    return true
  }

  // Check for resource-level wildcard (e.g., "agents.*" matches "agents.create")
  const [resource] = requiredPermission.split('.')
  if (userPermissions.includes(`${resource}.*`)) {
    return true
  }

  return false
}

// ============================================================================
// Require Permission (for event handlers)
// ============================================================================

/**
 * Require a specific permission in an event handler
 * Throws 403 error if permission is not granted
 */
export async function requirePermission(event: H3Event, permission: string): Promise<void> {
  // Always load user permissions if user is authenticated
  let userPermissions: string[] = []

  logger.info({ hasUser: !!event.context.user, userId: event.context.user?.id, permission }, 'requirePermission called')

  if (event.context.user?.id) {
    try {
      logger.info({ userId: event.context.user.id }, 'About to call getUserPermissions')
      userPermissions = await getUserPermissions(event.context.user.id)
      event.context.permissions = userPermissions

      logger.info({
        userId: event.context.user.id,
        permissionCount: userPermissions.length,
        required: permission,
        first3: userPermissions.slice(0, 3)
      }, 'Successfully loaded permissions')
    } catch (error) {
      logger.error({ error, userId: event.context.user.id }, 'Failed to load permissions')
      // Continue with empty permissions
    }
  }

  if (!checkPermission(userPermissions, permission)) {
    logger.warn(
      {
        userId: event.context.user?.id,
        required: permission,
        has: userPermissions
      },
      'Permission denied'
    )

    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      message: `Missing required permission: ${permission}`
    })
  }

  logger.info({ userId: event.context.user?.id, permission }, 'Permission granted')
}

// ============================================================================
// Validate Company Ownership
// ============================================================================

/**
 * Validate that a resource belongs to the user's company
 * Critical security function to prevent cross-company access
 */
export async function validateCompanyOwnership(
  companyId: string,
  table: string,
  resourceId: string
): Promise<boolean> {
  // Whitelist of allowed tables for security
  const allowedTables = [
    'agent_configs',
    'conversations',
    'knowledge_base',
    'users',
    'roles',
    'subscriptions',
    'usage_logs',
    'audit_logs'
  ]

  if (!allowedTables.includes(table)) {
    logger.error({ table }, 'Attempted to validate ownership on non-whitelisted table')
    throw createError({
      statusCode: 500,
      message: 'Invalid table for ownership validation'
    })
  }

  const result = await prisma.$queryRaw<[{ exists: boolean }]>(
    Prisma.sql`SELECT EXISTS(SELECT 1 FROM ${Prisma.raw(table)} WHERE id = ${resourceId}::uuid AND company_id = ${companyId}::uuid) as exists`
  )

  return result[0]?.exists ?? false
}

// ============================================================================
// Require Company Ownership
// ============================================================================

/**
 * Require that a resource belongs to the user's company
 * Throws 404 error if not found (don't reveal existence)
 */
export async function requireCompanyOwnership(
  event: H3Event,
  table: string,
  resourceId: string
): Promise<void> {
  const companyId = event.context.user?.company_id

  if (!companyId) {
    logger.error({ userId: event.context.user?.id }, 'User has no company_id')
    throw createError({
      statusCode: 403,
      message: 'No company associated with user'
    })
  }

  const isOwner = await validateCompanyOwnership(companyId, table, resourceId)

  if (!isOwner) {
    logger.warn(
      {
        userId: event.context.user?.id,
        companyId,
        table,
        resourceId
      },
      'Company ownership validation failed'
    )

    // Return 404 instead of 403 to not reveal existence
    throw createError({
      statusCode: 404,
      message: 'Resource not found'
    })
  }
}

// ============================================================================
// Invalidate Permission Cache
// ============================================================================

/**
 * Invalidate cached permissions for a user
 * Call this when user roles change
 */
export async function invalidateUserPermissions(userId: string): Promise<void> {
  const cacheKey = `${PERMISSION_CACHE_PREFIX}${userId}`
  await cacheDel(cacheKey)
  logger.debug({ userId }, 'Invalidated user permission cache')
}

/**
 * Invalidate cached permissions for all users with a specific role
 * Call this when role permissions change
 */
export async function invalidateRolePermissions(roleId: string): Promise<void> {
  // Get all users with this role
  const userRoles = await prisma.user_roles.findMany({
    where: { role_id: roleId },
    select: { user_id: true }
  })

  // Invalidate cache for each user
  await Promise.all(
    userRoles.map(row => invalidateUserPermissions(row.user_id))
  )

  logger.debug({ roleId, userCount: userRoles.length }, 'Invalidated role permissions cache')
}

// ============================================================================
// Check Privilege Escalation
// ============================================================================

/**
 * Prevent users from granting permissions they don't have
 * Returns the list of invalid permissions (permissions the user can't grant)
 */
export async function checkPrivilegeEscalation(
  userId: string,
  permissionsToGrant: string[]
): Promise<string[]> {
  const userPermissions = await getUserPermissions(userId)

  // Admin can grant anything
  if (userPermissions.includes('*')) {
    return []
  }

  // Check each permission
  const invalidPermissions: string[] = []

  for (const permission of permissionsToGrant) {
    if (!checkPermission(userPermissions, permission)) {
      invalidPermissions.push(permission)
    }
  }

  return invalidPermissions
}

// ============================================================================
// Get All Permissions (for UI)
// ============================================================================

/**
 * Get all available permissions in the system
 * Cached for 10 minutes (permissions rarely change)
 */
export async function getAllPermissions(): Promise<Permission[]> {
  const cacheKey = 'permissions:all'

  // Try cache first
  const cached = await cacheGet<Permission[]>(cacheKey)
  if (cached) {
    return cached
  }

  // Load from database
  const result = await prisma.permissions.findMany({
    select: {
      id: true,
      slug: true,
      name: true,
      description: true,
      resource: true,
      action: true,
      created_at: true
    },
    orderBy: [
      { resource: 'asc' },
      { action: 'asc' }
    ]
  })

  const permissions = result as unknown as Permission[]

  // Cache for 10 minutes
  await cacheSet(cacheKey, permissions, 600)

  return permissions
}

// ============================================================================
// Helper: Can User Manage Users
// ============================================================================

/**
 * Check if user can manage users (invite, update, delete)
 * Used in middleware to determine if user management endpoints are accessible
 */
export function canManageUsers(permissions: string[]): boolean {
  return checkPermission(permissions, 'users.invite') ||
         checkPermission(permissions, 'users.update') ||
         checkPermission(permissions, 'users.delete')
}

// ============================================================================
// Helper: Can User Manage Roles
// ============================================================================

/**
 * Check if user can manage roles (create, update, delete custom roles)
 */
export function canManageRoles(permissions: string[]): boolean {
  return checkPermission(permissions, 'roles.create') ||
         checkPermission(permissions, 'roles.update') ||
         checkPermission(permissions, 'roles.delete')
}

// ============================================================================
// Helper: Can User Manage Billing
// ============================================================================

/**
 * Check if user can manage billing and subscriptions
 */
export function canManageBilling(permissions: string[]): boolean {
  return checkPermission(permissions, 'billing.manage')
}

// ============================================================================
// Helper: Is Admin
// ============================================================================

/**
 * Check if user is an admin (has wildcard permission)
 */
export function isAdmin(permissions: string[]): boolean {
  return permissions.includes('*')
}
