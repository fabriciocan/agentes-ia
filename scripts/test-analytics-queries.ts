import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testQueries() {
  console.log('Testing analytics queries...\n')

  try {
    console.log('1. Testing stats query...')
    const [totalCompanies, totalUsers, totalAgents, totalConversations, totalMessages] =
      await Promise.all([
        prisma.companies.count({ where: { deleted_at: null } }),
        prisma.users.count({ where: { deleted_at: null } }),
        prisma.agent_configs.count(),
        prisma.conversations.count(),
        prisma.messages.count(),
      ])
    console.log('✓ Stats query successful:', {
      total_companies: totalCompanies,
      total_users: totalUsers,
      total_agents: totalAgents,
      total_conversations: totalConversations,
      total_messages: totalMessages,
    })
  } catch (error: any) {
    console.error('✗ Stats query failed:', error.message)
    console.error('Error details:', error)
  }

  try {
    console.log('\n2. Testing companies by status query...')
    const statusResult = await prisma.$queryRaw<{ status: string; count: bigint }[]>`
      SELECT status, COUNT(*) as count
      FROM companies
      WHERE deleted_at IS NULL
      GROUP BY status
    `
    console.log('✓ Status query successful:', statusResult.map(r => ({ ...r, count: r.count.toString() })))
  } catch (error: any) {
    console.error('✗ Status query failed:', error.message)
    console.error('Error details:', error)
  }

  try {
    console.log('\n3. Testing recent activity query...')
    const activityResult = await prisma.$queryRaw<{ company_name: string; conversations_today: bigint; messages_today: bigint }[]>`
      SELECT
        co.name as company_name,
        COUNT(DISTINCT conv.id) as conversations_today,
        COUNT(DISTINCT m.id) as messages_today
      FROM companies co
      LEFT JOIN conversations conv ON conv.company_id = co.id
        AND conv.created_at >= CURRENT_DATE
      LEFT JOIN messages m ON m.conversation_id = conv.id
        AND m.created_at >= CURRENT_DATE
      WHERE co.deleted_at IS NULL
      GROUP BY co.id, co.name
      ORDER BY messages_today DESC
      LIMIT 10
    `
    console.log('✓ Activity query successful:', activityResult.map(r => ({
      ...r,
      conversations_today: r.conversations_today.toString(),
      messages_today: r.messages_today.toString(),
    })))
  } catch (error: any) {
    console.error('✗ Activity query failed:', error.message)
    console.error('Error details:', error)
  }

  await prisma.$disconnect()
  process.exit(0)
}

testQueries()
