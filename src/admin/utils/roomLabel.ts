export interface ParsedRoomLabel {
  number: string | null
  bed: string
  amenity: string | null
}

export const parseRoomLabel = (name: string): ParsedRoomLabel => {
  const raw = name.trim()
  if (!raw) return { number: null, bed: 'Room', amenity: null }

  const dashed = raw.match(/^Room\s+(\d+)\s*[-–]\s*(.+)$/i)
  if (dashed) {
    const [bed, amenity] = dashed[2].split('·').map((part) => part.trim())
    return { number: dashed[1], bed: bed || dashed[2], amenity: amenity || null }
  }

  const numbered = raw.match(/^Room\s+(\d+)$/i)
  if (numbered) return { number: numbered[1], bed: 'Room', amenity: null }

  return { number: null, bed: raw, amenity: null }
}
