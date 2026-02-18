/**
 * Reset database — drops schema and recreates via Prisma db push
 * Usage: npm run db:reset
 */

import 'dotenv/config'
import { PrismaClient } from '../app/generated/prisma/client.js'
import { PrismaPg } from '@prisma/adapter-pg'

const connectionString = process.env.DATABASE_URL || process.env.NUXT_DATABASE_URL || ''
const adapter = new PrismaPg({ connectionString })
const prisma = new PrismaClient({ adapter })

async function resetDatabase() {
  try {
    console.log('⚠️  RESETTING DATABASE — all data will be lost!\n')

    console.log('🗑️  Dropping public schema...')
    await prisma.$executeRawUnsafe('DROP SCHEMA public CASCADE')
    await prisma.$executeRawUnsafe('CREATE SCHEMA public')
    await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO postgres')
    await prisma.$executeRawUnsafe('GRANT ALL ON SCHEMA public TO public')
    console.log('✅ Schema cleared\n')

    console.log('📦 Run the following to recreate all tables:')
    console.log('   npx prisma db push\n')
    console.log('🎉 Database reset complete! Run `npm run db:seed` to populate with test data.')
  } catch (error) {
    console.error('\n❌ Reset failed:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

resetDatabase()
  .then(() => process.exit(0))
  .catch(() => process.exit(1))
