import {
  BUILTIN_OTHER_CHARGE_KINDS,
  labelForOtherChargeKind,
  OTHER_CHARGE_KIND_LABELS,
  normalizeOtherChargeKind,
  slugifyOtherChargeKind,
  type OtherChargeKind,
} from '../../utils/bookings'

const STORAGE_KEY = 'cherekh_other_charge_kinds'

export interface CustomOtherChargeKind {
  id: OtherChargeKind
  label: string
}

const readCustom = (): CustomOtherChargeKind[] => {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((row) => {
        if (!row || typeof row !== 'object') return null
        const id = slugifyOtherChargeKind(String((row as { id?: unknown }).id ?? ''))
        const label = String((row as { label?: unknown }).label ?? '').trim()
        if (!id || !label) return null
        if ((BUILTIN_OTHER_CHARGE_KINDS as string[]).includes(id)) return null
        return { id, label }
      })
      .filter((row): row is CustomOtherChargeKind => Boolean(row))
  } catch {
    return []
  }
}

const writeCustom = (kinds: CustomOtherChargeKind[]) => {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(kinds))
}

export const getCustomOtherChargeKinds = (): CustomOtherChargeKind[] =>
  readCustom().sort((a, b) => a.label.localeCompare(b.label))

/** Built-in + custom kinds for the other-bill category select. */
export const listOtherChargeKinds = (): Array<{ id: OtherChargeKind; label: string; custom: boolean }> => {
  const builtins = BUILTIN_OTHER_CHARGE_KINDS.map((id) => ({
    id,
    label: OTHER_CHARGE_KIND_LABELS[id],
    custom: false,
  }))
  const custom = getCustomOtherChargeKinds().map((row) => ({ ...row, custom: true }))
  return [...builtins, ...custom]
}

/** Adds or updates a custom category. Returns the slug id, or null if invalid. */
export const addCustomOtherChargeKind = (label: string): OtherChargeKind | null => {
  const trimmed = label.trim().replace(/\s+/g, ' ')
  if (!trimmed) return null
  const id = slugifyOtherChargeKind(trimmed)
  if (!id) return null
  if ((BUILTIN_OTHER_CHARGE_KINDS as string[]).includes(id)) return id

  const existing = readCustom()
  const next = existing.filter((row) => row.id !== id)
  next.push({ id, label: trimmed })
  writeCustom(next)
  return id
}

export const removeCustomOtherChargeKind = (id: OtherChargeKind): void => {
  writeCustom(readCustom().filter((row) => row.id !== id))
}

/** Prefer custom registry label, then charge-stored label, then built-in / humanized slug. */
export const resolveOtherChargeKindLabel = (
  kind?: string | null,
  storedLabel?: string | null
): string => {
  const normalized = normalizeOtherChargeKind(kind)
  const custom = readCustom().find((row) => row.id === normalized)
  if (custom) return custom.label
  return labelForOtherChargeKind(kind, storedLabel)
}
