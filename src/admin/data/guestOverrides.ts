import { notifyAdminOfManagerAction } from '../../lib/adminNotifications'
import type { GuestTag } from '../types'

const STORAGE_KEY = 'cherekh_guest_overrides'

export interface GuestTagOverride {
  /** Tags forced ON even if booking history doesn't qualify the guest. */
  add: GuestTag[]
  /** Tags forced OFF even if booking history qualifies the guest. */
  remove: GuestTag[]
}

export type GuestOverridesMap = Record<string, GuestTagOverride>

const emptyOverride = (): GuestTagOverride => ({ add: [], remove: [] })

export const getGuestOverrides = (): GuestOverridesMap => {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as GuestOverridesMap) : {}
  } catch {
    return {}
  }
}

const persist = (overrides: GuestOverridesMap): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides))
}

/**
 * Apply an override on top of the derived tags. Removed tags are stripped
 * first, then added tags are appended (de-duplicated).
 */
export const applyTagOverride = (
  derived: GuestTag[],
  override?: GuestTagOverride
): GuestTag[] => {
  if (!override || (override.add.length === 0 && override.remove.length === 0)) {
    return derived
  }
  const filtered = derived.filter((t) => !override.remove.includes(t))
  const final = [...filtered]
  override.add.forEach((t) => {
    if (!final.includes(t)) final.push(t)
  })
  return final
}

/**
 * Set a single tag's state and persist the result.
 *  - 'on'   → force the tag to appear (adds to `add` if not derived)
 *  - 'off'  → force the tag to be hidden (adds to `remove` if derived)
 *  - 'auto' → clear any override for this tag; tag follows derivation
 */
export const setGuestTagOverride = (
  guestId: string,
  tag: GuestTag,
  state: 'on' | 'off' | 'auto',
  derivedTags: GuestTag[],
  guestName?: string
): GuestTagOverride => {
  const overrides = getGuestOverrides()
  const current = overrides[guestId] ?? emptyOverride()
  const isDerived = derivedTags.includes(tag)

  const next: GuestTagOverride = {
    add: current.add.filter((t) => t !== tag),
    remove: current.remove.filter((t) => t !== tag),
  }

  if (state === 'on' && !isDerived) {
    next.add.push(tag)
  } else if (state === 'off' && isDerived) {
    next.remove.push(tag)
  }

  if (next.add.length === 0 && next.remove.length === 0) {
    delete overrides[guestId]
  } else {
    overrides[guestId] = next
  }
  persist(overrides)
  const label = guestName?.trim() || guestId.slice(-6).toUpperCase()
  void notifyAdminOfManagerAction({
    category: 'guest',
    action: 'guest.tag',
    title: 'Guest tag updated',
    message: `${label}: ${tag} set to ${state}`,
    entityId: guestId,
  })
  return overrides[guestId] ?? emptyOverride()
}

export const resetGuestOverride = (guestId: string, guestName?: string): void => {
  const overrides = getGuestOverrides()
  if (!(guestId in overrides)) return
  delete overrides[guestId]
  persist(overrides)
  const label = guestName?.trim() || guestId.slice(-6).toUpperCase()
  void notifyAdminOfManagerAction({
    category: 'guest',
    action: 'guest.tags_reset',
    title: 'Guest tags reset',
    message: `All manual tag overrides cleared for ${label}`,
    entityId: guestId,
  })
}

export const hasOverride = (override?: GuestTagOverride): boolean =>
  !!override && (override.add.length > 0 || override.remove.length > 0)
