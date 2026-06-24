import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'List blocked slugs for admin review',
    security: [{ bearerAuth: [] }],
  },
})

const SlugBlacklistQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
})

interface SlugBlacklistRow {
  slug: string
  reason: string | null
  created_at: number
  created_by: string | null
  created_by_email: string | null
}

export default eventHandler(async (event) => {
  requireAdmin(event)

  const query = await getValidatedQuery(event, SlugBlacklistQuerySchema.parse)
  const where = query.search ? 'WHERE instr(slug_blacklist.slug, ?) > 0 OR instr(COALESCE(slug_blacklist.reason, \'\'), ?) > 0' : ''
  const binds = query.search ? [query.search, query.search, query.limit] : [query.limit]

  const result = await event.context.cloudflare.env.DB.prepare(`
    SELECT
      slug_blacklist.slug,
      slug_blacklist.reason,
      slug_blacklist.created_at,
      slug_blacklist.created_by,
      students.email as created_by_email
    FROM slug_blacklist
    LEFT JOIN students ON students.id = slug_blacklist.created_by
    ${where}
    ORDER BY slug_blacklist.created_at DESC, slug_blacklist.slug ASC
    LIMIT ?
  `).bind(...binds).all<SlugBlacklistRow>()

  return result.results
})
