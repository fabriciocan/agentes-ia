import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || ''
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

const kanbanPerms = [
  { slug: 'kanban.read',   name: 'View Kanban',   resource: 'kanban', action: 'read' },
  { slug: 'kanban.create', name: 'Create Kanban', resource: 'kanban', action: 'create' },
  { slug: 'kanban.update', name: 'Update Kanban', resource: 'kanban', action: 'update' },
  { slug: 'kanban.delete', name: 'Delete Kanban', resource: 'kanban', action: 'delete' },
]

for (const p of kanbanPerms) {
  await prisma.permissions.upsert({
    where: { slug: p.slug },
    create: p,
    update: { name: p.name }
  })
  console.log('✅ Permission:', p.slug)
}

const roles = await prisma.roles.findMany({ where: { is_system: true } })
const perms = await prisma.permissions.findMany({ where: { resource: 'kanban' } })

for (const role of roles) {
  const permsForRole = role.slug === 'viewer'
    ? perms.filter(p => p.action === 'read')
    : perms

  for (const perm of permsForRole) {
    await prisma.role_permissions.upsert({
      where: { role_id_permission_id: { role_id: role.id, permission_id: perm.id } },
      create: { role_id: role.id, permission_id: perm.id },
      update: {}
    })
  }
  console.log(`✅ Role ${role.name}: ${permsForRole.length} kanban permissions`)
}

await prisma.$disconnect()
console.log('\n✅ Kanban permissions seeded!')
