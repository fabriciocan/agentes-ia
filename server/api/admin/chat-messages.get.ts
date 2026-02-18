import { prisma } from '../../lib/prisma'

interface ChatMessage {
  id: string
  created_at: string
  phone: string
  nomewpp: string
  bot_message: string
  user_message: string
  message_type: string | null
  active: boolean
  clientid: string | null
  agentid: string | null
}

export default defineEventHandler(async (event) => {
  const adminUser = event.context.adminUser as unknown as { clientId: string }
  if (!adminUser?.clientId) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const clientId = adminUser.clientId
  const queryParams = getQuery(event)
  const phone = queryParams.phone as string | undefined

  // If phone is provided, return messages for that conversation
  if (phone) {
    const rows = await prisma.chat_messages.findMany({
      where: {
        phone,
        OR: [
          { clientid: clientId },
          { clientid: null }
        ]
      },
      orderBy: { created_at: 'asc' }
    })
    // Convert BigInt id to string for JSON serialization
    const data = rows.map(row => ({
      ...row,
      id: row.id.toString()
    }))
    return { data }
  }

  // Otherwise, return conversations grouped by phone (distinct sessions)
  // with the last message and count - complex query requires $queryRaw
  const rows = await prisma.$queryRaw<Array<{
    phone: string
    nomewpp: string
    message_count: number
    last_user_message: string
    last_bot_message: string
    last_message_at: string
    first_message_at: string
  }>>`
    SELECT
      phone,
      MAX(nomewpp) as nomewpp,
      COUNT(*)::int as message_count,
      (SELECT user_message FROM chat_messages cm2
       WHERE cm2.phone = cm.phone AND (cm2.clientid = ${clientId}::uuid OR cm2.clientid IS NULL)
       ORDER BY cm2.created_at DESC LIMIT 1) as last_user_message,
      (SELECT bot_message FROM chat_messages cm2
       WHERE cm2.phone = cm.phone AND (cm2.clientid = ${clientId}::uuid OR cm2.clientid IS NULL)
       ORDER BY cm2.created_at DESC LIMIT 1) as last_bot_message,
      MAX(created_at) as last_message_at,
      MIN(created_at) as first_message_at
    FROM chat_messages cm
    WHERE clientid = ${clientId}::uuid OR clientid IS NULL
    GROUP BY phone
    ORDER BY MAX(created_at) DESC
  `

  return { data: rows }
})
