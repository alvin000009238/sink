import { describe, expect, it } from 'vitest'
import { googlePayloadToUser } from '../../server/utils/auth'
import { createTestSession, fetch } from '../utils'

describe('/api/auth/google', () => {
  it('starts Google OAuth without API auth', async () => {
    const response = await fetch('/api/auth/google/start', { redirect: 'manual' })

    expect(response.status).toBe(302)
    expect(response.headers.get('location')).toContain('accounts.google.com')
    expect(response.headers.get('set-cookie')).toContain('SinkOAuthState=')
  })

  it('marks OAuth state cookies secure on HTTPS requests', async () => {
    const response = await fetch('/api/auth/google/start', {
      redirect: 'manual',
      headers: { 'x-forwarded-proto': 'https' },
    })

    expect(response.status).toBe(302)
    expect(response.headers.get('set-cookie')).toContain('Secure')
  })

  it('rejects callback without matching state cookie', async () => {
    const response = await fetch('/api/auth/google/callback?state=bad&code=test', { redirect: 'manual' })

    expect(response.status).toBe(400)
  })

  it('clears a session on logout', async () => {
    const token = await createTestSession(`logout-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)

    expect((await fetch('/api/verify', {
      headers: { Cookie: `SinkSession=${token}` },
    })).status).toBe(200)

    const logoutResponse = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Cookie: `SinkSession=${token}` },
    })

    expect(logoutResponse.status).toBe(200)
    expect((await fetch('/api/verify', {
      headers: { Cookie: `SinkSession=${token}` },
    })).status).toBe(401)
  })

  it('accepts only verified school Google accounts', () => {
    expect(googlePayloadToUser({
      iss: 'https://accounts.google.com',
      aud: 'test-google-client',
      email: 'student@student.clhs.tyc.edu.tw',
      email_verified: true,
      sub: '123',
    }, 'test-google-client', 'student.clhs.tyc.edu.tw')).toEqual(expect.objectContaining({
      email: 'student@student.clhs.tyc.edu.tw',
      role: 'student',
    }))

    expect(() => googlePayloadToUser({
      iss: 'https://accounts.google.com',
      aud: 'test-google-client',
      email: 'student@example.com',
      email_verified: true,
      sub: '123',
    }, 'test-google-client', 'student.clhs.tyc.edu.tw')).toThrow()
  })
})
