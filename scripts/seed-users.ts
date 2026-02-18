/**
 * Seed script for creating test users with different roles
 * Usage: npx tsx scripts/seed-users.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashAppPassword } from '../server/utils/password'

const connectionString = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || ''
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function seedUsers() {
  try {
    console.log('🌱 Starting user seeding...\n')

    // Step 1: Create test client
    console.log('📦 Creating test client...')
    const testClient = await prisma.clients.upsert({
      where: { slug: 'acme-corp' },
      create: { name: 'ACME Corporation', slug: 'acme-corp', api_key: `test_api_key_${crypto.randomUUID()}` },
      update: {},
    })
    console.log(`✅ Client: ${testClient.name} (ID: ${testClient.id})`)

    // Step 2: Create company
    console.log('\n🏢 Creating company...')
    const company = await prisma.companies.upsert({
      where: { client_id_slug: { client_id: testClient.id, slug: 'acme-main' } },
      create: { client_id: testClient.id, name: 'ACME Corporation', slug: 'acme-main', status: 'active' },
      update: {},
    })
    console.log(`✅ Company: ${company.name} (ID: ${company.id})`)

    // Step 3: Get roles
    console.log('\n🎭 Fetching roles...')
    const roles = await prisma.roles.findMany({ where: { is_system: true } })
    const adminRole = roles.find(r => r.slug === 'admin')
    const viewerRole = roles.find(r => r.slug === 'viewer')
    const agentManagerRole = roles.find(r => r.slug === 'agent_manager')

    if (!adminRole || !viewerRole || !agentManagerRole) {
      throw new Error('System roles not found. Please run migrations first.')
    }
    console.log(`✅ Found ${roles.length} system roles`)

    // Step 4: Create test users
    console.log('\n👥 Creating test users...')

    const testUsers = [
      { email: 'admin@acme.com',       name: 'Admin User',           password: 'admin123',   role: adminRole,        roleName: 'Admin' },
      { email: 'manager@acme.com',      name: 'Agent Manager',        password: 'manager123', role: agentManagerRole, roleName: 'Agent Manager' },
      { email: 'viewer@acme.com',       name: 'Viewer User',          password: 'viewer123',  role: viewerRole,       roleName: 'Viewer' },
      { email: 'john.admin@acme.com',   name: 'John Doe (Admin)',      password: 'john123',   role: adminRole,        roleName: 'Admin' },
      { email: 'jane.manager@acme.com', name: 'Jane Smith (Manager)', password: 'jane123',   role: agentManagerRole, roleName: 'Agent Manager' },
      { email: 'bob.viewer@acme.com',   name: 'Bob Johnson (Viewer)', password: 'bob123',    role: viewerRole,       roleName: 'Viewer' },
    ]

    const createdUsers: { email: string; name: string; roleName: string; password: string }[] = []

    for (const userData of testUsers) {
      const password_hash = await hashAppPassword(userData.password)

      const user = await prisma.users.upsert({
        where: { company_id_email: { company_id: company.id, email: userData.email } },
        create: { company_id: company.id, email: userData.email, name: userData.name, password_hash, status: 'active' },
        update: { name: userData.name, password_hash },
      })

      await prisma.user_roles.upsert({
        where: { user_id_role_id: { user_id: user.id, role_id: userData.role.id } },
        create: { user_id: user.id, role_id: userData.role.id },
        update: {},
      })

      createdUsers.push({ email: userData.email, name: userData.name, roleName: userData.roleName, password: userData.password })
      console.log(`  ✅ ${userData.name} (${userData.email}) - Role: ${userData.roleName}`)
    }

    // Step 5: Summary
    console.log('\n' + '='.repeat(80))
    console.log('🎉 SEED COMPLETED SUCCESSFULLY!')
    console.log('='.repeat(80))
    console.log(`\n📊 Client: ${testClient.name} | Company: ${company.name} | Users: ${createdUsers.length}`)

    console.log('\n👤 Test Users & Credentials:')
    console.log('─'.repeat(80))

    const groups: Record<string, typeof createdUsers> = {
      'Admin Users (Full Access)':                  createdUsers.filter(u => u.roleName === 'Admin'),
      'Agent Managers (Manage Agents & Knowledge)': createdUsers.filter(u => u.roleName === 'Agent Manager'),
      'Viewers (Read-Only)':                        createdUsers.filter(u => u.roleName === 'Viewer'),
    }

    for (const [groupName, users] of Object.entries(groups)) {
      console.log(`\n${groupName}:`)
      for (const user of users) {
        console.log(`   📧 ${user.email}`)
        console.log(`   🔑 Password: ${user.password}`)
        console.log(`   👤 Name: ${user.name}\n`)
      }
    }

    console.log('─'.repeat(80))
    console.log('\n🚀 Login at: http://localhost:3000/login\n')
  } catch (error) {
    console.error('❌ Error seeding users:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

seedUsers()
  .then(() => { console.log('✨ Seeding complete!'); process.exit(0) })
  .catch(() => process.exit(1))
