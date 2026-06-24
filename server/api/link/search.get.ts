import type { LinkSearchItem } from '#shared/types/link'

defineRouteMeta({
  openAPI: {
    description: 'Search all links (returns slug, url, comment for each link)',
    security: [{ bearerAuth: [] }],
  },
})

interface SearchRow {
  slug: string
  url: string
  comment: string | null
}

export default eventHandler(async (event) => {
  const { cloudflare } = event.context
  const { DB } = cloudflare.env
  const now = Math.floor(Date.now() / 1000)
  const user = requireAuthUser(event)
  const ownerFilter = user.role === 'admin' ? '' : 'AND owner_id = ?'
  const ownerBinds = user.role === 'admin' ? [] : [user.id]

  try {
    const result = await DB.prepare(`
      SELECT slug, url, comment
      FROM links
      WHERE status = 'active'
        AND (expiration IS NULL OR expiration > ?)
        ${ownerFilter}
      ORDER BY created_at DESC, slug ASC
    `).bind(now, ...ownerBinds).all<SearchRow>()

    return result.results.map((link): LinkSearchItem => ({
      slug: link.slug,
      url: withoutQuery(link.url),
      comment: link.comment ?? undefined,
    }))
  }
  catch (err) {
    console.error('Error fetching link list:', err)
    throw createError({
      status: 500,
      statusText: 'Failed to fetch link list',
    })
  }
})
