import { useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useRoomSelection } from './useRoomSelection'
import { saveSelectedRoomsHint, buildBookingUrl } from '../utils/roomSelection'

const selectedRoomsQuery = (roomIds: string[]): Record<string, string> | undefined =>
  roomIds.length > 0 ? { rooms: roomIds.join(',') } : undefined

/** Write the current room picks so /booking can add them as checkout lines. */
export const usePersistSelectedRooms = () => {
  const { selectedList, searchDates } = useRoomSelection()

  return useCallback(() => {
    if (selectedList.length === 0) return
    saveSelectedRoomsHint({
      roomIds: selectedList,
      checkIn: searchDates?.checkIn,
      checkOut: searchDates?.checkOut,
      adults: searchDates?.guests,
      children: 0,
    })
  }, [selectedList, searchDates])
}

export const useBookingHref = (): string => {
  const { selectedList, searchDates } = useRoomSelection()
  return useMemo(
    () => buildBookingUrl(searchDates, selectedRoomsQuery(selectedList)),
    [searchDates, selectedList]
  )
}

/** Persist selected rooms, then go to checkout. */
export const useGoToBooking = () => {
  const persist = usePersistSelectedRooms()
  const navigate = useNavigate()
  const bookingHref = useBookingHref()

  return useCallback(() => {
    persist()
    navigate(bookingHref)
  }, [persist, navigate, bookingHref])
}
