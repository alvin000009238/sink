import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Update report review status',
    security: [{ bearerAuth: [] }],
  },
})

const ReportStatusSchema = z.object({
  id: z.string().trim().min(1),
  status: z.enum(['open', 'reviewing', 'resolved', 'rejected']),
})

export default eventHandler(async (event) => {
  const user = requireAdmin(event)
  const body = await readValidatedBody(event, ReportStatusSchema.parse)

  const report = await event.context.cloudflare.env.DB.prepare(`
    UPDATE link_reports
    SET status = ?,
      reviewed_at = ?,
      reviewed_by = ?
    WHERE id = ?
    RETURNING id
  `).bind(body.status, Math.floor(Date.now() / 1000), user.id, body.id).first<{ id: string }>()

  if (!report) {
    throw createError({
      status: 404,
      statusText: 'Report not found',
    })
  }

  return { success: true }
})
