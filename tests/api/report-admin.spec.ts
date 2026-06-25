import { describe, expect, it } from 'vitest'
import { createTestSession, fetchWithAuth, fetchWithToken, getCachedLink, getStoredLinkStatus, postJson, postJsonWithToken } from '../utils'

interface ErrorResponse {
  message?: string
  statusMessage?: string
  statusText?: string
}

function responseMessage(body: ErrorResponse): string {
  return body.message || body.statusMessage || body.statusText || ''
}

describe.sequential('reports and admin moderation', () => {
  it('lets students report links and lets admins disable them', async () => {
    const ownerToken = await createTestSession(`owner-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)
    const reporterToken = await createTestSession(`reporter-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)
    const slug = `report-${crypto.randomUUID()}`

    expect((await postJsonWithToken('/api/link/create', ownerToken, {
      url: 'https://example.com/report-target',
      slug,
    })).status).toBe(201)
    expect(await getCachedLink(slug)).not.toBeNull()

    expect((await postJsonWithToken('/api/link/report', reporterToken, {
      slug: `https://s.clhs.dev/${slug}`,
      reason: 'unsafe',
      details: 'Looks suspicious',
    })).status).toBe(201)

    const reporterHistoryResponse = await fetchWithToken('/api/link/reports?status=open', reporterToken)
    expect(reporterHistoryResponse.status).toBe(200)
    const reporterHistory = await reporterHistoryResponse.json() as { slug: string, reason: string }[]
    expect(reporterHistory).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slug,
        reason: 'unsafe',
      }),
    ]))

    const ownerHistoryResponse = await fetchWithToken('/api/link/reports', ownerToken)
    expect(ownerHistoryResponse.status).toBe(200)
    const ownerHistory = await ownerHistoryResponse.json() as { slug: string }[]
    expect(ownerHistory.map(report => report.slug)).not.toContain(slug)

    const reportsResponse = await fetchWithAuth('/api/admin/reports?status=open')
    expect(reportsResponse.status).toBe(200)
    const reports = await reportsResponse.json() as { id: string, slug: string, reason: string, reporter_email: string }[]
    expect(reports).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slug,
        reason: 'unsafe',
      }),
    ]))

    expect((await postJsonWithToken('/api/admin/link-status', reporterToken, {
      slug,
      status: 'disabled',
    })).status).toBe(403)

    expect((await postJson('/api/admin/link-status', {
      slug,
      status: 'disabled',
    })).status).toBe(200)
    const report = reports.find(item => item.slug === slug)
    expect(report).toBeDefined()
    expect((await postJson('/api/admin/report-status', {
      id: report?.id,
      status: 'resolved',
    })).status).toBe(200)
    const resolvedReportsResponse = await fetchWithAuth('/api/admin/reports?status=resolved')
    const resolvedReports = await resolvedReportsResponse.json() as { id: string }[]
    expect(resolvedReports).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: report?.id }),
    ]))
    expect(await getStoredLinkStatus(slug)).toBe('disabled')
    expect(await getCachedLink(slug)).toBeNull()
  })

  it('lets anonymous users report links with Turnstile', async () => {
    const ownerToken = await createTestSession(`anonymous-owner-${crypto.randomUUID()}@student.clhs.tyc.edu.tw`)
    const slug = `anonymous-report-${crypto.randomUUID()}`

    expect((await postJsonWithToken('/api/link/create', ownerToken, {
      url: 'https://example.com/anonymous-report-target',
      slug,
    })).status).toBe(201)

    expect((await postJson('/api/link/anonymous-report', {
      slug: `https://s.clhs.dev/${slug}`,
      reason: 'abuse',
    }, false)).status).toBe(400)

    expect((await postJson('/api/link/anonymous-report', {
      slug,
      reason: 'abuse',
      turnstileToken: 'wrong-token',
    }, false)).status).toBe(403)

    expect((await postJson('/api/link/anonymous-report', {
      slug: `https://s.clhs.dev/${slug}`,
      reason: 'abuse',
      details: 'Anonymous report',
      turnstileToken: 'test-turnstile-token',
    }, false)).status).toBe(201)

    const reportsResponse = await fetchWithAuth('/api/admin/reports?status=open')
    expect(reportsResponse.status).toBe(200)
    const reports = await reportsResponse.json() as { slug: string, reason: string, reporter_email: string | null }[]
    expect(reports).toEqual(expect.arrayContaining([
      expect.objectContaining({
        slug,
        reason: 'abuse',
        reporter_email: null,
      }),
    ]))
  })

  it('returns useful anonymous report errors', async () => {
    const invalidSlugResponse = await postJson('/api/link/anonymous-report', {
      slug: '%E0%A4%A',
      reason: 'abuse',
      turnstileToken: 'test-turnstile-token',
    }, false)
    expect(invalidSlugResponse.status).toBe(400)
    expect(responseMessage(await invalidSlugResponse.json() as ErrorResponse)).toContain('valid short link')

    const missingLinkResponse = await postJson('/api/link/anonymous-report', {
      slug: `missing-${crypto.randomUUID()}`,
      reason: 'abuse',
      turnstileToken: 'test-turnstile-token',
    }, false)
    expect(missingLinkResponse.status).toBe(404)
    expect(responseMessage(await missingLinkResponse.json() as ErrorResponse)).toContain('Short link not found')

    const failedTurnstileResponse = await postJson('/api/link/anonymous-report', {
      slug: `missing-${crypto.randomUUID()}`,
      reason: 'abuse',
      turnstileToken: 'wrong-token',
    }, false)
    expect(failedTurnstileResponse.status).toBe(403)
    expect(responseMessage(await failedTurnstileResponse.json() as ErrorResponse)).toContain('Turnstile verification failed')
  })
})
