import { defineEventHandler } from 'h3'

const CONFIG_MAPPING: Record<string, string> = {
  googleOAuthClientId: 'NUXT_GOOGLE_OAUTH_CLIENT_ID',
  googleOAuthClientSecret: 'NUXT_GOOGLE_OAUTH_CLIENT_SECRET',
  googleOAuthRedirectUrl: 'NUXT_GOOGLE_OAUTH_REDIRECT_URL',
  googleOAuthHostedDomain: 'NUXT_GOOGLE_OAUTH_HOSTED_DOMAIN',
  turnstileSecretKey: 'NUXT_TURNSTILE_SECRET_KEY',
  testMockTurnstile: 'NUXT_TEST_MOCK_TURNSTILE',
  cfAccountId: 'NUXT_CF_ACCOUNT_ID',
  cfApiToken: 'NUXT_CF_API_TOKEN',
  siteToken: 'NUXT_SITE_TOKEN',
  redirectStatusCode: 'NUXT_REDIRECT_STATUS_CODE',
  linkCacheTtl: 'NUXT_LINK_CACHE_TTL',
  redirectWithQuery: 'NUXT_REDIRECT_WITH_QUERY',
  homeURL: 'NUXT_HOME_URL',
  sessionTtlSeconds: 'NUXT_SESSION_TTL_SECONDS',
  dailyCreateLimit: 'NUXT_DAILY_CREATE_LIMIT',
  dataset: 'NUXT_DATASET',
  aiModel: 'NUXT_AI_MODEL',
  aiPrompt: 'NUXT_AI_PROMPT',
  aiOgPrompt: 'NUXT_AI_OG_PROMPT',
  caseSensitive: 'NUXT_CASE_SENSITIVE',
  listQueryLimit: 'NUXT_LIST_QUERY_LIMIT',
  disableBotAccessLog: 'NUXT_DISABLE_BOT_ACCESS_LOG',
  disableAutoBackup: 'NUXT_DISABLE_AUTO_BACKUP',
  notFoundRedirect: 'NUXT_NOT_FOUND_REDIRECT',
  safeBrowsingDoh: 'NUXT_SAFE_BROWSING_DOH',
}

export default defineEventHandler((event) => {
  const env = event.context.cloudflare?.env
  if (!env)
    return

  const config = useRuntimeConfig(event)

  for (const [configKey, envKey] of Object.entries(CONFIG_MAPPING)) {
    const val = (env as Record<string, any>)[envKey]
    if (val !== undefined && val !== null && val !== '') {
      if (val === 'true') {
        config[configKey] = true
      }
      else if (val === 'false') {
        config[configKey] = false
      }
      else if (!Number.isNaN(Number(val)) && typeof val === 'string' && val.trim() !== '') {
        config[configKey] = Number(val)
      }
      else {
        config[configKey] = val
      }
    }
  }
})
