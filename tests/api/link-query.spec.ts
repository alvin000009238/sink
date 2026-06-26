import { describe, expect, it } from 'vitest'
import { createTestSession, fetchWithAuth, fetchWithToken, postJson, postJsonWithToken } from '../utils'

interface LinkListResponse {
  links: {
    slug: string
    status?: string
    owner?: {
      id: string
      email: string
      name: string | null
    }
  }[]
}

describe.sequential('/api/link/list filters', () => {
  it('filters by domain, creator, purpose, and creation order', async () => {
    const ownerAEmail = `query-a-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`
    const ownerBEmail = `query-b-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`
    const ownerA = await createTestSession(ownerAEmail)
    const ownerB = await createTestSession(ownerBEmail)
    const domain = `${crypto.randomUUID()}.example.com`
    const otherDomain = `${crypto.randomUUID()}.example.com`
    const oldSlug = `query-old-${crypto.randomUUID()}`
    const newSlug = `query-new-${crypto.randomUUID()}`
    const otherSlug = `query-other-${crypto.randomUUID()}`
    const createdAt = Math.floor(Date.now() / 1000) - 3600

    expect((await postJsonWithToken('/api/link/create', ownerA, {
      url: `https://${domain}/old`,
      slug: oldSlug,
      comment: 'club',
      createdAt,
    })).status).toBe(201)
    expect((await postJsonWithToken('/api/link/create', ownerB, {
      url: `https://${domain}/new`,
      slug: newSlug,
      comment: 'class',
      createdAt: createdAt + 10,
    })).status).toBe(201)
    expect((await postJsonWithToken('/api/link/create', ownerA, {
      url: `https://${otherDomain}/other`,
      slug: otherSlug,
      comment: 'club',
      createdAt: createdAt + 20,
    })).status).toBe(201)

    const byDomain = await (await fetchWithAuth(`/api/link/list?limit=10&domain=${domain}&order=asc`)).json() as LinkListResponse
    expect(byDomain.links.map(link => link.slug)).toEqual([oldSlug, newSlug])
    expect(byDomain.links.find(link => link.slug === oldSlug)?.owner).toMatchObject({
      email: ownerAEmail,
      name: ownerAEmail,
    })
    expect(byDomain.links.find(link => link.slug === newSlug)?.owner).toMatchObject({
      email: ownerBEmail,
      name: ownerBEmail,
    })

    const byCreator = await (await fetchWithAuth(`/api/link/list?limit=10&creator=${ownerAEmail}`)).json() as LinkListResponse
    expect(byCreator.links.map(link => link.slug)).toEqual(expect.arrayContaining([oldSlug, otherSlug]))
    expect(byCreator.links.map(link => link.slug)).not.toContain(newSlug)
    expect(byCreator.links.every(link => link.owner?.email === ownerAEmail)).toBe(true)

    const byPurpose = await (await fetchWithAuth('/api/link/list?limit=10&purpose=class')).json() as LinkListResponse
    expect(byPurpose.links.map(link => link.slug)).toContain(newSlug)
    expect(byPurpose.links.map(link => link.slug)).not.toContain(oldSlug)

    const studentEscape = await (await fetchWithToken(`/api/link/list?limit=10&creator=${ownerAEmail}`, ownerB)).json() as LinkListResponse
    expect(studentEscape.links.map(link => link.slug)).not.toContain(oldSlug)
  })

  it('lets admins list deleted slugs without exposing them to students', async () => {
    const ownerEmail = `query-deleted-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`
    const ownerToken = await createTestSession(ownerEmail)
    const deletedSlug = `query-deleted-${crypto.randomUUID()}`

    expect((await postJsonWithToken('/api/link/create', ownerToken, {
      url: 'https://example.com/deleted',
      slug: deletedSlug,
    })).status).toBe(201)
    expect((await postJson('/api/admin/link-status', {
      slug: deletedSlug,
      status: 'deleted',
    })).status).toBe(200)

    const defaultList = await (await fetchWithAuth(`/api/link/list?limit=10&creator=${ownerEmail}`)).json() as LinkListResponse
    expect(defaultList.links.map(link => link.slug)).not.toContain(deletedSlug)

    const allList = await (await fetchWithAuth(`/api/link/list?limit=10&creator=${ownerEmail}&status=all`)).json() as LinkListResponse
    expect(allList.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: deletedSlug, status: 'deleted' }),
    ]))

    const deletedList = await (await fetchWithAuth(`/api/link/list?limit=10&creator=${ownerEmail}&status=deleted`)).json() as LinkListResponse
    expect(deletedList.links).toEqual(expect.arrayContaining([
      expect.objectContaining({ slug: deletedSlug, status: 'deleted' }),
    ]))

    const studentList = await (await fetchWithToken(`/api/link/list?limit=10&status=all`, ownerToken)).json() as LinkListResponse
    expect(studentList.links.map(link => link.slug)).not.toContain(deletedSlug)
  })
})
