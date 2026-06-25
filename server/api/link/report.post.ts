defineRouteMeta({
  openAPI: {
    description: 'Report a short link for admin review',
    security: [{ bearerAuth: [] }],
  },
})

export default eventHandler(async (event) => {
  const user = requireAuthUser(event)
  const body = await readValidatedBody(event, LinkReportSchema.parse)
  await createLinkReport(event, body.slug, body.reason, body.details, user.id)

  setResponseStatus(event, 201)
  return { success: true }
})
