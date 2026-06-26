import type { H3Event } from 'h3'

export const SYSTEM_OWNER_ID = 'system'
export const SESSION_COOKIE = 'SinkSession'
export const OAUTH_STATE_COOKIE = 'SinkOAuthState'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  picture: string | null
  role: 'student' | 'admin'
  status: 'active' | 'disabled'
}

export type AuthSource = 'bearer' | 'cookie' | 'site-token'

interface SessionRow extends AuthUser {
  expires_at: number
}

interface GoogleIdTokenPayload {
  iss?: string
  aud?: string
  email?: string
  email_verified?: boolean | string
  name?: string
  picture?: string
  sub?: string
}

function toHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map(byte => byte.toString(16).padStart(2, '0')).join('')
}

export async function hashSessionToken(token: string): Promise<string> {
  return toHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token)))
}

export function getAuthUser(event: H3Event): AuthUser | null {
  return event.context.auth?.user ?? null
}

export function getAuthSource(event: H3Event): AuthSource | null {
  return event.context.auth?.source ?? null
}

export function isSecureRequest(event: H3Event): boolean {
  const forwardedProto = getHeader(event, 'x-forwarded-proto')?.split(',')[0]?.trim().toLowerCase()
  return forwardedProto === 'https' || getRequestProtocol(event) === 'https'
}

export function requireAuthUser(event: H3Event): AuthUser {
  const user = getAuthUser(event)
  if (!user) {
    throw createError({
      status: 401,
      message: 'Missing login token. Please sign in again.',
      statusText: 'Missing login token. Please sign in again.',
    })
  }

  return user
}

export function requireAdmin(event: H3Event): AuthUser {
  const user = requireAuthUser(event)
  if (user.role !== 'admin') {
    throw createError({
      status: 403,
      message: 'Admin permission is required for this action.',
      statusText: 'Admin permission is required for this action.',
    })
  }

  return user
}

export async function ensureSystemOwner(DB: D1Database): Promise<void> {
  const now = Math.floor(Date.now() / 1000)
  await DB.prepare(`
    INSERT OR IGNORE INTO students (id, email, name, role, status, created_at, updated_at)
    VALUES (?, ?, ?, 'admin', 'active', ?, ?)
  `).bind(SYSTEM_OWNER_ID, 'system@sink.local', 'System', now, now).run()
}

export function systemAuthUser(): AuthUser {
  return {
    id: SYSTEM_OWNER_ID,
    email: 'system@sink.local',
    name: 'System',
    picture: null,
    role: 'admin',
    status: 'active',
  }
}

export async function findSessionUser(DB: D1Database, token: string): Promise<AuthUser | null> {
  const now = Math.floor(Date.now() / 1000)
  const row = await DB.prepare(`
    SELECT students.id, students.email, students.name, students.picture, students.role, students.status, auth_sessions.expires_at
    FROM auth_sessions
    JOIN students ON students.id = auth_sessions.student_id
    WHERE auth_sessions.token_hash = ?
      AND auth_sessions.expires_at > ?
      AND students.status = 'active'
  `).bind(await hashSessionToken(token), now).first<SessionRow>()

  if (!row)
    return null

  return {
    id: row.id,
    email: row.email,
    name: row.name,
    picture: row.picture,
    role: row.role,
    status: row.status,
  }
}

export async function createStudentSession(DB: D1Database, user: AuthUser, ttlSeconds: number): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const token = `${crypto.randomUUID()}.${crypto.randomUUID()}`

  await DB.prepare(`
    INSERT INTO students (id, email, name, picture, role, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET
      name = excluded.name,
      picture = excluded.picture,
      updated_at = excluded.updated_at
  `).bind(user.id, user.email, user.name, user.picture, user.role, user.status, now, now).run()

  await DB.prepare(`
    INSERT INTO auth_sessions (token_hash, student_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).bind(await hashSessionToken(token), user.id, now, now + ttlSeconds).run()

  return token
}

function decodeBase64Url(value: string): string {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new TextDecoder().decode(bytes)
}

export function decodeGoogleIdTokenPayload(idToken: string): GoogleIdTokenPayload {
  const [, payload] = idToken.split('.')
  if (!payload) {
    throw createError({
      status: 401,
      message: 'Invalid Google sign-in response. Please sign in again.',
      statusText: 'Invalid Google sign-in response. Please sign in again.',
    })
  }

  return JSON.parse(decodeBase64Url(payload)) as GoogleIdTokenPayload
}

export function googlePayloadToUser(payload: GoogleIdTokenPayload, clientId: string, hostedDomain: string): AuthUser {
  const email = payload.email?.toLowerCase()
  const verified = payload.email_verified === true || payload.email_verified === 'true'
  const validIssuer = payload.iss === 'https://accounts.google.com' || payload.iss === 'accounts.google.com'

  if (!validIssuer || payload.aud !== clientId || !email || !verified || !email.endsWith(`@${hostedDomain}`) || !payload.sub) {
    throw createError({
      status: 401,
      message: `Use a verified ${hostedDomain} Google account to sign in.`,
      statusText: `Use a verified ${hostedDomain} Google account to sign in.`,
    })
  }

  return {
    id: `google:${payload.sub}`,
    email,
    name: payload.name ?? null,
    picture: payload.picture ?? null,
    role: 'student',
    status: 'active',
  }
}
