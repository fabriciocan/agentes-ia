import { z } from 'zod'

export const agentMessageSchema = z.object({
  agent_config_id: z.string().uuid(),
  user_external_id: z.string().min(1),
  message: z.string().min(1).max(10000),
  channel: z.string().optional().default('web'),
  conversation_id: z.string().uuid().optional(),
  user_name: z.string().optional()
})

export const agentConfigUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  system_prompt: z.string().max(10000).optional(),
  personality: z.string().max(100).optional(),
  tone: z.string().max(100).optional(),
  language: z.string().max(10).optional(),
  model: z.string().max(100).optional(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().min(1).max(4096).optional(),
  is_active: z.boolean().optional(),
  widget_config: z.object({
    primaryColor: z.string().max(20).optional(),
    botName: z.string().max(255).optional(),
    welcomeMessage: z.string().max(1000).optional(),
    inputPlaceholder: z.string().max(255).optional(),
    headerOnlineText: z.string().max(100).optional(),
    consentEnabled: z.boolean().optional(),
    consentTitle: z.string().max(500).optional(),
    consentDescription: z.string().max(1000).optional(),
    consentText: z.string().max(5000).optional(),
    consentCheckboxLabel: z.string().max(500).optional(),
    consentButtonText: z.string().max(255).optional()
  }).optional()
})

export const conversationListQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  channel: z.string().optional(),
  user_id: z.string().uuid().optional(),
  agent_config_id: z.string().uuid().optional()
})

export const agentConfigCreateSchema = z.object({
  name: z.string().min(1).max(255),
  system_prompt: z.string().max(10000).optional().default(''),
  personality: z.string().max(100).optional().default('professional'),
  tone: z.string().max(100).optional().default('friendly'),
  language: z.string().max(10).optional().default('pt-BR'),
  model: z.string().max(100).optional().default('claude-sonnet-4-5-20250929'),
  temperature: z.number().min(0).max(2).optional().default(0.7),
  max_tokens: z.number().int().min(1).max(4096).optional().default(1024)
})

export const knowledgeBaseCreateSchema = z.object({
  title: z.string().min(1).max(500),
  content: z.string().min(1),
  content_type: z.enum(['text', 'faq', 'document'])
})

export const knowledgeBaseUpdateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  content: z.string().min(1).optional(),
  content_type: z.enum(['text', 'faq', 'document']).optional()
})

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
})

// ============================================================================
// Multi-Company & RBAC Schemas
// ============================================================================

// Company schemas
export const companyUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/).optional(),
  logo_url: z.string().url().nullable().optional(),
  settings: z.record(z.string(), z.unknown()).optional()
})

// User management schemas
export const userInviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).max(255).optional(),
  role_ids: z.array(z.string().uuid()).min(1, 'At least one role is required')
})

export const userUpdateSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: z.string().email().optional(),
  avatar_url: z.string().url().nullable().optional(),
  status: z.enum(['active', 'suspended']).optional(),
  preferences: z.record(z.string(), z.unknown()).optional()
})

export const userRolesUpdateSchema = z.object({
  role_ids: z.array(z.string().uuid())
})

export const acceptInvitationSchema = z.object({
  invitation_token: z.string().min(32),
  password: z.string().min(8).max(100),
  name: z.string().min(1).max(255).optional()
})

// Role management schemas
export const roleCreateSchema = z.object({
  name: z.string().min(1).max(100),
  slug: z.string().min(1).max(100).regex(/^[a-z_-]+$/),
  description: z.string().max(500).optional(),
  permission_ids: z.array(z.string().uuid())
})

export const roleUpdateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  permission_ids: z.array(z.string().uuid()).optional()
})

// Subscription schemas
export const subscriptionUpgradeSchema = z.object({
  plan_id: z.string().uuid(),
  billing_period: z.enum(['monthly', 'yearly']).default('monthly')
})

// Analytics schemas
export const analyticsQuerySchema = z.object({
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  granularity: z.enum(['day', 'week', 'month']).optional().default('day')
})

// Audit logs schemas
export const auditLogsQuerySchema = z.object({
  user_id: z.string().uuid().optional(),
  action: z.string().optional(),
  resource_type: z.string().optional(),
  resource_id: z.string().uuid().optional(),
  start_date: z.coerce.date().optional(),
  end_date: z.coerce.date().optional(),
  status: z.enum(['success', 'failure', 'error']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50)
})
