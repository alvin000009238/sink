import { describe, expect, it } from 'vitest'
import { fetch } from '../utils'

describe('/api/public-config', () => {
  it('returns only public runtime config', async () => {
    const response = await fetch('/api/public-config')
    const body = await response.json() as Record<string, unknown>

    expect(response.status).toBe(200)
    expect(body).toEqual({ turnstileSiteKey: 'test-turnstile-site-key' })
    expect(body.NUXT_TURNSTILE_SECRET_KEY).toBeUndefined()
    expect(body.turnstileSecretKey).toBeUndefined()
  })
})
