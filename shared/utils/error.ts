export function toErrorMessage(error: unknown, maxLength?: number): string {
  const data = error && typeof error === 'object' && 'data' in error
    ? (error.data as Record<string, unknown> | undefined)
    : undefined
  const message = [
    data?.message,
    data?.statusMessage,
    data?.statusText,
    error instanceof Error ? error.message : String(error),
  ].find((value): value is string => typeof value === 'string' && value.trim() !== '') || 'Unknown error'

  return maxLength ? message.slice(0, maxLength) : message
}
