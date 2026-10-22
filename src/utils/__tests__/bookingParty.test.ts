import { describe, expect, it } from 'vitest'
import { allocateGuestsToRooms, rebalanceLinesToCapacity } from '../bookingParty'
import { createRoomLine, type RoomOption } from '../bookingHelpers'

const option = (value: string, capacity: number): RoomOption => ({
  value,
  label: value,
  typeSummary: '',
  capacity,
  includedGuests: 2,
  maxExtraGuests: capacity - 2,
  extraGuestPrice: 1000,
  price: 0,
  listPrice: 0,
  isConference: false,
})

describe('rebalanceLinesToCapacity', () => {
  it('moves a third guest from a double room into a couple room', () => {
    const lines = [createRoomLine('103', 3, 0), createRoomLine('104', 2, 0), createRoomLine('105', 2, 0)]
    const result = rebalanceLinesToCapacity(lines, [option('103', 2), option('104', 2), option('105', 3)])
    expect(result.map((l) => [l.roomType, l.adults + l.children])).toEqual([
      ['103', 2],
      ['104', 2],
      ['105', 3],
    ])
  })

  it('fills included occupancy before using a couple room third place', () => {
    const lines = [createRoomLine('103', 3, 0), createRoomLine('105', 2, 0), createRoomLine('104', 1, 0)]
    const result = rebalanceLinesToCapacity(lines, [option('103', 2), option('104', 2), option('105', 3)])
    expect(result.map((l) => [l.roomType, l.adults + l.children])).toEqual([
      ['103', 2],
      ['105', 2],
      ['104', 2],
    ])
  })
})

const double = (id: string) => ({ id, includedGuests: 2, capacity: 2 })
const couple = (id: string) => ({ id, includedGuests: 2, capacity: 3 })

describe('allocateGuestsToRooms', () => {
  it('uses included occupancy while rooms are left', () => {
    const rooms = [couple('105'), double('103'), double('104')]
    expect(allocateGuestsToRooms(3, 0, rooms)).toEqual([
      { id: '105', guests: 2 },
      { id: '103', guests: 1 },
    ])
  })

  it('adds overflow guests to couple rooms once every room is full', () => {
    const rooms = [couple('105'), double('103'), couple('205')]
    expect(allocateGuestsToRooms(8, 0, rooms)).toEqual([
      { id: '105', guests: 3 },
      { id: '103', guests: 2 },
      { id: '205', guests: 3 },
    ])
  })

  it('fills couple rooms in list order when only some overflow', () => {
    const rooms = [double('103'), couple('105'), couple('205')]
    expect(allocateGuestsToRooms(7, 0, rooms)).toEqual([
      { id: '103', guests: 2 },
      { id: '105', guests: 3 },
      { id: '205', guests: 2 },
    ])
  })

  it('puts 3 guests in a single available couple room', () => {
    expect(allocateGuestsToRooms(3, 0, [couple('206')])).toEqual([{ id: '206', guests: 3 }])
  })

  it('returns nothing when the party exceeds every room maximum', () => {
    expect(allocateGuestsToRooms(6, 0, [couple('105'), double('103')])).toEqual([])
  })
})
