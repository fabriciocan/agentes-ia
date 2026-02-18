import Redis from 'ioredis'

async function clearCache() {
  const redisUrl = process.env.NUXT_REDIS_URL || process.env.REDIS_URL || 'redis://localhost:6379'
  const redis = new Redis(redisUrl)

  try {
    await redis.flushall()
    console.log('✓ Cache Redis limpo com sucesso')
    console.log('✓ Todas as permissões e cache invalidados')
  } catch (error: any) {
    console.error('❌ Erro ao limpar cache:', error.message)
  } finally {
    await redis.quit()
  }
}

clearCache()
