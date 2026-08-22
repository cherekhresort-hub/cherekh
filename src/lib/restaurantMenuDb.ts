import { defaultMenuCategories, normalizeMenuPortion, type MenuCategory, type MenuItem } from '../data/menuCatalog'
import { notifyAdminOfManagerAction } from './adminNotifications'
import { getSupabase, isSupabaseConfigured } from './supabase'

const LOCAL_KEY = 'cherekh_restaurant_menu_v2'
export const RESTAURANT_MENU_CHANGED_EVENT = 'cherekh-restaurant-menu-changed'

export type RestaurantMenuItemRecord = {
  id: string
  categoryId: string
  categoryTitle: string
  categorySort: number
  name: string
  portion: string
  price: number
  sortOrder: number
}

type MenuRow = {
  id: string
  category_id: string
  category_title: string
  category_sort: number
  name: string
  portion?: string | null
  price: number | string
  sort_order: number
}

const normalizeItem = (item: MenuItem): MenuItem => ({
  id: item.id,
  name: item.name,
  price: Math.max(0, Math.round(Number(item.price) || 0)),
  portion: normalizeMenuPortion(item.portion),
})

const normalizeCategories = (categories: MenuCategory[]): MenuCategory[] =>
  categories.map((category) => ({
    ...category,
    items: category.items.map(normalizeItem),
  }))

const mergeMissingPortions = (
  categories: MenuCategory[],
  source: MenuCategory[]
): MenuCategory[] => {
  const byId = new Map<string, string>()
  for (const category of source) {
    for (const item of category.items) {
      const portion = normalizeMenuPortion(item.portion)
      byId.set(item.id, portion)
    }
  }
  return categories.map((category) => ({
    ...category,
    items: category.items.map((item) => ({
      ...item,
      portion: normalizeMenuPortion(item.portion || byId.get(item.id)),
    })),
  }))
}

const dispatchMenuChange = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RESTAURANT_MENU_CHANGED_EVENT))
  }
}

const cloneDefault = (): MenuCategory[] =>
  defaultMenuCategories.map((category) => ({
    ...category,
    items: category.items.map((item) => ({ ...item })),
  }))

const readLocal = (): MenuCategory[] | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as MenuCategory[]
    if (!Array.isArray(parsed) || parsed.length === 0) return null
    return normalizeCategories(parsed)
  } catch {
    return null
  }
}

const writeLocal = (categories: MenuCategory[]): void => {
  if (typeof window === 'undefined') return
  localStorage.setItem(LOCAL_KEY, JSON.stringify(categories))
}

const rowsToCategories = (rows: MenuRow[]): MenuCategory[] => {
  const byId = new Map<string, MenuCategory & { sort: number }>()
  for (const row of rows) {
    const existing = byId.get(row.category_id)
    const item: MenuItem = {
      id: row.id,
      name: row.name,
      price: Math.round(Number(row.price) || 0),
      portion: normalizeMenuPortion(row.portion ?? undefined),
    }
    if (existing) {
      existing.items.push(item)
    } else {
      byId.set(row.category_id, {
        id: row.category_id,
        title: row.category_title,
        sort: row.category_sort,
        items: [item],
      })
    }
  }
  return [...byId.values()]
    .sort((a, b) => a.sort - b.sort || a.title.localeCompare(b.title))
    .map(({ sort: _sort, ...category }) => category)
}

const categoriesToRecords = (categories: MenuCategory[]): RestaurantMenuItemRecord[] =>
  categories.flatMap((category, categoryIndex) =>
    category.items.map((item, itemIndex) => ({
      id: item.id,
      categoryId: category.id,
      categoryTitle: category.title,
      categorySort: (categoryIndex + 1) * 10,
      name: item.name.trim(),
      portion: normalizeMenuPortion(item.portion),
      price: Math.max(0, Math.round(Number(item.price) || 0)),
      sortOrder: (itemIndex + 1) * 10,
    }))
  )

/** Public + admin: published menu, or the default catalog if the table is empty. */
export const loadRestaurantMenu = async (): Promise<MenuCategory[]> => {
  if (!isSupabaseConfigured()) {
    return readLocal() ?? cloneDefault()
  }

  const supabase = getSupabase()
  if (!supabase) return readLocal() ?? cloneDefault()

  const columns = 'id, category_id, category_title, category_sort, name, portion, price, sort_order'
  const primary = await supabase
    .from('restaurant_menu_items')
    .select(columns)
    .order('category_sort', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  let rows: MenuRow[] = (primary.data ?? []) as MenuRow[]
  let error = primary.error
  let missingPortionColumn = false

  if (error && /portion/i.test(error.message)) {
    missingPortionColumn = true
    const fallback = await supabase
      .from('restaurant_menu_items')
      .select('id, category_id, category_title, category_sort, name, price, sort_order')
      .order('category_sort', { ascending: true })
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true })
    rows = (fallback.data ?? []) as MenuRow[]
    error = fallback.error
  }

  if (error) {
    console.warn('[Menu] fetch failed:', error.message)
    return readLocal() ?? cloneDefault()
  }

  if (rows.length === 0) return cloneDefault()

  let categories = rowsToCategories(rows)
  if (missingPortionColumn) {
    categories = mergeMissingPortions(categories, readLocal() ?? cloneDefault())
  }
  writeLocal(categories)
  return categories
}

export const saveRestaurantMenu = async (categories: MenuCategory[]): Promise<boolean> => {
  const cleaned = categories
    .map((category) => ({
      ...category,
      id: category.id.trim() || `cat-${Date.now()}`,
      title: category.title.trim() || 'Untitled',
      items: category.items
        .map((item) => normalizeItem({
          ...item,
          name: item.name.trim(),
        }))
        .filter((item) => item.name.length > 0),
    }))
    .filter((category) => category.title.length > 0)

  writeLocal(cleaned)
  dispatchMenuChange()

  if (!isSupabaseConfigured()) {
    void notifyAdminOfManagerAction({
      category: 'system',
      action: 'menu.updated',
      title: 'Restaurant menu updated',
      message: `${cleaned.reduce((sum, cat) => sum + cat.items.length, 0)} items saved locally`,
    })
    return true
  }

  const supabase = getSupabase()
  if (!supabase) return false

  const records = categoriesToRecords(cleaned)
  const { data: existing, error: existingError } = await supabase
    .from('restaurant_menu_items')
    .select('id')

  if (existingError) {
    console.warn('[Menu] load existing failed:', existingError.message)
    return false
  }

  const keepIds = new Set(records.map((row) => row.id))
  const deleteIds = (existing ?? [])
    .map((row) => row.id as string)
    .filter((id) => !keepIds.has(id))

  if (deleteIds.length > 0) {
    const { error: deleteError } = await supabase
      .from('restaurant_menu_items')
      .delete()
      .in('id', deleteIds)
    if (deleteError) {
      console.warn('[Menu] delete failed:', deleteError.message)
      return false
    }
  }

  if (records.length > 0) {
    const { error: upsertError } = await supabase.from('restaurant_menu_items').upsert(
      records.map((row) => ({
        id: row.id,
        category_id: row.categoryId,
        category_title: row.categoryTitle,
        category_sort: row.categorySort,
        name: row.name,
        portion: row.portion,
        price: row.price,
        sort_order: row.sortOrder,
        updated_at: new Date().toISOString(),
      })),
      { onConflict: 'id' }
    )
    if (upsertError) {
      if (/portion/i.test(upsertError.message)) {
        const retry = await supabase.from('restaurant_menu_items').upsert(
          records.map((row) => ({
            id: row.id,
            category_id: row.categoryId,
            category_title: row.categoryTitle,
            category_sort: row.categorySort,
            name: row.name,
            price: row.price,
            sort_order: row.sortOrder,
            updated_at: new Date().toISOString(),
          })),
          { onConflict: 'id' }
        )
        if (!retry.error) {
          console.warn('[Menu] portion column missing; run 036_restaurant_menu_portion.sql')
          void notifyAdminOfManagerAction({
            category: 'system',
            action: 'menu.updated',
            title: 'Restaurant menu updated',
            message: `${records.length} items published to the dining page`,
          })
          return true
        }
      }
      console.warn('[Menu] upsert failed:', upsertError.message)
      return false
    }
  }

  void notifyAdminOfManagerAction({
    category: 'system',
    action: 'menu.updated',
    title: 'Restaurant menu updated',
    message: `${records.length} items published to the dining page`,
  })

  return true
}

export const newMenuItemId = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

export const slugifyCategoryId = (title: string): string =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || `category-${Date.now()}`
