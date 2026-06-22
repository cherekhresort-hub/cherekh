import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { getIndexableRoutes, siteUrl, siteAssetUrl } from './seo-config.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')
const today = new Date().toISOString().slice(0, 10)

const routes = getIndexableRoutes()

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

const urlEntries = routes
  .map((route) => {
    const loc = siteUrl(route.path)
    const lastmod = route.lastmod || today
    const imageBlock =
      route.ogImage
        ? `
    <image:image>
      <image:loc>${escapeXml(siteAssetUrl(route.ogImage))}</image:loc>
      <image:title>${escapeXml(route.title)}</image:title>
    </image:image>`
        : ''

    return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${escapeXml(route.changefreq || 'monthly')}</changefreq>
    <priority>${escapeXml(route.priority || '0.5')}</priority>${imageBlock}
  </url>`
  })
  .join('\n')

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urlEntries}
</urlset>
`

const targets = [path.join(root, 'public', 'sitemap.xml'), path.join(root, 'dist', 'sitemap.xml')]

for (const target of targets) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.writeFileSync(target, xml, 'utf8')
  console.log(`[seo] wrote ${target}`)
}
