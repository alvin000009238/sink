import { z } from 'zod'

defineRouteMeta({
  openAPI: {
    description: 'Update admin-managed application settings',
    security: [{ bearerAuth: [] }],
  },
})

const SettingsSchema = z.object({
  dailyCreateLimit: z.coerce.number().int().min(0).max(10000),
})

export default eventHandler(async (event) => {
  requireAdmin(event)
  const body = await readValidatedBody(event, SettingsSchema.parse)

  return {
    dailyCreateLimit: await setDailyCreateLimit(event, body.dailyCreateLimit),
  }
})
