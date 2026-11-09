import { describe, expect, it } from 'vitest'
import type { MenuCategory } from '../../data/menuCatalog'
import { describeMenuChanges } from '../restaurantMenuDb'

const menu = (items: { id: string; name: string; price: number; portion?: string }[], title = 'Mains'): MenuCategory[] => [
  { id: title.toLowerCase(), title, items: items.map((item) => ({ portion: '1:1', ...item })) as MenuCategory['items'] },
]

describe('describeMenuChanges', () => {
  it('returns null without a previous menu', () => {
    expect(describeMenuChanges(null, menu([{ id: 'a', name: 'Rice', price: 50 }]))).toBeNull()
  })

  it('lists price edits, additions and removals with highlight ids', () => {
    const before = menu([
      { id: 'a', name: 'Rice', price: 50 },
      { id: 'b', name: 'Tea', price: 20 },
    ])
    const after = menu([
      { id: 'a', name: 'Rice', price: 60 },
      { id: 'c', name: 'Lassi', price: 80 },
    ])
    const changes = describeMenuChanges(before, after)!
    expect(changes.changedItemIds).toEqual(['a', 'c'])
    expect(changes.removedNames).toEqual(['Tea'])
    expect(changes.summary).toContain('Rice')
    expect(changes.summary).toContain('Added Lassi')
    expect(changes.summary).toContain('Removed Tea')
  })

  it('reports renames, portion changes and section moves', () => {
    const before = menu([{ id: 'a', name: 'Tea', price: 20 }], 'Drinks')
    const after = menu([{ id: 'a', name: 'Milk Tea', price: 20, portion: '1:2' }], 'Hot drinks')
    const changes = describeMenuChanges(before, after)!
    expect(changes.changedItemIds).toEqual(['a'])
    expect(changes.summary).toBe('Milk Tea renamed from Tea, portion 1:1 → 1:2, moved to Hot drinks')
  })

  it('treats a pure reorder as an order update with nothing to highlight', () => {
    const before = menu([
      { id: 'a', name: 'Rice', price: 50 },
      { id: 'b', name: 'Tea', price: 20 },
    ])
    const after = menu([
      { id: 'b', name: 'Tea', price: 20 },
      { id: 'a', name: 'Rice', price: 50 },
    ])
    expect(describeMenuChanges(before, after)).toEqual({
      changedItemIds: [],
      removedNames: [],
      summary: 'Menu order updated',
    })
  })

  it('caps the summary and notes how many more changes there were', () => {
    const before = menu([])
    const after = menu(['A', 'B', 'C', 'D', 'E'].map((name) => ({ id: name, name, price: 10 })))
    expect(describeMenuChanges(before, after)!.summary).toBe('Added A · Added B · Added C · +2 more')
  })
})
