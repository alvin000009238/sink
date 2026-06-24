/// <reference path="../../worker-configuration.d.ts" />

import type { Link } from '#shared/schemas/link'

export interface BackupData {
  version: string
  exportedAt: string
  count: number
  links: Link[]
}

interface BackupLinkRow {
  payload_json: string
}

export async function backupLinksToR2(env: Cloudflare.Env, isManual: boolean = false): Promise<void> {
  if (!env.R2) {
    console.info('[backup:d1] R2 binding not configured, skipping backup')
    return
  }

  const nowSeconds = Math.floor(Date.now() / 1000)
  const result = await env.DB.prepare(`
    SELECT payload_json
    FROM links
    WHERE status = 'active'
      AND (expiration IS NULL OR expiration > ?)
    ORDER BY created_at DESC, slug ASC
  `).bind(nowSeconds).all<BackupLinkRow>()

  const allLinks = result.results.map(row => JSON.parse(row.payload_json) as Link)

  const now = new Date()
  const backupData: BackupData = {
    version: '1.0',
    exportedAt: now.toISOString(),
    count: allLinks.length,
    links: allLinks,
  }

  const timestamp = now.toISOString().replace(/:/g, '-')
  const prefix = isManual ? 'manual-links-' : 'links-'
  const filename = `backups/${prefix}${timestamp}.json`

  await env.R2.put(filename, JSON.stringify(backupData, null, 2), {
    httpMetadata: {
      contentType: 'application/json',
    },
    customMetadata: {
      count: String(allLinks.length),
      exportedAt: backupData.exportedAt,
    },
  })

  console.info(`[backup:d1] Backup completed: ${filename}, ${allLinks.length} links`)
}
