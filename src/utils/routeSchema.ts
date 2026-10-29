import { getPublicCatalogRoomById, publicRoomCatalog } from '../data/roomCatalog'
import { getBlogPostById } from '../data/blogPosts'
import { FAQ_HOMEPAGE_ITEMS, faqSchemaJsonLd } from '../data/faqCatalog'
import { siteAssetUrl, siteUrl } from '../data/siteConfig'
import { resortContact, resortEntitySameAs, resortLocation } from '../data/contactInfo'
import { getPageMeta } from './meta'

type SchemaNode = Record<string, unknown>

const LODGING_ID = `${siteUrl('/')}#lodging`
const ORGANIZATION_ID = `${siteUrl('/')}#organization`

const HOTEL_AMENITIES = [
  'Complimentary breakfast',
  'Free Starlink WiFi',
  'IPS backup power',
  'Hot water',
  'Room service',
  'Air conditioning (selected rooms)',
  'Balcony with garden view',
  'Restaurant',
  '24/7 reception',
  'Conference room',
  'Tour and trek assistance',
  'Parking',
]

const amenityFeatures = (names: readonly string[]): SchemaNode[] =>
  names.map((name) => ({
    '@type': 'LocationFeatureSpecification',
    name,
    value: true,
  }))

const breadcrumbSchema = (items: Array<{ name: string; path: string }>): SchemaNode => ({
  '@type': 'BreadcrumbList',
  '@id': `${siteUrl(items[items.length - 1]?.path ?? '/')}#breadcrumbs`,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: siteUrl(item.path),
  })),
})

const organizationSchema = (): SchemaNode => ({
  '@type': 'Organization',
  '@id': ORGANIZATION_ID,
  name: 'Cherekh Center',
  url: siteUrl('/'),
  logo: {
    '@type': 'ImageObject',
    url: siteAssetUrl('/images/CherekhLogoFinal.png'),
  },
  sameAs: [...resortEntitySameAs],
})

const lodgingSchema = (): SchemaNode => ({
  '@type': ['LodgingBusiness', 'Hotel'],
  '@id': LODGING_ID,
  name: 'Cherekh Center',
  description:
    'Comfortable accommodation in Thanchi, Bandarban with nine guest rooms, restaurant, conference room, and local hill experiences.',
  url: siteUrl('/'),
  image: [
    siteAssetUrl('/cherekhImages/homepageHero/hero01.jpg'),
    siteAssetUrl('/cherekhImages/homepageHero/hero02.jpg'),
    siteAssetUrl('/cherekhImages/homepageHero/hero03.jpg'),
  ],
  address: {
    '@type': 'PostalAddress',
    streetAddress: 'Thanchi',
    addressLocality: 'Thanchi',
    addressRegion: 'Bandarban',
    postalCode: '4650',
    addressCountry: 'BD',
  },
  geo: {
    '@type': 'GeoCoordinates',
    latitude: resortLocation.latitude,
    longitude: resortLocation.longitude,
  },
  hasMap: resortLocation.mapsPlaceUrl,
  telephone: resortContact.phoneE164,
  email: resortContact.email,
  priceRange: '$$',
  currenciesAccepted: 'BDT',
  paymentAccepted: 'Cash, bKash, Nagad, Rocket, Bank transfer',
  knowsLanguage: ['en', 'bn'],
  checkinTime: '12:00',
  checkoutTime: '11:00',
  numberOfRooms: publicRoomCatalog.length,
  areaServed: [
    { '@type': 'AdministrativeArea', name: 'Thanchi' },
    { '@type': 'AdministrativeArea', name: 'Bandarban' },
  ],
  amenityFeature: amenityFeatures(HOTEL_AMENITIES),
  sameAs: [...resortEntitySameAs],
  parentOrganization: { '@id': ORGANIZATION_ID },
})

const webSiteSchema = (): SchemaNode => ({
  '@type': 'WebSite',
  '@id': `${siteUrl('/')}#website`,
  name: 'Cherekh Center',
  url: siteUrl('/'),
  publisher: { '@id': ORGANIZATION_ID },
})

const webPageSchema = (pathname: string): SchemaNode => {
  const meta = getPageMeta(pathname)
  return {
    '@type': 'WebPage',
    '@id': `${siteUrl(pathname)}#webpage`,
    url: siteUrl(pathname),
    name: meta.title,
    description: meta.description,
    isPartOf: { '@id': `${siteUrl('/')}#website` },
    inLanguage: 'en',
  }
}

const roomSchemas = (pathname: string, roomId: string): SchemaNode[] => {
  const room = getPublicCatalogRoomById(roomId)
  if (!room) return []
  return [
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Rooms', path: '/rooms' },
      { name: room.name, path: pathname },
    ]),
    {
      '@type': 'HotelRoom',
      '@id': `${siteUrl(pathname)}#room`,
      name: `${room.name} - ${room.label}`,
      description: room.description,
      url: siteUrl(pathname),
      image: room.images.map((img) => siteAssetUrl(img)),
      bed: {
        '@type': 'BedDetails',
        typeOfBed: room.bedType,
        numberOfBeds: 1,
      },
      occupancy: {
        '@type': 'QuantitativeValue',
        minValue: 1,
        maxValue: room.capacity,
        unitText: 'guests',
      },
      floorSize: {
        '@type': 'QuantitativeValue',
        value: 30,
        unitCode: 'MTK',
      },
      amenityFeature: amenityFeatures(room.amenities),
      offers: {
        '@type': 'Offer',
        url: siteUrl('/booking'),
        priceCurrency: 'BDT',
        price: room.price,
        priceSpecification: {
          '@type': 'UnitPriceSpecification',
          price: room.price,
          priceCurrency: 'BDT',
          unitCode: 'DAY',
          unitText: 'per night',
        },
        seller: { '@id': LODGING_ID },
      },
      containedInPlace: { '@id': LODGING_ID },
    },
  ]
}

const roomListSchemas = (): SchemaNode[] => [
  breadcrumbSchema([
    { name: 'Home', path: '/' },
    { name: 'Rooms', path: '/rooms' },
  ]),
  {
    '@type': 'ItemList',
    '@id': `${siteUrl('/rooms')}#room-list`,
    name: 'Cherekh Center Rooms',
    itemListElement: publicRoomCatalog.map((room, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      item: {
        '@type': 'HotelRoom',
        '@id': `${siteUrl(`/rooms/${room.id}`)}#room`,
        name: `${room.name} - ${room.label}`,
        url: siteUrl(`/rooms/${room.id}`),
        image: siteAssetUrl(room.images[0]),
      },
    })),
  },
]

const blogPostSchemas = (pathname: string): SchemaNode[] => {
  const post = getBlogPostById(pathname.replace('/blog/', ''))
  if (!post) return []
  return [
    breadcrumbSchema([
      { name: 'Home', path: '/' },
      { name: 'Blog', path: '/blog' },
      { name: post.title, path: pathname },
    ]),
    {
      '@type': 'BlogPosting',
      headline: post.title,
      description: post.excerpt,
      image: siteAssetUrl(post.image),
      datePublished: post.date,
      author: {
        '@type': 'Organization',
        name: post.author,
      },
      publisher: { '@id': ORGANIZATION_ID },
      mainEntityOfPage: siteUrl(pathname),
    },
  ]
}

const genericBreadcrumbs = (pathname: string): SchemaNode[] => {
  const crumbs = [{ name: 'Home', path: '/' }]
  let acc = ''
  for (const segment of pathname.split('/').filter(Boolean)) {
    acc += `/${segment}`
    crumbs.push({ name: getPageMeta(acc).title.split(' - ')[0] || segment, path: acc })
  }
  return crumbs.length > 1 ? [breadcrumbSchema(crumbs)] : []
}

/**
 * JSON-LD graph for a public route. Shared by the build-time prerender (static HTML for
 * crawlers that skip JavaScript) and RouteSchema (client navigation), so both stay identical.
 */
export const buildRouteSchema = (pathname: string): SchemaNode => {
  const graph: SchemaNode[] = [
    organizationSchema(),
    lodgingSchema(),
    webSiteSchema(),
    webPageSchema(pathname),
  ]

  const roomMatch = pathname.match(/^\/rooms\/(\d{3})$/)
  if (roomMatch) {
    graph.push(...roomSchemas(pathname, roomMatch[1]))
  } else if (pathname === '/') {
    graph.push(faqSchemaJsonLd('/', FAQ_HOMEPAGE_ITEMS))
  } else if (pathname === '/rooms') {
    graph.push(...roomListSchemas())
  } else if (pathname === '/conference-room') {
    graph.push(
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Conference Room', path: '/conference-room' },
      ]),
      {
        '@type': 'EventVenue',
        '@id': `${siteUrl('/conference-room')}#venue`,
        name: 'Cherekh Center Conference Room',
        description:
          'Conference and event space in Thanchi, Bandarban with capacity for 80–100 guests.',
        url: siteUrl('/conference-room'),
        image: siteAssetUrl('/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg'),
        maximumAttendeeCapacity: 100,
        containedInPlace: { '@id': LODGING_ID },
      }
    )
  } else if (pathname === '/dining') {
    graph.push(
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Dining', path: '/dining' },
      ]),
      {
        '@type': 'Restaurant',
        '@id': `${siteUrl('/dining')}#restaurant`,
        name: 'Cherekh Center Restaurant',
        url: siteUrl('/dining'),
        image: siteAssetUrl('/cherekhImages/RestaurantPhotos/Restaurant_1.jpg'),
        servesCuisine: ['Bangla', 'Local Tribal', 'International'],
        containedInPlace: { '@id': LODGING_ID },
      }
    )
  } else if (pathname.startsWith('/blog/')) {
    graph.push(...blogPostSchemas(pathname))
  } else {
    graph.push(...genericBreadcrumbs(pathname))
  }

  if (pathname === '/faq') {
    graph.push(faqSchemaJsonLd('/faq'))
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}
