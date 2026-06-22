import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getPageMeta } from '../utils/meta'
import { siteAssetUrl, siteUrl } from '../data/siteConfig'
import { resortLocation } from '../data/contactInfo'

const PageMeta = () => {
  const location = useLocation()
  const meta = getPageMeta(location.pathname)

  useEffect(() => {
    // Update document title
    document.title = meta.title

    // Update or create meta description
    let metaDescription = document.querySelector('meta[name="description"]')
    if (!metaDescription) {
      metaDescription = document.createElement('meta')
      metaDescription.setAttribute('name', 'description')
      document.head.appendChild(metaDescription)
    }
    metaDescription.setAttribute('content', meta.description)

    // Update or create meta keywords
    if (meta.keywords) {
      let metaKeywords = document.querySelector('meta[name="keywords"]')
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta')
        metaKeywords.setAttribute('name', 'keywords')
        document.head.appendChild(metaKeywords)
      }
      metaKeywords.setAttribute('content', meta.keywords)
    } else {
      document.querySelector('meta[name="keywords"]')?.remove()
    }

    const canonicalUrl = meta.canonical || siteUrl(location.pathname)

    // Update or create canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]')
    if (!canonicalLink) {
      canonicalLink = document.createElement('link')
      canonicalLink.setAttribute('rel', 'canonical')
      document.head.appendChild(canonicalLink)
    }
    canonicalLink.setAttribute('href', canonicalUrl)

    // Update Open Graph tags
    const updateOGTag = (property: string, content: string) => {
      let ogTag = document.querySelector(`meta[property="${property}"]`)
      if (!ogTag) {
        ogTag = document.createElement('meta')
        ogTag.setAttribute('property', property)
        document.head.appendChild(ogTag)
      }
      ogTag.setAttribute('content', content)
    }

    const ogImage = siteAssetUrl(meta.ogImage || '/images/CherekhLogoFinal.png')

    updateOGTag('og:title', meta.title)
    updateOGTag('og:description', meta.description)
    updateOGTag('og:url', canonicalUrl)
    updateOGTag('og:image', ogImage)
    updateOGTag('og:type', meta.ogType || 'website')

    // Update Twitter Card tags
    const updateTwitterTag = (name: string, content: string) => {
      let twitterTag = document.querySelector(`meta[name="${name}"]`)
      if (!twitterTag) {
        twitterTag = document.createElement('meta')
        twitterTag.setAttribute('name', name)
        document.head.appendChild(twitterTag)
      }
      twitterTag.setAttribute('content', content)
    }

    updateTwitterTag('twitter:title', meta.title)
    updateTwitterTag('twitter:description', meta.description)
    updateTwitterTag('twitter:card', 'summary_large_image')
    updateTwitterTag('twitter:site', '@cherekhresort')
    updateTwitterTag('twitter:creator', '@cherekhresort')
    updateTwitterTag('twitter:image', ogImage)

    // Enhanced Open Graph tags
    updateOGTag('og:locale', 'en_US')
    updateOGTag('og:site_name', 'Cherekh Center')
    updateOGTag('og:image:width', '1200')
    updateOGTag('og:image:height', '630')
    updateOGTag('og:image:alt', meta.title)

    // Additional SEO meta tags
    const addMetaTag = (name: string, content: string) => {
      let metaTag = document.querySelector(`meta[name="${name}"]`)
      if (!metaTag) {
        metaTag = document.createElement('meta')
        metaTag.setAttribute('name', name)
        document.head.appendChild(metaTag)
      }
      metaTag.setAttribute('content', content)
    }

    addMetaTag('author', 'Cherekh Center')
    const robots = meta.robots || 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    addMetaTag('robots', robots)
    addMetaTag('googlebot', robots)
    addMetaTag('bingbot', robots)
    addMetaTag('language', 'English')
    addMetaTag('geo.region', 'BD-01')
    addMetaTag('geo.placename', 'Thanchi, Bandarban')
    addMetaTag('geo.position', `${resortLocation.latitude};${resortLocation.longitude}`)
    addMetaTag('ICBM', `${resortLocation.latitude}, ${resortLocation.longitude}`)
    addMetaTag('rating', 'general')
    addMetaTag('distribution', 'global')
    addMetaTag('revisit-after', '7 days')
  }, [location.pathname, meta])

  return null
}

export default PageMeta

