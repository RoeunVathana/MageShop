import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

export const SITE_URL = 'https://tyushop.blog'
const DEFAULT_TITLE = 'TYUSHOP | Cambodia Online Marketplace'
const DEFAULT_DESCRIPTION =
  'Shop authentic electronics, fashion, beauty, home goods and groceries in Cambodia at TYUSHOP. Pay with Bakong KHQR or cash on delivery and track orders with live GPS delivery.'

interface PageMeta {
  title: string
  description: string
  indexable: boolean
  type?: 'website' | 'product'
}

interface SeoHeadProps {
  title?: string
  description?: string
  path?: string
  image?: string
  type?: 'website' | 'product'
  jsonLd?: Record<string, unknown> | Record<string, unknown>[]
  noIndex?: boolean
}

const PUBLIC_META: Record<string, PageMeta> = {
  '/': { title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, indexable: true },
  '/products': {
    title: 'Shop Products in Cambodia | TYUSHOP',
    description: 'Browse electronics, fashion, beauty, home goods and everyday products from trusted Cambodia marketplace sellers.',
    indexable: true,
  },
  '/categories': {
    title: 'Product Categories | TYUSHOP Cambodia',
    description: 'Explore TYUSHOP product categories, from electronics and fashion to home, beauty and daily essentials.',
    indexable: true,
  },
  '/brands': {
    title: 'Trusted Brands in Cambodia | TYUSHOP',
    description: 'Discover trusted brands and verified marketplace stores available for delivery across Cambodia.',
    indexable: true,
  },
  '/about': {
    title: 'About TYUSHOP Cambodia',
    description: 'Learn about TYUSHOP, a Cambodia-focused multi-vendor marketplace with secure checkout and nationwide delivery.',
    indexable: true,
  },
  '/contact': {
    title: 'Contact TYUSHOP Support',
    description: 'Contact TYUSHOP customer support for orders, delivery, sellers, payments and account assistance.',
    indexable: true,
  },
  '/faq': {
    title: 'TYUSHOP Frequently Asked Questions',
    description: 'Answers about TYUSHOP orders, Bakong KHQR, cash on delivery, OTP password recovery, coupons and live delivery tracking.',
    indexable: true,
  },
  '/sell': {
    title: 'Sell Online in Cambodia | Join TYUSHOP',
    description: 'Join TYUSHOP as a seller and reach Cambodia shoppers with marketplace tools, delivery support and secure payments.',
    indexable: true,
  },
}

function metaForPath(pathname: string): PageMeta {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/'
  if (PUBLIC_META[normalizedPath]) return PUBLIC_META[normalizedPath]

  if (normalizedPath.startsWith('/products/')) {
    return {
      title: 'Product Details | TYUSHOP Cambodia',
      description: 'View product details, seller information, pricing, delivery options and secure checkout on TYUSHOP.',
      indexable: true,
      type: 'product',
    }
  }

  if (normalizedPath === '/track-order') {
    return {
      title: 'Track Your Order | TYUSHOP Cambodia',
      description: 'Track TYUSHOP order status and delivery progress across Cambodia.',
      indexable: true,
    }
  }

  if (normalizedPath === '/seller/register' || normalizedPath === '/seller/join') {
    return PUBLIC_META['/sell']
  }

  return {
    title: normalizedPath.startsWith('/admin') || normalizedPath.startsWith('/dashboard')
      ? 'TYUSHOP Admin Workspace'
      : 'TYUSHOP Account',
    description: DEFAULT_DESCRIPTION,
    indexable: false,
  }
}

function upsertMeta(attribute: 'name' | 'property', key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, key)
    document.head.appendChild(element)
  }
  element.content = content
}

function upsertCanonical(url: string) {
  let link = document.head.querySelector<HTMLLinkElement>('link[data-tyushop-canonical]')
  if (!link) {
    link = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]') || document.createElement('link')
    link.rel = 'canonical'
    link.dataset.tyushopCanonical = 'true'
    document.head.appendChild(link)
  }
  link.href = url
}

export function SeoHead({
  title,
  description,
  path,
  image = `${SITE_URL}/logo.png`,
  type,
  jsonLd,
  noIndex,
}: SeoHeadProps) {
  const location = useLocation()
  const routeMeta = metaForPath(location.pathname)
  const resolvedTitle = title || routeMeta.title
  const resolvedDescription = description || routeMeta.description
  const resolvedPath = path || location.pathname
  const resolvedType = type || routeMeta.type || 'website'
  const resolvedNoIndex = noIndex ?? !routeMeta.indexable

  useEffect(() => {
    const canonicalUrl = `${SITE_URL}${resolvedPath === '/' ? '/' : resolvedPath.replace(/\/+$/, '')}`

    document.title = resolvedTitle
    upsertMeta('name', 'title', resolvedTitle)
    upsertMeta('name', 'description', resolvedDescription)
    upsertMeta('name', 'robots', resolvedNoIndex ? 'noindex, nofollow, noarchive' : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1')
    upsertMeta('property', 'og:type', resolvedType === 'product' ? 'product' : 'website')
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:title', resolvedTitle)
    upsertMeta('property', 'og:description', resolvedDescription)
    upsertMeta('property', 'og:image', image)
    upsertMeta('property', 'og:image:alt', resolvedTitle)
    upsertMeta('name', 'twitter:title', resolvedTitle)
    upsertMeta('name', 'twitter:description', resolvedDescription)
    upsertMeta('name', 'twitter:image', image)
    upsertCanonical(canonicalUrl)

    const scriptId = 'tyushop-route-jsonld'
    let structuredData = document.head.querySelector<HTMLScriptElement>(`script#${scriptId}`)
    if (!structuredData) {
      structuredData = document.createElement('script')
      structuredData.id = scriptId
      structuredData.type = 'application/ld+json'
      document.head.appendChild(structuredData)
    }
    structuredData.textContent = JSON.stringify(jsonLd || {
      '@context': 'https://schema.org',
      '@type': resolvedType === 'product' ? 'ItemPage' : 'WebPage',
      '@id': `${canonicalUrl}#page`,
      name: resolvedTitle,
      description: resolvedDescription,
      url: canonicalUrl,
      inLanguage: ['en', 'km'],
      isPartOf: { '@id': `${SITE_URL}/#website` },
    })
  }, [image, jsonLd, resolvedDescription, resolvedNoIndex, resolvedPath, resolvedTitle, resolvedType])

  return null
}
