import { defineWorkersConfig } from '@cloudflare/vitest-pool-workers/config'
import { loadEnv } from 'vite'

export default defineWorkersConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const siteToken = env.NUXT_SITE_TOKEN || 'SinkCool'

  return {
    test: {
      env: {
        ...env,
        NUXT_SITE_TOKEN: siteToken,
        NUXT_GOOGLE_OAUTH_CLIENT_ID: env.NUXT_GOOGLE_OAUTH_CLIENT_ID || 'test-google-client',
        NUXT_PUBLIC_TURNSTILE_SITE_KEY: env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || 'test-turnstile-site-key',
        NUXT_TEST_MOCK_WAE: 'true',
        NUXT_TEST_MOCK_TURNSTILE: 'true',
      },
      setupFiles: ['./tests/setup.ts'],
      poolOptions: {
        workers: {
          singleWorker: true,
          isolatedStorage: false,
          wrangler: {
            configPath: './wrangler.jsonc',
          },
          miniflare: {
            cf: true,
            bindings: {
              NUXT_SITE_TOKEN: siteToken,
              NUXT_GOOGLE_OAUTH_CLIENT_ID: env.NUXT_GOOGLE_OAUTH_CLIENT_ID || 'test-google-client',
              NUXT_PUBLIC_TURNSTILE_SITE_KEY: env.NUXT_PUBLIC_TURNSTILE_SITE_KEY || 'test-turnstile-site-key',
              NUXT_TEST_MOCK_WAE: 'true',
              NUXT_TEST_MOCK_TURNSTILE: 'true',
            },
          },
        },
      },
    },
  }
})
