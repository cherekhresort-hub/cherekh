/** Basic but strict email validation for form submissions. */
export const isValidEmail = (email: string): boolean => {
  const normalized = email.trim().toLowerCase()
  if (!normalized || normalized.length > 254) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)
}

export const normalizeEmail = (email: string): string => email.trim().toLowerCase()
