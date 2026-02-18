import type { Conversation, Message } from './database.types'

export interface ConversationListQuery {
  page?: number
  limit?: number
  status?: string
  channel?: string
  user_id?: string
  agent_config_id?: string
}

export interface ConversationWithMessages extends Conversation {
  messages: Message[]
  user_name?: string
  agent_name?: string
  message_count: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  total_pages: number
}
