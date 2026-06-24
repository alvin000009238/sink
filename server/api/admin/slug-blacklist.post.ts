import { LinkSchema } from '#shared/schemas/link'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Add or remove a slug from the blacklist',
    security: [{ bearerAuth: [] }],
  },
})

const SlugBlacklistSchema = z.object({
  slug: LinkSchema.shape.slug.removeDefault().min(1).optional(),
  slugs: z.string().trim().max(10000).optional(),
  reason: z.string().trim().max(256).optional(),
  blocked: z.boolean().default(true),
})

export default eventHandler(async (event) => {
  const user = requireAdmin(event)
  const body = await readValidatedBody(event, SlugBlacklistSchema.parse)
  const slugs = [...new Set([
    ...(body.slug ? [body.slug] : []),
    ...(body.slugs?.split(/\r?\n/) ?? []),
  ].map(slug => slug.trim()).filter(Boolean).map((slug) => {
    const normalizedSlug = normalizeSlug(event, slug)
    LinkSchema.shape.slug.removeDefault().min(1).parse(normalizedSlug)
    return normalizedSlug
  }))]

  if (!slugs.length) {
    throw createError({ status: 400, statusText: 'At least one slug is required' })
  }

  const { DB } = event.context.cloudflare.env

  if (!body.blocked) {
    const batch = slugs.map(slug => DB.prepare('DELETE FROM slug_blacklist WHERE slug = ?').bind(slug))
    await DB.batch(batch)
    return { success: true, blocked: false, count: slugs.length }
  }

  const now = Math.floor(Date.now() / 1000)
  const batch = slugs.map(slug => DB.prepare(`
    INSERT INTO slug_blacklist (slug, reason, created_at, created_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      reason = excluded.reason,
      created_at = excluded.created_at,
      created_by = excluded.created_by
  `).bind(slug, body.reason ?? null, now, user.id))
  await DB.batch(batch)

  return { success: true, blocked: true, count: slugs.length }
})
