import { describe, expect, it } from 'vitest'
import { postJson } from '../utils'

describe.sequential('/api/backup', () => {
  it('returns 503 with auth when R2 is disabled', async () => {
    const response = await postJson('/api/backup', {})
    expect(response.status).toBe(503)

    const data = await response.json() as { message: string }
    expect(data.message).toBe('R2 binding not configured')
  })

  it('returns 401 without auth', async () => {
    const response = await postJson('/api/backup', {}, false)
    expect(response.status).toBe(401)
  })
})
