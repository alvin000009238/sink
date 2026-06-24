import { describe, expect, it } from 'vitest'
import { createTestSession, fetchWithAuth, fetchWithToken, getCachedLink, getStoredLinkOwner, postJsonWithToken, putJsonWithToken } from '../utils'

describe.sequential('link ownership', () => {
  it('limits student sessions to their own links while admins can see all links', async () => {
    const studentA = await createTestSession('a@student.clhs.tyc.edu.tw')
    const studentB = await createTestSession('b@student.clhs.tyc.edu.tw')
    const slugA = `own-a-${crypto.randomUUID()}`
    const slugB = `own-b-${crypto.randomUUID()}`

    expect(await postJsonWithToken('/api/link/create', studentA, {
      url: 'https://example.com/a',
      slug: slugA,
    })).toHaveProperty('status', 201)
    expect(await postJsonWithToken('/api/link/create', studentB, {
      url: 'https://example.com/b',
      slug: slugB,
    })).toHaveProperty('status', 201)

    expect(await getStoredLinkOwner(slugA)).toBe('test:a@student.clhs.tyc.edu.tw')
    expect(await getStoredLinkOwner(slugB)).toBe('test:b@student.clhs.tyc.edu.tw')

    const listResponse = await fetchWithToken('/api/link/list?limit=1000', studentA)
    expect(listResponse.status).toBe(200)
    const listData = await listResponse.json() as { links: { slug: string }[] }
    expect(listData.links.map(link => link.slug)).toContain(slugA)
    expect(listData.links.map(link => link.slug)).not.toContain(slugB)

    const searchResponse = await fetchWithToken('/api/link/search', studentA)
    expect(searchResponse.status).toBe(200)
    const searchData = await searchResponse.json() as { slug: string }[]
    expect(searchData.map(link => link.slug)).toContain(slugA)
    expect(searchData.map(link => link.slug)).not.toContain(slugB)

    const exportResponse = await fetchWithToken('/api/link/export', studentA)
    expect(exportResponse.status).toBe(200)
    const exportData = await exportResponse.json() as { links: { slug: string }[] }
    expect(exportData.links.map(link => link.slug)).toContain(slugA)
    expect(exportData.links.map(link => link.slug)).not.toContain(slugB)

    const queryOtherResponse = await fetchWithToken(`/api/link/query?slug=${slugB}`, studentA)
    const editOtherResponse = await putJsonWithToken('/api/link/edit', studentA, { url: 'https://example.com/b2', slug: slugB })
    const deleteOtherResponse = await postJsonWithToken('/api/link/delete', studentA, { slug: slugB })
    const checkOtherResponse = await postJsonWithToken('/api/link/check', studentA, {
      links: [{ slug: slugB, url: 'https://example.com/b' }],
      timeout: 1,
    })
    expect(queryOtherResponse.status).toBe(404)
    expect(editOtherResponse.status).toBe(404)
    expect(deleteOtherResponse.status).toBe(404)
    expect(checkOtherResponse.status).toBe(200)
    expect(await checkOtherResponse.json()).toEqual(expect.objectContaining({
      results: [expect.objectContaining({
        slug: slugB,
        ok: false,
        error: 'Link not found',
      })],
    }))
    expect(await getCachedLink(slugB)).toEqual(expect.objectContaining({ slug: slugB }))
    expect((await fetchWithAuth(`/api/link/query?slug=${slugB}`)).status).toBe(200)

    expect((await fetchWithToken(`/api/stats/counters?slug=${slugA}`, studentA)).status).toBe(200)
    expect((await fetchWithToken('/api/stats/counters', studentA)).status).toBe(200)
    expect((await fetchWithToken(`/api/stats/counters?slug=${slugB}`, studentA)).status).toBe(403)
    expect((await fetchWithToken(`/api/logs/events?slug=${slugB}`, studentA)).status).toBe(403)
  })
})
