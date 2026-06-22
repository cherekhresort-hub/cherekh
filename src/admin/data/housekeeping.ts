import { roomCatalog } from '../../data/roomCatalog'
import type { HousekeepingTask } from '../types'

/** One kanban card per guest room in the catalog. */
export const buildDefaultHousekeepingTasks = (): HousekeepingTask[] =>
  roomCatalog.map((room) => ({
    id: `hk-${room.id}`,
    roomId: room.id,
    roomNumber: room.roomNumber,
    status: 'ready',
    priority: 'medium',
    estimatedMinutes: room.bedCategory === 'double' ? 35 : 25,
  }))
