export const MENU_PORTIONS = ['1:1', '1:2', '1:4'] as const
export type MenuPortion = (typeof MENU_PORTIONS)[number]
export const DEFAULT_MENU_PORTION: MenuPortion = '1:1'

export interface MenuItem {
  id: string
  name: string
  price: number
  /** Serving size: `1:1` (one person), `1:2` (two), or `1:4` (four). */
  portion?: MenuPortion
}

export interface MenuCategory {
  id: string
  title: string
  items: MenuItem[]
}

/** Default Cherekh restaurant menu. Overridden by admin Menu when published. */
export const defaultMenuCategories: MenuCategory[] = [
  {
    id: 'rice-dal',
    title: 'Rice & Dal',
    items: [
      { id: 'rice', name: 'Rice', price: 60, portion: '1:1' },
      { id: 'dal', name: 'Dal', price: 80, portion: '1:1' },
      { id: 'alu-vorta', name: 'Alu Vorta', price: 60, portion: '1:2' },
      { id: 'begun-vorta', name: 'Begun Vorta', price: 100, portion: '1:2' },
      { id: 'tomato-vorta', name: 'Tomato Vorta', price: 100, portion: '1:2' },
      { id: 'mixed-salad', name: 'Mixed Salad (Local Style)', price: 80, portion: '1:2' },
    ],
  },
  {
    id: 'fish',
    title: 'Fish Delicacies',
    items: [
      { id: 'fish-fry', name: 'Fish Fry (Telapia/Rui)', price: 180, portion: '1:1' },
      { id: 'fish-lakso', name: 'Fish Lakso', price: 220, portion: '1:2' },
      { id: 'fish-curry', name: 'Fish Curry (Local Style)', price: 250, portion: '1:1' },
      { id: 'bamboo-fish', name: 'Bamboo Fish', price: 700, portion: '1:2' },
      { id: 'fish-pahari', name: 'Fish (Pahari Style)', price: 320, portion: '1:1' },
    ],
  },
  {
    id: 'eggs',
    title: 'Eggs',
    items: [
      { id: 'egg-lakso', name: 'Egg Lakso', price: 80, portion: '1:2' },
      { id: 'egg-curry', name: 'Egg Curry', price: 100, portion: '1:2' },
    ],
  },
  {
    id: 'chicken-meat',
    title: 'Chicken & Meat',
    items: [
      { id: 'chicken-lakso-farm', name: 'Chicken Lakso - Farm', price: 180, portion: '1:2' },
      { id: 'chicken-lakso-local', name: 'Chicken Lakso - Local (Pahari)', price: 280, portion: '1:2' },
      { id: 'chicken-bhuna-farm', name: 'Chicken Bhuna - Farm', price: 220, portion: '1:1' },
      { id: 'chicken-bhuna-local', name: 'Chicken Bhuna - Local (Pahari)', price: 340, portion: '1:1' },
      { id: 'chicken-pahari-farm', name: 'Chicken Pahari Style - Farm', price: 220, portion: '1:1' },
      { id: 'chicken-pahari-local', name: 'Chicken Pahari Style - Local (Pahari)', price: 340, portion: '1:1' },
      { id: 'bamboo-chicken-farm', name: 'Bamboo Chicken - Farm', price: 1200, portion: '1:4' },
      { id: 'bamboo-chicken-local', name: 'Bamboo Chicken - Local (Pahari)', price: 1800, portion: '1:4' },
    ],
  },
  {
    id: 'traditional',
    title: 'Traditional & Local Specials',
    items: [
      { id: 'pajon', name: 'Pajon (Vegetable Mix)', price: 150, portion: '1:1' },
      { id: 'tohza', name: 'Tohza', price: 100, portion: '1:1' },
      { id: 'borboti-lakso', name: 'Borboti Lakso', price: 150, portion: '1:2' },
    ],
  },
  {
    id: 'beverages',
    title: 'Beverages',
    items: [
      { id: 'milk-tea', name: 'Milk Tea', price: 60, portion: '1:1' },
      { id: 'rong-tea', name: 'Rong Tea', price: 40, portion: '1:1' },
      { id: 'coffee-small', name: 'Coffee (Small)', price: 120, portion: '1:1' },
      { id: 'coffee-large', name: 'Coffee (Large)', price: 220, portion: '1:1' },
    ],
  },
  {
    id: 'momo',
    title: 'Momo',
    items: [
      { id: 'chicken-momo', name: 'Chicken Momo (3 Pieces)', price: 130, portion: '1:1' },
      { id: 'dragon-momo', name: 'Dragon Momo (3 Pieces)', price: 160, portion: '1:1' },
    ],
  },
  {
    id: 'platter',
    title: 'Platter',
    items: [
      {
        id: 'vorta-platter',
        name: 'Vorta Platter (Alu Vorta + Begun Vorta + Egg Lakso + Tomato Vorta + Chicken Lakso + Borboti Lakso + Fish Lakso) (Any six items will be available)',
        price: 499,
        portion: '1:1',
      },
      {
        id: 'pahari-platter-local',
        name: 'Pahari Platter (Tohza + Chicken Lakso + Egg Lakso + Borboti Lakso + Pahari Murgi + Pahari Style Fish)',
        price: 999,
        portion: '1:1',
      },
      {
        id: 'pahari-platter-farm',
        name: 'Pahari Platter (Tohza + Farm Chicken Lakso + Egg Lakso + Borboti Lakso + Farm Murgi + Pahari Style Fish)',
        price: 799,
        portion: '1:1',
      },
      {
        id: 'regular-platter',
        name: 'Regular Platter (Rice + Dal + Alu Vorta + Farm Chicken Vuna)',
        price: 299,
        portion: '1:1',
      },
    ],
  },
]

/** @deprecated use defaultMenuCategories */
export const menuCategories = defaultMenuCategories

export const formatMenuPrice = (price: number): string =>
  `৳ ${price.toLocaleString('en-BD')}`

export const normalizeMenuPortion = (portion?: string): MenuPortion => {
  const value = (portion ?? '').trim().replace(/\s+/g, '')
  if (value === '1:4' || value === '1-4') return '1:4'
  if (value === '1:2' || value === '1-2') return '1:2'
  return '1:1'
}

export const formatMenuPortion = (portion?: string): MenuPortion => normalizeMenuPortion(portion)

export const flattenMenuItems = (categories: MenuCategory[]): MenuItem[] =>
  categories.flatMap((category) => category.items)

/** Move an item within a section or into another section. `toIndex` is the insertion index in the destination. */
export const moveMenuItem = (
  categories: MenuCategory[],
  itemId: string,
  toCategoryId: string,
  toIndex: number
): MenuCategory[] => {
  const fromCategory = categories.find((category) => category.items.some((item) => item.id === itemId))
  const toCategory = categories.find((category) => category.id === toCategoryId)
  if (!fromCategory || !toCategory) return categories

  const fromIndex = fromCategory.items.findIndex((item) => item.id === itemId)
  if (fromIndex < 0) return categories

  const insertBefore = Math.max(0, Math.min(toIndex, toCategory.items.length))
  if (fromCategory.id === toCategory.id && (insertBefore === fromIndex || insertBefore === fromIndex + 1)) {
    return categories
  }

  const item = fromCategory.items[fromIndex]
  return categories.map((category) => {
    if (category.id === fromCategory.id && category.id === toCategory.id) {
      const items = category.items.filter((entry) => entry.id !== itemId)
      const nextIndex = fromIndex < insertBefore ? insertBefore - 1 : insertBefore
      items.splice(nextIndex, 0, item)
      return { ...category, items }
    }
    if (category.id === fromCategory.id) {
      return { ...category, items: category.items.filter((entry) => entry.id !== itemId) }
    }
    if (category.id === toCategory.id) {
      const items = [...category.items]
      items.splice(insertBefore, 0, item)
      return { ...category, items }
    }
    return category
  })
}
