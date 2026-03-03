/**
 * Comprehensive seed script — creates permissions, roles, and users:
 *   • Platform Admin  (superadmin@platform.com)
 *   • Admin           (admin@acme.com)
 *   • Agent Manager   (manager@acme.com)
 *   • Viewer          (viewer@acme.com)
 *
 * Usage: npm run db:seed
 */

import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashAppPassword } from '../server/utils/password'

const connectionString = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || ''
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

// ─── User definitions ─────────────────────────────────────────────────────────

const PLATFORM_USER = {
  email: 'superadmin@platform.com',
  name: 'Super Admin',
  password: 'superadmin123',
  roleSlug: 'platform_admin',
}

const COMPANY_USERS = [
  { email: 'admin@acme.com',   name: 'Admin ACME',   password: 'admin123',   roleSlug: 'admin' },
  { email: 'manager@acme.com', name: 'Manager ACME', password: 'manager123', roleSlug: 'agent_manager' },
  { email: 'viewer@acme.com',  name: 'Viewer ACME',  password: 'viewer123',  roleSlug: 'viewer' },
]

// ─── Permissions definitions ───────────────────────────────────────────────────

const PERMISSIONS = [
  { slug: 'agents.read',      name: 'View Agents',            resource: 'agents',        action: 'read' },
  { slug: 'agents.create',    name: 'Create Agents',          resource: 'agents',        action: 'create' },
  { slug: 'agents.update',    name: 'Update Agents',          resource: 'agents',        action: 'update' },
  { slug: 'agents.delete',    name: 'Delete Agents',          resource: 'agents',        action: 'delete' },
  { slug: 'agents.manage',    name: 'Manage Agents (Full)',   resource: 'agents',        action: 'manage' },
  { slug: 'agents.publish',   name: 'Publish Agents',         resource: 'agents',        action: 'publish' },
  { slug: 'knowledge.read',   name: 'View Knowledge',         resource: 'knowledge',     action: 'read' },
  { slug: 'knowledge.create', name: 'Upload Knowledge',       resource: 'knowledge',     action: 'create' },
  { slug: 'knowledge.update', name: 'Update Knowledge',       resource: 'knowledge',     action: 'update' },
  { slug: 'knowledge.delete', name: 'Delete Knowledge',       resource: 'knowledge',     action: 'delete' },
  { slug: 'conversations.read',   name: 'View Conversations',   resource: 'conversations', action: 'read' },
  { slug: 'conversations.create', name: 'Create Conversations', resource: 'conversations', action: 'create' },
  { slug: 'conversations.delete', name: 'Delete Conversations', resource: 'conversations', action: 'delete' },
  { slug: 'conversations.export', name: 'Export Conversations', resource: 'conversations', action: 'export' },
  { slug: 'users.read',    name: 'View Users',    resource: 'users', action: 'read' },
  { slug: 'users.invite',  name: 'Invite Users',  resource: 'users', action: 'invite' },
  { slug: 'users.update',  name: 'Update Users',  resource: 'users', action: 'update' },
  { slug: 'users.delete',  name: 'Remove Users',  resource: 'users', action: 'delete' },
  { slug: 'roles.read',    name: 'View Roles',    resource: 'roles', action: 'read' },
  { slug: 'roles.create',  name: 'Create Roles',  resource: 'roles', action: 'create' },
  { slug: 'roles.update',  name: 'Update Roles',  resource: 'roles', action: 'update' },
  { slug: 'roles.delete',  name: 'Delete Roles',  resource: 'roles', action: 'delete' },
  { slug: 'billing.read',   name: 'View Billing',   resource: 'billing',   action: 'read' },
  { slug: 'billing.manage', name: 'Manage Billing', resource: 'billing',   action: 'manage' },
  { slug: 'analytics.read',   name: 'View Analytics',   resource: 'analytics', action: 'read' },
  { slug: 'analytics.export', name: 'Export Analytics', resource: 'analytics', action: 'export' },
  { slug: 'company.read',   name: 'View Company Settings',   resource: 'company', action: 'read' },
  { slug: 'company.update', name: 'Update Company Settings', resource: 'company', action: 'update' },
  { slug: 'audit.read',     name: 'View Audit Logs',         resource: 'audit',   action: 'read' },
  { slug: 'api_keys.read',   name: 'View API Keys',   resource: 'api_keys', action: 'read' },
  { slug: 'api_keys.create', name: 'Create API Keys', resource: 'api_keys', action: 'create' },
  { slug: 'api_keys.delete', name: 'Delete API Keys', resource: 'api_keys', action: 'delete' },
  { slug: 'platform.view_all_companies', name: 'View All Companies', resource: 'platform', action: 'read' },
  { slug: 'platform.manage_companies',   name: 'Manage Companies',   resource: 'platform', action: 'manage' },
  { slug: 'platform.view_all_users',     name: 'View All Users',     resource: 'platform', action: 'read' },
  { slug: 'platform.system_settings',    name: 'System Settings',    resource: 'platform', action: 'manage' },
  { slug: 'platform.analytics',          name: 'Platform Analytics', resource: 'platform', action: 'read' },
  { slug: 'kanban.read',   name: 'View Kanban',   resource: 'kanban', action: 'read' },
  { slug: 'kanban.create', name: 'Create Kanban', resource: 'kanban', action: 'create' },
  { slug: 'kanban.update', name: 'Update Kanban', resource: 'kanban', action: 'update' },
  { slug: 'kanban.delete', name: 'Delete Kanban', resource: 'kanban', action: 'delete' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function seedPermissionsAndRoles() {
  console.log('\n🔐 Seeding permissions...')
  for (const perm of PERMISSIONS) {
    await prisma.permissions.upsert({
      where: { slug: perm.slug },
      create: { slug: perm.slug, name: perm.name, resource: perm.resource, action: perm.action },
      update: { name: perm.name, resource: perm.resource, action: perm.action },
    })
  }
  console.log(`  ✅ ${PERMISSIONS.length} permissions upserted`)

  console.log('\n🎭 Seeding system roles...')
  const systemRoles = [
    { slug: 'platform_admin',  name: 'Platform Admin',   description: 'Platform-level administrator with access to all companies' },
    { slug: 'admin',           name: 'Admin',            description: 'Full system access - can manage everything' },
    { slug: 'company-admin',   name: 'Admin da Empresa', description: 'Administrador da empresa com acesso completo exceto plataforma' },
    { slug: 'agent_manager',   name: 'Agent Manager',    description: 'Can manage agents and knowledge base' },
    { slug: 'viewer',          name: 'Viewer',           description: 'Read-only access' },
  ]
  for (const r of systemRoles) {
    const existing = await prisma.roles.findFirst({ where: { slug: r.slug, is_system: true } })
    if (existing) {
      await prisma.roles.update({ where: { id: existing.id }, data: { name: r.name, description: r.description } })
    } else {
      await prisma.roles.create({ data: { slug: r.slug, name: r.name, description: r.description, is_system: true, company_id: null } })
    }
  }
  console.log(`  ✅ ${systemRoles.length} system roles upserted`)

  // Assign permissions to roles
  console.log('\n🔗 Assigning permissions to roles...')
  const allPerms = await prisma.permissions.findMany()
  const roles = await prisma.roles.findMany({ where: { is_system: true } })

  const rolePermMap: Record<string, (p: typeof allPerms[0]) => boolean> = {
    platform_admin: () => true,
    admin:          () => true,
    'company-admin': (p) => p.resource !== 'platform',
    agent_manager:  (p) => p.resource === 'agents' || p.resource === 'knowledge' || p.resource === 'kanban' || (p.resource !== 'users' && p.action === 'read'),
    viewer:         (p) => p.action === 'read' && p.resource !== 'users',
  }

  for (const role of roles) {
    const filter = rolePermMap[role.slug]
    if (!filter) continue
    const permsForRole = allPerms.filter(filter)
    for (const perm of permsForRole) {
      await prisma.role_permissions.upsert({
        where: { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
        create: { role_id: role.id, permission_id: perm.id },
        update: {},
      })
    }
    console.log(`  ✅ ${role.name}: ${permsForRole.length} permissions assigned`)
  }
}

async function getRole(slug: string) {
  const role = await prisma.roles.findFirst({ where: { slug, is_system: true } })
  if (!role) throw new Error(`Role '${slug}' not found.`)
  return role
}

async function upsertUser(companyId: string, email: string, name: string, password: string) {
  const password_hash = await hashAppPassword(password)
  return prisma.users.upsert({
    where: { company_id_email: { company_id: companyId, email } },
    create: { company_id: companyId, email, name, password_hash, status: 'active' },
    update: { name, password_hash, status: 'active' },
  })
}

async function assignRole(userId: string, roleId: string) {
  await prisma.user_roles.upsert({
    where: { user_id_role_id: { user_id: userId, role_id: roleId } },
    create: { user_id: userId, role_id: roleId },
    update: {},
  })
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seed() {
  try {
    console.log('🌱 Starting seed...\n')

    // ── Permissions & Roles ────────────────────────────────────────────────────
    await seedPermissionsAndRoles()

    // ── Platform client & company ──────────────────────────────────────────────
    console.log('\n🔧 Creating Platform tenant...')
    const platformClient = await prisma.clients.upsert({
      where: { slug: 'platform' },
      create: { name: 'Platform', slug: 'platform', api_key: `platform_${crypto.randomUUID()}` },
      update: {},
    })

    const platformCompany = await prisma.companies.upsert({
      where: { client_id_slug: { client_id: platformClient.id, slug: 'platform-admin' } },
      create: { client_id: platformClient.id, name: 'Platform Administration', slug: 'platform-admin', status: 'active' },
      update: {},
    })
    console.log(`  ✅ Client: ${platformClient.name} | Company: ${platformCompany.name}`)

    // ── Platform Admin user ────────────────────────────────────────────────────
    console.log('\n👑 Creating Platform Admin user...')
    const platformAdminRole = await getRole(PLATFORM_USER.roleSlug)
    const platformUser = await upsertUser(platformCompany.id, PLATFORM_USER.email, PLATFORM_USER.name, PLATFORM_USER.password)
    await assignRole(platformUser.id, platformAdminRole.id)
    console.log(`  ✅ ${PLATFORM_USER.name} (${PLATFORM_USER.email}) — Platform Admin`)

    // ── ACME client & company ──────────────────────────────────────────────────
    console.log('\n🏢 Creating ACME tenant...')
    const acmeClient = await prisma.clients.upsert({
      where: { slug: 'acme-corp' },
      create: { name: 'ACME Corporation', slug: 'acme-corp', api_key: `test_${crypto.randomUUID()}` },
      update: {},
    })

    const acmeCompany = await prisma.companies.upsert({
      where: { client_id_slug: { client_id: acmeClient.id, slug: 'acme-main' } },
      create: { client_id: acmeClient.id, name: 'ACME Corporation', slug: 'acme-main', status: 'active' },
      update: {},
    })
    console.log(`  ✅ Client: ${acmeClient.name} | Company: ${acmeCompany.name}`)

    // ── ACME users ─────────────────────────────────────────────────────────────
    console.log('\n👥 Creating ACME users...')
    const summary: { email: string; password: string; role: string }[] = []

    for (const userData of COMPANY_USERS) {
      const role = await getRole(userData.roleSlug)
      const user = await upsertUser(acmeCompany.id, userData.email, userData.name, userData.password)
      await assignRole(user.id, role.id)
      summary.push({ email: userData.email, password: userData.password, role: role.name })
      console.log(`  ✅ ${userData.name} (${userData.email}) — ${role.name}`)
    }

    // ── Summary ────────────────────────────────────────────────────────────────
    console.log('\n' + '═'.repeat(70))
    console.log('🎉  SEED CONCLUÍDO')
    console.log('═'.repeat(70))

    const allUsers = [
      { email: PLATFORM_USER.email, password: PLATFORM_USER.password, role: 'Platform Admin' },
      ...summary,
    ]

    const colW = [32, 18, 18]
    const header = ['Email'.padEnd(colW[0]), 'Senha'.padEnd(colW[1]), 'Perfil'.padEnd(colW[2])].join(' │ ')
    console.log('\n' + header)
    console.log('─'.repeat(header.length))

    for (const u of allUsers) {
      console.log([u.email.padEnd(colW[0]), u.password.padEnd(colW[1]), u.role.padEnd(colW[2])].join(' │ '))
    }

    console.log('\n🚀 Login: http://localhost:3000/login')
    console.log('🔑 Platform: http://localhost:3000/platform\n')
  } catch (error) {
    console.error('\n❌ Seed failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seed()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
