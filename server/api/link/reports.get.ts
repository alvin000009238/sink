import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'List reports submitted by the current user',
    security: [{ bearerAuth: [] }],
  },
})

const ReportsQuerySchema = z.object({
  status: z.enum(['open', 'reviewing', 'resolved', 'rejected']).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

interface ReportRow {
  id: string
  slug: string
  reason: string
  details: string | null
  status: string
  created_at: number
}

export default eventHandler(async (event) => {
  const user = requireAuthUser(event)
  const query = await getValidatedQuery(event, ReportsQuerySchema.parse)
  const statusFilter = query.status ? 'AND link_reports.status = ?' : ''
  const binds = query.status ? [user.id, query.status, query.limit] : [user.id, query.limit]

  const result = await event.context.cloudflare.env.DB.prepare(`
    SELECT link_reports.id, links.slug, link_reports.reason, link_reports.details,
      link_reports.status, link_reports.created_at
    FROM link_reports
    JOIN links ON links.id = link_reports.link_id
    WHERE link_reports.reporter_id = ?
      ${statusFilter}
    ORDER BY link_reports.created_at DESC
    LIMIT ?
  `).bind(...binds).all<ReportRow>()

  return result.results
})
