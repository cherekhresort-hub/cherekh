import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { BookingSearchParams } from '../utils/roomSelection'

interface RoomSelectionContextValue {
  selectedIds: Set<string>
  selectedList: string[]
  selectedCount: number
  searchDates: BookingSearchParams | null
  toggle: (id: string) => void
  selectRooms: (roomIds: string[]) => void
  setSearchDates: (dates: BookingSearchParams) => void
  clearSearchDates: () => void
  clear: () => void
  clearAll: () => void
  isSelected: (id: string) => boolean
}

const RoomSelectionContext = createContext<RoomSelectionContextValue | null>(null)

export const RoomSelectionProvider = ({ children }: { children: ReactNode }) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [searchDates, setSearchDatesState] = useState<BookingSearchParams | null>(null)

  const toggle = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }, [])

  const selectRooms = useCallback((roomIds: string[]) => {
    setSelectedIds(new Set(roomIds))
  }, [])

  const setSearchDates = useCallback((dates: BookingSearchParams) => {
    setSearchDatesState(dates)
  }, [])

  const clearSearchDates = useCallback(() => {
    setSearchDatesState(null)
  }, [])

  const clear = useCallback(() => {
    setSelectedIds(new Set())
  }, [])

  const clearAll = useCallback(() => {
    setSelectedIds(new Set())
    setSearchDatesState(null)
  }, [])

  const isSelected = useCallback((id: string) => selectedIds.has(id), [selectedIds])

  const value = useMemo(
    () => ({
      selectedIds,
      selectedList: [...selectedIds],
      selectedCount: selectedIds.size,
      searchDates,
      toggle,
      selectRooms,
      setSearchDates,
      clearSearchDates,
      clear,
      clearAll,
      isSelected,
    }),
    [
      selectedIds,
      searchDates,
      toggle,
      selectRooms,
      setSearchDates,
      clearSearchDates,
      clear,
      clearAll,
      isSelected,
    ]
  )

  return (
    <RoomSelectionContext.Provider value={value}>{children}</RoomSelectionContext.Provider>
  )
}

export const useRoomSelection = (): RoomSelectionContextValue => {
  const ctx = useContext(RoomSelectionContext)
  if (!ctx) {
    throw new Error('useRoomSelection must be used within RoomSelectionProvider')
  }
  return ctx
}
