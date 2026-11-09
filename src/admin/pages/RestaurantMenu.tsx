import { useEffect, useRef, useState, type DragEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Check,
  ChevronDown,
  ChevronUp,
  GripVertical,
  List,
  Plus,
  Save,
  Trash2,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { TopBar } from '../components/layout/TopBar'
import { Card, CardDescription, CardTitle } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Field, Input, Select } from '../components/ui/Input'
import { useToast } from '../components/ui/Toast'
import {
  MENU_PORTIONS,
  defaultMenuCategories,
  formatMenuPrice,
  moveMenuItem,
  normalizeMenuPortion,
  type MenuCategory,
  type MenuItem,
} from '../../data/menuCatalog'
import {
  loadRestaurantMenu,
  newMenuItemId,
  saveRestaurantMenu,
  slugifyCategoryId,
} from '../../lib/restaurantMenuDb'
import { HIGHLIGHT_PARAM } from '../../lib/activityNavigation'
import { useFlashHighlight } from '../hooks/useFlashHighlight'
import { confirmDelete } from '../utils/confirmDelete'
import { cn } from '../utils/cn'

const MENU_DRAG_TYPE = 'application/x-cherekh-menu-item'

type DragPayload = {
  itemId: string
  fromCategoryId: string
}

type DropTarget = {
  categoryId: string
  index: number
}

const cloneMenu = (categories: MenuCategory[]): MenuCategory[] =>
  categories.map((category) => ({
    ...category,
    items: category.items.map((item) => ({ ...item })),
  }))

const parseDragPayload = (event: DragEvent): DragPayload | null => {
  const raw = event.dataTransfer.getData(MENU_DRAG_TYPE) || event.dataTransfer.getData('text/plain')
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as DragPayload
    if (!parsed?.itemId || !parsed?.fromCategoryId) return null
    return parsed
  } catch {
    return null
  }
}

const RestaurantMenu = () => {
  const toast = useToast()
  const [categories, setCategories] = useState<MenuCategory[]>(() => cloneMenu(defaultMenuCategories))
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newCategoryTitle, setNewCategoryTitle] = useState('')
  const [dragging, setDragging] = useState<DragPayload | null>(null)
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null)
  const [searchParams, setSearchParams] = useSearchParams()
  const [changedIds, setChangedIds] = useState<string[]>([])
  const [seen, setSeen] = useState<Set<string>>(() => new Set())
  const [activeChangeId, setActiveChangeId] = useState<string | null>(null)
  const [changesOpen, setChangesOpen] = useState(false)
  const changesNavRef = useRef<HTMLDivElement>(null)
  const flash = useFlashHighlight({
    onVisible: setActiveChangeId,
    onExpire: (id) => setSeen((prev) => new Set(prev).add(id)),
  })

  useEffect(() => {
    void loadRestaurantMenu()
      .then((loaded) => setCategories(cloneMenu(loaded)))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!changesOpen) return
    const close = (event: PointerEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !changesNavRef.current?.contains(event.target as Node)) {
        setChangesOpen(false)
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', close)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', close)
    }
  }, [changesOpen])

  const changedSet = new Set(changedIds)
  const changedItems = categories.flatMap((category) =>
    category.items.filter((item) => changedSet.has(item.id)).map((item) => ({ item, categoryTitle: category.title }))
  )
  const activeChangeIndex = changedItems.findIndex(({ item }) => item.id === activeChangeId)

  const jumpToChange = (id: string) => {
    setActiveChangeId(id)
    flash.flash(id)
  }

  const stepChange = (direction: 1 | -1) => {
    const count = changedItems.length
    if (count === 0) return
    const from = activeChangeIndex === -1 ? (direction === 1 ? -1 : 0) : activeChangeIndex
    jumpToChange(changedItems[(from + direction + count) % count].item.id)
  }

  const dismissChanges = () => {
    flash.clear()
    setChangedIds([])
    setSeen(new Set())
    setActiveChangeId(null)
    setChangesOpen(false)
  }

  // Activity links pass ?highlight=id1,id2 for the items a menu update changed.
  useEffect(() => {
    if (loading) return
    const raw = searchParams.get(HIGHLIGHT_PARAM)
    if (!raw) return
    setSearchParams(
      (params) => {
        params.delete(HIGHLIGHT_PARAM)
        return params
      },
      { replace: true }
    )
    const wanted = new Set(raw.split(',').filter(Boolean))
    const present = categories.flatMap((category) => category.items).filter((item) => wanted.has(item.id))
    if (present.length === 0) {
      toast.info('Those menu items have since been changed or removed')
      return
    }
    const ids = present.map((item) => item.id)
    setChangedIds(ids)
    setSeen(new Set())
    setActiveChangeId(ids[0])
    flash.start(ids)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, searchParams])

  const updateCategoryTitle = (categoryId: string, title: string) => {
    setCategories((prev) =>
      prev.map((category) => (category.id === categoryId ? { ...category, title } : category))
    )
  }

  const updateItem = (
    categoryId: string,
    itemId: string,
    patch: { name?: string; price?: number; portion?: MenuItem['portion'] }
  ) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: category.items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
            }
          : category
      )
    )
  }

  const addItem = (categoryId: string) => {
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? {
              ...category,
              items: [...category.items, { id: newMenuItemId(), name: '', price: 0, portion: '1:1' }],
            }
          : category
      )
    )
  }

  const removeItem = async (categoryId: string, itemId: string, name: string) => {
    if (name.trim()) {
      const ok = await confirmDelete({
        title: 'Remove menu item?',
        text: `Remove ${name} from the public dining menu?`,
      })
      if (!ok) return
    }
    setCategories((prev) =>
      prev.map((category) =>
        category.id === categoryId
          ? { ...category, items: category.items.filter((item) => item.id !== itemId) }
          : category
      )
    )
  }

  const removeCategory = async (category: MenuCategory) => {
    const ok = await confirmDelete({
      title: 'Remove section?',
      text: `Remove “${category.title}” and its ${category.items.length} item${
        category.items.length === 1 ? '' : 's'
      } from the dining menu?`,
    })
    if (!ok) return
    setCategories((prev) => prev.filter((entry) => entry.id !== category.id))
  }

  const addCategory = () => {
    const title = newCategoryTitle.trim()
    if (!title) {
      toast.error('Enter a section name')
      return
    }
    const id = slugifyCategoryId(title)
    if (categories.some((category) => category.id === id)) {
      toast.error('A section with that name already exists')
      return
    }
    setCategories((prev) => [...prev, { id, title, items: [] }])
    setNewCategoryTitle('')
  }

  const applyDrop = (payload: DragPayload, target: DropTarget) => {
    setCategories((prev) => moveMenuItem(prev, payload.itemId, target.categoryId, target.index))
    setDragging(null)
    setDropTarget(null)
  }

  const handleDragOver = (event: DragEvent, target: DropTarget) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    if (dropTarget?.categoryId !== target.categoryId || dropTarget.index !== target.index) {
      setDropTarget(target)
    }
  }

  const handleDrop = (event: DragEvent, target: DropTarget) => {
    event.preventDefault()
    event.stopPropagation()
    const payload = parseDragPayload(event) ?? dragging
    if (!payload) return
    applyDrop(payload, target)
  }

  const save = async () => {
    const namedItems = categories.reduce(
      (sum, category) => sum + category.items.filter((item) => item.name.trim()).length,
      0
    )
    if (namedItems === 0) {
      toast.error('Add at least one menu item before publishing')
      return
    }
    setSaving(true)
    const ok = await saveRestaurantMenu(categories)
    setSaving(false)
    if (ok) {
      toast.success('Menu published', 'The dining page now shows these names, portions, and prices.')
    } else {
      toast.error(
        'Could not publish menu',
        'Saved locally only. Run supabase/migrations/034_restaurant_menu.sql and 036_restaurant_menu_portion.sql in Supabase, then try again.'
      )
    }
  }

  return (
    <>
      <TopBar
        title="Menu"
        description="Item names, portions, and prices for cherekhcenter.com/dining"
        actions={
          <Button onClick={() => void save()} disabled={saving || loading} leftIcon={<Save className="w-4 h-4" />}>
            {saving ? 'Publishing…' : 'Publish menu'}
          </Button>
        }
      />
      <main className="px-4 lg:px-8 py-6 space-y-4 max-w-5xl">
        <Card className="p-4">
          <p className="text-sm text-stone-600">
            Drag the grip handle to reorder items or move them into another section. Portion is{' '}
            <span className="font-medium text-stone-700">1:1</span> (one person),{' '}
            <span className="font-medium text-stone-700">1:2</span> (two people), or{' '}
            <span className="font-medium text-stone-700">1:4</span> (four people). Publish to update
            the dining page.
          </p>
        </Card>

        {loading ? (
          <p className="text-sm text-stone-500 px-1">Loading menu…</p>
        ) : (
          categories.map((category) => (
            <Card
              key={category.id}
              padded={false}
              className={cn(
                'p-5 space-y-3 transition-shadow',
                dragging && dropTarget?.categoryId === category.id && 'ring-2 ring-forest-200'
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <UtensilsCrossed className="w-4 h-4 text-forest-600 shrink-0" />
                  <Input
                    value={category.title}
                    onChange={(event) => updateCategoryTitle(category.id, event.target.value)}
                    className="max-w-sm font-medium"
                    aria-label="Section name"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:bg-red-50"
                  leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                  onClick={() => void removeCategory(category)}
                >
                  Remove section
                </Button>
              </div>

              <div className="hidden sm:grid grid-cols-[1.5rem_minmax(0,1fr)_2.5rem] gap-2 text-[10px] uppercase tracking-wide text-stone-400">
                <span />
                <div className="grid grid-cols-[minmax(0,1.4fr)_5.5rem_6.5rem] gap-2">
                  <span>Name</span>
                  <span>Portion</span>
                  <span>Price</span>
                </div>
                <span />
              </div>

              <div className="space-y-1 min-h-[2.75rem]">
                {category.items.length === 0 && (
                  <div
                    className={cn(
                      'rounded-xl border border-dashed px-3 py-4 text-center text-xs text-stone-400',
                      dropTarget?.categoryId === category.id
                        ? 'border-forest-400 bg-forest-50 text-forest-700'
                        : 'border-stone-200'
                    )}
                    onDragOver={(event) =>
                      handleDragOver(event, { categoryId: category.id, index: 0 })
                    }
                    onDrop={(event) => handleDrop(event, { categoryId: category.id, index: 0 })}
                  >
                    Drop items here
                  </div>
                )}
                {category.items.map((item, index) => (
                  <MenuItemRow
                    key={item.id}
                    item={item}
                    showDropLine={
                      dropTarget?.categoryId === category.id &&
                      dropTarget.index === index &&
                      dragging?.itemId !== item.id
                    }
                    isDragging={dragging?.itemId === item.id}
                    onDragStart={(event) => {
                      const payload: DragPayload = { itemId: item.id, fromCategoryId: category.id }
                      event.dataTransfer.effectAllowed = 'move'
                      event.dataTransfer.setData(MENU_DRAG_TYPE, JSON.stringify(payload))
                      event.dataTransfer.setData('text/plain', JSON.stringify(payload))
                      setDragging(payload)
                    }}
                    onDragOver={(event) => {
                      event.stopPropagation()
                      handleDragOver(event, { categoryId: category.id, index })
                    }}
                    onDrop={(event) => handleDrop(event, { categoryId: category.id, index })}
                    onDragEnd={() => {
                      setDragging(null)
                      setDropTarget(null)
                    }}
                    onChange={(patch) => updateItem(category.id, item.id, patch)}
                    onRemove={() => void removeItem(category.id, item.id, item.name)}
                  />
                ))}
                {category.items.length > 0 && (
                  <div
                    className="h-4"
                    onDragOver={(event) => {
                      event.stopPropagation()
                      handleDragOver(event, {
                        categoryId: category.id,
                        index: category.items.length,
                      })
                    }}
                    onDrop={(event) =>
                      handleDrop(event, { categoryId: category.id, index: category.items.length })
                    }
                  >
                    {dropTarget?.categoryId === category.id &&
                      dropTarget.index >= category.items.length && (
                        <div className="h-0.5 rounded-full bg-forest-500 mx-8" />
                      )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-xs text-stone-400">
                  {category.items.length} item{category.items.length === 1 ? '' : 's'}
                  {category.items[0] ? ` · e.g. ${formatMenuPrice(category.items[0].price)}` : ''}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                  onClick={() => addItem(category.id)}
                >
                  Add item
                </Button>
              </div>
            </Card>
          ))
        )}

        <Card padded={false} className="p-5">
          <CardTitle className="text-base">Add section</CardTitle>
          <CardDescription className="mt-1">New heading on the dining page, then add items inside it.</CardDescription>
          <div className="mt-3 flex flex-wrap gap-2">
            <Field className="min-w-[12rem] flex-1">
              <Input
                value={newCategoryTitle}
                onChange={(event) => setNewCategoryTitle(event.target.value)}
                placeholder="e.g. Desserts"
              />
            </Field>
            <Button
              variant="outline"
              className="self-end"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={addCategory}
            >
              Add section
            </Button>
          </div>
        </Card>
      </main>

      {changedItems.length > 0 && (
        <div className="fixed inset-x-0 bottom-36 lg:bottom-6 z-40 flex justify-center px-4 pointer-events-none">
          <div ref={changesNavRef} className="relative pointer-events-auto max-w-full">
            {changesOpen && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-[min(20rem,calc(100vw-2rem))] rounded-2xl border border-stone-200 bg-white shadow-pop overflow-hidden">
                <p className="px-4 pt-3 pb-2 text-[11px] uppercase tracking-wide text-stone-400">
                  Changed in last update
                </p>
                <ul className="max-h-64 overflow-y-auto pb-1.5">
                  {changedItems.map(({ item, categoryTitle }, index) => {
                    const glowing = flash.active.has(item.id)
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            jumpToChange(item.id)
                            setChangesOpen(false)
                          }}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2 text-left hover:bg-stone-50',
                            index === activeChangeIndex && 'bg-amber-50/70'
                          )}
                        >
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                            {glowing ? (
                              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 animate-pulse" />
                            ) : seen.has(item.id) ? (
                              <Check className="w-4 h-4 text-forest-600" />
                            ) : (
                              <span className="h-2.5 w-2.5 rounded-full bg-stone-300" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-stone-800">
                              {item.name.trim() || 'Untitled item'}
                            </span>
                            <span className="block truncate text-xs text-stone-500">
                              {categoryTitle} · {normalizeMenuPortion(item.portion)} · {formatMenuPrice(item.price)}
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            <div className="flex items-center gap-0.5 rounded-full border border-amber-300 bg-amber-50 p-1 shadow-pop text-sm text-amber-900">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Previous changed item"
                disabled={changedItems.length < 2}
                onClick={() => stepChange(-1)}
              >
                <ChevronUp className="w-4 h-4" />
              </Button>
              <button
                type="button"
                aria-expanded={changesOpen}
                onClick={() => setChangesOpen((open) => !open)}
                className="flex min-w-0 items-center gap-2 rounded-full px-2 py-1.5 hover:bg-amber-100"
              >
                <span className="shrink-0 tabular-nums font-medium">
                  {activeChangeIndex === -1 ? changedItems.length : `${activeChangeIndex + 1}/${changedItems.length}`}
                </span>
                <span className="truncate max-w-[9rem] sm:max-w-[14rem]">
                  {activeChangeIndex === -1
                    ? `changed item${changedItems.length === 1 ? '' : 's'}`
                    : changedItems[activeChangeIndex].item.name.trim() || 'Untitled item'}
                </span>
                <List className="w-3.5 h-3.5 shrink-0 opacity-60" />
              </button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Next changed item"
                disabled={changedItems.length < 2}
                onClick={() => stepChange(1)}
              >
                <ChevronDown className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" aria-label="Close changed items" onClick={dismissChanges}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

const MenuItemRow = ({
  item,
  showDropLine,
  isDragging,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onChange,
  onRemove,
}: {
  item: MenuItem
  showDropLine: boolean
  isDragging: boolean
  onDragStart: (event: DragEvent<HTMLDivElement>) => void
  onDragOver: (event: DragEvent<HTMLDivElement>) => void
  onDrop: (event: DragEvent<HTMLDivElement>) => void
  onDragEnd: () => void
  onChange: (patch: { name?: string; price?: number; portion?: MenuItem['portion'] }) => void
  onRemove: () => void
}) => (
  <div
    data-highlight-id={item.id}
    onDragOver={onDragOver}
    onDrop={onDrop}
    className={cn('relative rounded-xl', isDragging && 'opacity-40')}
  >
    {showDropLine && <div className="absolute -top-0.5 left-8 right-8 h-0.5 rounded-full bg-forest-500" />}
    <div className="flex items-start gap-2">
      <div
        role="button"
        tabIndex={0}
        draggable
        aria-label={`Move ${item.name || 'menu item'}`}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        className="flex h-10 w-6 shrink-0 items-center justify-center text-stone-400 hover:text-stone-600 cursor-grab active:cursor-grabbing select-none"
      >
        <GripVertical className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1 grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_5.5rem_6.5rem] gap-2">
        <Input
          value={item.name}
          onChange={(event) => onChange({ name: event.target.value })}
          placeholder="Item name"
        />
        <Select
          value={normalizeMenuPortion(item.portion)}
          onChange={(event) => onChange({ portion: normalizeMenuPortion(event.target.value) })}
          aria-label={`Portion for ${item.name || 'item'}`}
        >
          {MENU_PORTIONS.map((portion) => (
            <option key={portion} value={portion}>
              {portion}
            </option>
          ))}
        </Select>
        <Input
          type="number"
          min={0}
          step={10}
          value={item.price || ''}
          onChange={(event) => onChange({ price: Math.max(0, Number(event.target.value || 0)) })}
          placeholder="৳"
          aria-label={`Price for ${item.name || 'item'}`}
        />
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="text-stone-400 hover:text-red-600 shrink-0"
        aria-label="Remove item"
        onClick={onRemove}
      >
        <Trash2 className="w-4 h-4" />
      </Button>
    </div>
  </div>
)

export default RestaurantMenu
