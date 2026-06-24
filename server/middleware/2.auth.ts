export default eventHandler(async (event) => {
  if (!event.path.startsWith('/api/') || event.path.startsWith('/api/auth/'))
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
      statusText: 'Unauthorized',
    })
  }
  if (token.length < 8) {
    throw createError({
      status: 401,
      statusText: 'Token is too short',
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
      statusText: 'Unauthorized',
    })
  }

  event.context.auth = { user }
})
