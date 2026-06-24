import { LinkSchema } from '#shared/schemas/link'
import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Delete a short link',
    security: [{ bearerAuth: [] }],
    requestBody: {
      required: true,
      content: {
        'application/json': {
          schema: {
            type: 'object',
            required: ['slug'],
            properties: {
              slug: { type: 'string', description: 'The slug of the link to delete' },
            },
          },
        },
      },
    },
  },
})

const DeleteSchema = z.object({
  slug: LinkSchema.shape.slug.removeDefault().min(1),
})

export default eventHandler(async (event) => {
  const { previewMode } = useRuntimeConfig(event).public
  if (previewMode) {
    throw createError({
      status: 403,
      statusText: 'Preview mode cannot delete links.',
    })
  }

  const user = requireAuthUser(event)
  const body = await readValidatedBody(event, DeleteSchema.parse)
  const slug = normalizeSlug(event, body.slug)
  const row = await event.context.cloudflare.env.DB.prepare('SELECT owner_id FROM links WHERE slug = ?').bind(slug).first<{ owner_id: string }>()
  if (!row || (user.role !== 'admin' && row.owner_id !== user.id)) {
    throw createError({
      status: 404,
      statusText: 'Link not found',
    })
  }

  await deleteLink(event, slug)
})
