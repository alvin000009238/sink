import type { LinkSchema } from '#shared/schemas/link'
import type { H3Event } from 'h3'
import type { z } from 'zod'
import { parseURL, stringifyParsedURL } from 'ufo'

type Link = z.infer<typeof LinkSchema>
type LinkStatus = 'active' | 'disabled' | 'deleted' | 'pending'
type ListedLink = Link & {
  status: LinkStatus
  owner: {
    id: string
    email: string
    name: string | null
  }
}

interface LinkRow {
  payload_json: string
  status: LinkStatus
  owner_id: string
  owner_email: string
  owner_name: string | null
}

interface ExistingLinkRow {
  owner_id: string
  status: string
}

export function withoutQuery(url: string): string {
  const parsed = parseURL(url)
  return stringifyParsedURL({ ...parsed, search: '' })
}

export function normalizeSlug(event: H3Event, slug: string): string {
  const { caseSensitive } = useRuntimeConfig(event)
  return caseSensitive ? slug : slug.toLowerCase()
}

export function buildShortLink(event: H3Event, slug: string): string {
  return `${getRequestProtocol(event)}://${getRequestHost(event)}/${slug}`
}

function getDomain(url: string): string {
  return new URL(url).hostname.toLowerCase()
}

function parseStoredLink(row: Pick<LinkRow, 'payload_json'> | null): Link | null {
  return row ? JSON.parse(row.payload_json) as Link : null
}

function parseListedLink(row: LinkRow): ListedLink {
  return {
    ...JSON.parse(row.payload_json) as Link,
    status: row.status,
    owner: {
      id: row.owner_id,
      email: row.owner_email,
      name: row.owner_name,
    },
  }
}

function metadataForLink(link: Link): Record<string, unknown> {
  return {
    expiration: link.expiration,
    url: withoutQuery(link.url),
    comment: link.comment,
  }
}

function rejectCreate(statusText: string): never {
  throw createError({
    status: 400,
    statusText,
  })
}

function linkAccessClause(event: H3Event): { sql: string, binds: string[] } {
  const user = getAuthUser(event)
  if (!user || user.role === 'admin')
    return { sql: '', binds: [] }

  return { sql: 'AND owner_id = ?', binds: [user.id] }
}

export async function enforceLinkCreatePolicy(event: H3Event, slug: string): Promise<void> {
  const { reserveSlug } = useAppConfig()
  if (reserveSlug.includes(slug))
    rejectCreate('Slug is reserved')

  const { cloudflare } = event.context
  const { DB } = cloudflare.env
  const blacklisted = await DB.prepare('SELECT slug FROM slug_blacklist WHERE slug = ?').bind(slug).first<{ slug: string }>()
  if (blacklisted)
    rejectCreate('Slug is blocked')

  const user = getAuthUser(event)
  if (!user || user.role === 'admin')
    return

  const limit = Math.max(0, Math.floor(Number(useRuntimeConfig(event).dailyCreateLimit)))
  if (limit === 0)
    return

  const now = Math.floor(Date.now() / 1000)
  const dayStart = now - (now % 86400)
  const row = await DB.prepare(`
    SELECT COUNT(*) as count
    FROM links
    WHERE owner_id = ?
      AND created_at >= ?
      AND status <> 'deleted'
  `).bind(user.id, dayStart).first<{ count: number }>()

  if ((row?.count ?? 0) >= limit)
    rejectCreate('Daily link creation limit reached')
}

async function putRedirectCache(event: H3Event, link: Link): Promise<void> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  const expiration = getExpiration(event, link.expiration)

  await KV.put(`link:${link.slug}`, JSON.stringify(link), {
    expiration,
    metadata: {
      expiration,
      url: withoutQuery(link.url),
      comment: link.comment,
    },
  })
}

export async function putLink(event: H3Event, link: Link): Promise<void> {
  const { cloudflare } = event.context
  const { DB } = cloudflare.env
  await ensureSystemOwner(DB)
  const ownerId = getAuthUser(event)?.id ?? SYSTEM_OWNER_ID
  const existing = await DB.prepare('SELECT owner_id, status FROM links WHERE slug = ?').bind(link.slug).first<ExistingLinkRow>()
  if (existing) {
    const user = getAuthUser(event)
    if (existing.status !== 'active' || (user?.role !== 'admin' && existing.owner_id !== ownerId)) {
      throw createError({
        status: 409,
        statusText: 'Link already exists',
      })
    }
  }

  await DB.prepare(`
    INSERT INTO links (
      id, slug, url, owner_id, purpose, domain, comment, payload_json,
      status, created_at, updated_at, expiration
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
    ON CONFLICT(slug) DO UPDATE SET
      id = excluded.id,
      url = excluded.url,
      purpose = excluded.purpose,
      domain = excluded.domain,
      comment = excluded.comment,
      payload_json = excluded.payload_json,
      status = 'active',
      updated_at = excluded.updated_at,
      expiration = excluded.expiration
  `).bind(
    link.id,
    link.slug,
    link.url,
    ownerId,
    // ponytail: purpose reuses comment until the product needs a separate field.
    link.comment ?? null,
    getDomain(link.url),
    link.comment ?? null,
    JSON.stringify(link),
    link.createdAt,
    link.updatedAt,
    link.expiration ?? null,
  ).run()

  await putRedirectCache(event, link)
}

export async function getLink(event: H3Event, slug: string, cacheTtl?: number, checkAccess = false): Promise<Link | null> {
  const { cloudflare } = event.context
  const { KV } = cloudflare.env
  if (cacheTtl !== undefined && !checkAccess) {
    const cachedLink = await KV.get(`link:${slug}`, { type: 'json', cacheTtl }) as Link | null
    if (cachedLink)
      return cachedLink
  }

  const { sql, binds } = checkAccess ? linkAccessClause(event) : { sql: '', binds: [] }
  const { DB } = cloudflare.env
  const now = Math.floor(Date.now() / 1000)
  const row = await DB.prepare(`
    SELECT payload_json
    FROM links
    WHERE slug = ?
      AND status = 'active'
      AND (expiration IS NULL OR expiration > ?)
      ${sql}
  `).bind(slug, now, ...binds).first<LinkRow>()
  const link = parseStoredLink(row)

  if (link && cacheTtl !== undefined && !checkAccess)
    await putRedirectCache(event, link)

  return link
}

export async function getLinkWithMetadata(event: H3Event, slug: string): Promise<{ link: Link | null, metadata: Record<string, unknown> | null }> {
  const link = await getLink(event, slug, undefined, true)
  return { link, metadata: link ? metadataForLink(link) : null }
}

export async function deleteLink(event: H3Event, slug: string): Promise<void> {
  const { cloudflare } = event.context
  const { DB, KV } = cloudflare.env
  const { sql, binds } = linkAccessClause(event)
  const row = await DB.prepare(`SELECT slug FROM links WHERE slug = ? ${sql}`).bind(slug, ...binds).first<{ slug: string }>()
  if (!row) {
    throw createError({
      status: 404,
      message: 'Link not found or you do not have permission to delete it.',
      statusText: 'Link not found or you do not have permission to delete it.',
    })
  }

  await DB.prepare(`DELETE FROM links WHERE slug = ? ${sql}`).bind(slug, ...binds).run()
  await KV.delete(`link:${slug}`)
}

export async function setLinkStatus(event: H3Event, slug: string, status: 'active' | 'disabled' | 'deleted' | 'pending'): Promise<void> {
  const { cloudflare } = event.context
  const { DB, KV } = cloudflare.env
  const row = await DB.prepare('SELECT payload_json FROM links WHERE slug = ?').bind(slug).first<LinkRow>()
  if (!row) {
    throw createError({
      status: 404,
      message: 'Link not found. Check the slug and try again.',
      statusText: 'Link not found. Check the slug and try again.',
    })
  }

  await DB.prepare('UPDATE links SET status = ?, updated_at = ? WHERE slug = ?')
    .bind(status, Math.floor(Date.now() / 1000), slug)
    .run()

  if (status === 'active') {
    const link = parseStoredLink(row)
    if (link)
      await putRedirectCache(event, link)
    return
  }

  await KV.delete(`link:${slug}`)
}

export async function linkExists(event: H3Event, slug: string): Promise<boolean> {
  const link = await getLink(event, slug)
  return link !== null
}

export async function linkSlugExists(event: H3Event, slug: string): Promise<boolean> {
  const row = await event.context.cloudflare.env.DB.prepare('SELECT slug FROM links WHERE slug = ?').bind(slug).first<{ slug: string }>()
  return row !== null
}

interface ListLinksOptions {
  limit: number
  cursor?: string
  creator?: string
  domain?: string
  order?: 'asc' | 'desc'
  owner?: string
  purpose?: string
  status?: LinkStatus | 'all'
}

interface ListLinksResult {
  links: ListedLink[]
  list_complete: boolean
  cursor?: string
}

export async function listLinks(event: H3Event, options: ListLinksOptions): Promise<ListLinksResult> {
  const { cloudflare } = event.context
  const { DB } = cloudflare.env
  const offset = Math.max(0, Number.parseInt(options.cursor || '0') || 0)
  const limit = Math.max(0, options.limit)
  const now = Math.floor(Date.now() / 1000)
  const user = getAuthUser(event)
  const order = options.order === 'asc' ? 'ASC' : 'DESC'
  const creator = options.creator ?? options.owner
  const clauses: string[] = ['1 = 1']
  const binds: (number | string)[] = []

  if (user?.role !== 'admin') {
    clauses.push('links.status = \'active\'')
    clauses.push('(links.expiration IS NULL OR links.expiration > ?)')
    binds.push(now)
    clauses.push('links.owner_id = ?')
    binds.push(user?.id ?? SYSTEM_OWNER_ID)
  }
  else if (options.status && options.status !== 'all') {
    clauses.push('links.status = ?')
    binds.push(options.status)
    if (options.status === 'active') {
      clauses.push('(links.expiration IS NULL OR links.expiration > ?)')
      binds.push(now)
    }
  }
  else if (!options.status) {
    clauses.push('links.status = \'active\'')
    clauses.push('(links.expiration IS NULL OR links.expiration > ?)')
    binds.push(now)
  }
  if (options.domain) {
    clauses.push('links.domain = ?')
    binds.push(options.domain)
  }
  if (creator) {
    clauses.push('(links.owner_id = ? OR students.email = ?)')
    binds.push(creator, creator)
  }
  if (options.purpose) {
    clauses.push('links.purpose = ?')
    binds.push(options.purpose)
  }

  const result = await DB.prepare(`
    SELECT
      links.payload_json,
      links.status,
      students.id as owner_id,
      students.email as owner_email,
      students.name as owner_name
    FROM links
    JOIN students ON students.id = links.owner_id
    WHERE ${clauses.join(' AND ')}
    ORDER BY links.created_at ${order}, links.slug ASC
    LIMIT ? OFFSET ?
  `).bind(...binds, limit + 1, offset).all<LinkRow>()

  const rows = result.results.slice(0, limit)
  const links = rows.map(row => parseListedLink(row))
  const listComplete = result.results.length <= limit

  return {
    links,
    list_complete: listComplete,
    cursor: listComplete ? undefined : String(offset + limit),
  }
}
