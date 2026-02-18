/**
 * Script to create a Platform Admin user
 * Usage: npx tsx scripts/create-platform-admin.ts
 */

import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'
import { hashAppPassword } from '../server/utils/password'

const connectionString = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || ''
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function createPlatformAdmin() {
  try {
    console.log('🌱 Creating Platform Admin user...\n')

    const platformCompany = await prisma.companies.findFirst({
      where: { slug: 'platform-admin' },
    })
    if (!platformCompany) {
      throw new Error('Platform company not found. Run `npm run db:seed` first.')
    }

    const platformAdminRole = await prisma.roles.findFirst({
      where: { slug: 'platform_admin', is_system: true },
    })
    if (!platformAdminRole) {
      throw new Error('Platform Admin role not found. Run `npm run db:seed` first.')
    }

    const email = 'superadmin@platform.com'
    const password = 'superadmin123'
    const name = 'Platform Administrator'

    console.log('👤 Creating user:', email)

    const password_hash = await hashAppPassword(password)

    const user = await prisma.users.upsert({
      where: { company_id_email: { company_id: platformCompany.id, email } },
      create: { company_id: platformCompany.id, email, name, password_hash, status: 'active' },
      update: { name, password_hash, status: 'active' },
    })

    await prisma.user_roles.upsert({
      where: { user_id_role_id: { user_id: user.id, role_id: platformAdminRole.id } },
      create: { user_id: user.id, role_id: platformAdminRole.id },
      update: {},
    })

    console.log('✅ Platform Admin user created successfully!\n')
    console.log('═'.repeat(80))
    console.log('🎉 PLATFORM ADMIN CREATED!')
    console.log('═'.repeat(80))
    console.log('\n👤 Platform Administrator Details:')
    console.log('─'.repeat(80))
    console.log(`   📧 Email:    ${email}`)
    console.log(`   🔑 Password: ${password}`)
    console.log(`   👤 Name:     ${name}`)
    console.log(`   🆔 User ID:  ${user.id}`)
    console.log(`   🏢 Company:  Platform Administration`)
    console.log(`   🎭 Role:     Platform Admin`)
    console.log('─'.repeat(80))
    console.log('\n🌐 Login URL: http://localhost:3000/login\n')
  } catch (error) {
    console.error('❌ Error creating Platform Admin:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

createPlatformAdmin()
  .then(() => { console.log('✅ Platform Admin setup complete!'); process.exit(0) })
  .catch(() => process.exit(1))
