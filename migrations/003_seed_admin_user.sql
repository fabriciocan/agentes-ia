-- Seed: Admin user with default client
-- Email: admin@agentes.ia
-- Password: admin123

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Create the default client (tenant)
INSERT INTO clients (id, name, slug, api_key, settings)
VALUES (
  uuid_generate_v4(),
  'Default',
  'default',
  encode(gen_random_bytes(32), 'hex'),
  '{}'::jsonb
)
ON CONFLICT (slug) DO NOTHING;

-- 2. Create admin user linked to the default client
INSERT INTO admin_users (id, email, password_hash, client_id, name)
SELECT
  uuid_generate_v4(),
  'admin@agentes.ia',
  encode(sha256('admin123'::bytea), 'hex'),
  c.id,
  'Administrador'
FROM clients c
WHERE c.slug = 'default'
ON CONFLICT (email) DO NOTHING;
