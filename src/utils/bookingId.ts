/** Display a booking id (6-digit new ids shown as-is; legacy ids shortened). */
export const formatBookingId = (id: string): string => {
  if (/^\d{6}$/.test(id)) return id
  const digits = id.replace(/\D/g, '')
  if (digits.length >= 6) return digits.slice(-6)
  return id.slice(-6).toUpperCase()
}

/** Generate a unique 6-digit numeric booking id. */
export const generateBookingId = (existingIds: Iterable<string>): string => {
  const taken = new Set(existingIds)
  for (let attempt = 0; attempt < 100; attempt++) {
    const id = String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0')
    if (!taken.has(id)) return id
  }
  throw new Error('Could not generate a unique booking ID')
}
