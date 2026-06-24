import { LinkSchema } from '#shared/schemas/link'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Report a short link for admin review',
    security: [{ bearerAuth: [] }],
  },
})

const ReportSchema = z.object({
  slug: LinkSchema.shape.slug.removeDefault().min(1),
  reason: z.string().trim().min(1).max(128),
  details: z.string().trim().max(2048).optional(),
})

export default eventHandler(async (event) => {
  const user = requireAuthUser(event)
  const body = await readValidatedBody(event, ReportSchema.parse)
  const slug = normalizeSlug(event, body.slug)
  const { DB } = event.context.cloudflare.env
  const link = await DB.prepare(`
    SELECT id
    FROM links
    WHERE slug = ?
      AND status = 'active'
  `).bind(slug).first<{ id: string }>()

  if (!link) {
    throw createError({
      status: 404,
      statusText: 'Link not found',
    })
  }

  await DB.prepare(`
    INSERT INTO link_reports (id, link_id, reporter_id, reason, details, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?)
  `).bind(crypto.randomUUID(), link.id, user.id, body.reason, body.details ?? null, Math.floor(Date.now() / 1000)).run()

  setResponseStatus(event, 201)
  return { success: true }
})
