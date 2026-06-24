export default eventHandler(async (event) => {
  const session = getCookie(event, SESSION_COOKIE)

  if (session) {
    await event.context.cloudflare.env.DB.prepare(`
      DELETE FROM auth_sessions
      WHERE token_hash = ?
    `).bind(await hashSessionToken(session)).run()
  }

  deleteCookie(event, SESSION_COOKIE, { path: '/' })

  return { success: true }
})
