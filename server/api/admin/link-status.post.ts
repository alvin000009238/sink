import { LinkSchema } from '#shared/schemas/link'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Update link moderation status',
    security: [{ bearerAuth: [] }],
  },
})

const LinkStatusSchema = z.object({
  slug: LinkSchema.shape.slug.removeDefault().min(1),
  status: z.enum(['active', 'disabled', 'deleted', 'pending']),
})

export default eventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedBody(event, LinkStatusSchema.parse)
  await setLinkStatus(event, normalizeSlug(event, body.slug), body.status)
  return { success: true }
})
