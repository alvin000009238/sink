import type { H3Event } from 'h3'
import { LinkSchema } from '#shared/schemas/link'
import { z } from 'zod'

export const LinkReportSchema = z.object({
  slug: z.string().trim().min(1).max(2048),
  reason: z.string().trim().min(1).max(128),
  details: z.string().trim().max(2048).optional(),
})

interface TurnstileVerifyResponse {
  'success': boolean
  'error-codes'?: string[]
}

function targetToSlug(event: H3Event, target: string): string {
  const trimmed = target.trim()
  let rawSlug = trimmed

  try {
    const url = new URL(trimmed)
    rawSlug = url.pathname.split('/').filter(Boolean)[0] ?? ''
  }
  catch {
    // Treat non-URLs as raw slugs.
  }

  let decodedSlug = rawSlug
  try {
    decodedSlug = decodeURIComponent(rawSlug)
  }
  catch {
    throw createError({
      status: 400,
      message: 'Enter a valid short link URL or slug.',
      statusText: 'Enter a valid short link URL or slug.',
    })
  }

  const slug = normalizeSlug(event, decodedSlug.trim())
  const parsed = LinkSchema.shape.slug.removeDefault().min(1).safeParse(slug)
  if (!parsed.success) {
    throw createError({
      status: 400,
      message: 'Enter a valid short link URL or slug.',
      statusText: 'Enter a valid short link URL or slug.',
    })
  }

  return parsed.data
}

export async function createLinkReport(event: H3Event, target: string, reason: string, details: string | undefined, reporterId: string | null): Promise<void> {
  const slug = targetToSlug(event, target)
  const { DB } = event.context.cloudflare.env
  const link = await DB.prepare(`
    SELECT id
    FROM links
    WHERE slug = ?
      AND status = 'active'
  `).bind(slug).first<{ id: string }>()

  if (!link) {
    throw createError({
      status: 404,
      message: 'Short link not found. Check the URL or slug and try again.',
      statusText: 'Short link not found. Check the URL or slug and try again.',
    })
  }

  await DB.prepare(`
    INSERT INTO link_reports (id, link_id, reporter_id, reason, details, status, created_at)
    VALUES (?, ?, ?, ?, ?, 'open', ?)
  `).bind(crypto.randomUUID(), link.id, reporterId, reason, details ?? null, Math.floor(Date.now() / 1000)).run()
}

export async function verifyTurnstile(event: H3Event, token: string): Promise<void> {
  const config = useRuntimeConfig(event)
  if (config.testMockTurnstile) {
    if (token === 'test-turnstile-token')
      return

    throw createError({
      status: 403,
      message: 'Turnstile verification failed. Please try again.',
      statusText: 'Turnstile verification failed. Please try again.',
    })
  }

  if (!config.turnstileSecretKey) {
    throw createError({
      status: 500,
      message: 'Turnstile is not configured. Contact an administrator.',
      statusText: 'Turnstile is not configured. Contact an administrator.',
    })
  }

  const body = new FormData()
  body.set('secret', config.turnstileSecretKey)
  body.set('response', token)
  const remoteIp = getRequestIP(event, { xForwardedFor: true })
  if (remoteIp)
    body.set('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body,
  })
  if (!response.ok) {
    throw createError({
      status: 502,
      message: 'Could not verify Turnstile right now. Please try again later.',
      statusText: 'Could not verify Turnstile right now. Please try again later.',
    })
  }

  const result = await response.json() as TurnstileVerifyResponse
  if (!result.success) {
    throw createError({
      status: 403,
      message: 'Turnstile verification failed. Please try again.',
      statusText: 'Turnstile verification failed. Please try again.',
    })
  }
}
