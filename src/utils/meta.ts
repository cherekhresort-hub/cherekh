import { siteUrl } from '../data/siteConfig'
import { getCatalogRoomById } from '../data/roomCatalog'
import { getBlogPostById } from '../data/blogPosts'
import { getRobotsDirective } from './seoRoutes'

export interface PageMeta {
  title: string
  description: string
  keywords?: string
  canonical?: string
  ogImage?: string
  ogType?: string
  robots?: string
}

export const pageMeta: Record<string, PageMeta> = {
  '/': {
    title: 'Cherekh Center - Best Accommodation in Thanchi | Top Stay in Bandarban | Luxury Hill Stay',
    description:
      'Cherekh Center - One of the best luxury accommodations in Thanchi, Bandarban. Ranked among top places to stay in Bandarban. Experience premium nature-inspired accommodations, authentic local cuisine, and unforgettable hill station experiences. Book your stay at the best accommodation in Thanchi today.',
    keywords:
      'best accommodation in Thanchi, top 3 accommodation Bandarban, best hotel Thanchi, luxury accommodation Thanchi, Thanchi accommodation, Bandarban hill accommodation, top stay Bandarban, Thanchi luxury stay, best accommodation Bandarban, Thanchi hotel, Bandarban accommodation, hill station stay Bangladesh, Thanchi best accommodation, Bandarban top hotels, luxury accommodation Thanchi Bandarban',
    canonical: siteUrl('/'),
    ogImage: '/images/CherekhLogoFinal.png',
    ogType: 'website',
  },
  '/rooms': {
    title: 'Rooms & Suites - Best Accommodation in Thanchi | Cherekh Center',
    description:
      'Discover all 9 rooms at Cherekh Center in Thanchi, Bandarban. Choose from double and couple rooms with AC and non-AC options, each listed by room number with transparent pricing.',
    keywords:
      'best guest rooms Thanchi, top guest accommodation Bandarban, luxury rooms Thanchi, hotel rooms Bandarban, Thanchi best rooms, Bandarban accommodation rooms, Thanchi accommodation, luxury stay Bandarban',
    canonical: siteUrl('/rooms'),
    ogImage: '/cherekhImages/RoomPhotos/206_1.jpg',
  },
  '/conference-room': {
    title: 'Community Center & Conference Room - Cherekh Center Thanchi',
    description:
      'Host meetings, workshops, and community events at the Cherekh Center community center and conference room in Thanchi, Bandarban. Capacity for 80–100 guests with AV equipment and catering.',
    keywords:
      'community center Thanchi, conference room Bandarban, event space Thanchi, meeting room Bandarban, corporate events',
    canonical: siteUrl('/conference-room'),
    ogImage: '/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg',
  },
  '/conference-room/booking': {
    title: 'Book Conference Room - Cherekh Center',
    description: 'Reserve the Cherekh Center conference room for your event in Thanchi, Bandarban.',
    canonical: siteUrl('/conference-room/booking'),
    ogImage: '/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg',
  },
  '/dining': {
    title: 'Dining & Menu - Cherekh Center',
    description:
      'Explore the Cherekh Restaurant menu — main courses, snacks, breakfast, and fresh juices. Authentic Bangla cuisine in Thanchi, Bandarban. Complimentary breakfast with every room.',
    keywords:
      'Cherekh Center menu, restaurant Thanchi, Bangla food Bandarban, on-site dining, Cherekh Restaurant menu',
    canonical: siteUrl('/dining'),
    ogImage: '/cherekhImages/RestaurantPhotos/Restaurant_1.jpg',
  },
  '/experiences': {
    title: 'Experiences & Activities - Best Accommodation Thanchi | Cherekh Center',
    description:
      "Explore Bandarban with Cherekh Center, one of the best places to stay in Thanchi. Guided hill trekking, river activities, cultural visits, and sunset viewpoints. Discover why we're among the top places to stay in Bandarban.",
    keywords:
      'Thanchi trekking, Bandarban experiences, hill trekking Thanchi, cultural tours Bandarban, river activities Thanchi, best stay experiences Bandarban',
    canonical: siteUrl('/experiences'),
    ogImage: '/cherekhImages/homepageHero/hero02.jpg',
  },
  '/best-resort-thanchi': {
    title: 'Best Accommodation in Thanchi - Cherekh Center',
    description:
      'Find out why Cherekh Center is a top choice for travelers searching for the best accommodation in Thanchi with comfortable rooms, local experiences, and easy booking.',
    keywords:
      'best accommodation in thanchi, thanchi accommodation, thanchi accommodation, bandarban hill accommodation',
    canonical: siteUrl('/best-resort-thanchi'),
    ogImage: '/cherekhImages/homepageHero/Cover.jpg',
  },
  '/family-resort-bandarban': {
    title: 'Family Stay in Bandarban - Cherekh Center',
    description:
      'Plan a comfortable family stay in Bandarban with clear room capacity, practical pricing, and nature-friendly experiences at Cherekh Center.',
    keywords:
      'family stay bandarban, bandarban family stay, thanchi family accommodation, accommodation for family trip bandarban',
    canonical: siteUrl('/family-resort-bandarban'),
    ogImage: '/cherekhImages/RoomPhotos/103_1.jpg',
  },
  '/couple-resort-bandarban': {
    title: 'Couple Stay in Bandarban - Cherekh Center',
    description:
      'Book a peaceful couple getaway in Bandarban with scenic surroundings, couple room options, and direct booking at Cherekh Center.',
    keywords:
      'couple stay bandarban, bandarban couple stay, thanchi couple room, romantic stay bandarban',
    canonical: siteUrl('/couple-resort-bandarban'),
    ogImage: '/cherekhImages/RoomPhotos/206_1.jpg',
  },
  '/conference-resort-bandarban': {
    title: 'Conference Stay in Bandarban - Cherekh Center',
    description:
      'Host workshops, offsites, and team retreats at Cherekh Center with conference facilities and on-site accommodation in Bandarban.',
    keywords:
      'conference stay bandarban, corporate retreat bandarban, event venue thanchi, conference room bandarban',
    canonical: siteUrl('/conference-resort-bandarban'),
    ogImage: '/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg',
  },
  '/about': {
    title: 'About Us - Best Accommodation in Thanchi | Top Stay in Bandarban',
    description:
      'Learn about Cherekh Center, one of the best luxury accommodations in Thanchi and ranked among the top places to stay in Bandarban. Our story, values, and commitment to premium nature-inspired experiences.',
    keywords:
      'about Cherekh Center, best accommodation Thanchi story, top stay Bandarban, Thanchi accommodation history, Bandarban luxury accommodation',
    canonical: siteUrl('/about'),
    ogImage: '/images/CherekhLogoFinal.png',
  },
  '/contact': {
    title: 'Contact - Best Accommodation Thanchi | Cherekh Center Bandarban',
    description:
      'Contact Cherekh Center, one of the best places to stay in Thanchi, Bandarban. Book your stay, inquire about our top-rated accommodations, or get assistance. Located in Thanchi, Bandarban, Bangladesh.',
    keywords:
      'contact Cherekh Center, book best accommodation Thanchi, Thanchi accommodation contact, Bandarban accommodation booking, accommodation contact Bandarban',
    canonical: siteUrl('/contact'),
    ogImage: '/images/CherekhLogoFinal.png',
  },
  '/faq': {
    title: 'FAQ - Cherekh Center Thanchi, Bandarban',
    description:
      'Frequently asked questions about Cherekh Center in Thanchi, Bandarban — rooms, rates, dining, conference facilities, experiences, travel directions, check-in times, cancellation, and booking.',
    keywords:
      'Cherekh Center FAQ, Thanchi accommodation questions, Bandarban hotel FAQ, Cherekh booking help, conference room Thanchi FAQ',
    canonical: siteUrl('/faq'),
    ogImage: '/cherekhImages/faqCover.webp',
  },
  '/booking': {
    title: 'Book Now - Best Accommodation in Thanchi | Top Stay in Bandarban',
    description:
      'Book your stay at Cherekh Center, one of the best luxury accommodations in Thanchi and among the top places to stay in Bandarban. Choose from premium rooms and experience the tranquility of the hills.',
    keywords:
      'book best accommodation Thanchi, accommodation booking Bandarban, Thanchi accommodation reservation, Bandarban luxury hotel booking, book top 3 accommodation Bandarban',
    canonical: siteUrl('/booking'),
    ogImage: '/images/CherekhLogoFinal.png',
  },
  '/blog': {
    title: 'Blog - Cherekh Center',
    description:
      'Read our latest updates, travel guides, and local insights about Bandarban and Thanchi. Discover tips for your visit to Cherekh Center.',
    keywords: 'blog, travel guides, Bandarban tips, stay updates, local insights',
    canonical: siteUrl('/blog'),
    ogImage: '/images/CherekhLogoFinal.png',
  },
  '/developer': {
    title: 'Developer - Cherekh Center',
    description: 'Credits and technical information for the Cherekh Center website.',
    canonical: siteUrl('/developer'),
    ogImage: '/images/CherekhLogoFinal.png',
  },
  '/privacy-policy': {
    title: 'Privacy Policy - Cherekh Center',
    description:
      'Comprehensive Privacy Policy for Cherekh Center. Learn what data we collect, how we use it, your rights, cookies, retention, and how to contact us.',
    keywords: 'privacy policy, data protection, guest data, Cherekh Center privacy',
    canonical: siteUrl('/privacy-policy'),
  },
  '/terms': {
    title: 'Terms & Conditions - Cherekh Center',
    description:
      'Terms and Conditions for booking and staying at Cherekh Center, Thanchi. Covers reservations, payments, check-in, conduct, liability, and governing law.',
    keywords: 'terms and conditions, booking terms, guest policies, house rules',
    canonical: siteUrl('/terms'),
  },
  '/cancellation-policy': {
    title: 'Cancellation Policy - Cherekh Center',
    description:
      'Cancellation and refund policy for Cherekh Center room stays and conference events. Refund windows, modifications, no-shows, and exceptional circumstances.',
    keywords: 'cancellation policy, refund policy, booking cancellation, conference cancellation',
    canonical: siteUrl('/cancellation-policy'),
  },
  '/thank-you': {
    title: 'Booking Confirmed - Cherekh Center',
    description: 'Your booking request has been received.',
    canonical: siteUrl('/thank-you'),
  },
  '/contact/thank-you': {
    title: 'Message Sent - Cherekh Center',
    description: 'Your message has been received.',
    canonical: siteUrl('/contact/thank-you'),
  },
  '/conference-thank-you': {
    title: 'Conference Booking Confirmed - Cherekh Center',
    description: 'Your conference booking request has been received.',
    canonical: siteUrl('/conference-thank-you'),
  },
}

const buildRoomMeta = (roomNumber: string): PageMeta => {
  const room = getCatalogRoomById(roomNumber)
  if (!room) {
    return {
      title: `Room ${roomNumber} - Cherekh Center Thanchi`,
      description: `View photos, amenities, and pricing for Room ${roomNumber} at Cherekh Center in Thanchi, Bandarban.`,
      keywords: `room ${roomNumber} Cherekh Center, Thanchi hotel room, Bandarban accommodation`,
      canonical: siteUrl(`/rooms/${roomNumber}`),
      ogImage: `/cherekhImages/RoomPhotos/${roomNumber}_1.jpg`,
    }
  }

  const acLabel = room.features.some((f) => f === 'AC') ? 'AC' : 'Non-AC'
  return {
    title: `${room.name} - ${room.label} | Cherekh Center Thanchi`,
    description: room.description,
    keywords: `room ${roomNumber} Cherekh Center, ${room.label.toLowerCase()} Thanchi, ${acLabel} room Bandarban, ${room.bedType.toLowerCase()} Thanchi`,
    canonical: siteUrl(`/rooms/${roomNumber}`),
    ogImage: room.images[0],
    ogType: 'website',
  }
}

const buildBlogPostMeta = (postId: string): PageMeta | null => {
  const post = getBlogPostById(postId)
  if (!post) return null
  return {
    title: `${post.title} | Cherekh Center Blog`,
    description: post.excerpt,
    keywords: `${post.category}, Cherekh Center blog, Bandarban travel, Thanchi guide`,
    canonical: siteUrl(`/blog/${post.id}`),
    ogImage: post.image,
    ogType: 'article',
  }
}

const defaultMeta: PageMeta = {
  title: 'Cherekh Center - Best Accommodation in Thanchi | Top Stay in Bandarban',
  description:
    'Cherekh Center - One of the best luxury accommodations in Thanchi, Bandarban. Ranked among top places to stay in Bandarban. Experience premium nature-inspired accommodations and authentic local experiences.',
  keywords:
    'best accommodation in Thanchi, top 3 accommodation Bandarban, luxury accommodation Thanchi, best hotel Thanchi, Thanchi accommodation, Bandarban hill accommodation',
  canonical: siteUrl('/'),
  ogImage: '/images/CherekhLogoFinal.png',
}

export const getPageMeta = (pathname: string): PageMeta => {
  let meta: PageMeta

  if (pageMeta[pathname]) {
    meta = pageMeta[pathname]
  } else {
    const roomMatch = pathname.match(/^\/rooms\/(\d{3})$/)
    if (roomMatch) {
      meta = buildRoomMeta(roomMatch[1])
    } else {
      const blogMatch = pathname.match(/^\/blog\/([^/]+)$/)
      if (blogMatch) {
        const blogMeta = buildBlogPostMeta(blogMatch[1])
        meta = blogMeta ?? {
          ...defaultMeta,
          title: 'Post Not Found | Cherekh Center Blog',
          description: 'The blog post you are looking for could not be found.',
          canonical: siteUrl(pathname),
        }
      } else if (pathname !== '/' && !pathname.startsWith('/admin') && pathname !== '/login') {
        meta = {
          ...defaultMeta,
          title: 'Page Not Found | Cherekh Center',
          description: 'The page you are looking for could not be found on Cherekh Center.',
          canonical: siteUrl(pathname),
        }
      } else {
        meta = { ...defaultMeta, canonical: siteUrl(pathname) }
      }
    }
  }

  return {
    ...meta,
    robots: getRobotsDirective(pathname),
  }
}
