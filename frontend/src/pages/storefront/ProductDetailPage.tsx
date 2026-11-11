import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  Heart,
  ShoppingCart,
  Store,
  Info,
  CheckCircle2,
  AlertCircle,
  Package,
  Layers,
  SlidersHorizontal,
  ChevronRight,
  ChevronLeft,
  Images,
  RefreshCw,
  Boxes,
  Weight,
  Ruler,
  Check,
  Gift,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { productService } from '@/services/product.service'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import type { Product, ProductVariantItem } from '@/types/product.types'
import { SeoHead, SITE_URL } from '@/components/seo/SeoHead'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { toast } = useToast()
  const { addToCart, toggleFavorite, isFavorite, t, formatPrice } = useShopEngagement()

  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantItem | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeImage, setActiveImage] = useState<string>('')
  const [activeImageIndex, setActiveImageIndex] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)

  // Consolidate all images from product.image_url, product.gallery_urls, and variant images
  const allImages = React.useMemo(() => {
    if (!product) return []
    const list: string[] = []
    if (product.image_url && typeof product.image_url === 'string' && product.image_url.trim()) {
      list.push(product.image_url.trim())
    }
    if (Array.isArray(product.gallery_urls)) {
      for (const url of product.gallery_urls) {
        if (url && typeof url === 'string' && url.trim() && !list.includes(url.trim())) {
          list.push(url.trim())
        }
      }
    }
    if (Array.isArray(product.variants)) {
      for (const v of product.variants) {
        if (v.image_url && typeof v.image_url === 'string' && v.image_url.trim() && !list.includes(v.image_url.trim())) {
          list.push(v.image_url.trim())
        }
      }
    }
    return list
  }, [product])

  // Synchronize active slide index if activeImage changes or product loads
  useEffect(() => {
    if (allImages.length > 0) {
      if (activeImage) {
        const foundIdx = allImages.findIndex((img) => img === activeImage)
        if (foundIdx >= 0) {
          setActiveImageIndex(foundIdx)
          return
        }
      }
      setActiveImageIndex(0)
    }
  }, [allImages, activeImage])

  const displayImage = allImages[activeImageIndex] || activeImage || product?.image_url || ''

  const handlePrevImage = () => {
    if (allImages.length <= 1) return
    setActiveImageIndex((prev) => {
      const nextIdx = (prev - 1 + allImages.length) % allImages.length
      setActiveImage(allImages[nextIdx])
      return nextIdx
    })
  }

  const handleNextImage = () => {
    if (allImages.length <= 1) return
    setActiveImageIndex((prev) => {
      const nextIdx = (prev + 1) % allImages.length
      setActiveImage(allImages[nextIdx])
      return nextIdx
    })
  }

  const handleSelectThumbnail = (index: number) => {
    setActiveImageIndex(index)
    if (allImages[index]) {
      setActiveImage(allImages[index])
    }
  }

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setError(null)

    productService
      .getProduct(slug)
      .then((data) => {
        setProduct(data)
        setActiveImage(data.image_url || '')
        // Select first active variant if available
        if (data.variants && data.variants.length > 0) {
          const firstActive = data.variants.find((v) => v.is_active) || data.variants[0]
          setSelectedVariant(firstActive)
          if (firstActive.image_url) {
            setActiveImage(firstActive.image_url)
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load product details', err)
        setError(err?.message || 'Product not found.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [slug])

  const handleSelectVariant = (variant: ProductVariantItem) => {
    setSelectedVariant(variant)
    setQuantity(1)
    if (variant.image_url) {
      setActiveImage(variant.image_url)
    }
  }

  const handleAddToCart = () => {
    if (!product) return

    const itemTitle = selectedVariant
      ? `${product.name} (${selectedVariant.name})`
      : product.name
    const basePrice = selectedVariant ? Number(selectedVariant.selling_price) : Number(product.selling_price)
    const hasDiscount = Boolean(
      product.discount_price &&
      Number(product.discount_price) > 0 &&
      Number(product.discount_price) < basePrice
    )
    const effItemPrice = hasDiscount ? Number(product.discount_price) : basePrice

    addToCart(
      {
        id: product.id,
        slug: product.slug || String(product.id),
        name: itemTitle,
        price: effItemPrice,
        originalPrice: hasDiscount ? basePrice : undefined,
        image: activeImage || product.image_url || '',
        vendor: product.brand || 'TYUSHOP',
      },
      quantity
    )

    toast({
      title: 'Added to Shopping Cart 🛒',
      description: `Added ${quantity}x "${itemTitle}" to your cart (+5 Loyalty Points on checkout).`,
      type: 'success',
    })
  }

  const handleWishlist = () => {
    if (!product) return
    const liked = isFavorite(product.id)
    const basePrice = Number(product.selling_price)
    const hasDiscount = Boolean(
      product.discount_price &&
      Number(product.discount_price) > 0 &&
      Number(product.discount_price) < basePrice
    )
    const effItemPrice = hasDiscount ? Number(product.discount_price) : basePrice

    toggleFavorite({
      id: product.id,
      slug: product.slug || String(product.id),
      name: product.name,
      price: effItemPrice,
      originalPrice: hasDiscount ? basePrice : undefined,
      image: activeImage || product.image_url || '',
      vendor: product.brand || 'TYUSHOP',
      category: product.category?.name || 'Universal',
    })
    toast({
      title: liked ? 'Removed from Favorites' : 'Saved to Favorites ❤️',
      description: liked
        ? `"${product.name}" removed from your favorite items.`
        : `"${product.name}" saved to your customer favorites list.`,
      type: 'info',
    })
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-20 text-center text-muted-foreground">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
        <p className="text-sm font-semibold">{t('Loading product information...', 'កំពុងទាញយកព័ត៌មានផលិតផល...')}</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">{t('Product Not Found', 'រកមិនឃើញផលិតផលទេ')}</h2>
        <p className="text-xs text-muted-foreground">
          {error || t('The product you requested could not be located in our catalog.', 'ផលិតផលដែលអ្នកបានស្នើសុំមិនមានក្នុងកាតាឡុកទេ។')}
        </p>
        <Link to="/products" className="inline-block mt-4">
          <Button size="sm" variant="outline" className="text-xs font-semibold">
            {t('Return to Marketplace Catalog', 'ត្រឡប់ទៅកាតាឡុកទំនិញ')}
          </Button>
        </Link>
      </div>
    )
  }

  // Active pricing and stock
  const currentPrice = selectedVariant ? selectedVariant.selling_price : product.selling_price
  const currentSku = selectedVariant ? selectedVariant.sku : product.sku
  const currentStock = selectedVariant ? selectedVariant.stock_quantity : product.stock_quantity
  const isOutOfStock = currentStock <= 0
  const isLowStock = !isOutOfStock && currentStock <= product.low_stock_threshold
  const productDescription = product.description?.trim() || `Buy ${product.name} from TYUSHOP Cambodia with secure checkout and delivery tracking.`
  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: productDescription,
    sku: product.sku,
    image: allImages.length ? allImages : [`${SITE_URL}/logo.png`],
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    offers: {
      '@type': 'Offer',
      url: `${SITE_URL}/products/${product.slug}`,
      priceCurrency: product.currency || 'USD',
      price: Number(product.discount_price || product.selling_price || product.price || 0).toFixed(2),
      availability: product.available_stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: 'TYUSHOP', url: SITE_URL },
    },
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-10">
      <SeoHead
        title={`${product.name} | TYUSHOP Cambodia`}
        description={productDescription}
        path={`/products/${product.slug}`}
        image={displayImage || `${SITE_URL}/logo.png`}
        type="product"
        jsonLd={productJsonLd}
      />
      {/* Breadcrumb Navigation */}
      <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1.5 border-b pb-4">
        <Link to="/" className="hover:underline">{t('Home', 'ទំព័រដើម')}</Link>
        <ChevronRight className="w-3 h-3 opacity-60" />
        <Link to="/products" className="hover:underline">{t('Products', 'ផលិតផល')}</Link>
        {product.category && (
          <>
            <ChevronRight className="w-3 h-3 opacity-60" />
            <Link
              to={`/products?category_id=${product.category.id}`}
              className="hover:underline"
            >
              {product.category.name}
            </Link>
          </>
        )}
        <ChevronRight className="w-3 h-3 opacity-60" />
        <span className="text-foreground font-semibold truncate max-w-xs">{product.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-14">
        {/* Product Media Display with Interactive Slider & Thumbnails */}
        <div className="space-y-3">
          <div className="relative aspect-square rounded-2xl overflow-hidden bg-slate-50/90 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 p-4 sm:p-6 flex items-center justify-center shadow-sm group">
            {displayImage ? (
              <img
                src={displayImage}
                alt={`${product.name} - slide ${activeImageIndex + 1}`}
                className="w-full h-full object-contain max-h-full max-w-full transition-all duration-300 select-none"
              />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <Package className="w-16 h-16 opacity-30 mx-auto mb-2" />
                <p className="text-xs">{t('No media preview available', 'គ្មានរូបភាពបង្ហាញ')}</p>
              </div>
            )}

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5 z-10 pointer-events-none">
              {product.category && (
                <Badge className="bg-background/90 text-foreground text-xs backdrop-blur font-semibold shadow-xs">
                  {product.category.name}
                </Badge>
              )}
              {product.product_type === 'variable' && (
                <Badge className="bg-purple-600 text-white text-xs font-semibold">
                  {t('Multi-Variant', 'មានច្រើនជម្រើស')}
                </Badge>
              )}
              {product.product_type === 'digital' && (
                <Badge className="bg-blue-600 text-white text-xs font-semibold">
                  {t('Digital Product', 'ទំនិញឌីជីថល')}
                </Badge>
              )}
            </div>

            {/* Slide Navigation Controls (Prev / Next Buttons) */}
            {allImages.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Previous product image"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handlePrevImage()
                  }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-20"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  aria-label="Next product image"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleNextImage()
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/95 dark:bg-slate-900/95 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-20"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Slide Counter Badge */}
                <div className="absolute bottom-3 right-3 bg-black/75 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-mono font-medium shadow-md flex items-center gap-1.5 z-10 pointer-events-none">
                  <Images className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    {activeImageIndex + 1} / {allImages.length}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Thumbnail Strip Gallery */}
          {allImages.length > 1 && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 overflow-x-auto p-1 scrollbar-thin">
                {allImages.map((imgUrl, idx) => {
                  const isActive = activeImageIndex === idx
                  return (
                    <button
                      key={idx}
                      type="button"
                      aria-label={`Slide to photo ${idx + 1}`}
                      onClick={() => handleSelectThumbnail(idx)}
                      className={`relative flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-2 transition-all p-1 bg-white dark:bg-slate-950 ${
                        isActive
                          ? 'border-blue-600 ring-2 ring-blue-500/50 shadow-md scale-102'
                          : 'border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 hover:border-slate-400'
                      }`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-contain rounded-lg"
                      />
                      {isActive && (
                        <div className="absolute bottom-1 right-1 w-2 h-2 rounded-full bg-blue-600" />
                      )}
                    </button>
                  )
                })}
              </div>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1 px-1">
                <Images className="w-3 h-3 opacity-70" />
                <span>
                  {t(
                    `Slide through ${allImages.length} photos or tap thumbnails`,
                    `ចុចលើរូបតូចៗ ឬព្រួញដើម្បីមើលរូបភាពទាំង ${allImages.length}`
                  )}
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Product Info & Purchase Shell */}
        <div className="space-y-6">
          <div className="space-y-2">
            {product.brand && (
              <div className="text-xs font-bold uppercase tracking-wider text-primary">
                {product.brand}
              </div>
            )}

            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-snug">
              {product.name}
            </h1>

            <div className="flex items-center flex-wrap gap-4 text-xs text-muted-foreground pt-1">
              <span className="font-mono">
                SKU: <strong className="text-foreground">{currentSku}</strong>
              </span>

              {/* Stock Status Badge */}
              {isOutOfStock ? (
                <Badge variant="destructive" className="text-xs font-bold">
                  {t('Out of Stock', 'អស់ពីស្តុក')}
                </Badge>
              ) : isLowStock ? (
                <Badge className="bg-amber-500 text-white text-xs font-bold">
                  {t(`Low Stock: Only ${currentStock} Left`, `ស្តុកជិតអស់៖ នៅសល់តែ ${currentStock}`)}
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white text-xs font-bold">
                  {t(`In Stock (${currentStock} available)`, `មានក្នុងស្តុក (${currentStock} មុខ)`)}
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Box */}
          {(() => {
            const hasDiscount = Boolean(
              product.discount_price &&
              Number(product.discount_price) > 0 &&
              Number(product.discount_price) < currentPrice
            )
            const effPrice = hasDiscount ? Number(product.discount_price) : currentPrice
            const savings = hasDiscount ? currentPrice - effPrice : 0
            const savingsPercent = hasDiscount && currentPrice > 0 ? Math.round((savings / currentPrice) * 100) : 0

            return (
              <div className="p-5 rounded-2xl bg-muted/40 border space-y-2">
                <div className="flex items-baseline gap-3 flex-wrap">
                  <span className="text-3xl font-black text-foreground">
                    {formatPrice(effPrice)}
                  </span>
                  {hasDiscount && (
                    <>
                      <span className="text-base text-muted-foreground line-through font-mono">
                        {formatPrice(currentPrice)}
                      </span>
                      <Badge className="bg-rose-500 text-white font-bold text-xs py-0.5 px-2">
                        {savingsPercent}% OFF ({t('Save', 'ចំណេញ')} {formatPrice(savings)})
                      </Badge>
                    </>
                  )}
                  {effPrice <= 30 && (
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 gap-1 font-bold">
                      <Gift className="w-3 h-3 text-amber-500" />
                      {t('100 Pts Free Eligible', 'ប្តូរយកឥតគិតថ្លៃ (១០០ ពិន្ទុ)')}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'Official catalog pricing. All taxes included where applicable.',
                    'តម្លៃស្តង់ដារផ្លូវការ។ រួមបញ្ចូលពន្ធអាករតាមច្បាប់កំណត់។'
                  )}
                </p>
              </div>
            )
          })()}

          {/* Variable Product Options Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 p-4 rounded-2xl border bg-card">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  {t('Select Variant / Option:', 'ជ្រើសរើសជម្រើស / ម៉ូដ៖')}
                </span>
                {selectedVariant && (
                  <span className="text-purple-600 font-mono text-[11px]">
                    {selectedVariant.sku}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id || selectedVariant?.sku === v.sku
                  const isVarOutOfStock = v.stock_quantity <= 0

                  return (
                    <button
                      key={v.id || v.sku}
                      type="button"
                      disabled={!v.is_active || isVarOutOfStock}
                      onClick={() => handleSelectVariant(v)}
                      className={`p-3 rounded-xl border text-left text-xs transition-all flex flex-col justify-between ${
                        isSelected
                          ? 'border-purple-600 bg-purple-50/50 dark:bg-purple-950/20 ring-1 ring-purple-600 font-semibold'
                          : isVarOutOfStock
                          ? 'opacity-50 cursor-not-allowed border-dashed bg-muted/20'
                          : 'hover:border-purple-300 hover:bg-muted/30'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-bold text-foreground truncate">{v.name}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-purple-600 shrink-0" />}
                      </div>

                      <div className="flex items-center justify-between gap-2 mt-2 pt-1 border-t text-[11px]">
                        <span className="font-black text-foreground">
                          {formatPrice(v.selling_price)}
                        </span>
                        <span className={isVarOutOfStock ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                          {isVarOutOfStock ? t('Sold Out', 'អស់ស្តុក') : `${v.stock_quantity} ${t('left', 'នៅសល់')}`}
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Description */}
          {product.description && (
            <div className="space-y-1.5 text-xs text-muted-foreground leading-relaxed">
              <h3 className="font-bold text-foreground text-sm">{t('Product Description', 'ព័ត៌មានលម្អិតអំពីផលិតផល')}</h3>
              <p className="whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Quantity and Purchase Actions */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold">{t('Quantity:', 'ចំនួន៖')}</span>
              <div className="flex items-center border rounded-xl overflow-hidden bg-background">
                <button
                  type="button"
                  disabled={quantity <= 1 || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1.5 text-sm font-bold hover:bg-muted disabled:opacity-40"
                >
                  -
                </button>
                <span className="px-4 py-1.5 text-xs font-mono font-bold min-w-10 text-center">
                  {quantity}
                </span>
                <button
                  type="button"
                  disabled={quantity >= currentStock || isOutOfStock}
                  onClick={() => setQuantity((q) => Math.min(currentStock, q + 1))}
                  className="px-3 py-1.5 text-sm font-bold hover:bg-muted disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <span className="text-[11px] text-muted-foreground">
                ({currentStock} {t('units available', 'មុខមានក្នុងស្តុក')})
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className="flex-1 rounded-xl gap-2 font-semibold shadow-md bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                <ShoppingCart className="w-4 h-4" />
                {isOutOfStock
                  ? t('Currently Out of Stock', 'បច្ចុប្បន្នអស់ពីស្តុក')
                  : t('Add to Shopping Cart (+5 Pts)', 'ដាក់ចូលកន្ត្រក (+5 ពិន្ទុ)')}
              </Button>
              <Button
                size="lg"
                variant={isFavorite(product.id) ? 'default' : 'outline'}
                onClick={handleWishlist}
                className={`rounded-xl gap-2 ${
                  isFavorite(product.id) ? 'bg-rose-500 hover:bg-rose-600 text-white border-rose-500' : ''
                }`}
              >
                <Heart className={`w-4 h-4 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                {isFavorite(product.id) ? t('Liked ❤️', 'បានពេញចិត្ត ❤️') : t('Favorite', 'ពេញចិត្ត')}
              </Button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>
                🎁 {t('Earn +5 Points per order • ', 'ទទួលបាន +5 ពិន្ទុរាល់ការទិញ • ')}
                {currentPrice <= 30 ? (
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    {t('Eligible for 100-Point FREE Redemption!', 'អាចប្តូរយក Free ពេលមាន ១០០ ពិន្ទុ!')}
                  </strong>
                ) : (
                  t('Collect 100 points to redeem any item ≤$30 FREE.', 'សន្សំ ១០០ ពិន្ទុដើម្បីប្តូរទំនិញ Free តម្លៃ ≤$30។')
                )}
              </span>
              <Link to="/track-order" className="font-bold text-primary hover:underline">
                {t('Live GPS Delivery Track →', 'តាមដានការដឹកជញ្ជូន GPS →')}
              </Link>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t text-center text-xs">
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto" />
              <div className="font-bold text-[11px]">{t('100% Authentic', 'ទំនិញសុទ្ធ ១០០%')}</div>
              <div className="text-[10px] text-muted-foreground">{t('Guaranteed Quality', 'ធានាគុណភាព')}</div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <Truck className="w-5 h-5 text-blue-600 mx-auto" />
              <div className="font-bold text-[11px]">{t('Express Shipping', 'ដឹកជញ្ជូនរហ័ស')}</div>
              <div className="text-[10px] text-muted-foreground">{t('Nationwide delivery', 'ទូទាំងប្រទេសកម្ពុជា')}</div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <RotateCcw className="w-5 h-5 text-purple-600 mx-auto" />
              <div className="font-bold text-[11px]">{t('Easy Returns', 'ប្តូរទំនិញងាយស្រួល')}</div>
              <div className="text-[10px] text-muted-foreground">{t('7 days policy', 'រយៈពេល ៧ ថ្ងៃ')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & Dynamic Attributes Table */}
      {(product.attributes && product.attributes.length > 0) || product.weight || product.dimensions ? (
        <div className="space-y-4 pt-6 border-t">
          <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-primary" />
            Product Specifications & Department Attributes
          </h2>

          <div className="border rounded-2xl overflow-hidden bg-card">
            <table className="w-full text-xs">
              <tbody className="divide-y">
                {product.brand && (
                  <tr className="hover:bg-muted/20">
                    <td className="w-1/3 p-3.5 font-semibold text-muted-foreground bg-muted/30">
                      Brand
                    </td>
                    <td className="p-3.5 font-bold text-foreground">{product.brand}</td>
                  </tr>
                )}
                {product.weight && (
                  <tr className="hover:bg-muted/20">
                    <td className="w-1/3 p-3.5 font-semibold text-muted-foreground bg-muted/30">
                      Shipping Weight
                    </td>
                    <td className="p-3.5 font-mono text-foreground">{product.weight} kg</td>
                  </tr>
                )}
                {product.attributes?.map((attr) => (
                  <tr key={attr.id || attr.attribute_id} className="hover:bg-muted/20">
                    <td className="w-1/3 p-3.5 font-semibold text-muted-foreground bg-muted/30">
                      {attr.name || attr.code}
                    </td>
                    <td className="p-3.5 font-medium text-foreground">
                      {attr.display_value || attr.value || 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}
