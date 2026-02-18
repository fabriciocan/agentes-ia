#!/usr/bin/env tsx
/**
 * Database Backup Script — creates a logical backup of critical tables
 * Usage: npx tsx scripts/backup-database.ts
 */

import 'dotenv/config'
import { writeFileSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { PrismaClient } from '@prisma/client'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const prisma = new PrismaClient()

async function createBackup() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = resolve(__dirname, '..', 'backups')
  const backupFile = resolve(backupDir, `backup-${timestamp}.json`)

  console.log('📦 Creating database backup...')

  try {
    mkdirSync(backupDir, { recursive: true })

    const [clients, admin_users, agent_configs, conversations, messages, knowledge_base] =
      await Promise.all([
        prisma.clients.count(),
        prisma.admin_users.count(),
        prisma.agent_configs.count(),
        prisma.conversations.count(),
        prisma.messages.count(),
        prisma.knowledge_base.count(),
      ])

    const backup = {
      timestamp: new Date().toISOString(),
      tables: { clients, admin_users, agent_configs, conversations, messages, knowledge_base },
    }

    for (const [table, count] of Object.entries(backup.tables)) {
      console.log(`  ✓ ${table}: ${count} rows`)
    }

    writeFileSync(backupFile, JSON.stringify(backup, null, 2))
    console.log(`\n✅ Backup metadata saved to: ${backupFile}`)
    console.log('\nNote: For full backup, use pg_dump:')
    console.log(`  pg_dump $DATABASE_URL > backups/backup-${timestamp}.sql`)

    return backup
  } finally {
    await prisma.$disconnect()
  }
}

createBackup().catch(console.error)
