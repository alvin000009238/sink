import type { H3Event } from 'h3'

export function useWAE(event: H3Event, query: string) {
  const { cfAccountId, cfApiToken, testMockWae } = useRuntimeConfig(event)
  console.info('useWAE', query)
  if (testMockWae)
    return Promise.resolve({ data: [] })

  return $fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/analytics_engine/sql`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfApiToken}`,
    },
    body: query,
    retry: 1,
    retryDelay: 100, // ms
  })
}
