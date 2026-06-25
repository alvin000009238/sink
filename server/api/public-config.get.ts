defineRouteMeta({
  openAPI: {
    description: 'Get public runtime configuration',
  },
})

export default eventHandler((event) => {
  const env = event.context.cloudflare?.env as unknown as Record<string, string | undefined> | undefined

  return {
    turnstileSiteKey: env?.NUXT_PUBLIC_TURNSTILE_SITE_KEY || env?.NUXT_TURNSTILE_SITE_KEY || '',
  }
})
