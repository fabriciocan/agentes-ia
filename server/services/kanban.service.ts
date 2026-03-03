import { prisma } from '../lib/prisma'
import { createLogger } from '../utils/logger'

const logger = createLogger('kanban-service')

// ============================================================================
// Types
// ============================================================================

export interface KanbanBoardCreateData {
  client_id: string
  company_id: string
  agent_config_id: string
  name?: string
  description?: string
}

export interface KanbanBoardUpdateData {
  name?: string
  description?: string | null
  entry_column_id?: string | null
}

export interface KanbanColumnCreateData {
  name: string
  color?: string
}

export interface KanbanCardCreateData {
  column_id: string
  title: string
  client_name?: string
  client_phone?: string
  client_email?: string
  notes?: string
  tags?: string[]
  end_user_id?: string
  conversation_id?: string
  source?: string
}

export interface KanbanCardUpdateData {
  title?: string
  client_name?: string | null
  client_phone?: string | null
  client_email?: string | null
  notes?: string | null
  tags?: string[]
}

export interface KanbanCardsFilter {
  column_id?: string
  date_from?: Date
  date_to?: Date
  search?: string
  source?: string
  page?: number
  limit?: number
}

// ============================================================================
// Board
// ============================================================================

export async function getKanbanByAgent(agentId: string, companyId: string) {
  const board = await prisma.kanban_boards.findFirst({
    where: { agent_config_id: agentId, company_id: companyId },
    include: {
      columns: {
        orderBy: { position: 'asc' },
        include: {
          cards: {
            orderBy: { position: 'asc' },
            include: {
              end_user: { select: { id: true, name: true, phone: true, email: true, external_id: true } },
              conversation: { select: { id: true, status: true, created_at: true } }
            }
          }
        }
      }
    }
  })
  return board
}

export async function getBoardById(boardId: string, companyId: string) {
  return prisma.kanban_boards.findFirst({
    where: { id: boardId, company_id: companyId }
  })
}

export async function createBoard(data: KanbanBoardCreateData) {
  const existing = await prisma.kanban_boards.findFirst({
    where: { agent_config_id: data.agent_config_id }
  })
  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'Este agente já possui um Kanban' })
  }

  const board = await prisma.kanban_boards.create({
    data: {
      client_id: data.client_id,
      company_id: data.company_id,
      agent_config_id: data.agent_config_id,
      name: data.name ?? 'Kanban',
      description: data.description
    }
  })

  logger.info({ boardId: board.id, agentId: data.agent_config_id }, 'Kanban board created')
  return board
}

export async function updateBoard(boardId: string, companyId: string, data: KanbanBoardUpdateData) {
  // Validate entry_column_id belongs to this board
  if (data.entry_column_id) {
    const col = await prisma.kanban_columns.findFirst({
      where: { id: data.entry_column_id, board_id: boardId }
    })
    if (!col) {
      throw createError({ statusCode: 400, statusMessage: 'Coluna de entrada não pertence a este board' })
    }
  }

  return prisma.kanban_boards.update({
    where: { id: boardId },
    data: { ...data, updated_at: new Date() }
  })
}

export async function deleteBoard(boardId: string, companyId: string) {
  await prisma.kanban_boards.deleteMany({
    where: { id: boardId, company_id: companyId }
  })
}

// ============================================================================
// Columns
// ============================================================================

export async function createColumn(boardId: string, companyId: string, data: KanbanColumnCreateData) {
  const board = await getBoardById(boardId, companyId)
  if (!board) throw createError({ statusCode: 404, statusMessage: 'Board não encontrado' })

  const maxPosition = await prisma.kanban_columns.aggregate({
    where: { board_id: boardId },
    _max: { position: true }
  })

  const position = (maxPosition._max.position ?? -1) + 1

  return prisma.kanban_columns.create({
    data: {
      board_id: boardId,
      name: data.name,
      color: data.color ?? '#6366f1',
      position
    }
  })
}

export async function updateColumn(boardId: string, columnId: string, companyId: string, data: { name?: string; color?: string }) {
  const col = await prisma.kanban_columns.findFirst({
    where: { id: columnId, board_id: boardId, board: { company_id: companyId } }
  })
  if (!col) throw createError({ statusCode: 404, statusMessage: 'Coluna não encontrada' })

  return prisma.kanban_columns.update({
    where: { id: columnId },
    data: { ...data, updated_at: new Date() }
  })
}

export async function deleteColumn(boardId: string, columnId: string, companyId: string) {
  const col = await prisma.kanban_columns.findFirst({
    where: { id: columnId, board_id: boardId, board: { company_id: companyId } }
  })
  if (!col) throw createError({ statusCode: 404, statusMessage: 'Coluna não encontrada' })

  // If this column was the entry point, clear it from the board
  await prisma.kanban_boards.updateMany({
    where: { id: boardId, entry_column_id: columnId },
    data: { entry_column_id: null, updated_at: new Date() }
  })

  await prisma.kanban_columns.delete({ where: { id: columnId } })
}

export async function reorderColumns(boardId: string, companyId: string, columnIds: string[]) {
  const board = await getBoardById(boardId, companyId)
  if (!board) throw createError({ statusCode: 404, statusMessage: 'Board não encontrado' })

  await prisma.$transaction(
    columnIds.map((id, index) =>
      prisma.kanban_columns.updateMany({
        where: { id, board_id: boardId },
        data: { position: index }
      })
    )
  )
}

// ============================================================================
// Cards
// ============================================================================

export async function getCards(boardId: string, companyId: string, filters: KanbanCardsFilter) {
  const board = await getBoardById(boardId, companyId)
  if (!board) throw createError({ statusCode: 404, statusMessage: 'Board não encontrado' })

  const page = filters.page ?? 1
  const limit = filters.limit ?? 50
  const skip = (page - 1) * limit

  const where: Record<string, unknown> = { board_id: boardId }
  if (filters.column_id) where.column_id = filters.column_id
  if (filters.source) where.source = filters.source
  if (filters.date_from || filters.date_to) {
    where.created_at = {}
    if (filters.date_from) (where.created_at as Record<string, unknown>).gte = filters.date_from
    if (filters.date_to) (where.created_at as Record<string, unknown>).lte = filters.date_to
  }
  if (filters.search) {
    where.OR = [
      { title: { contains: filters.search, mode: 'insensitive' } },
      { client_name: { contains: filters.search, mode: 'insensitive' } },
      { client_phone: { contains: filters.search, mode: 'insensitive' } },
      { client_email: { contains: filters.search, mode: 'insensitive' } }
    ]
  }

  const [cards, total] = await Promise.all([
    prisma.kanban_cards.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ column_id: 'asc' }, { position: 'asc' }],
      include: {
        end_user: { select: { id: true, name: true, phone: true, email: true, external_id: true } },
        conversation: { select: { id: true, status: true, created_at: true } }
      }
    }),
    prisma.kanban_cards.count({ where })
  ])

  return { cards, total, page, limit, pages: Math.ceil(total / limit) }
}

export async function createCard(boardId: string, companyId: string, data: KanbanCardCreateData, userId?: string) {
  const board = await getBoardById(boardId, companyId)
  if (!board) throw createError({ statusCode: 404, statusMessage: 'Board não encontrado' })

  const col = await prisma.kanban_columns.findFirst({
    where: { id: data.column_id, board_id: boardId }
  })
  if (!col) throw createError({ statusCode: 400, statusMessage: 'Coluna não pertence a este board' })

  const maxPos = await prisma.kanban_cards.aggregate({
    where: { column_id: data.column_id },
    _max: { position: true }
  })

  const card = await prisma.kanban_cards.create({
    data: {
      board_id: boardId,
      column_id: data.column_id,
      title: data.title,
      client_name: data.client_name,
      client_phone: data.client_phone,
      client_email: data.client_email || null,
      notes: data.notes,
      tags: data.tags ?? [],
      end_user_id: data.end_user_id,
      conversation_id: data.conversation_id,
      source: data.source ?? 'manual',
      position: (maxPos._max.position ?? -1) + 1
    },
    include: {
      end_user: { select: { id: true, name: true, phone: true, email: true, external_id: true } },
      conversation: { select: { id: true, status: true, created_at: true } }
    }
  })

  // Record initial move (entry)
  await prisma.kanban_card_moves.create({
    data: {
      card_id: card.id,
      from_column_id: null,
      to_column_id: data.column_id,
      moved_by: userId ?? null
    }
  })

  logger.info({ cardId: card.id, boardId, columnId: data.column_id }, 'Kanban card created')
  return card
}

export async function updateCard(boardId: string, cardId: string, companyId: string, data: KanbanCardUpdateData) {
  const card = await prisma.kanban_cards.findFirst({
    where: { id: cardId, board_id: boardId, board: { company_id: companyId } }
  })
  if (!card) throw createError({ statusCode: 404, statusMessage: 'Card não encontrado' })

  return prisma.kanban_cards.update({
    where: { id: cardId },
    data: { ...data, updated_at: new Date() },
    include: {
      end_user: { select: { id: true, name: true, phone: true, email: true, external_id: true } },
      conversation: { select: { id: true, status: true, created_at: true } }
    }
  })
}

export async function moveCard(boardId: string, cardId: string, companyId: string, toColumnId: string, userId?: string) {
  const card = await prisma.kanban_cards.findFirst({
    where: { id: cardId, board_id: boardId, board: { company_id: companyId } }
  })
  if (!card) throw createError({ statusCode: 404, statusMessage: 'Card não encontrado' })

  const col = await prisma.kanban_columns.findFirst({
    where: { id: toColumnId, board_id: boardId }
  })
  if (!col) throw createError({ statusCode: 400, statusMessage: 'Coluna de destino não pertence a este board' })

  const maxPos = await prisma.kanban_cards.aggregate({
    where: { column_id: toColumnId },
    _max: { position: true }
  })

  const [updated] = await prisma.$transaction([
    prisma.kanban_cards.update({
      where: { id: cardId },
      data: { column_id: toColumnId, position: (maxPos._max.position ?? -1) + 1, updated_at: new Date() }
    }),
    prisma.kanban_card_moves.create({
      data: {
        card_id: cardId,
        from_column_id: card.column_id,
        to_column_id: toColumnId,
        moved_by: userId ?? null
      }
    })
  ])

  return updated
}

export async function deleteCard(boardId: string, cardId: string, companyId: string) {
  const card = await prisma.kanban_cards.findFirst({
    where: { id: cardId, board_id: boardId, board: { company_id: companyId } }
  })
  if (!card) throw createError({ statusCode: 404, statusMessage: 'Card não encontrado' })

  await prisma.kanban_cards.delete({ where: { id: cardId } })
}

// ============================================================================
// Webhook Entry (n8n)
// ============================================================================

export interface WebhookEntryData {
  agent_id: string
  client_id: string
  client_name: string
  client_phone?: string
  client_email?: string
  conversation_id?: string
  notes?: string
  tags?: string[]
}

export async function handleWebhookEntry(data: WebhookEntryData) {
  // Find board by agent
  const board = await prisma.kanban_boards.findFirst({
    where: { agent_config_id: data.agent_id }
  })
  if (!board) {
    throw createError({ statusCode: 404, statusMessage: 'Kanban não encontrado para este agente' })
  }
  if (!board.entry_column_id) {
    throw createError({ statusCode: 400, statusMessage: 'Coluna de entrada não configurada neste Kanban' })
  }

  // Upsert end_user if phone provided
  let endUserId: string | undefined
  if (data.client_phone) {
    const externalId = `phone:${data.client_phone}`
    const endUser = await prisma.end_users.upsert({
      where: { client_id_external_id: { client_id: data.client_id, external_id: externalId } },
      create: {
        client_id: data.client_id,
        external_id: externalId,
        name: data.client_name,
        phone: data.client_phone,
        email: data.client_email || null,
        channel: 'webhook'
      },
      update: {
        name: data.client_name,
        email: data.client_email || null,
        updated_at: new Date()
      }
    })
    endUserId = endUser.id
  }

  const card = await createCard(board.id, board.company_id, {
    column_id: board.entry_column_id,
    title: data.client_name,
    client_name: data.client_name,
    client_phone: data.client_phone,
    client_email: data.client_email,
    notes: data.notes,
    tags: data.tags ?? [],
    end_user_id: endUserId,
    conversation_id: data.conversation_id,
    source: 'n8n'
  })

  logger.info({ cardId: card.id, agentId: data.agent_id }, 'Card created via webhook')
  return card
}
