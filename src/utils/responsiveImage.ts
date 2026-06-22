export type ImageVariant = {
  width: number
  src: string
}

export type ResponsiveImageSources = {
  /** Original public URL, e.g. /cherekhImages/homepageHero/Cover.jpg */
  src: string
  alt: string
  width?: number
  height?: number
  /** Pre-built srcset when variants exist */
  srcSet?: string
  /** WebP srcset when optimized variants exist */
  webpSrcSet?: string
  /** Smallest variant for thumbnails */
  thumbSrc?: string
  sizes?: string
}

const OPTIMIZED_PREFIX = '/cherekhImages/_optimized'

const IMAGE_PATH = /^(\/cherekhImages\/)(.+)\.(jpe?g|png)$/i

function parsePublicImage(src: string) {
  const match = src.match(IMAGE_PATH)
  if (!match) return null
  return {
    dir: match[2].replace(/\/[^/]+$/, ''),
    name: match[2].split('/').pop() ?? '',
    ext: match[3].toLowerCase(),
  }
}

/** Build responsive srcset paths for known optimized variants */
export function buildResponsiveSources(
  src: string,
  alt: string,
  options?: {
    widths?: number[]
    thumbWidth?: number
    sizes?: string
    intrinsicWidth?: number
    intrinsicHeight?: number
  }
): ResponsiveImageSources {
  const parsed = parsePublicImage(src)
  if (!parsed) {
    return { src, alt, width: options?.intrinsicWidth, height: options?.intrinsicHeight }
  }

  const base = `${OPTIMIZED_PREFIX}/${parsed.dir}/${parsed.name}`
  const widths =
    options?.widths ??
    (parsed.dir.includes('homepageHero')
      ? [480, 768, 1024]
      : [320, 480, 640, 800])

  const webpSrcSet = widths.map((w) => `${base}-${w}w.webp ${w}w`).join(', ')
  const thumbSrc = options?.thumbWidth
    ? `${base}-thumb-${options.thumbWidth}w.webp`
    : `${base}-thumb-176w.webp`

  const defaultSizes =
    options?.sizes ??
    (parsed.dir.includes('homepageHero')
      ? '(max-width: 768px) 100vw, (max-width: 1280px) 90vw, 1280px'
      : '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px')

  return {
    src,
    alt,
    webpSrcSet,
    thumbSrc,
    sizes: defaultSizes,
    width: options?.intrinsicWidth,
    height: options?.intrinsicHeight,
  }
}

export function heroImageSources(src: string, alt: string): ResponsiveImageSources {
  return buildResponsiveSources(src, alt, {
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    sizes: '100vw',
  })
}

export function cardImageSources(src: string, alt: string): ResponsiveImageSources {
  return buildResponsiveSources(src, alt, {
    intrinsicWidth: 1200,
    intrinsicHeight: 800,
    sizes: '(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 400px',
  })
}

export function galleryThumbSources(src: string, alt: string): ResponsiveImageSources {
  return buildResponsiveSources(src, alt, {
    thumbWidth: 176,
    intrinsicWidth: 176,
    intrinsicHeight: 132,
    sizes: '5.25rem',
  })
}
