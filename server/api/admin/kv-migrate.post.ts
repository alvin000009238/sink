import { LinkSchema } from '#shared/schemas/link'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Migrate legacy KV link records into D1',
    security: [{ bearerAuth: [] }],
  },
})

const KvMigrateSchema = z.object({
  cursor: z.string().trim().optional(),
  limit: z.coerce.number().int().min(1).max(1000).default(100),
  prefix: z.string().default(''),
})

export default eventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedBody(event, KvMigrateSchema.parse)
  const { DB, KV } = event.context.cloudflare.env
  const listed = await KV.list({
    cursor: body.cursor,
    limit: body.limit,
    prefix: body.prefix,
  })

  const result = {
    scanned: listed.keys.length,
    migrated: 0,
    skipped: 0,
    failed: 0,
    cursor: listed.list_complete ? undefined : listed.cursor,
    list_complete: listed.list_complete,
  }

  for (const key of listed.keys) {
    try {
      const value = await KV.get(key.name, { type: 'json' })
      const parsed = LinkSchema.safeParse(value)
      if (!parsed.success) {
        result.skipped++
        continue
      }

      const link = parsed.data
      link.slug = normalizeSlug(event, link.slug)

      const existing = await DB.prepare('SELECT slug FROM links WHERE slug = ?').bind(link.slug).first<{ slug: string }>()
      if (existing) {
        result.skipped++
        continue
      }

      if (link.password)
        link.password = await normalizeLinkPasswordForStorage(link.password)

      await putLink(event, link)
      result.migrated++
    }
    catch (error) {
      console.error(`Failed to migrate KV key ${key.name}:`, error)
      result.failed++
    }
  }

  return result
})
