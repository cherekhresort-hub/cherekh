import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BLOG_POSTS,
  CRAWL_NAV_LINKS,
  ROOM_NUMBERS,
  getIndexableRoutes,
  siteAssetUrl,
  siteUrl,
} from './seo-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const distIndex = path.join(root, 'dist', 'index.html')

if (!fs.existsSync(distIndex)) {
  console.warn('[seo] dist/index.html not found — skip prerender')
  process.exit(0)
}

const baseHtml = fs.readFileSync(distIndex, 'utf8')
const routes = getIndexableRoutes()

const escapeHtml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

const setMetaContent = (html, attr, key, value) => {
  const escaped = escapeHtml(value)
  const attrFirst = new RegExp(`(<meta[^>]+${attr}="${key}"[^>]+content=")([^"]*)(")`, 'i')
  if (attrFirst.test(html)) return html.replace(attrFirst, `$1${escaped}$3`)

  const contentFirst = new RegExp(`(<meta[^>]+content=")([^"]*)("[^>]+${attr}="${key}"[^>]*>)`, 'i')
  if (contentFirst.test(html)) return html.replace(contentFirst, `$1${escaped}$3`)

  return html.replace('</head>', `    <meta ${attr}="${key}" content="${escaped}" />\n  </head>`)
}

const setLinkHref = (html, rel, value) => {
  const pattern = new RegExp(`(<link[^>]+rel="${rel}"[^>]+href=")([^"]*)(")`, 'i')
  if (pattern.test(html)) return html.replace(pattern, `$1${escapeHtml(value)}$3`)
  return html.replace('</head>', `    <link rel="${rel}" href="${escapeHtml(value)}" />\n  </head>`)
}

const stripStaticSchemas = (html) =>
  html.replace(
    /\s*<script type="application\/ld\+json"[^>]*data-static-seo="true"[^>]*>[\s\S]*?<\/script>/gi,
    ''
  )

const baseGraph = (route) => [
  {
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
  },
  {
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
    numberOfRooms: ROOM_NUMBERS.length,
    parentOrganization: { '@id': `${siteUrl('/')}#organization` },
  },
  {
    '@type': 'WebSite',
    '@id': `${siteUrl('/')}#website`,
    name: 'Cherekh Center',
    url: siteUrl('/'),
    publisher: { '@id': `${siteUrl('/')}#organization` },
  },
  {
    '@type': 'WebPage',
    '@id': `${siteUrl(route.path)}#webpage`,
    url: siteUrl(route.path),
    name: route.title,
    description: route.description,
    isPartOf: { '@id': `${siteUrl('/')}#website` },
    inLanguage: 'en',
  },
]

const breadcrumbSchema = (items) => ({
  '@type': 'BreadcrumbList',
  '@id': `${siteUrl(items.at(-1)?.path || '/')}#breadcrumbs`,
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: siteUrl(item.path),
  })),
})

const routeSchema = (route) => {
  const graph = baseGraph(route)

  const roomMatch = route.path.match(/^\/rooms\/(\d{3})$/)
  if (roomMatch) {
    const roomNumber = roomMatch[1]
    graph.push(
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Rooms', path: '/rooms' },
        { name: `Room ${roomNumber}`, path: route.path },
      ]),
      {
        '@type': 'HotelRoom',
        '@id': `${siteUrl(route.path)}#room`,
        name: `Room ${roomNumber}`,
        description: route.description,
        image: siteAssetUrl(`/cherekhImages/RoomPhotos/${roomNumber}_1.jpg`),
        url: siteUrl(route.path),
        isPartOf: { '@id': `${siteUrl('/')}#lodging` },
      }
    )
  } else if (route.path === '/') {
    graph.push({
      '@type': 'FAQPage',
      '@id': `${siteUrl('/')}#faq`,
      mainEntity: [
        {
          '@type': 'Question',
          name: 'What types of rooms does Cherekh Center offer?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Cherekh Center has nine guest rooms numbered 103-206 with double and couple bed options, AC and Non-AC rooms.',
          },
        },
        {
          '@type': 'Question',
          name: 'Where is Cherekh Center located?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Cherekh Center is located in Thanchi, Bandarban, Bangladesh.',
          },
        },
      ],
    })
  } else if (route.path === '/rooms') {
    graph.push(
      breadcrumbSchema([
        { name: 'Home', path: '/' },
        { name: 'Rooms', path: '/rooms' },
      ]),
      {
        '@type': 'ItemList',
        '@id': `${siteUrl('/rooms')}#room-list`,
        name: 'Cherekh Center Rooms',
        itemListElement: ROOM_NUMBERS.map((roomNumber, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: siteUrl(`/rooms/${roomNumber}`),
        })),
      }
    )
  } else if (route.path === '/conference-room') {
    graph.push({
      '@type': 'EventVenue',
      '@id': `${siteUrl('/conference-room')}#venue`,
      name: 'Cherekh Center Conference Room',
      description: route.description,
      url: siteUrl('/conference-room'),
      image: siteAssetUrl('/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg'),
      maximumAttendeeCapacity: 100,
      isPartOf: { '@id': `${siteUrl('/')}#lodging` },
    })
  } else if (route.path === '/dining') {
    graph.push({
      '@type': 'Restaurant',
      '@id': `${siteUrl('/dining')}#restaurant`,
      name: 'Cherekh Center Restaurant',
      url: siteUrl('/dining'),
      image: siteAssetUrl('/cherekhImages/RestaurantPhotos/Restaurant_1.jpg'),
      servesCuisine: ['Bangla', 'Local Tribal', 'International'],
      isPartOf: { '@id': `${siteUrl('/')}#lodging` },
    })
  } else if (route.path.startsWith('/blog/')) {
    const post = BLOG_POSTS.find((item) => route.path === `/blog/${item.id}`)
    if (post) {
      graph.push(
        breadcrumbSchema([
          { name: 'Home', path: '/' },
          { name: 'Blog', path: '/blog' },
          { name: post.title, path: route.path },
        ]),
        {
          '@type': 'BlogPosting',
          headline: post.title,
          description: post.excerpt,
          image: siteAssetUrl(post.image),
          datePublished: post.date,
          author: { '@id': `${siteUrl('/')}#organization` },
          publisher: { '@id': `${siteUrl('/')}#organization` },
          mainEntityOfPage: siteUrl(route.path),
        }
      )
    }
  }

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  }
}

const stripHeroPreload = (html) =>
  html.replace(
    /\s*<link(?=[\s\S]*?homepageHero)(?=[\s\S]*?rel=["']preload["'])[\s\S]*?>\s*/gi,
    '\n'
  )

const stripHeroSplash = (html) => {
  let out = html.replace(/\s*<!-- Instant LCP shell[\s\S]*?<\/style>\s*/i, '')
  out = out.replace(/\s*<div id="hero-splash"[\s\S]*?<\/div>\s*/i, '')
  return out
}

const crawlHeading = (route) =>
  route.crawlHeading ||
  route.title.split(' | ')[0].split(' - ')[0].trim()

const injectCrawlableBody = (html, route) => {
  const nav = CRAWL_NAV_LINKS.map(
    (link) =>
      `<a href="${escapeHtml(siteUrl(link.path))}" style="color:#1E4D2B">${escapeHtml(link.label)}</a>`
  ).join(' · ')

  const block = `    <noscript id="static-crawl-content">
      <main style="max-width:42rem;margin:2rem auto;padding:0 1.25rem;font-family:Georgia,serif;color:#1a1a1a;line-height:1.6">
        <h1 style="font-size:1.75rem;margin:0 0 1rem">${escapeHtml(crawlHeading(route))}</h1>
        <p style="margin:0 0 1.25rem">${escapeHtml(route.description)}</p>
        <p style="margin:0;font-size:0.95rem"><strong>Cherekh Center</strong> — Thanchi, Bandarban, Bangladesh</p>
        <nav aria-label="Site pages" style="margin-top:1.25rem;font-size:0.9rem">${nav}</nav>
      </main>
    </noscript>
`

  if (html.includes('id="static-crawl-content"')) {
    return html.replace(
      /<noscript id="static-crawl-content">[\s\S]*?<\/noscript>\s*/i,
      `${block}\n`
    )
  }
  return html.replace('<div id="root">', `${block}    <div id="root">`)
}

const writeNetlifyRedirects = (routeList) => {
  const lines = [
    '# Auto-generated by scripts/prerender-meta.mjs',
    '# Canonical URLs — remove trailing slashes (Facebook and shared links)',
  ]

  for (const route of routeList) {
    if (route.path === '/') continue
    lines.push(`${route.path}/  ${route.path}  301`)
  }

  lines.push(
    '',
    '# Serve prerendered HTML for indexable routes (before SPA fallback)',
  )

  for (const route of routeList) {
    if (route.path === '/') continue
    const target = `${route.path}/index.html`
    lines.push(`${route.path}  ${target}  200`)
  }

  lines.push(
    '',
    '# Team access API — proxy to Netlify Function (must be before SPA fallback)',
    '/api/team-members  /.netlify/functions/team-members  200',
    '',
    '# Client-only routes (admin, auth, thank-you pages)',
    '/admin/*  /index.html  200',
    '/login  /index.html  200',
    '/thank-you  /index.html  200',
    '/conference-thank-you  /index.html  200',
    '/conference-room/booking/  /conference-room/booking  301',
    '/conference-room/booking  /index.html  200',
    '/contact/thank-you/  /contact/thank-you  301',
    '/contact/thank-you  /index.html  200',
    '',
    '# SPA fallback for other client routes (e.g. 404 page)',
    '/*  /index.html  200'
  )
  fs.writeFileSync(path.join(root, 'dist', '_redirects'), `${lines.join('\n')}\n`, 'utf8')
}

const injectRouteMeta = (html, route) => {
  const canonical = siteUrl(route.path)
  const ogImage = siteAssetUrl(route.ogImage || '/images/CherekhLogoFinal.png')
  const robots = route.robots || 'index, follow'

  let out = stripHeroPreload(html)
  if (route.path !== '/') {
    out = stripHeroSplash(out)
  }
  out = out.replace(/<title>.*?<\/title>/i, `<title>${escapeHtml(route.title)}</title>`)
  out = setMetaContent(out, 'name', 'description', route.description)
  out = setMetaContent(out, 'name', 'robots', robots)
  out = setMetaContent(out, 'name', 'googlebot', robots)
  out = setMetaContent(out, 'name', 'bingbot', robots)
  out = setLinkHref(out, 'canonical', canonical)
  out = setMetaContent(out, 'property', 'og:title', route.title)
  out = setMetaContent(out, 'property', 'og:description', route.description)
  out = setMetaContent(out, 'property', 'og:url', canonical)
  out = setMetaContent(out, 'property', 'og:image', ogImage)
  out = setMetaContent(out, 'name', 'twitter:title', route.title)
  out = setMetaContent(out, 'name', 'twitter:description', route.description)
  out = setMetaContent(out, 'name', 'twitter:image', ogImage)

  out = stripStaticSchemas(out)

  const schemaTag = `<script type="application/ld+json" id="prerender-route-schema" data-static-seo="true">${JSON.stringify(routeSchema(route))}</script>`
  if (out.includes('id="prerender-route-schema"')) {
    out = out.replace(
      /<script type="application\/ld\+json" id="prerender-route-schema"[^>]*>[\s\S]*?<\/script>/i,
      schemaTag
    )
  } else {
    out = out.replace('</head>', `${schemaTag}\n  </head>`)
  }

  return injectCrawlableBody(out, route)
}

const writeRouteHtml = (routePath, html) => {
  if (routePath === '/') {
    fs.writeFileSync(distIndex, html, 'utf8')
    return
  }

  const segments = routePath.split('/').filter(Boolean)
  const dir = path.join(root, 'dist', ...segments)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'index.html'), html, 'utf8')
}

let count = 0
for (const route of routes) {
  writeRouteHtml(route.path, injectRouteMeta(baseHtml, route))
  count += 1
}

writeNetlifyRedirects(routes)

console.log(`[seo] prerendered meta for ${count} routes`)
console.log(`[seo] wrote dist/_redirects with ${routes.length - 1} prerendered paths`)
