export const ROOM_NUMBERS = ['103', '104', '105', '201', '202', '203', '204', '205', '206'] as const

export type RoomNumber = (typeof ROOM_NUMBERS)[number]
export type RoomBedCategory = 'double' | 'couple'

export const EXTRA_GUEST_PRICE = 1000

/** Children below this age are not charged extra-guest fees. */
export const CHILD_FREE_MAX_AGE = 12

/** Guests counted toward extra-guest fees (children under 12 stay free). */
export const getBillableGuestCount = (adults: number): number => Math.max(0, adults)

/** Total guests for room capacity / occupancy limits. */
export const getOccupancyGuestCount = (adults: number, children = 0): number =>
  Math.max(0, adults) + Math.max(0, children)

export interface RoomCatalogEntry {
  id: string
  roomNumber: string
  name: string
  label: string
  bedType: string
  bedCategory: RoomBedCategory
  includedGuests: number
  maxExtraGuests: number
  capacity: number
  extraGuestPrice: number
  price: number
  totalRooms: number
  description: string
  features: string[]
  amenities: string[]
  size: string
  images: string[]
  floor: number
  youtubeVideoId?: string
}

const ROOM_PHOTO_COUNTS: Record<string, number> = {
  '103': 5,
  '104': 6,
  '105': 5,
  '201': 4,
  '202': 4,
  '203': 4,
  '204': 5,
  '205': 4,
  '206': 6,
}

export const getRoomPhotoPaths = (roomNumber: string): string[] => {
  const count = ROOM_PHOTO_COUNTS[roomNumber] ?? 1
  return Array.from(
    { length: count },
    (_, index) => `/cherekhImages/RoomPhotos/${roomNumber}_${index + 1}.jpg`
  )
}

export const getMaxGuests = (room: Pick<RoomCatalogEntry, 'includedGuests' | 'maxExtraGuests'>): number =>
  room.includedGuests + room.maxExtraGuests

export const calculateExtraGuestCount = (
  billableGuests: number,
  includedGuests: number,
  maxExtraGuests: number
): number => Math.min(Math.max(0, billableGuests - includedGuests), maxExtraGuests)

export const calculateExtraGuestCountForParty = (
  adults: number,
  _children: number,
  includedGuests: number,
  maxExtraGuests: number
): number =>
  calculateExtraGuestCount(
    getBillableGuestCount(adults),
    includedGuests,
    maxExtraGuests
  )

export const calculateExtraGuestFee = (
  adults: number,
  children: number,
  includedGuests: number,
  maxExtraGuests: number,
  extraGuestPrice: number = EXTRA_GUEST_PRICE
): number =>
  calculateExtraGuestCountForParty(adults, children, includedGuests, maxExtraGuests) *
  extraGuestPrice

export const ROOM_BASE_AMENITIES = [
  'Complimentary Breakfast',
  '24 Hour Electricity',
  'En-suite Bathroom',
  'Hot Water',
  'Room Service',
  'Balcony with Garden View',
] as const

const ROOM_YOUTUBE_VIDEOS: Record<RoomNumber, string> = {
  '103': 'EHEqBZeOjvM',
  '104': 'LSFj4HfGVNI',
  '105': '6bP0UJkITgk',
  '201': 'x-Kazv2RlHo',
  '202': 'DVhG387Qj8g',
  '203': 'PMPwhSFSqZw',
  '204': 'KunkUeIly2Y',
  '205': 'kCe0o2YmFOc',
  '206': 'jBY5wUXMsrI',
}

const roomSpecs: Array<{
  roomNumber: RoomNumber
  label: string
  bedType: string
  bedCategory: RoomBedCategory
  price: number
  features: string[]
  extraAmenities?: string[]
}> = [
  {
    roomNumber: '103',
    label: 'Double Bed Non AC',
    bedType: 'Double Bed',
    bedCategory: 'double',
    price: 3000,
    features: ['Non-AC', 'Double Bed', 'Up to 4 Guests'],
  },
  {
    roomNumber: '104',
    label: 'Double Bed Non AC',
    bedType: 'Double Bed',
    bedCategory: 'double',
    price: 3000,
    features: ['Non-AC', 'Double Bed', 'Up to 4 Guests'],
  },
  {
    roomNumber: '105',
    label: 'Couple Bed AC',
    bedType: 'Couple Bed',
    bedCategory: 'couple',
    price: 3000,
    features: ['AC', 'Couple Bed', 'Up to 2 Guests'],
    extraAmenities: ['Air Conditioning'],
  },
  {
    roomNumber: '201',
    label: 'Double Bed Non AC',
    bedType: 'Double Bed',
    bedCategory: 'double',
    price: 3000,
    features: ['Non-AC', 'Double Bed', 'Up to 4 Guests'],
  },
  {
    roomNumber: '202',
    label: 'Double Bed Non AC',
    bedType: 'Double Bed',
    bedCategory: 'double',
    price: 3000,
    features: ['Non-AC', 'Double Bed', 'Up to 4 Guests'],
  },
  {
    roomNumber: '203',
    label: 'Double Bed Non AC',
    bedType: 'Double Bed',
    bedCategory: 'double',
    price: 3000,
    features: ['Non-AC', 'Double Bed', 'Up to 4 Guests'],
  },
  {
    roomNumber: '204',
    label: 'Couple Bed Non AC',
    bedType: 'Couple Bed',
    bedCategory: 'couple',
    price: 2500,
    features: ['Non-AC', 'Couple Bed', 'Up to 2 Guests'],
  },
  {
    roomNumber: '205',
    label: 'Couple Bed AC',
    bedType: 'Couple Bed',
    bedCategory: 'couple',
    price: 3500,
    features: ['AC', 'Couple Bed', 'Up to 2 Guests'],
    extraAmenities: ['Air Conditioning'],
  },
  {
    roomNumber: '206',
    label: 'Couple Bed AC',
    bedType: 'Couple Bed',
    bedCategory: 'couple',
    price: 4000,
    features: ['AC', 'Couple Bed', 'Hill View', 'Up to 2 Guests'],
    extraAmenities: ['Air Conditioning', 'Premium Hill View'],
  },
]

const getGuestPolicy = (bedCategory: RoomBedCategory) => {
  if (bedCategory === 'double') {
    return {
      includedGuests: 3,
      maxExtraGuests: 1,
    }
  }

  return {
    includedGuests: 2,
    maxExtraGuests: 1,
  }
}

const buildDescription = (roomNumber: string, label: string, floor: number, bedCategory: RoomBedCategory): string => {
  const floorLabel = floor === 1 ? 'ground floor' : 'second floor'
  const guestNote =
    bedCategory === 'double'
      ? 'Includes complimentary breakfast for up to 3 guests, with up to 1 additional paying guest at ৳1,000 per night. Children under 12 stay free. Maximum occupancy is 4 guests.'
      : 'Includes complimentary breakfast for up to 2 guests, with up to 1 additional paying guest at ৳1,000 per night. Children under 12 stay free.'

  return `Room ${roomNumber} is a comfortable ${label.toLowerCase()} on the ${floorLabel} at Cherekh Center. ${guestNote} Enjoy peaceful hill-station surroundings, natural light, and a relaxing stay in Thanchi, Bandarban.`
}

export const roomCatalog: RoomCatalogEntry[] = roomSpecs.map((spec) => {
  const floor = spec.roomNumber.startsWith('1') ? 1 : 2
  const guestPolicy = getGuestPolicy(spec.bedCategory)

  return {
    id: spec.roomNumber,
    roomNumber: spec.roomNumber,
    name: `Room ${spec.roomNumber}`,
    label: spec.label,
    bedType: spec.bedType,
    bedCategory: spec.bedCategory,
    includedGuests: guestPolicy.includedGuests,
    maxExtraGuests: guestPolicy.maxExtraGuests,
    capacity: guestPolicy.includedGuests + guestPolicy.maxExtraGuests,
    extraGuestPrice: EXTRA_GUEST_PRICE,
    price: spec.price,
    totalRooms: 1,
    floor,
    description: buildDescription(spec.roomNumber, spec.label, floor, spec.bedCategory),
    features: spec.features,
    amenities: [...ROOM_BASE_AMENITIES, ...(spec.extraAmenities ?? [])],
    size: '30 sqm',
    images: getRoomPhotoPaths(spec.roomNumber),
    youtubeVideoId: ROOM_YOUTUBE_VIDEOS[spec.roomNumber],
  }
})

export const getCatalogRoomById = (id: string): RoomCatalogEntry | undefined =>
  roomCatalog.find((room) => room.id === id)

export const CONFERENCE_ROOM_ID = 'conference' as const
export const CONFERENCE_CAPACITY = 100

export type BookableRoomRef = {
  id: string
  name: string
  selectLabel: string
  typeSummary: string
  capacity: number
  includedGuests: number
  maxExtraGuests: number
  extraGuestPrice: number
  isConference: boolean
}

export const getBookableRoomRef = (id: string): BookableRoomRef | undefined => {
  const catalog = getCatalogRoomById(id)
  if (catalog) {
    return {
      id: catalog.id,
      name: catalog.name,
      selectLabel: getRoomSelectLabel(catalog),
      typeSummary: getRoomTypeSummary(catalog),
      capacity: catalog.capacity,
      includedGuests: catalog.includedGuests,
      maxExtraGuests: catalog.maxExtraGuests,
      extraGuestPrice: catalog.extraGuestPrice,
      isConference: false,
    }
  }

  if (id === CONFERENCE_ROOM_ID) {
    const facility = facilityCatalog.conference
    return {
      id: CONFERENCE_ROOM_ID,
      name: facility.name,
      selectLabel: `${facility.name} — Event space`,
      typeSummary: facility.capacity,
      capacity: CONFERENCE_CAPACITY,
      includedGuests: CONFERENCE_CAPACITY,
      maxExtraGuests: 0,
      extraGuestPrice: 0,
      isConference: true,
    }
  }

  return undefined
}

/** Guest rooms plus conference — for admin and public booking selectors. */
export const bookableRoomCatalog = (): BookableRoomRef[] => {
  const conference = getBookableRoomRef(CONFERENCE_ROOM_ID)
  return [
    ...(conference ? [conference] : []),
    ...roomCatalog.map((room) => getBookableRoomRef(room.id)!),
  ]
}

export const BOOKABLE_ROOM_COUNT = roomCatalog.length + 1

/** Largest occupancy allowed in a single room (double rooms: 3 included + 1 extra). */
export const MAX_SINGLE_ROOM_CAPACITY = Math.max(...roomCatalog.map((room) => room.capacity))

export const getRoomTypeSummary = (
  room: Pick<RoomCatalogEntry, 'bedCategory' | 'features'>
): string => {
  const bed = room.bedCategory === 'couple' ? 'Couple Bed' : 'Double Bed'
  const ac = room.features.includes('AC') ? 'AC' : 'Non AC'
  return `${bed} · ${ac}`
}

export const getRoomSelectLabel = (
  room: Pick<RoomCatalogEntry, 'roomNumber' | 'bedCategory' | 'features'>
): string => `Room ${room.roomNumber} — ${getRoomTypeSummary(room)}`

export const getGuestPolicyLabel = (room: Pick<RoomCatalogEntry, 'bedCategory' | 'includedGuests' | 'maxExtraGuests' | 'extraGuestPrice'>): string => {
  const extraFee = `${room.extraGuestPrice.toLocaleString('en-BD')} BDT/adult/night`
  return `${room.includedGuests} paying guests included · up to ${room.maxExtraGuests} extra at ${extraFee} · children under ${CHILD_FREE_MAX_AGE} free`
}

export const conferenceImages = [
  '/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg',
  '/cherekhImages/ConferenceRoomPhotos/CFR_2.jpg',
  '/cherekhImages/ConferenceRoomPhotos/CFR_3.jpg',
  '/cherekhImages/ConferenceRoomPhotos/CFR_4.jpg',
  '/cherekhImages/ConferenceRoomPhotos/CFR_5.jpg',
]

export const restaurantImages = [
  '/cherekhImages/RestaurantPhotos/Restaurant_1.jpg',
  '/cherekhImages/RestaurantPhotos/Restaurant_2.jpg',
  '/cherekhImages/RestaurantPhotos/Restaurant_3.jpg',
  '/cherekhImages/RestaurantPhotos/Restaurant_4.jpg',
]

export const facilityCatalog = {
  conference: {
    id: 'conference',
    name: 'Conference Room',
    images: conferenceImages,
    capacity: '80-100 People',
    description:
      'Our spacious Conference Room is perfect for meetings, seminars, and events. With a capacity of 80-100 people, it features modern audio-visual equipment and can be configured to suit your needs. Catering services are available upon request.',
    amenities: [
      'Capacity: 80-100 People',
      'Audio/Visual Equipment',
      'Projector & Screen',
      'Sound System',
      'Catering Available',
      'Flexible Seating',
      'Climate Control',
    ],
    features: ['Audio/Visual Equipment', 'Catering Available'],
    ctaLabel: 'Book Conference',
    ctaHref: '/conference-room',
  },
  reception: {
    id: 'reception',
    name: 'Reception',
    images: [
      '/cherekhImages/homepageHero/Reception.jpg',
      '/cherekhImages/homepageHero/Cover.jpg',
    ],
    description:
      'Our reception area provides 24/7 service to assist you with check-in, check-out, and any inquiries during your stay. Our friendly staff is always ready to help with tour arrangements and local information.',
    amenities: [
      '24/7 Service',
      'Check-in/Check-out',
      'Tour Assistance',
      'Local Information',
      'Luggage Storage',
      'Concierge Service',
    ],
    features: ['24/7 Service', 'Check-in/Check-out', 'Tour Assistance'],
    ctaLabel: 'About Reception',
    ctaHref: '/rooms/reception',
  },
  'waiting-lounge': {
    id: 'waiting-lounge',
    name: 'Waiting Lounge',
    images: [
      '/cherekhImages/homepageHero/Cover_2.jpg',
      '/cherekhImages/homepageHero/Cover_3.jpg',
      '/cherekhImages/homepageHero/Cover_4.jpg',
    ],
    description:
      'Relax in our beautiful waiting lounge while you wait for check-in or prepare for your departure. The lounge features comfortable seating and refreshments, providing a pleasant space to unwind.',
    amenities: [
      'Comfortable Seating',
      'Refreshments',
      'Beautiful Ambiance',
      'Reading Materials',
      'Garden Views',
    ],
    features: ['Comfortable Seating', 'Refreshments'],
    ctaLabel: 'Explore Lounge',
    ctaHref: '/rooms/waiting-lounge',
  },
  restaurant: {
    id: 'restaurant',
    name: 'Cherekh Restaurant',
    images: restaurantImages,
    description:
      'Dine at Cherekh Restaurant with authentic Bangla main courses, snacks, breakfast, and freshly blended juices. Complimentary breakfast is included with every room stay.',
    amenities: [
      'Main Courses',
      'Snacks & Fast Food',
      'Breakfast',
      'Juices & Beverages',
      'Complimentary Breakfast with Rooms',
      'Local & International Flavours',
    ],
    features: ['Main Courses', 'Breakfast', 'Fresh Juices'],
    ctaLabel: 'View Menu',
    ctaHref: '/dining',
  },
}
