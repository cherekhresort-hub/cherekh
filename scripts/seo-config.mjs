/** Shared SEO route config for build-time sitemap + prerender scripts. */

export const SITE_ORIGIN = 'https://cherekhcenter.com'

export const ROOM_NUMBERS = ['103', '104', '105', '201', '202', '203', '204', '205', '206']

export const BLOG_POSTS = [
  {
    id: '1',
    title: 'Welcome to Cherekh Center: Your Gateway to Thanchi',
    excerpt:
      'Discover the natural beauty of Thanchi, Bandarban at Cherekh Center. Experience peace in the hills with our premium accommodations.',
    date: '2025-01-15',
    image: '/cherekhImages/homepageHero/hero01.jpg',
  },
  {
    id: '2',
    title: 'Best Time to Visit Bandarban: A Seasonal Guide',
    excerpt:
      'Learn about the best seasons to visit Bandarban and what to expect during each time of year.',
    date: '2025-01-10',
    image: '/cherekhImages/homepageHero/hero02.jpg',
  },
  {
    id: '3',
    title: 'Top 5 Trekking Trails Near Thanchi',
    excerpt: 'Explore the most beautiful trekking routes accessible from Cherekh Center.',
    date: '2025-01-05',
    image: '/cherekhImages/homepageHero/hero03.jpg',
  },
  {
    id: '4',
    title: "Local Tribal Culture: A Visitor's Guide",
    excerpt: 'Learn about the rich cultural heritage of the tribal communities in Bandarban.',
    date: '2024-12-28',
    image: '/cherekhImages/homepageHero/hero05.jpg',
  },
  {
    id: '5',
    title: 'New Year Celebration at Cherekh Center',
    excerpt:
      'Join us for a special New Year celebration with traditional food and cultural performances.',
    date: '2024-12-20',
    image: '/cherekhImages/homepageHero/hero06.jpg',
  },
]

const ROOM_SPECS = {
  103: { label: 'Double Bed Non AC', bedType: 'Double Bed' },
  104: { label: 'Double Bed Non AC', bedType: 'Double Bed' },
  105: { label: 'Couple Bed AC', bedType: 'Couple Bed' },
  201: { label: 'Double Bed Non AC', bedType: 'Double Bed' },
  202: { label: 'Double Bed Non AC', bedType: 'Double Bed' },
  203: { label: 'Double Bed Non AC', bedType: 'Double Bed' },
  204: { label: 'Couple Bed Non AC', bedType: 'Couple Bed' },
  205: { label: 'Couple Bed AC', bedType: 'Couple Bed' },
  206: { label: 'Couple Bed AC', bedType: 'Couple Bed' },
}

/** @type {Record<string, { title: string, description: string, ogImage?: string, robots?: string, priority?: string, changefreq?: string }>} */
export const STATIC_PAGE_META = {
  '/': {
    title: 'Cherekh Center - Best Accommodation in Thanchi | Top Stay in Bandarban | Luxury Hill Stay',
    description:
      'Cherekh Center - One of the best luxury accommodations in Thanchi, Bandarban. Ranked among top places to stay in Bandarban. Experience premium nature-inspired accommodations, authentic local cuisine, and unforgettable hill station experiences.',
    ogImage: '/images/CherekhLogoFinal.png',
    priority: '1.0',
    changefreq: 'daily',
  },
  '/rooms': {
    title: 'Rooms & Suites - Best Accommodation in Thanchi | Cherekh Center',
    crawlHeading: 'Rooms & Suites',
    description:
      'Discover all 9 guest rooms at Cherekh Center in Thanchi, Bandarban. Double and couple rooms with AC and non-AC options, listed by room number with transparent pricing.',
    ogImage: '/cherekhImages/RoomPhotos/206_1.jpg',
    priority: '0.9',
    changefreq: 'weekly',
  },
  '/conference-room': {
    title: 'Community Center & Conference Room - Cherekh Center Thanchi',
    crawlHeading: 'Community Center & Conference Room',
    description:
      'Host meetings, workshops, and community events at the Cherekh Center community center and conference room in Thanchi, Bandarban. Capacity for 80–100 guests with AV equipment and catering.',
    ogImage: '/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg',
    priority: '0.9',
    changefreq: 'monthly',
  },
  '/dining': {
    title: 'Dining & Menu - Cherekh Center',
    description: 'Explore the Cherekh Restaurant menu in Thanchi, Bandarban.',
    ogImage: '/cherekhImages/RestaurantPhotos/Restaurant_1.jpg',
    priority: '0.8',
    changefreq: 'monthly',
  },
  '/experiences': {
    title: 'Experiences & Activities - Cherekh Center',
    description: 'Guided hill trekking, river activities, and cultural visits from Cherekh Center.',
    ogImage: '/cherekhImages/homepageHero/hero02.jpg',
    priority: '0.8',
    changefreq: 'monthly',
  },
  '/best-resort-thanchi': {
    title: 'Best Accommodation in Thanchi - Cherekh Center',
    description: 'Why Cherekh Center is a top choice for the best accommodation in Thanchi.',
    ogImage: '/cherekhImages/homepageHero/Cover.jpg',
    priority: '0.8',
    changefreq: 'monthly',
  },
  '/family-resort-bandarban': {
    title: 'Family Stay in Bandarban - Cherekh Center',
    description: 'Plan a comfortable family stay in Bandarban at Cherekh Center.',
    ogImage: '/cherekhImages/RoomPhotos/103_1.jpg',
    priority: '0.7',
    changefreq: 'monthly',
  },
  '/couple-resort-bandarban': {
    title: 'Couple Stay in Bandarban - Cherekh Center',
    description: 'Book a peaceful couple getaway in Bandarban at Cherekh Center.',
    ogImage: '/cherekhImages/RoomPhotos/206_1.jpg',
    priority: '0.7',
    changefreq: 'monthly',
  },
  '/conference-resort-bandarban': {
    title: 'Conference Stay in Bandarban - Cherekh Center',
    description: 'Host workshops and team retreats with conference facilities in Bandarban.',
    ogImage: '/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg',
    priority: '0.7',
    changefreq: 'monthly',
  },
  '/about': {
    title: 'About Us - Cherekh Center Thanchi, Bandarban',
    crawlHeading: 'About Cherekh Center',
    description:
      'Learn about Cherekh Center — a hill retreat in Thanchi, Bandarban with guest rooms, restaurant, community center, and local experiences.',
    ogImage: '/images/CherekhLogoFinal.png',
    priority: '0.7',
    changefreq: 'monthly',
  },
  '/contact': {
    title: 'Contact - Cherekh Center',
    description: 'Contact Cherekh Center to book or inquire about your stay in Thanchi.',
    ogImage: '/images/CherekhLogoFinal.png',
    priority: '0.8',
    changefreq: 'monthly',
  },
  '/faq': {
    title: 'FAQ - Cherekh Center Thanchi, Bandarban',
    crawlHeading: 'Frequently Asked Questions',
    description:
      'Answers about rooms, rates, dining, conference facilities, experiences, travel, check-in, cancellation, and booking at Cherekh Center in Thanchi, Bandarban.',
    ogImage: '/cherekhImages/faqCover.webp',
    priority: '0.8',
    changefreq: 'monthly',
  },
  '/booking': {
    title: 'Book Your Stay - Cherekh Center Thanchi, Bandarban',
    crawlHeading: 'Book Your Stay',
    description:
      'Book rooms at Cherekh Center in Thanchi, Bandarban. Choose dates, select from nine guest rooms, and confirm your hill retreat online.',
    ogImage: '/images/CherekhLogoFinal.png',
    priority: '0.9',
    changefreq: 'weekly',
  },
  '/blog': {
    title: 'Blog - Cherekh Center',
    description: 'Travel guides and stay updates from Cherekh Center.',
    ogImage: '/images/CherekhLogoFinal.png',
    priority: '0.7',
    changefreq: 'weekly',
  },
  '/developer': {
    title: 'Developer - Cherekh Center',
    description: 'Credits and technical information for the Cherekh Center website.',
    ogImage: '/images/CherekhLogoFinal.png',
    priority: '0.3',
    changefreq: 'yearly',
  },
  '/privacy-policy': {
    title: 'Privacy Policy - Cherekh Center',
    description: "Read Cherekh Center's Privacy Policy.",
    priority: '0.4',
    changefreq: 'yearly',
  },
  '/terms': {
    title: 'Terms & Conditions - Cherekh Center',
    description: "Review Cherekh Center's Terms & Conditions.",
    priority: '0.4',
    changefreq: 'yearly',
  },
  '/cancellation-policy': {
    title: 'Cancellation Policy - Cherekh Center',
    description: "Learn about Cherekh Center's cancellation policy.",
    priority: '0.4',
    changefreq: 'yearly',
  },
}

export const getRoomMeta = (roomNumber) => {
  const spec = ROOM_SPECS[roomNumber]
  const ogImage = `/cherekhImages/RoomPhotos/${roomNumber}_1.jpg`
  if (!spec) {
    return {
      title: `Room ${roomNumber} - Cherekh Center Thanchi`,
      description: `View photos, amenities, and pricing for Room ${roomNumber} at Cherekh Center.`,
      ogImage,
      priority: '0.8',
      changefreq: 'monthly',
    }
  }
  return {
    title: `Room ${roomNumber} - ${spec.label} | Cherekh Center Thanchi`,
    description: `Book Room ${roomNumber}, a ${spec.label.toLowerCase()} (${spec.bedType}) at Cherekh Center in Thanchi, Bandarban.`,
    ogImage,
    priority: '0.8',
    changefreq: 'monthly',
  }
}

export const getBlogMeta = (post) => ({
  title: `${post.title} | Cherekh Center Blog`,
  description: post.excerpt,
  ogImage: post.image,
  priority: '0.6',
  changefreq: 'monthly',
  lastmod: post.date,
})

/** Indexable routes for prerender + sitemap (excludes thank-you and admin). */
export const getIndexableRoutes = () => {
  const routes = Object.keys(STATIC_PAGE_META).map((path) => ({
    path,
    ...STATIC_PAGE_META[path],
    robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  }))

  for (const roomNumber of ROOM_NUMBERS) {
    routes.push({
      path: `/rooms/${roomNumber}`,
      ...getRoomMeta(roomNumber),
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    })
  }

  for (const post of BLOG_POSTS) {
    routes.push({
      path: `/blog/${post.id}`,
      ...getBlogMeta(post),
      robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    })
  }

  return routes
}

export const siteUrl = (path = '/') => {
  if (path === '/' || path === '') return `${SITE_ORIGIN}/`
  return `${SITE_ORIGIN}${path.startsWith('/') ? path : `/${path}`}`
}

export const siteAssetUrl = (assetPath) => siteUrl(assetPath.startsWith('/') ? assetPath : `/${assetPath}`)

/** Crawlable nav links injected into prerendered HTML (noscript). */
export const CRAWL_NAV_LINKS = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' },
  { path: '/rooms', label: 'Rooms' },
  { path: '/booking', label: 'Book Now' },
  { path: '/conference-room', label: 'Community Center' },
  { path: '/dining', label: 'Dining' },
  { path: '/faq', label: 'FAQ' },
  { path: '/contact', label: 'Contact' },
]
