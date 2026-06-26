export default eventHandler((event) => {
  const { googleOAuthClientId, googleOAuthRedirectUrl, googleOAuthHostedDomain, testMockWae } = useRuntimeConfig(event)
  const clientId = googleOAuthClientId || (testMockWae ? 'test-google-client' : '')
  if (!clientId) {
    throw createError({
      status: 501,
      statusText: 'Google OAuth is not configured',
    })
  }

  const state = crypto.randomUUID()
  const redirectUri = googleOAuthRedirectUrl || `${getRequestProtocol(event)}://${getRequestHost(event)}/api/auth/google/callback`
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', clientId)
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('scope', 'openid email profile')
  url.searchParams.set('state', state)
  url.searchParams.set('hd', googleOAuthHostedDomain)
  url.searchParams.set('prompt', 'select_account')

  setCookie(event, OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecureRequest(event),
    path: '/',
    maxAge: 600,
  })

  return sendRedirect(event, url.toString(), 302)
})
