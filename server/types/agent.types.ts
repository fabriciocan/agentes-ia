export interface AgentMessageRequest {
  agent_config_id: string
  user_external_id: string
  message: string
  channel?: string
  conversation_id?: string
  user_name?: string
}

export interface AgentMessageResponse {
  conversation_id: string
  message: {
    id: string
    role: string
    content: string
    created_at: string
  }
}
