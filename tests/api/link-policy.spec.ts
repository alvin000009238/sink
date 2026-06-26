import { env } from 'cloudflare:test'
import { describe, expect, it } from 'vitest'
import { createTestSession, fetchWithAuth, fetchWithToken, getCachedLink, getStoredLinkStatus, postJson, postJsonWithToken } from '../utils'

describe.sequential('link create policy', () => {
  it('rejects reserved and blocked slugs', async () => {
    const blockedSlug = `blocked-${crypto.randomUUID()}`
    await env.DB.prepare(`
      INSERT INTO slug_blacklist (slug, reason, created_at)
      VALUES (?, ?, ?)
    `).bind(blockedSlug, 'test', Math.floor(Date.now() / 1000)).run()

    expect((await postJson('/api/link/create', {
      url: 'https://example.com/reserved',
      slug: 'dashboard',
    })).status).toBe(400)

    expect((await postJson('/api/link/create', {
      url: 'https://example.com/blocked',
      slug: blockedSlug,
    })).status).toBe(400)
  })

  it('lets admins manage the slug blacklist', async () => {
    const token = await createTestSession(`blacklist-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)
    const slug = `admin-blocked-${crypto.randomUUID()}`
    const specialSlug = `blocked.example:${crypto.randomUUID()}`

    expect((await postJsonWithToken('/api/admin/slug-blacklist', token, {
      slug,
      reason: 'test',
    })).status).toBe(403)
    expect((await fetchWithToken('/api/admin/slug-blacklist', token)).status).toBe(403)

    expect((await postJson('/api/admin/slug-blacklist', {
      slug,
      reason: 'test',
    })).status).toBe(200)
    expect((await postJson('/api/admin/slug-blacklist', {
      slug: specialSlug,
      reason: 'special',
    })).status).toBe(200)
    const blacklistResponse = await fetchWithAuth(`/api/admin/slug-blacklist?search=${slug}`)
    expect(blacklistResponse.status).toBe(200)
    const blacklist = await blacklistResponse.json() as { slug: string, reason: string | null }[]
    expect(blacklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug, reason: 'test' }),
    ]))
    const specialBlacklist = await (await fetchWithAuth('/api/admin/slug-blacklist?search=blocked.example:')).json() as { slug: string, reason: string | null }[]
    expect(specialBlacklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: specialSlug, reason: 'special' }),
    ]))
    expect((await postJson('/api/link/create', {
      url: 'https://example.com/admin-blocked',
      slug,
    })).status).toBe(400)

    expect((await postJson('/api/admin/slug-blacklist', {
      slug,
      blocked: false,
    })).status).toBe(200)
    expect((await postJson('/api/admin/slug-blacklist', {
      slug: specialSlug,
      blocked: false,
    })).status).toBe(200)
    const unblockedResponse = await fetchWithAuth(`/api/admin/slug-blacklist?search=${slug}`)
    const unblocked = await unblockedResponse.json() as { slug: string }[]
    expect(unblocked.map(item => item.slug)).not.toContain(slug)
    expect((await postJson('/api/link/create', {
      url: 'https://example.com/admin-unblocked',
      slug,
    })).status).toBe(201)
  })

  it('lets admins block multiple slugs at once', async () => {
    const firstSlug = `bulk-blocked-${crypto.randomUUID()}`
    const secondSlug = `bulk-blocked-${crypto.randomUUID()}`

    const response = await postJson('/api/admin/slug-blacklist', {
      slugs: `${firstSlug}\n\n ${secondSlug} \n${firstSlug}`,
    })
    expect(response.status).toBe(200)
    expect(await response.json()).toMatchObject({ success: true, blocked: true, count: 2 })

    const blacklistResponse = await fetchWithAuth('/api/admin/slug-blacklist?search=bulk-blocked-')
    expect(blacklistResponse.status).toBe(200)
    const blacklist = await blacklistResponse.json() as { slug: string, reason: string | null }[]
    expect(blacklist).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: firstSlug, reason: null }),
      expect.objectContaining({ slug: secondSlug, reason: null }),
    ]))

    for (const blockedSlug of [firstSlug, secondSlug]) {
      expect((await postJson('/api/link/create', {
        url: `https://example.com/${blockedSlug}`,
        slug: blockedSlug,
      })).status).toBe(400)
    }
  })

  it('limits student-created links per day', async () => {
    const token = await createTestSession(`quota-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)

    for (let i = 0; i < 20; i++) {
      const response = await postJsonWithToken('/api/link/create', token, {
        url: `https://example.com/quota/${i}`,
        slug: `quota-${i}-${crypto.randomUUID()}`,
      })
      expect(response.status).toBe(201)
    }

    const limitedResponse = await postJsonWithToken('/api/link/create', token, {
      url: 'https://example.com/quota/limited',
      slug: `quota-limited-${crypto.randomUUID()}`,
    })
    expect(limitedResponse.status).toBe(400)
  })

  it('lets admins change the student daily link limit', async () => {
    const token = await createTestSession(`quota-config-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)

    expect((await postJsonWithToken('/api/admin/settings', token, { dailyCreateLimit: 1 })).status).toBe(403)

    const updateResponse = await postJson('/api/admin/settings', { dailyCreateLimit: 1 })
    expect(updateResponse.status).toBe(200)
    expect(await updateResponse.json()).toEqual({ dailyCreateLimit: 1 })

    const settingsResponse = await fetchWithAuth('/api/admin/settings')
    expect(settingsResponse.status).toBe(200)
    expect(await settingsResponse.json()).toEqual({ dailyCreateLimit: 1 })

    expect((await postJsonWithToken('/api/link/create', token, {
      url: 'https://example.com/quota-config/first',
      slug: `quota-config-first-${crypto.randomUUID()}`,
    })).status).toBe(201)

    expect((await postJsonWithToken('/api/link/create', token, {
      url: 'https://example.com/quota-config/second',
      slug: `quota-config-second-${crypto.randomUUID()}`,
    })).status).toBe(400)

    await postJson('/api/admin/settings', { dailyCreateLimit: 20 })
  })

  it('does not let students recreate inactive slugs', async () => {
    const token = await createTestSession(`inactive-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)
    const slug = `inactive-${crypto.randomUUID()}`

    expect((await postJsonWithToken('/api/link/create', token, {
      url: 'https://example.com/inactive',
      slug,
    })).status).toBe(201)
    expect((await postJson('/api/admin/link-status', {
      slug,
      status: 'disabled',
    })).status).toBe(200)
    expect(await getStoredLinkStatus(slug)).toBe('disabled')
    expect(await getCachedLink(slug)).toBeNull()

    expect((await postJsonWithToken('/api/link/create', token, {
      url: 'https://example.com/recreate',
      slug,
    })).status).toBe(409)
    expect((await postJsonWithToken('/api/link/upsert', token, {
      url: 'https://example.com/upsert',
      slug,
    })).status).toBe(409)

    const importResponse = await postJsonWithToken('/api/link/import', token, {
      version: '1.0',
      links: [{
        url: 'https://example.com/import',
        slug,
      }],
    })
    expect(importResponse.status).toBe(200)
    const importData = await importResponse.json() as { skipped: number, success: number }
    expect(importData.success).toBe(0)
    expect(importData.skipped).toBe(1)
    expect(await getStoredLinkStatus(slug)).toBe('disabled')
    expect(await getCachedLink(slug)).toBeNull()
  })
})
