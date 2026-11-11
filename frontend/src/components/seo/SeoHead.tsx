import { useEffect } from 'react'

export const SITE_URL = 'https://tyushop.blog'

interface SeoHeadProps {
  title: string
  description: string
  path?: string
  image?: string
  type?: 'website' | 'product'
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
  noIndex?: boolean
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.setAttribute('content', content)
}

export function SeoHead({ title, description, path = '/', image = `${SITE_URL}/logo.png`, type = 'website', jsonLd, noIndex = false }: SeoHeadProps) {
  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`
    document.title = title
    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
    upsertMeta('property', 'og:type', type === 'product' ? 'product' : 'website')
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:title', title)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:image', image)
    upsertMeta('property', 'og:image:alt', title)
    upsertMeta('name', 'twitter:title', title)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:image', image)

    let canonical = document.head.querySelector<HTMLLinkElement>('link[data-tyushop-canonical]')
    if (!canonical) {
      canonical = document.createElement('link')
      canonical.rel = 'canonical'
      canonical.dataset.tyushopCanonical = 'true'
      document.head.appendChild(canonical)
    }
    canonical.href = canonicalUrl

    document.head.querySelector('script[data-tyushop-jsonld]')?.remove()
    if (jsonLd) {
      const script = document.createElement('script')
      script.type = 'application/ld+json'
      script.dataset.tyushopJsonld = 'true'
      script.textContent = JSON.stringify(jsonLd)
      document.head.appendChild(script)
    }

    return () => {
      document.head.querySelector('script[data-tyushop-jsonld]')?.remove()
    }
  }, [description, image, jsonLd, noIndex, path, title, type])

  return null
}
