import type { H3Event } from 'h3'
import type { AuthSource } from '../utils/auth'

export default eventHandler(async (event) => {
  if (!event.path.startsWith('/api/') || event.path.startsWith('/api/auth/') || event.path === '/api/link/anonymous-report' || event.path === '/api/public-config')
    return

  const authHeader = getHeader(event, 'Authorization')
  let token = ''
  let source: AuthSource = 'bearer'

  if (authHeader) {
    const trimmed = authHeader.trim()
    if (trimmed.toLowerCase() !== 'bearer') {
      token = trimmed.replace(/^Bearer\s+/i, '')
    }
  }

  if (!token) {
    token = getCookie(event, SESSION_COOKIE) || ''
    source = 'cookie'
  }

  if (!token) {
    throw createError({
      status: 401,
      message: 'Missing login token. Please sign in again.',
      statusText: 'Missing login token. Please sign in again.',
    })
  }
  if (token.length < 8) {
    throw createError({
      status: 401,
      message: 'Login token is too short. Check the token and try again.',
      statusText: 'Login token is too short. Check the token and try again.',
    })
  }

  const { siteToken } = useRuntimeConfig(event)
  const { DB } = event.context.cloudflare.env

  if (token === siteToken) {
    await ensureSystemOwner(DB)
    event.context.auth = { user: systemAuthUser(), source: 'site-token' }
    return
  }

  const user = await findSessionUser(DB, token)
  if (!user) {
    throw createError({
      status: 401,
      message: 'Invalid login token or expired session. Please sign in again.',
      statusText: 'Invalid login token or expired session. Please sign in again.',
    })
  }

  if (source === 'cookie' && user.role === 'admin' && isUnsafeAdminRequest(event) && !isSameOriginRequest(event)) {
    throw createError({
      status: 403,
      message: 'Same-origin request is required for cookie-authenticated admin changes.',
      statusText: 'Same-origin request is required for cookie-authenticated admin changes.',
    })
  }

  event.context.auth = { user, source }
})

function isUnsafeAdminRequest(event: H3Event): boolean {
  return event.path.startsWith('/api/admin/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method)
}

function isSameOriginRequest(event: H3Event): boolean {
  const requestHost = getRequestHost(event)
  const origin = getHeader(event, 'Origin')
  if (origin)
    return getUrlHost(origin) === requestHost

  const referer = getHeader(event, 'Referer')
  return referer ? getUrlHost(referer) === requestHost : false
}

function getUrlHost(value: string): string | null {
  try {
    return new URL(value).host
  }
  catch {
    return null
  }
}
