import { env } from 'cloudflare:test'
import { beforeAll } from 'vitest'
import schemaSql from '../migrations/0001_core_schema.sql?raw'

beforeAll(async () => {
  for (const statement of schemaSql.split(';').map(sql => sql.trim()).filter(Boolean))
    await env.DB.prepare(statement).run()
})
