export interface Client {
  id: string
  name: string
  slug: string
  api_key: string
  created_at: Date
  updated_at: Date
}

// ============================================================================
// Multi-Company & Team Management
// ============================================================================

export interface Company {
  id: string
  client_id: string
  name: string
  slug: string
  logo_url: string | null
  settings: Record<string, unknown>
  status: 'active' | 'suspended' | 'deleted'
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

// Legacy admin users (being deprecated)
export interface AdminUser {
  id: string
  email: string
  password_hash: string
  client_id: string
  name: string
  created_at: Date
  updated_at: Date
  migrated_to_users?: boolean
}

// New team user system (replaces AdminUser)
export interface TeamUser {
  id: string
  company_id: string
  email: string
  name: string | null
  password_hash: string
  avatar_url: string | null
  invitation_token: string | null
  invitation_sent_at: Date | null
  invitation_accepted_at: Date | null
  invited_by_user_id: string | null
  status: 'active' | 'invited' | 'suspended' | 'deleted'
  preferences: Record<string, unknown>
  last_login_at: Date | null
  last_active_at: Date | null
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

// ============================================================================
// RBAC System
// ============================================================================

export interface Permission {
  id: string
  slug: string
  name: string
  description: string | null
  resource: string
  action: string
  created_at: Date
}

export interface Role {
  id: string
  company_id: string | null
  name: string
  slug: string
  description: string | null
  is_system: boolean
  deleted_at: Date | null
  created_at: Date
  updated_at: Date
}

export interface RolePermission {
  id: string
  role_id: string
  permission_id: string
  created_at: Date
}

export interface UserRole {
  id: string
  user_id: string
  role_id: string
  assigned_by_user_id: string | null
  assigned_at: Date
  created_at: Date
}

// ============================================================================
// Subscriptions & Billing
// ============================================================================

export interface SubscriptionPlan {
  id: string
  slug: string
  name: string
  description: string | null
  price_monthly: number
  price_yearly: number
  limits: {
    max_agents?: number
    max_users?: number
    max_conversations_per_month?: number
    max_knowledge_documents?: number
    max_api_calls_per_month?: number
  }
  features: string[]
  is_active: boolean
  is_visible: boolean
  created_at: Date
  updated_at: Date
}

export interface Subscription {
  id: string
  company_id: string
  plan_id: string
  status: 'active' | 'trial' | 'cancelled' | 'expired' | 'suspended'
  billing_period: 'monthly' | 'yearly'
  trial_ends_at: Date | null
  trial_used: boolean
  current_period_start: Date
  current_period_end: Date | null
  cancelled_at: Date | null
  expires_at: Date | null
  last_payment_at: Date | null
  next_payment_at: Date | null
  usage_current_period: {
    conversations?: number
    api_calls?: number
    knowledge_documents?: number
    reset_at?: string
  }
  metadata: Record<string, unknown>
  created_at: Date
  updated_at: Date
}

// ============================================================================
// Analytics & Audit
// ============================================================================

export interface UsageLog {
  id: string
  company_id: string
  user_id: string | null
  event_type: string
  resource_type: string | null
  resource_id: string | null
  quantity: number
  duration_ms: number | null
  tokens_used: number | null
  metadata: Record<string, unknown>
  created_at: Date
}

export interface AuditLog {
  id: string
  company_id: string
  user_id: string | null
  action: string
  resource_type: string
  resource_id: string | null
  changes: {
    old?: Record<string, unknown>
    new?: Record<string, unknown>
  } | null
  ip_address: string | null
  user_agent: string | null
  request_id: string | null
  status: 'success' | 'failure' | 'error'
  error_message: string | null
  metadata: Record<string, unknown>
  created_at: Date
}

export interface AgentConfig {
  id: string
  client_id: string
  company_id: string | null // Added for multi-company support
  name: string
  system_prompt: string
  personality: string
  tone: string
  language: string
  model: string
  temperature: number
  max_tokens: number
  is_active: boolean
  whatsapp_instance_name: string | null
  whatsapp_instance_status: string
  whatsapp_number: string | null
  widget_config: WidgetConfig
  created_at: Date
  updated_at: Date
}

export interface WidgetConfig {
  webhookUrl?: string
  primaryColor?: string
  botName?: string
  welcomeMessage?: string
  inputPlaceholder?: string
  headerOnlineText?: string
  consentEnabled?: boolean
  consentTitle?: string
  consentDescription?: string
  consentText?: string
  consentCheckboxLabel?: string
  consentButtonText?: string
}

export interface User {
  id: string
  client_id: string
  external_id: string
  name: string | null
  phone: string | null
  email: string | null
  channel: string
  created_at: Date
  updated_at: Date
}

export type ConversationStatus = 'active' | 'closed' | 'archived'
export type MessageRole = 'user' | 'assistant' | 'system'

export interface Conversation {
  id: string
  client_id: string
  company_id: string | null // Added for multi-company support
  agent_config_id: string
  user_id: string
  status: ConversationStatus
  created_at: Date
  updated_at: Date
}

export interface Message {
  id: string
  conversation_id: string
  role: MessageRole
  content: string
  metadata: Record<string, unknown>
  created_at: Date
}

export interface KnowledgeBase {
  id: string
  agent_config_id: string
  title: string
  content: string
  content_type: string
  metadata: Record<string, unknown>
  file_size: number | null
  file_type: string | null
  chunk_index: number | null
  created_at: Date
  updated_at: Date
}
