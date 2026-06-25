import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Report a short link anonymously after Turnstile verification',
  },
})

const AnonymousReportSchema = LinkReportSchema.extend({
  turnstileToken: z.string().trim().min(1).max(4096),
})

export default eventHandler(async (event) => {
  const body = await readValidatedBody(event, AnonymousReportSchema.parse)
  await verifyTurnstile(event, body.turnstileToken)
  await createLinkReport(event, body.slug, body.reason, body.details, null)

  setResponseStatus(event, 201)
  return { success: true }
})
