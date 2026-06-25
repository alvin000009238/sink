export default eventHandler(async (event) => {
  if (!event.path.startsWith('/api/') || event.path.startsWith('/api/auth/') || event.path === '/api/link/anonymous-report' || event.path === '/api/public-config')
    return

  const authHeader = getHeader(event, 'Authorization')
  let token = ''

  if (authHeader) {
    const trimmed = authHeader.trim()
    if (trimmed.toLowerCase() !== 'bearer') {
      token = trimmed.replace(/^Bearer\s+/i, '')
    }
  }

  if (!token) {
    token = getCookie(event, SESSION_COOKIE) || ''
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
    event.context.auth = { user: systemAuthUser() }
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

  event.context.auth = { user }
})
