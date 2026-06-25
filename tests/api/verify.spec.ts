import { describe, expect, it } from 'vitest'
import { createTestSession, fetch, fetchWithAuth } from '../utils'

interface VerifyResponse {
  name: string
  url: string
  user: {
    email: string
    role: 'student' | 'admin'
  }
}

interface ErrorResponse {
  message?: string
  statusMessage?: string
  statusText?: string
}

function responseMessage(body: ErrorResponse): string {
  return body.message || body.statusMessage || body.statusText || ''
}

describe('/api/verify', () => {
  it('returns user data with valid auth', async () => {
    const response = await fetchWithAuth('/api/verify')
    expect(response.status).toBe(200)

    const data = await response.json() as VerifyResponse
    expect(data).toHaveProperty('name')
    expect(data).toHaveProperty('url')
    expect(data.name).toBeTypeOf('string')
    expect(data.url).toBeTypeOf('string')
    expect(data.user.role).toBe('admin')
  })

  it('returns correct response structure', async () => {
    const response = await fetchWithAuth('/api/verify')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain('application/json')

    const data = await response.json() as VerifyResponse
    expect(data.name).toBe('Sink')
    expect(data.url).toBe('https://sink.cool')
  })

  it('returns the current student for a session cookie', async () => {
    const email = `verify-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`
    const token = await createTestSession(email)
    const response = await fetch('/api/verify', {
      headers: { Cookie: `SinkSession=${token}` },
    })

    expect(response.status).toBe(200)
    const data = await response.json() as VerifyResponse
    expect(data.user.email).toBe(email)
    expect(data.user.role).toBe('student')
  })

  it('returns 401 when accessing without auth', async () => {
    const response = await fetch('/api/verify')
    expect(response.status).toBe(401)
    expect(responseMessage(await response.json() as ErrorResponse)).toContain('Missing login token')
  })

  it('returns 401 with invalid token', async () => {
    const response = await fetch('/api/verify', {
      headers: { Authorization: 'Bearer invalid-token-12345' },
    })
    expect(response.status).toBe(401)
    expect(responseMessage(await response.json() as ErrorResponse)).toContain('Invalid login token')
  })
})
