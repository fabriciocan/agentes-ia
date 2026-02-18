-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "admin_users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "client_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "migrated_to_users" BOOLEAN DEFAULT false,

    CONSTRAINT "admin_users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_configs" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL DEFAULT 'Default Agent',
    "system_prompt" TEXT NOT NULL DEFAULT '',
    "personality" VARCHAR(100) NOT NULL DEFAULT 'professional',
    "tone" VARCHAR(100) NOT NULL DEFAULT 'friendly',
    "language" VARCHAR(10) NOT NULL DEFAULT 'pt-BR',
    "model" VARCHAR(100) NOT NULL DEFAULT 'claude-sonnet-4-5-20250929',
    "temperature" DECIMAL(3,2) NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 1024,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "whatsapp_instance_name" VARCHAR(255),
    "whatsapp_instance_status" VARCHAR(50) NOT NULL DEFAULT 'disconnected',
    "whatsapp_number" VARCHAR(50),
    "widget_config" JSONB NOT NULL DEFAULT '{}',
    "company_id" UUID,

    CONSTRAINT "agent_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "user_id" UUID,
    "action" VARCHAR(100) NOT NULL,
    "resource_type" VARCHAR(50) NOT NULL,
    "resource_id" UUID,
    "changes" JSONB,
    "ip_address" INET,
    "user_agent" TEXT,
    "request_id" VARCHAR(100),
    "status" VARCHAR(20) DEFAULT 'success',
    "error_message" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_messages" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "phone" TEXT,
    "nomewpp" TEXT,
    "bot_message" TEXT,
    "user_message" TEXT,
    "message_type" TEXT,
    "active" BOOLEAN DEFAULT true,
    "clientid" UUID,
    "agentid" UUID,

    CONSTRAINT "chat_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clients" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "api_key" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "client_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "logo_url" TEXT,
    "settings" JSONB DEFAULT '{}',
    "status" VARCHAR(20) DEFAULT 'active',
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "agent_config_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "company_id" UUID,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dados_cliente" (
    "id" BIGSERIAL NOT NULL,
    "created_at" TIMESTAMPTZ(6),
    "telefone" TEXT,
    "nomewpp" TEXT,
    "atendimento_ia" TEXT,
    "setor" TEXT,
    "clientid" UUID,
    "agentid" UUID,

    CONSTRAINT "dados_cliente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "end_users" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "client_id" UUID NOT NULL,
    "external_id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "phone" VARCHAR(50),
    "email" VARCHAR(255),
    "channel" VARCHAR(50) NOT NULL DEFAULT 'web',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "agent_config_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" VARCHAR(50) NOT NULL DEFAULT 'text',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_size" INTEGER,
    "file_type" VARCHAR(100),
    "chunk_index" INTEGER DEFAULT 0,

    CONSTRAINT "knowledge_base_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "conversation_id" UUID NOT NULL,
    "role" VARCHAR(20) NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "migrations" (
    "id" SERIAL NOT NULL,
    "filename" VARCHAR(255) NOT NULL,
    "executed_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "migrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "n8n_chat_histories" (
    "id" SERIAL NOT NULL,
    "session_id" VARCHAR,
    "message" JSONB,
    "clientid" UUID,
    "agentid" UUID,

    CONSTRAINT "n8n_chat_histories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "resource" VARCHAR(50) NOT NULL,
    "action" VARCHAR(50) NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN DEFAULT false,
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" VARCHAR(50) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "price_monthly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "price_yearly" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "limits" JSONB DEFAULT '{}',
    "features" JSONB DEFAULT '[]',
    "is_active" BOOLEAN DEFAULT true,
    "is_visible" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscriptions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "plan_id" UUID NOT NULL,
    "status" VARCHAR(20) DEFAULT 'active',
    "billing_period" VARCHAR(20) DEFAULT 'monthly',
    "trial_ends_at" TIMESTAMPTZ(6),
    "trial_used" BOOLEAN DEFAULT false,
    "current_period_start" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "current_period_end" TIMESTAMPTZ(6),
    "cancelled_at" TIMESTAMPTZ(6),
    "expires_at" TIMESTAMPTZ(6),
    "last_payment_at" TIMESTAMPTZ(6),
    "next_payment_at" TIMESTAMPTZ(6),
    "usage_current_period" JSONB DEFAULT '{}',
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usage_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "user_id" UUID,
    "event_type" VARCHAR(50) NOT NULL,
    "resource_type" VARCHAR(50),
    "resource_id" UUID,
    "quantity" INTEGER DEFAULT 1,
    "duration_ms" INTEGER,
    "tokens_used" INTEGER,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by_user_id" UUID,
    "assigned_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "company_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255),
    "password_hash" TEXT NOT NULL,
    "avatar_url" TEXT,
    "invitation_token" VARCHAR(64),
    "invitation_sent_at" TIMESTAMPTZ(6),
    "invitation_accepted_at" TIMESTAMPTZ(6),
    "invited_by_user_id" UUID,
    "status" VARCHAR(20) DEFAULT 'active',
    "preferences" JSONB DEFAULT '{}',
    "last_login_at" TIMESTAMPTZ(6),
    "last_active_at" TIMESTAMPTZ(6),
    "deleted_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey1" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "idx_admin_users_client_id" ON "admin_users"("client_id");

-- CreateIndex
CREATE INDEX "idx_agent_configs_client_active" ON "agent_configs"("client_id", "is_active") WHERE (is_active = true);

-- CreateIndex
CREATE INDEX "idx_agent_configs_client_id" ON "agent_configs"("client_id");

-- CreateIndex
CREATE INDEX "idx_agent_configs_company_id" ON "agent_configs"("company_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_action_created_at" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_company_id_created_at" ON "audit_logs"("company_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_audit_logs_resource_type_id" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "idx_audit_logs_status" ON "audit_logs"("status") WHERE ((status)::text <> 'success'::text);

-- CreateIndex
CREATE INDEX "idx_audit_logs_user_id_created_at" ON "audit_logs"("user_id", "created_at" DESC) WHERE (user_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_chat_messages_agentid" ON "chat_messages"("agentid");

-- CreateIndex
CREATE INDEX "idx_chat_messages_clientid" ON "chat_messages"("clientid");

-- CreateIndex
CREATE INDEX "idx_chat_messages_phone" ON "chat_messages"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "clients_slug_key" ON "clients"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "clients_api_key_key" ON "clients"("api_key");

-- CreateIndex
CREATE INDEX "idx_clients_api_key" ON "clients"("api_key");

-- CreateIndex
CREATE INDEX "idx_clients_slug" ON "clients"("slug");

-- CreateIndex
CREATE INDEX "idx_companies_client_id" ON "companies"("client_id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_companies_created_at" ON "companies"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_companies_slug" ON "companies"("slug") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_companies_status" ON "companies"("status") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "unique_company_slug_per_client" ON "companies"("client_id", "slug");

-- CreateIndex
CREATE INDEX "idx_conversations_agent_config_id" ON "conversations"("agent_config_id");

-- CreateIndex
CREATE INDEX "idx_conversations_client_id" ON "conversations"("client_id");

-- CreateIndex
CREATE INDEX "idx_conversations_client_status_active" ON "conversations"("client_id", "status") WHERE ((status)::text = 'active'::text);

-- CreateIndex
CREATE INDEX "idx_conversations_company_id" ON "conversations"("company_id");

-- CreateIndex
CREATE INDEX "idx_conversations_status" ON "conversations"("client_id", "status");

-- CreateIndex
CREATE INDEX "idx_conversations_user_id" ON "conversations"("user_id");

-- CreateIndex
CREATE INDEX "idx_dados_cliente_agentid" ON "dados_cliente"("agentid");

-- CreateIndex
CREATE INDEX "idx_dados_cliente_clientid" ON "dados_cliente"("clientid");

-- CreateIndex
CREATE INDEX "idx_dados_cliente_telefone" ON "dados_cliente"("telefone");

-- CreateIndex
CREATE INDEX "idx_users_client_id" ON "end_users"("client_id");

-- CreateIndex
CREATE INDEX "idx_users_external_id" ON "end_users"("client_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_client_id_external_id_key" ON "end_users"("client_id", "external_id");

-- CreateIndex
CREATE INDEX "idx_knowledge_base_agent_chunk" ON "knowledge_base"("agent_config_id", "chunk_index");

-- CreateIndex
CREATE INDEX "idx_knowledge_base_agent_config_id" ON "knowledge_base"("agent_config_id");

-- CreateIndex
CREATE INDEX "idx_knowledge_metadata_gin" ON "knowledge_base" USING GIN ("metadata");

-- CreateIndex
CREATE INDEX "idx_messages_conversation_created_desc" ON "messages"("conversation_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_messages_conversation_id" ON "messages"("conversation_id");

-- CreateIndex
CREATE INDEX "idx_messages_created_at" ON "messages"("conversation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "migrations_filename_key" ON "migrations"("filename");

-- CreateIndex
CREATE INDEX "idx_n8n_chat_histories_agentid" ON "n8n_chat_histories"("agentid");

-- CreateIndex
CREATE INDEX "idx_n8n_chat_histories_clientid" ON "n8n_chat_histories"("clientid");

-- CreateIndex
CREATE INDEX "idx_n8n_chat_histories_session_id" ON "n8n_chat_histories"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_slug_key" ON "permissions"("slug");

-- CreateIndex
CREATE INDEX "idx_permissions_resource" ON "permissions"("resource");

-- CreateIndex
CREATE INDEX "idx_permissions_slug" ON "permissions"("slug");

-- CreateIndex
CREATE INDEX "idx_role_permissions_permission_id" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE INDEX "idx_role_permissions_role_id" ON "role_permissions"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_role_permission" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE INDEX "idx_roles_company_id" ON "roles"("company_id") WHERE ((deleted_at IS NULL) AND (is_system = false));

-- CreateIndex
CREATE INDEX "idx_roles_is_system" ON "roles"("is_system") WHERE (is_system = true);

-- CreateIndex
CREATE INDEX "idx_roles_slug" ON "roles"("slug") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "unique_role_slug_per_company" ON "roles"("company_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_slug_key" ON "subscription_plans"("slug");

-- CreateIndex
CREATE INDEX "idx_subscription_plans_is_active" ON "subscription_plans"("is_active");

-- CreateIndex
CREATE INDEX "idx_subscription_plans_slug" ON "subscription_plans"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "subscriptions_company_id_key" ON "subscriptions"("company_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_company_id" ON "subscriptions"("company_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_expires_at" ON "subscriptions"("expires_at") WHERE (expires_at IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_subscriptions_plan_id" ON "subscriptions"("plan_id");

-- CreateIndex
CREATE INDEX "idx_subscriptions_status" ON "subscriptions"("status");

-- CreateIndex
CREATE INDEX "idx_subscriptions_trial_ends_at" ON "subscriptions"("trial_ends_at") WHERE (trial_ends_at IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_usage_logs_company_id_created_at" ON "usage_logs"("company_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_usage_logs_created_at" ON "usage_logs"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_usage_logs_event_type_created_at" ON "usage_logs"("event_type", "created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_usage_logs_resource_type_id" ON "usage_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "idx_usage_logs_user_id_created_at" ON "usage_logs"("user_id", "created_at" DESC) WHERE (user_id IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_user_permissions_view_user_id" ON "user_roles"("user_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_role_id" ON "user_roles"("role_id");

-- CreateIndex
CREATE INDEX "idx_user_roles_user_id" ON "user_roles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_role" ON "user_roles"("user_id", "role_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_invitation_token_key" ON "users"("invitation_token");

-- CreateIndex
CREATE INDEX "idx_users_company_id" ON "users"("company_id") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_users_created_at" ON "users"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_users_email" ON "users"("email") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE INDEX "idx_users_invitation_token" ON "users"("invitation_token") WHERE (invitation_token IS NOT NULL);

-- CreateIndex
CREATE INDEX "idx_users_last_login_at" ON "users"("last_login_at" DESC);

-- CreateIndex
CREATE INDEX "idx_users_status" ON "users"("status") WHERE (deleted_at IS NULL);

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_email_per_company" ON "users"("company_id", "email");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "agent_configs" ADD CONSTRAINT "agent_configs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_agent_config_id_fkey" FOREIGN KEY ("agent_config_id") REFERENCES "agent_configs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "end_users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "end_users" ADD CONSTRAINT "users_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "clients"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "knowledge_base" ADD CONSTRAINT "knowledge_base_agent_config_id_fkey" FOREIGN KEY ("agent_config_id") REFERENCES "agent_configs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "usage_logs" ADD CONSTRAINT "usage_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_user_id_fkey" FOREIGN KEY ("assigned_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_invited_by_user_id_fkey" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
