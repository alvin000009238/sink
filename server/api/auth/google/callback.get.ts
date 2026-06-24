interface TokenResponse {
  id_token?: string
}

export default eventHandler(async (event) => {
  const query = getQuery(event)
  const state = typeof query.state === 'string' ? query.state : ''
  const code = typeof query.code === 'string' ? query.code : ''
  const expectedState = getCookie(event, OAUTH_STATE_COOKIE)

  deleteCookie(event, OAUTH_STATE_COOKIE, { path: '/' })

  if (!state || state !== expectedState || !code) {
    throw createError({
      status: 400,
      statusText: 'Invalid OAuth callback',
    })
  }

  const {
    googleOAuthClientId,
    googleOAuthClientSecret,
    googleOAuthRedirectUrl,
    googleOAuthHostedDomain,
    sessionTtlSeconds,
  } = useRuntimeConfig(event)

  if (!googleOAuthClientId || !googleOAuthClientSecret) {
    throw createError({
      status: 501,
      statusText: 'Google OAuth is not configured',
    })
  }

  const redirectUri = googleOAuthRedirectUrl || `${getRequestProtocol(event)}://${getRequestHost(event)}/api/auth/google/callback`
  const token = await $fetch<TokenResponse>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: new URLSearchParams({
      code,
      client_id: googleOAuthClientId,
      client_secret: googleOAuthClientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (!token.id_token) {
    throw createError({
      status: 401,
      statusText: 'Missing Google ID token',
    })
  }

  const user = googlePayloadToUser(decodeGoogleIdTokenPayload(token.id_token), googleOAuthClientId, googleOAuthHostedDomain)
  const session = await createStudentSession(event.context.cloudflare.env.DB, user, Number(sessionTtlSeconds))

  setCookie(event, SESSION_COOKIE, session, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: Number(sessionTtlSeconds),
  })

  return sendRedirect(event, '/dashboard', 302)
})
