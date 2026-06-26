import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Update a user role or status',
    security: [{ bearerAuth: [] }],
  },
})

const UserStatusSchema = z.object({
  id: z.string().trim().min(1),
  role: z.enum(['student', 'admin']).optional(),
  status: z.enum(['active', 'disabled']).optional(),
}).refine(body => body.role || body.status, {
  message: 'Role or status is required',
})

interface UpdatedUser {
  id: string
  email: string
  name: string | null
  picture: string | null
  role: 'student' | 'admin'
  status: 'active' | 'disabled'
  created_at: number
  updated_at: number
}

export default eventHandler(async (event) => {
  const admin = requireAdmin(event)
  const body = await readValidatedBody(event, UserStatusSchema.parse)

  if (body.id === SYSTEM_OWNER_ID) {
    throw createError({
      status: 400,
      statusText: 'System user cannot be changed',
    })
  }

  if (body.id === admin.id && (body.status === 'disabled' || body.role === 'student')) {
    throw createError({
      status: 400,
      statusText: 'Cannot remove your own admin access',
    })
  }

  if (body.role === 'admin' && getAuthSource(event) !== 'site-token') {
    throw createError({
      status: 403,
      statusText: 'Only the system admin can promote users to admin',
    })
  }

  const updates: string[] = []
  const binds: (string | number)[] = []

  if (body.role) {
    updates.push('role = ?')
    binds.push(body.role)
  }

  if (body.status) {
    updates.push('status = ?')
    binds.push(body.status)
  }

  updates.push('updated_at = ?')
  binds.push(Math.floor(Date.now() / 1000), body.id)

  const updated = await event.context.cloudflare.env.DB.prepare(`
    UPDATE students
    SET ${updates.join(', ')}
    WHERE id = ?
    RETURNING id, email, name, picture, role, status, created_at, updated_at
  `).bind(...binds).first<UpdatedUser>()

  if (!updated) {
    throw createError({
      status: 404,
      statusText: 'User not found',
    })
  }

  return updated
})
