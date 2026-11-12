type CacheEntry<T> = {
  value: T
  expiresAt: number
}

const entries = new Map<string, CacheEntry<unknown>>()
const inFlight = new Map<string, Promise<unknown>>()

export function stableReadKey(scope: string, params?: Record<string, unknown>): string {
  const normalized = Object.entries(params || {})
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .sort(([left], [right]) => left.localeCompare(right))

  return `${scope}:${JSON.stringify(normalized)}`
}

/**
 * Small in-memory cache for read-only catalog requests.
 * It prevents duplicate page-mount requests while keeping mutations explicit.
 */
export async function cachedRead<T>(
  key: string,
  request: () => Promise<T>,
  ttlMs: number,
  dedupeInFlight = true
): Promise<T> {
  const now = Date.now()
  const cached = entries.get(key) as CacheEntry<T> | undefined
  if (cached && cached.expiresAt > now) {
    return cached.value
  }
  if (cached) entries.delete(key)

  const pending = dedupeInFlight ? (inFlight.get(key) as Promise<T> | undefined) : undefined
  if (pending) return pending

  const promise = request()
    .then((value) => {
      entries.set(key, { value, expiresAt: Date.now() + ttlMs })
      return value
    })
    .finally(() => {
      if (inFlight.get(key) === promise) inFlight.delete(key)
    })

  if (dedupeInFlight) inFlight.set(key, promise)
  return promise
}

export function invalidateReadCache(scope: string): void {
  for (const key of entries.keys()) {
    if (key.startsWith(scope)) entries.delete(key)
  }
}
