/**
 * Generates WebP variants under public/cherekhImages/_optimized/
 * Run: npm run optimize:images
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'

const PUBLIC_ROOT = path.resolve('public/cherekhImages')
const OUTPUT_ROOT = path.join(PUBLIC_ROOT, '_optimized')

/** Width breakpoints for responsive srcset */
const HERO_WIDTHS = [480, 768, 1024, 1280, 1600]
const CARD_WIDTHS = [320, 480, 640, 800]
const THUMB_WIDTHS = [176, 352]

const IMAGE_EXT = /\.(jpe?g|png)$/i

async function walk(dir) {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === '_optimized') continue
      files.push(...(await walk(fullPath)))
    } else if (IMAGE_EXT.test(entry.name)) {
      files.push(fullPath)
    }
  }
  return files
}

function relFromPublic(absPath) {
  return path.relative(PUBLIC_ROOT, absPath).replace(/\\/g, '/')
}

function outputBase(relPath) {
  const parsed = path.parse(relPath)
  return path.join(OUTPUT_ROOT, parsed.dir, parsed.name)
}

function pickWidths(relPath, metaWidth) {
  const max = metaWidth ?? 1280
  if (relPath.includes('homepageHero')) {
    return HERO_WIDTHS.filter((w) => w <= Math.max(max, 480))
  }
  if (relPath.includes('RoomPhotos') || relPath.includes('ExperiencePhotos')) {
    return CARD_WIDTHS.filter((w) => w <= Math.max(max, 320))
  }
  return CARD_WIDTHS.filter((w) => w <= Math.max(max, 320))
}

async function ensureDir(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
}

async function optimizeFile(absPath) {
  const rel = relFromPublic(absPath)
  const meta = await sharp(absPath).metadata()
  const widths = pickWidths(rel, meta.width ?? 1280)
  const base = outputBase(rel)
  const generated = []

  for (const width of widths) {
    const targetWidth = Math.min(width, meta.width ?? width)
    const outPath = `${base}-${width}w.webp`
    await ensureDir(outPath)
    await sharp(absPath)
      .rotate()
      .resize({ width: targetWidth, withoutEnlargement: true })
      .webp({ quality: rel.includes('homepageHero') ? 78 : 72, effort: 4 })
      .toFile(outPath)
    generated.push(outPath)
  }

  // Small thumbnails for gallery strip
  if (rel.includes('homepageHero')) {
    for (const width of THUMB_WIDTHS) {
      const outPath = `${base}-thumb-${width}w.webp`
      await ensureDir(outPath)
      await sharp(absPath)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 68, effort: 4 })
        .toFile(outPath)
      generated.push(outPath)
    }
  }

  return { rel, generated }
}

async function main() {
  const files = await walk(PUBLIC_ROOT)
  if (files.length === 0) {
    console.log('No images found under public/cherekhImages')
    return
  }

  console.log(`Optimizing ${files.length} images…`)
  let totalOut = 0
  for (const file of files) {
    const { rel, generated } = await optimizeFile(file)
    totalOut += generated.length
    console.log(`  ${rel} → ${generated.length} variants`)
  }
  console.log(`Done. ${totalOut} WebP files in public/cherekhImages/_optimized/`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
