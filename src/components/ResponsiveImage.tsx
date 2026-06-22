import { useState } from 'react'
import type { ResponsiveImageSources } from '../utils/responsiveImage'

type ResponsiveImageProps = ResponsiveImageSources & {
  className?: string
  loading?: 'eager' | 'lazy'
  decoding?: 'async' | 'sync' | 'auto'
  fetchPriority?: 'high' | 'low' | 'auto'
  /** Use smallest thumb variant (gallery strip) */
  thumb?: boolean
  onError?: () => void
  onLoad?: () => void
}

const ResponsiveImage = ({
  src,
  alt,
  webpSrcSet,
  thumbSrc,
  sizes,
  width,
  height,
  className,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority,
  thumb = false,
  onError,
  onLoad,
}: ResponsiveImageProps) => {
  const [useFallback, setUseFallback] = useState(false)

  const imgSrc = thumb && thumbSrc ? thumbSrc : src
  const hasWebp = Boolean(webpSrcSet) && !useFallback && !thumb

  const handleError = () => {
    setUseFallback(true)
    onError?.()
  }

  if (!hasWebp) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
        {...(fetchPriority ? { fetchpriority: fetchPriority } : {})}
        {...(width && height ? { width, height } : {})}
        onError={handleError}
        onLoad={onLoad}
      />
    )
  }

  return (
    <picture>
      <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
      <img
        src={src}
        alt={alt}
        className={className}
        loading={loading}
        decoding={decoding}
        sizes={sizes}
        {...(fetchPriority ? { fetchpriority: fetchPriority } : {})}
        {...(width && height ? { width, height } : {})}
        onError={handleError}
        onLoad={onLoad}
      />
    </picture>
  )
}

export default ResponsiveImage
