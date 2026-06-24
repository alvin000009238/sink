import type { Link } from '../shared/schemas/link'
import { env, SELF } from 'cloudflare:test'
import { expect } from 'vitest'
import { LINK_PASSWORD_HASH_PREFIX, LINK_PASSWORD_MASK_PREFIX } from '../shared/utils/link-password'

export function fetchWithAuth(path: string, options?: RequestInit): Promise<Response> {
  return fetchWithToken(path, import.meta.env.NUXT_SITE_TOKEN, options)
}

export function fetchWithToken(path: string, token: string, options?: RequestInit): Promise<Response> {
  return SELF.fetch(`http://localhost${path}`, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
    },
  })
}

export function fetch(path: string, options?: RequestInit): Promise<Response> {
  return SELF.fetch(`http://localhost${path}`, options)
}

export function postJson(path: string, body: unknown, withAuth = true): Promise<Response> {
  const fn = withAuth ? fetchWithAuth : fetch
  return fn(path, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function postJsonWithToken(path: string, token: string, body: unknown): Promise<Response> {
  return fetchWithToken(path, token, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function putJson(path: string, body: unknown, withAuth = true): Promise<Response> {
  const fn = withAuth ? fetchWithAuth : fetch
  return fn(path, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

export function putJsonWithToken(path: string, token: string, body: unknown): Promise<Response> {
  return fetchWithToken(path, token, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

async function hashTestSessionToken(token: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function createTestSession(email: string, role: 'student' | 'admin' = 'student'): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`
  const id = `test:${email}`

  await env.DB.prepare(`
    INSERT INTO students (id, email, name, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'active', ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      role = excluded.role,
      status = 'active',
      updated_at = excluded.updated_at
  `).bind(id, email, email, role, now, now).run()

  await env.DB.prepare(`
    INSERT INTO auth_sessions (token_hash, student_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(await hashTestSessionToken(token), id, now, now + 3600).run()

  return token
}

export async function getStoredLink(slug: string) {
  const row = await env.DB.prepare(`
    SELECT payload_json
    FROM links
    WHERE slug = ?
  `).bind(slug).first<{ payload_json: string }>()

  return row ? JSON.parse(row.payload_json) as Link : null
}

export async function getStoredLinkOwner(slug: string) {
  const row = await env.DB.prepare('SELECT owner_id FROM links WHERE slug = ?').bind(slug).first<{ owner_id: string }>()
  return row?.owner_id ?? null
}

export async function getStoredLinkStatus(slug: string) {
  const row = await env.DB.prepare('SELECT status FROM links WHERE slug = ?').bind(slug).first<{ status: string }>()
  return row?.status ?? null
}

export async function getCachedLink(slug: string) {
  return await env.KV.get<Link>(`link:${slug}`, { type: 'json' })
}

export async function deleteCachedLink(slug: string) {
  await env.KV.delete(`link:${slug}`)
}

export async function deleteStoredLink(slug: string) {
  await env.DB.prepare('DELETE FROM links WHERE slug = ?').bind(slug).run()
  await env.KV.delete(`link:${slug}`)
}

export async function deleteStoredLinks(slugs: string[]) {
  await Promise.all(slugs.map(slug => deleteStoredLink(slug)))
}

export function expectMaskedPassword(password: string | undefined, plainText: string) {
  expect(password).toBeDefined()
  expect(password?.startsWith(LINK_PASSWORD_MASK_PREFIX), password).toBe(true)
  expect(password).toContain(plainText.slice(-3))
  expect(password).not.toBe(plainText)
  expect(password?.startsWith(LINK_PASSWORD_HASH_PREFIX)).toBe(false)
}

export async function expectStoredHashedPassword(slug: string, plainText: string) {
  const storedLink = await getStoredLink(slug)
  expect(storedLink?.password?.startsWith(LINK_PASSWORD_HASH_PREFIX), storedLink?.password).toBe(true)
  expect(storedLink?.password).not.toBe(plainText)
}

// 1x1 transparent PNG for testing
export const TEST_PNG_BYTES = new Uint8Array([
  0x89,
  0x50,
  0x4E,
  0x47,
  0x0D,
  0x0A,
  0x1A,
  0x0A,
  0x00,
  0x00,
  0x00,
  0x0D,
  0x49,
  0x48,
  0x44,
  0x52,
  0x00,
  0x00,
  0x00,
  0x01,
  0x00,
  0x00,
  0x00,
  0x01,
  0x08,
  0x06,
  0x00,
  0x00,
  0x00,
  0x1F,
  0x15,
  0xC4,
  0x89,
  0x00,
  0x00,
  0x00,
  0x0A,
  0x49,
  0x44,
  0x41,
  0x54,
  0x78,
  0x9C,
  0x63,
  0x00,
  0x01,
  0x00,
  0x00,
  0x05,
  0x00,
  0x01,
  0x0D,
  0x0A,
  0x2D,
  0xB4,
  0x00,
  0x00,
  0x00,
  0x00,
  0x49,
  0x45,
  0x4E,
  0x44,
  0xAE,
  0x42,
  0x60,
  0x82,
])
