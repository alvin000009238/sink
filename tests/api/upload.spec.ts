import { describe, expect, it } from 'vitest'
import { createTestSession, fetch, fetchWithAuth, fetchWithToken, postJsonWithToken, TEST_PNG_BYTES } from '../utils'

describe('/api/upload/image', () => {
  it('uploads image with valid file and slug', async () => {
    const token = await createTestSession(`upload-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)
    const slug = `test-upload-${crypto.randomUUID()}`
    expect((await postJsonWithToken('/api/link/create', token, {
      url: 'https://example.com/upload',
      slug,
    })).status).toBe(201)

    const formData = new FormData()
    const file = new File([TEST_PNG_BYTES], 'test.png', { type: 'image/png' })
    formData.append('file', file)
    formData.append('slug', slug)

    const response = await fetchWithToken('/api/upload/image', token, {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(200)

    const data = await response.json() as { key: string, url: string }
    expect(data.key).toContain(`images/${slug}/`)
    expect(data.url).toBe(`/_assets/${data.key}`)
  })

  it('rejects image uploads for links owned by another student', async () => {
    const ownerToken = await createTestSession(`upload-owner-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)
    const otherToken = await createTestSession(`upload-other-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)
    const slug = `test-upload-owner-${crypto.randomUUID()}`
    expect((await postJsonWithToken('/api/link/create', ownerToken, {
      url: 'https://example.com/upload-owner',
      slug,
    })).status).toBe(201)

    const formData = new FormData()
    formData.append('file', new File([TEST_PNG_BYTES], 'test.png', { type: 'image/png' }))
    formData.append('slug', slug)

    const response = await fetchWithToken('/api/upload/image', otherToken, {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(403)
  })

  it('returns 400 when file is missing', async () => {
    const formData = new FormData()
    formData.append('slug', 'test-slug')

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 when slug is missing', async () => {
    const formData = new FormData()
    const file = new File(['test'], 'test.png', { type: 'image/png' })
    formData.append('file', file)

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid file type', async () => {
    const formData = new FormData()
    const file = new File(['test content'], 'test.txt', { type: 'text/plain' })
    formData.append('file', file)
    formData.append('slug', 'test-slug')

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for file exceeding 5MB limit', async () => {
    const formData = new FormData()
    const largeContent = new Uint8Array(5 * 1024 * 1024 + 1)
    const file = new File([largeContent], 'large.png', { type: 'image/png' })
    formData.append('file', file)
    formData.append('slug', 'test-slug')

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })

  it('returns 400 for invalid slug format', async () => {
    const formData = new FormData()
    const file = new File([TEST_PNG_BYTES], 'test.png', { type: 'image/png' })
    formData.append('file', file)
    formData.append('slug', 'invalid<>slug/path')

    const response = await fetchWithAuth('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(400)
  })

  it('returns 401 when accessing without auth', async () => {
    const formData = new FormData()
    formData.append('slug', 'test-slug')

    const response = await fetch('/api/upload/image', {
      method: 'POST',
      body: formData,
    })
    expect(response.status).toBe(401)
  })
})
