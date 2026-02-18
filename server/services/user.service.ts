import { prisma } from '../lib/prisma'
import { createLogger } from '../utils/logger'
import { invalidateUserPermissions } from '../utils/authorization'
import { hashAppPassword } from '../utils/password'
import type { TeamUser, Role } from '../types/database.types'
import crypto from 'crypto'

const logger = createLogger('user-service')

// ============================================================================
// Get User by ID
// ============================================================================

export async function getUserById(userId: string): Promise<TeamUser | null> {
  const user = await prisma.users.findFirst({
    where: { id: userId, deleted_at: null }
  })

  return (user as unknown as TeamUser) || null
}

// ============================================================================
// Get User by Email (in company)
// ============================================================================

export async function getUserByEmail(
  companyId: string,
  email: string
): Promise<TeamUser | null> {
  const user = await prisma.users.findFirst({
    where: { company_id: companyId, email, deleted_at: null }
  })

  return (user as unknown as TeamUser) || null
}

// ============================================================================
// List Users in Company
// ============================================================================

export interface UserWithRoles extends TeamUser {
  roles: Array<{
    id: string
    name: string
    slug: string
    is_system: boolean
  }>
}

export async function listUsers(companyId: string): Promise<UserWithRoles[]> {
  const users = await prisma.users.findMany({
    where: { company_id: companyId, deleted_at: null },
    orderBy: { created_at: 'desc' },
    include: {
      user_roles_user_roles_user_idTousers: {
        include: {
          roles: {
            select: { id: true, name: true, slug: true, is_system: true, deleted_at: true }
          }
        }
      }
    }
  })

  return users.map((user) => {
    const roles = user.user_roles_user_roles_user_idTousers
      .filter((ur) => ur.roles.deleted_at === null)
      .map((ur) => ({
        id: ur.roles.id,
        name: ur.roles.name,
        slug: ur.roles.slug,
        is_system: ur.roles.is_system ?? false
      }))

    const { user_roles_user_roles_user_idTousers: _, ...userData } = user
    return { ...userData, roles } as unknown as UserWithRoles
  })
}

// ============================================================================
// Invite User
// ============================================================================

export async function inviteUser(
  companyId: string,
  invitedByUserId: string,
  data: {
    email: string
    name?: string
    roleIds: string[]
  }
): Promise<{ user: TeamUser; invitationToken: string }> {
  // Check if user already exists
  const existing = await getUserByEmail(companyId, data.email)
  if (existing) {
    throw createError({
      statusCode: 409,
      message: 'User with this email already exists in this company'
    })
  }

  // Generate invitation token
  const invitationToken = crypto.randomBytes(32).toString('hex')

  // Generate temporary password hash (will be replaced when user accepts)
  const tempPasswordHash = await hashAppPassword(crypto.randomBytes(32).toString('hex'))

  // Create user with 'invited' status
  const user = await prisma.users.create({
    data: {
      company_id: companyId,
      email: data.email,
      name: data.name || null,
      password_hash: tempPasswordHash,
      invitation_token: invitationToken,
      invitation_sent_at: new Date(),
      invited_by_user_id: invitedByUserId,
      status: 'invited'
    }
  })

  if (!user) throw createError({ statusCode: 500, message: 'Failed to create user' })

  // Assign roles
  if (data.roleIds.length > 0) {
    await assignRolesToUser(user.id, data.roleIds, invitedByUserId)
  }

  logger.info(
    {
      userId: user.id,
      email: data.email,
      companyId,
      invitedBy: invitedByUserId
    },
    'User invited'
  )

  return { user: user as unknown as TeamUser, invitationToken }
}

// ============================================================================
// Accept Invitation
// ============================================================================

export async function acceptInvitation(
  invitationToken: string,
  password: string,
  name?: string
): Promise<TeamUser> {
  // Find user by invitation token
  const user = await prisma.users.findFirst({
    where: { invitation_token: invitationToken, status: 'invited' }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      message: 'Invalid or expired invitation'
    })
  }

  // Check if invitation is expired (7 days)
  const invitationAge = Date.now() - new Date(user.invitation_sent_at!).getTime()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  if (invitationAge > sevenDays) {
    throw createError({
      statusCode: 410,
      message: 'Invitation has expired'
    })
  }

  // Hash password
  const passwordHash = await hashAppPassword(password)

  // Update user
  const updatedUser = await prisma.users.update({
    where: { id: user.id },
    data: {
      password_hash: passwordHash,
      name: name || user.name,
      status: 'active',
      invitation_accepted_at: new Date(),
      invitation_token: null
    }
  })

  logger.info({ userId: user.id, email: user.email }, 'User accepted invitation')

  if (!updatedUser) throw createError({ statusCode: 500, message: 'Failed to update user' })
  return updatedUser as unknown as TeamUser
}

// ============================================================================
// Update User
// ============================================================================

export async function updateUser(
  userId: string,
  updates: {
    name?: string
    email?: string
    avatar_url?: string | null
    status?: 'active' | 'suspended'
    preferences?: Record<string, unknown>
  }
): Promise<TeamUser> {
  const data: Record<string, unknown> = {}

  if (updates.name !== undefined) data.name = updates.name
  if (updates.email !== undefined) data.email = updates.email
  if (updates.avatar_url !== undefined) data.avatar_url = updates.avatar_url
  if (updates.status !== undefined) data.status = updates.status
  if (updates.preferences !== undefined) data.preferences = updates.preferences

  if (Object.keys(data).length === 0) {
    throw new Error('No updates provided')
  }

  try {
    const user = await prisma.users.update({
      where: { id: userId },
      data
    })

    // Verify user is not soft-deleted
    if (user.deleted_at !== null) {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }

    logger.info({ userId, updates: Object.keys(updates) }, 'Updated user')

    return user as unknown as TeamUser
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw createError({
        statusCode: 404,
        message: 'User not found'
      })
    }
    throw error
  }
}

// ============================================================================
// Delete User (Soft Delete)
// ============================================================================

export async function deleteUser(userId: string): Promise<void> {
  await prisma.users.update({
    where: { id: userId },
    data: {
      status: 'deleted',
      deleted_at: new Date()
    }
  })

  // Invalidate permission cache
  await invalidateUserPermissions(userId)

  logger.info({ userId }, 'Deleted user')
}

// ============================================================================
// Assign Roles to User
// ============================================================================

export async function assignRolesToUser(
  userId: string,
  roleIds: string[],
  assignedByUserId: string
): Promise<void> {
  // Remove existing roles
  await prisma.user_roles.deleteMany({ where: { user_id: userId } })

  // Add new roles
  if (roleIds.length > 0) {
    await prisma.user_roles.createMany({
      data: roleIds.map((roleId) => ({
        user_id: userId,
        role_id: roleId,
        assigned_by_user_id: assignedByUserId
      }))
    })
  }

  // Invalidate permission cache
  await invalidateUserPermissions(userId)

  logger.info({ userId, roleIds, assignedBy: assignedByUserId }, 'Assigned roles to user')
}

// ============================================================================
// Get User Roles
// ============================================================================

export async function getUserRoles(userId: string): Promise<Role[]> {
  const userRoles = await prisma.user_roles.findMany({
    where: { user_id: userId },
    include: {
      roles: true
    },
    orderBy: [
      { roles: { is_system: 'desc' } },
      { roles: { name: 'asc' } }
    ]
  })

  return userRoles
    .filter((ur) => ur.roles.deleted_at === null)
    .map((ur) => ur.roles as unknown as Role)
}

// ============================================================================
// Update Last Login
// ============================================================================

export async function updateLastLogin(userId: string): Promise<void> {
  await prisma.users.update({
    where: { id: userId },
    data: { last_login_at: new Date() }
  })
}
