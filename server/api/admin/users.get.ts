import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'List users for admin management',
    security: [{ bearerAuth: [] }],
  },
})

const UsersQuerySchema = z.object({
  role: z.enum(['student', 'admin']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
  search: z.string().trim().max(100).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(100),
})

interface UserRow {
  id: string
  email: string
  name: string | null
  picture: string | null
  role: 'student' | 'admin'
  status: 'active' | 'disabled'
  created_at: number
  updated_at: number
  link_count: number
  active_session_count: number
}

export default eventHandler(async (event) => {
  requireAdmin(event)

  const query = await getValidatedQuery(event, UsersQuerySchema.parse)
  const where: string[] = []
  const binds: (string | number)[] = [Math.floor(Date.now() / 1000)]

  if (query.role) {
    where.push('role = ?')
    binds.push(query.role)
  }

  if (query.status) {
    where.push('status = ?')
    binds.push(query.status)
  }

  if (query.search) {
    where.push('(email LIKE ? OR name LIKE ?)')
    binds.push(`%${query.search}%`, `%${query.search}%`)
  }

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const result = await event.context.cloudflare.env.DB.prepare(`
    SELECT
      id,
      email,
      name,
      picture,
      role,
      status,
      created_at,
      updated_at,
      (SELECT COUNT(*) FROM links WHERE links.owner_id = students.id) as link_count,
      (
        SELECT COUNT(*)
        FROM auth_sessions
        WHERE auth_sessions.student_id = students.id
          AND auth_sessions.expires_at > ?
      ) as active_session_count
    FROM students
    ${whereSql}
    ORDER BY created_at DESC
    LIMIT ?
  `).bind(...binds, query.limit).all<UserRow>()

  return result.results
})
