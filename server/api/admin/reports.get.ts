import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'List link reports for admin review',
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
  reporter_email: string | null
}

export default eventHandler(async (event) => {
  requireAdmin(event)
  const query = await getValidatedQuery(event, ReportsQuerySchema.parse)
  const statusFilter = query.status ? 'WHERE link_reports.status = ?' : ''
  const binds = query.status ? [query.status, query.limit] : [query.limit]
  const result = await event.context.cloudflare.env.DB.prepare(`
    SELECT link_reports.id, links.slug, link_reports.reason, link_reports.details, link_reports.status,
      link_reports.created_at, students.email as reporter_email
    FROM link_reports
    JOIN links ON links.id = link_reports.link_id
    LEFT JOIN students ON students.id = link_reports.reporter_id
    ${statusFilter}
    ORDER BY link_reports.created_at DESC
    LIMIT ?
  `).bind(...binds).all<ReportRow>()

  return result.results
})
