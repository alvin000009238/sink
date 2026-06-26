defineRouteMeta({
  openAPI: {
    description: 'Read admin-managed application settings',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async (event) => {
  requireAdmin(event)

  return {
    dailyCreateLimit: await getDailyCreateLimit(event),
  }
})
