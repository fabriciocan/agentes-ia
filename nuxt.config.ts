// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui',
    'nuxt-auth-utils'
  ],

  ssr: false,

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  nitro: {
    experimental: {
      wasm: true
    },
    esbuild: {
      options: {
        target: 'esnext'
      }
    },
    nodeModulesDirs: ['./node_modules'],
    alias: {
      '#prisma': './app/generated/prisma/client.ts'
    },
    externals: {
      external: ['@prisma/client/runtime/client', '@prisma/adapter-pg', 'pg']
    }
  },

  routeRules: {},

  runtimeConfig: {
    databaseUrl: '',
    redisUrl: '',
    openaiApiKey: '',
    rateLimitMax: 60,
    rateLimitWindowSeconds: 60,
    n8nWebhookSecret: '',
    evoApiUrl: '',
    evoApiKey: '',
    n8nWebhookUrl: '',
    session: {
      password: '',
      cookie: {
        secure: process.env.NODE_ENV === 'production'
      }
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
