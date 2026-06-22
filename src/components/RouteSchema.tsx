import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getCatalogRoomById, roomCatalog } from '../data/roomCatalog'
import { getBlogPostById } from '../data/blogPosts'
import { getPageMeta } from '../utils/meta'
import { faqSchemaJsonLd } from '../data/faqCatalog'
import { siteAssetUrl, siteUrl } from '../data/siteConfig'

const SCHEMA_ID = 'route-schema-jsonld'

const injectSchema = (data: Record<string, unknown>) => {
  const existing = document.getElementById(SCHEMA_ID)
  if (existing) existing.remove()
  document.getElementById('prerender-route-schema')?.remove()

  const script = document.createElement('script')
  script.id = SCHEMA_ID
  script.type = 'application/ld+json'
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
}

const breadcrumbSchema = (items: Array<{ name: string; path: string }>): Record<string, unknown> => ({
  '@type': 'BreadcrumbList',
  '@id': `${siteUrl(items[items.length - 1]?.path ?? '/')}#breadcrumbs`,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: siteUrl(item.path),
  })),
})

const organizationSchema = (): Record<string, unknown> => ({
  '@type': 'Organization',
  '@id': `${siteUrl('/')}#organization`,
  name: 'Cherekh Center',
  url: siteUrl('/'),
  logo: {
    '@type': 'ImageObject',
    url: siteAssetUrl('/images/CherekhLogoFinal.png'),
  },
  sameAs: [
    'https://www.facebook.com/cherekhcenter',
    'https://www.instagram.com/cherekhcenter',
    'https://www.youtube.com/@CherekhCenter',
  ],
})

const lodgingSchema = (): Record<string, unknown> => ({
  '@type': 'LodgingBusiness',
  '@id': `${siteUrl('/')}#lodging`,
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
    latitude: 21.81657,
    longitude: 92.433641,
  },
  telephone: '+8801601719735',
  email: 'cherekhcenter@gmail.com',
  priceRange: '$$',
  checkinTime: '14:00',
  checkoutTime: '11:00',
  numberOfRooms: roomCatalog.length,
  amenityFeature: [
    'Nine guest rooms',
    'AC and Non-AC rooms',
    'Conference Room',
    'Restaurant',
    'Free WiFi',
    'Parking',
    'Room Service',
  ].map((name) => ({
    '@type': 'LocationFeatureSpecification',
    name,
    value: true,
  })),
  parentOrganization: { '@id': `${siteUrl('/')}#organization` },
})

const webSiteSchema = (): Record<string, unknown> => ({
  '@type': 'WebSite',
  '@id': `${siteUrl('/')}#website`,
  name: 'Cherekh Center',
  url: siteUrl('/'),
  publisher: { '@id': `${siteUrl('/')}#organization` },
})

const webPageSchema = (pathname: string): Record<string, unknown> => {
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

const faqSchema = (): Record<string, unknown> => faqSchemaJsonLd('/faq')

const RouteSchema = () => {
  const { pathname } = useLocation()

  useEffect(() => {
    const graph: Record<string, unknown>[] = [
      organizationSchema(),
      lodgingSchema(),
      webSiteSchema(),
      webPageSchema(pathname),
    ]

    const roomMatch = pathname.match(/^\/rooms\/(\d{3})$/)
    if (roomMatch) {
      const room = getCatalogRoomById(roomMatch[1])
      if (room) {
        graph.push(
          breadcrumbSchema([
            { name: 'Home', path: '/' },
            { name: 'Rooms', path: '/rooms' },
            { name: room.name, path: pathname },
          ]),
          {
            '@type': 'HotelRoom',
            '@id': `${siteUrl(pathname)}#room`,
            name: room.name,
            description: room.description,
            image: room.images.map((img) => siteAssetUrl(img)),
            occupancy: {
              '@type': 'QuantitativeValue',
              maxValue: room.capacity,
              unitText: 'guests',
            },
            amenityFeature: room.amenities.map((name) => ({
              '@type': 'LocationFeatureSpecification',
              name,
              value: true,
            })),
            floorSize: {
              '@type': 'QuantitativeValue',
              value: 30,
              unitCode: 'MTK',
            },
            offers: {
              '@type': 'Offer',
              price: room.price,
              priceCurrency: 'BDT',
              availability: 'https://schema.org/InStock',
              url: siteUrl('/booking'),
            },
            isPartOf: {
              '@type': 'LodgingBusiness',
              '@id': `${siteUrl('/')}#organization`,
              name: 'Cherekh Center',
            },
          }
        )
      }
    } else if (pathname === '/rooms') {
      graph.push(
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Rooms', path: '/rooms' },
        ]),
        {
          '@type': 'ItemList',
          '@id': `${siteUrl('/rooms')}#room-list`,
          name: 'Cherekh Center Rooms',
          itemListElement: roomCatalog.map((room, index) => ({
            '@type': 'ListItem',
            position: index + 1,
            item: {
              '@type': 'HotelRoom',
              '@id': `${siteUrl(`/rooms/${room.id}`)}#room`,
              name: room.name,
              url: siteUrl(`/rooms/${room.id}`),
              image: siteAssetUrl(room.images[0]),
            },
          })),
        }
      )
    } else if (pathname === '/conference-room') {
      graph.push(
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Conference Room', path: '/conference-room' },
        ]),
        {
          '@type': 'EventVenue',
          name: 'Cherekh Center Conference Room',
          description:
            'Conference and event space in Thanchi, Bandarban with capacity for 80–100 guests.',
          url: siteUrl('/conference-room'),
          image: siteAssetUrl('/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg'),
          maximumAttendeeCapacity: 100,
          isPartOf: { '@id': `${siteUrl('/')}#organization` },
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
          isPartOf: { '@id': `${siteUrl('/')}#lodging` },
        }
      )
    } else if (pathname.startsWith('/blog/')) {
      const postId = pathname.replace('/blog/', '')
      const post = getBlogPostById(postId)
      if (post) {
        graph.push(
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
            publisher: {
              '@type': 'Organization',
              name: 'Cherekh Center',
              logo: {
                '@type': 'ImageObject',
                url: siteAssetUrl('/images/CherekhLogoFinal.png'),
              },
            },
            mainEntityOfPage: siteUrl(pathname),
          }
        )
      }
    } else if (pathname !== '/') {
      const segments = pathname.split('/').filter(Boolean)
      const crumbs = [{ name: 'Home', path: '/' }]
      let acc = ''
      for (const segment of segments) {
        acc += `/${segment}`
        const meta = getPageMeta(acc)
        crumbs.push({ name: meta.title.split(' - ')[0] || segment, path: acc })
      }
      if (crumbs.length > 1) graph.push(breadcrumbSchema(crumbs))
    }

    if (pathname === '/faq') {
      graph.push(faqSchema())
    }

    injectSchema({
      '@context': 'https://schema.org',
      '@graph': graph,
    })
  }, [pathname])

  return null
}

export default RouteSchema
