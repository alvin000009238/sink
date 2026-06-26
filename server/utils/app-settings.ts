import type { H3Event } from 'h3'

const DAILY_CREATE_LIMIT_KEY = 'dailyCreateLimit'

interface AppSettingRow {
  value: string
}

export function normalizeDailyCreateLimit(value: unknown): number {
  return Math.max(0, Math.floor(Number(value)))
}

export async function getDailyCreateLimit(event: H3Event): Promise<number> {
  const row = await event.context.cloudflare.env.DB.prepare('SELECT value FROM app_settings WHERE key = ?')
    .bind(DAILY_CREATE_LIMIT_KEY)
    .first<AppSettingRow>()

  return normalizeDailyCreateLimit(row?.value ?? useRuntimeConfig(event).dailyCreateLimit)
}

export async function setDailyCreateLimit(event: H3Event, limit: number): Promise<number> {
  const normalizedLimit = normalizeDailyCreateLimit(limit)
  const now = Math.floor(Date.now() / 1000)
  const user = getAuthUser(event)

  await event.context.cloudflare.env.DB.prepare(`
    INSERT INTO app_settings (key, value, updated_at, updated_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).bind(DAILY_CREATE_LIMIT_KEY, String(normalizedLimit), now, user?.id ?? null).run()

  return normalizedLimit
}
