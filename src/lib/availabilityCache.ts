import { AvailabilityLoadError, fetchAvailabilityRows, type AvailabilityRow } from './bookingsDb'

/** Reuse availability rows for a few minutes — booking page date changes won't re-hit Supabase. */
const TTL_MS = 3 * 60 * 1000

let cached: { rows: AvailabilityRow[]; fetchedAt: number } | null = null
let inflight: Promise<AvailabilityRow[]> | null = null

export const invalidateAvailabilityCache = (): void => {
  cached = null
  inflight = null
}

export const getAvailabilityRowsCached = async (): Promise<AvailabilityRow[]> => {
  const now = Date.now()
  if (cached && now - cached.fetchedAt < TTL_MS) {
    return cached.rows
  }

  if (inflight) return inflight

  inflight = fetchAvailabilityRows()
    .then((rows) => {
      cached = { rows, fetchedAt: Date.now() }
      return rows
    })
    .catch((err) => {
      cached = null
      if (err instanceof AvailabilityLoadError) throw err
      throw new AvailabilityLoadError()
    })
    .finally(() => {
      inflight = null
    })

  return inflight
}
