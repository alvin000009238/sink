import type { Query } from '#shared/schemas/query'
import type { H3Event } from 'h3'
import type { SelectStatement } from 'sql-bricks'
import type { BlobsKey } from './access-log'

const { in: $in, and } = SqlBricks

export type { Query }

export function query2filter(query: Query) {
  const filter = []
  if (query.id)
    filter.push($in('index1', query.id.split(',').filter(Boolean)))

  const blobKeys = Object.keys(blobsMap) as BlobsKey[]
  for (const blobKey of blobKeys) {
    const queryKey = blobsMap[blobKey] as keyof Query
    const value = query[queryKey]
    if (typeof value === 'string' && value) {
      filter.push($in(blobKey, value.split(',')))
    }
  }

  return filter.length ? and(...filter) : []
}

export async function scopeQueryToOwnedLinks<T extends Query>(event: H3Event, query: T): Promise<T> {
  const user = getAuthUser(event)
  if (!user || user.role === 'admin')
    return query

  const result = await event.context.cloudflare.env.DB.prepare(`
    SELECT slug
    FROM links
    WHERE owner_id = ?
      AND status = 'active'
  `).bind(user.id).all<{ slug: string }>()
  const ownedSlugs = new Set(result.results.map(link => link.slug))

  if (query.slug) {
    const requestedSlugs = query.slug.split(',').filter(Boolean)
    if (requestedSlugs.some(slug => !ownedSlugs.has(slug))) {
      throw createError({
        status: 403,
        statusText: 'Forbidden',
      })
    }

    return query
  }

  return {
    ...query,
    slug: [...ownedSlugs].join(',') || '__no_owned_links__',
  }
}

export function appendTimeFilter(sql: SelectStatement, query: Query): SelectStatement {
  if (query.startAt) {
    const startTimestamp = Math.floor(Number(query.startAt))
    sql.where(SqlBricks.gte('timestamp', SqlBricks(`toDateTime(${startTimestamp})`)))
  }

  if (query.endAt) {
    const endTimestamp = Math.floor(Number(query.endAt))
    sql.where(SqlBricks.lte('timestamp', SqlBricks(`toDateTime(${endTimestamp})`)))
  }

  return sql
}
