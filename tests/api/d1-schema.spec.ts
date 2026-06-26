import { env } from 'cloudflare:test'
import { beforeAll, describe, expect, it } from 'vitest'
import schemaSql from '../../migrations/0001_core_schema.sql?raw'
import settingsSql from '../../migrations/0002_app_settings.sql?raw'

async function applyCoreSchema() {
  for (const statement of [schemaSql, settingsSql].join('\n').split(';').map(sql => sql.trim()).filter(Boolean))
    await env.DB.prepare(statement).run()
}

describe.sequential('d1 core schema', () => {
  beforeAll(async () => {
    await applyCoreSchema()
  })

  it('applies the core schema', async () => {
    const tables = await env.DB.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
        AND name IN ('students', 'links', 'link_reports', 'slug_blacklist', 'app_settings')
    `).all<{ name: string }>()

    expect(new Set(tables.results.map(table => table.name))).toEqual(new Set([
      'students',
      'links',
      'link_reports',
      'slug_blacklist',
      'app_settings',
    ]))
  })

  it('supports ownership, slug uniqueness, and created-time ordering', async () => {
    const now = Math.floor(Date.now() / 1000)
    const ownerId = `student-${crypto.randomUUID()}`
    const slugA = `d1-schema-a-${crypto.randomUUID()}`
    const slugB = `d1-schema-b-${crypto.randomUUID()}`

    await env.DB.prepare(`
      INSERT INTO students (id, email, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `).bind(ownerId, `${ownerId}@student.clhs.tyc.edu.tw`, now, now).run()

    for (const [slug, createdAt] of [[slugA, now], [slugB, now + 1]] as const) {
      await env.DB.prepare(`
        INSERT INTO links (id, slug, url, owner_id, domain, payload_json, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        crypto.randomUUID(),
        slug,
        `https://example.com/${slug}`,
        ownerId,
        'example.com',
        JSON.stringify({ slug, url: `https://example.com/${slug}` }),
        createdAt,
        createdAt,
      ).run()
    }

    const duplicate = await env.DB.prepare(`
      INSERT OR IGNORE INTO links (id, slug, url, owner_id, domain, payload_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      crypto.randomUUID(),
      slugA,
      'https://example.com/duplicate',
      ownerId,
      'example.com',
      '{}',
      now + 2,
      now + 2,
    ).run()

    expect(duplicate.meta.changes).toBe(0)

    const links = await env.DB.prepare(`
      SELECT slug
      FROM links
      WHERE owner_id = ?
      ORDER BY created_at DESC
      LIMIT 2
    `).bind(ownerId).all<{ slug: string }>()

    expect(links.results.map(link => link.slug)).toEqual([slugB, slugA])
  })
})
