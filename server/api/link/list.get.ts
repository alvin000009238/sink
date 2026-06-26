import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'List all short links with pagination',
    security: [{ bearerAuth: [] }],
    parameters: [
      {
        name: 'limit',
        in: 'query',
        required: false,
        schema: { type: 'integer', default: 20, maximum: 1024 },
        description: 'Maximum number of links to return',
      },
      {
        name: 'cursor',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Pagination cursor from previous response',
      },
      {
        name: 'domain',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filter links by destination hostname',
      },
      {
        name: 'creator',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filter links by creator id or email',
      },
      {
        name: 'purpose',
        in: 'query',
        required: false,
        schema: { type: 'string' },
        description: 'Filter links by purpose',
      },
      {
        name: 'order',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
        description: 'Sort links by creation time',
      },
      {
        name: 'status',
        in: 'query',
        required: false,
        schema: { type: 'string', enum: ['active', 'disabled', 'deleted', 'pending', 'all'], default: 'active' },
        description: 'Admin-only status filter',
      },
    ],
  },
})

const ListQuerySchema = z.object({
  limit: z.coerce.number().max(1024).default(20),
  cursor: z.string().trim().max(1024).optional(),
  creator: z.string().trim().max(320).optional(),
  domain: z.string().trim().toLowerCase().max(253).optional(),
  order: z.enum(['asc', 'desc']).default('desc'),
  owner: z.string().trim().max(320).optional(),
  purpose: z.string().trim().max(2048).optional(),
  status: z.enum(['active', 'disabled', 'deleted', 'pending', 'all']).optional(),
})

export default eventHandler(async (event) => {
  const { creator, cursor, domain, limit, order, owner, purpose, status } = await getValidatedQuery(event, ListQuerySchema.parse)

  const list = await listLinks(event, { creator, cursor, domain, limit, order, owner, purpose, status })
  return {
    ...list,
    links: sanitizeLinksPassword(list.links),
  }
})
