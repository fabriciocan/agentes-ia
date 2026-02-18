import { prisma } from '../lib/prisma'
import { createLogger } from '../utils/logger'
import { invalidateRolePermissions, checkPrivilegeEscalation } from '../utils/authorization'
import type { Role, Permission } from '../types/database.types'

const logger = createLogger('role-service')

// ============================================================================
// Get Role by ID
// ============================================================================

export interface RoleWithPermissions extends Role {
  permissions: Permission[]
}

export async function getRoleById(roleId: string): Promise<RoleWithPermissions | null> {
  const role = await prisma.roles.findFirst({
    where: { id: roleId, deleted_at: null },
    include: {
      role_permissions: {
        include: { permissions: true }
      }
    }
  })

  if (!role) return null

  const permissions = role.role_permissions.map((rp) => rp.permissions as unknown as Permission)
  const { role_permissions: _, ...roleData } = role

  return { ...roleData, permissions } as unknown as RoleWithPermissions
}

// ============================================================================
// List Roles
// ============================================================================

export async function listRoles(companyId: string): Promise<RoleWithPermissions[]> {
  const roles = await prisma.roles.findMany({
    where: {
      OR: [{ is_system: true }, { company_id: companyId }],
      deleted_at: null
    },
    include: {
      role_permissions: {
        include: { permissions: true }
      }
    },
    orderBy: [{ is_system: 'desc' }, { name: 'asc' }]
  })

  return roles.map((role) => {
    const permissions = role.role_permissions.map((rp) => rp.permissions as unknown as Permission)
    const { role_permissions: _, ...roleData } = role
    return { ...roleData, permissions } as unknown as RoleWithPermissions
  })
}

// ============================================================================
// Create Custom Role
// ============================================================================

export async function createRole(
  companyId: string,
  createdByUserId: string,
  data: {
    name: string
    slug: string
    description?: string
    permissionIds: string[]
  }
): Promise<RoleWithPermissions> {
  // Verify no privilege escalation
  const permissionsToGrant = await getPermissionsByIds(data.permissionIds)
  const permissionSlugs = permissionsToGrant.map(p => p.slug)
  const invalidPermissions = await checkPrivilegeEscalation(createdByUserId, permissionSlugs)

  if (invalidPermissions.length > 0) {
    throw createError({
      statusCode: 403,
      message: `Cannot grant permissions you don't have: ${invalidPermissions.join(', ')}`
    })
  }

  // Create role
  const role = await prisma.roles.create({
    data: {
      company_id: companyId,
      name: data.name,
      slug: data.slug,
      description: data.description || null,
      is_system: false
    }
  })

  // Assign permissions
  if (data.permissionIds.length > 0) {
    await assignPermissionsToRole(role.id, data.permissionIds)
  }

  logger.info(
    {
      roleId: role.id,
      companyId,
      name: data.name,
      permissionCount: data.permissionIds.length,
      createdBy: createdByUserId
    },
    'Created custom role'
  )

  // Return role with permissions
  return (await getRoleById(role.id))!
}

// ============================================================================
// Update Role
// ============================================================================

export async function updateRole(
  roleId: string,
  updatedByUserId: string,
  updates: {
    name?: string
    description?: string
    permissionIds?: string[]
  }
): Promise<RoleWithPermissions> {
  // Check if role is a system role
  const existingRole = await getRoleById(roleId)
  if (!existingRole) {
    throw createError({
      statusCode: 404,
      message: 'Role not found'
    })
  }

  if (existingRole.is_system) {
    throw createError({
      statusCode: 403,
      message: 'Cannot modify system roles'
    })
  }

  // Verify no privilege escalation if updating permissions
  if (updates.permissionIds) {
    const permissionsToGrant = await getPermissionsByIds(updates.permissionIds)
    const permissionSlugs = permissionsToGrant.map(p => p.slug)
    const invalidPermissions = await checkPrivilegeEscalation(updatedByUserId, permissionSlugs)

    if (invalidPermissions.length > 0) {
      throw createError({
        statusCode: 403,
        message: `Cannot grant permissions you don't have: ${invalidPermissions.join(', ')}`
      })
    }
  }

  // Update role metadata
  const data: Record<string, unknown> = {}

  if (updates.name !== undefined) data.name = updates.name
  if (updates.description !== undefined) data.description = updates.description

  if (Object.keys(data).length > 0) {
    await prisma.roles.update({
      where: { id: roleId },
      data
    })
  }

  // Update permissions if provided
  if (updates.permissionIds) {
    await assignPermissionsToRole(roleId, updates.permissionIds)
  }

  // Invalidate permission cache for all users with this role
  await invalidateRolePermissions(roleId)

  logger.info(
    {
      roleId,
      updates: Object.keys(updates),
      updatedBy: updatedByUserId
    },
    'Updated custom role'
  )

  // Return updated role with permissions
  return (await getRoleById(roleId))!
}

// ============================================================================
// Delete Role
// ============================================================================

export async function deleteRole(roleId: string): Promise<void> {
  // Check if role is a system role
  const role = await getRoleById(roleId)
  if (!role) {
    throw createError({
      statusCode: 404,
      message: 'Role not found'
    })
  }

  if (role.is_system) {
    throw createError({
      statusCode: 403,
      message: 'Cannot delete system roles'
    })
  }

  // Check if role is assigned to any users
  const userCount = await prisma.user_roles.count({
    where: { role_id: roleId }
  })

  if (userCount > 0) {
    throw createError({
      statusCode: 409,
      message: `Cannot delete role: ${userCount} user(s) still have this role`
    })
  }

  // Soft delete
  await prisma.roles.update({
    where: { id: roleId },
    data: { deleted_at: new Date() }
  })

  logger.info({ roleId }, 'Deleted custom role')
}

// ============================================================================
// Assign Permissions to Role
// ============================================================================

async function assignPermissionsToRole(
  roleId: string,
  permissionIds: string[]
): Promise<void> {
  // Remove existing permissions
  await prisma.role_permissions.deleteMany({ where: { role_id: roleId } })

  // Add new permissions
  if (permissionIds.length > 0) {
    await prisma.role_permissions.createMany({
      data: permissionIds.map((permissionId) => ({
        role_id: roleId,
        permission_id: permissionId
      }))
    })
  }
}

// ============================================================================
// Get Permissions by IDs
// ============================================================================

async function getPermissionsByIds(permissionIds: string[]): Promise<Permission[]> {
  if (permissionIds.length === 0) {
    return []
  }

  const permissions = await prisma.permissions.findMany({
    where: { id: { in: permissionIds } }
  })

  return permissions as unknown as Permission[]
}

// ============================================================================
// Get Role Permissions
// ============================================================================

export async function getRolePermissions(roleId: string): Promise<Permission[]> {
  const rolePerms = await prisma.role_permissions.findMany({
    where: { role_id: roleId },
    include: { permissions: true },
    orderBy: [
      { permissions: { resource: 'asc' } },
      { permissions: { action: 'asc' } }
    ]
  })

  return rolePerms.map((rp) => rp.permissions as unknown as Permission)
}
