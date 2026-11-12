import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ShoppingCart,
  Heart,
  Eye,
  Star,
  Gift,
  ShieldCheck,
  Truck,
  Sparkles,
  ArrowUpRight,
  ShoppingBag,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { useToast } from '@/components/ui/toast'
import type { Product } from '@/types/product.types'

export interface ProductCardProps {
  product: Product
  className?: string
  priority?: boolean
}

export function ProductCard({ product: p, className = '' }: ProductCardProps) {
  const { addToCart, toggleFavorite, isFavorite, t, formatPrice } = useShopEngagement()
  const { toast } = useToast()
  const [justAdded, setJustAdded] = useState(false)

  const hasDiscount = Boolean(
    p.discount_price &&
    Number(p.discount_price) > 0 &&
    Number(p.discount_price) < Number(p.selling_price)
  )
  const effPrice = hasDiscount ? Number(p.discount_price) : Number(p.selling_price)
  const discountPercent = hasDiscount
    ? Math.round((1 - effPrice / Number(p.selling_price)) * 100)
    : 0

  const isRewardEligible = effPrice <= 30
  const isOutOfStock = p.stock_quantity <= 0
  const isLowStock = !isOutOfStock && p.stock_quantity <= (p.low_stock_threshold || 5)
  const liked = isFavorite(p.id)

  const brandName = p.brand || p.brand_record?.name || 'TYUSHOP'
  const ratingValue = Number(p.rating || 4.8)
  const reviewsCount = p.reviews_count || Math.floor(40 + (p.id * 17) % 180)

  // Smart department display
  const categoryName = p.category?.name || 'Everyday'

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (isOutOfStock) return

    addToCart(
      {
        id: p.id,
        slug: p.slug || String(p.id),
        name: p.name,
        price: effPrice,
        originalPrice: hasDiscount ? Number(p.selling_price) : undefined,
        image: p.image_url || '',
        vendor: brandName,
      },
      1
    )

    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1600)

    toast({
      title: t('🛒 Added to Cart!', '🛒 បានដាក់ចូលកន្ត្រក!'),
      description: `${p.name} (+5 Loyalty Points).`,
      type: 'success',
    })
  }

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const nowLiked = toggleFavorite({
      id: p.id,
      slug: p.slug || String(p.id),
      name: p.name,
      price: effPrice,
      originalPrice: hasDiscount ? Number(p.selling_price) : undefined,
      image: p.image_url || '',
      vendor: brandName,
      category: categoryName,
    })

    toast({
      title: nowLiked
        ? t('❤️ Saved to Favorites', '❤️ បានរក្សាទុកក្នុងទំនិញពេញចិត្ត')
        : t('Removed from Favorites', 'បានដកចេញពីទំនិញពេញចិត្ត'),
      description: p.name,
      type: nowLiked ? 'success' : 'info',
    })
  }

  return (
    <div
      className={`product-card box-border group relative h-full w-full min-w-0 rounded-2xl border border-slate-200/90 dark:border-slate-800/90 bg-white !m-0 !p-0 dark:bg-slate-900/95 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10 hover:border-primary/40 flex flex-col justify-between ${className}`}
    >
      <div className="product-card-content box-border w-full !m-0 !p-0">
        {/* Top Product Media Frame */}
        <div className="product-card-media box-border relative !m-0 !p-0 w-full aspect-[4/3] sm:aspect-[1.35] overflow-hidden rounded-t-2xl bg-gradient-to-br from-slate-50 via-slate-100/50 to-slate-100/20 dark:from-slate-950 dark:via-slate-900/60 dark:to-slate-900/30">
          <Link to={`/products/${p.slug || p.id}`} className="absolute inset-0 !m-0 !p-0 block">
            {p.image_url ? (
              <img
                src={p.image_url}
                alt={p.name}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 !m-0 !p-0 block h-full w-full object-cover scale-[1.01] group-hover:scale-105 transition-transform duration-500 ease-out select-none"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground/40">
                <ShoppingBag className="w-14 h-14" />
              </div>
            )}
          </Link>

          {/* Top-Left Floating Badges */}
          <div className="absolute top-2 left-2 flex flex-col gap-1 pointer-events-none z-10">
            {/* Category / Department Badge */}
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-white/90 dark:bg-slate-900/90 backdrop-blur-md text-slate-700 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/70 shadow-xs tracking-tight">
              {categoryName}
            </span>

            {/* 100-Point Free Reward Badge */}
            {isRewardEligible && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white shadow-md shadow-orange-500/20 animate-in fade-in">
                <Gift className="w-2.5 h-2.5 text-white" />
                <span>{t('100 Pts Free', '១០០ ពិន្ទុឥតគិតថ្លៃ')}</span>
              </span>
            )}

            {/* Discount Percentage Pill */}
            {hasDiscount && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-black bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-sm w-fit">
                -{discountPercent}% OFF
              </span>
            )}
          </div>

          {/* Top-Right Wishlist Heart Button */}
          <button
            type="button"
            onClick={handleToggleFavorite}
            aria-label="Save to Wishlist"
          className={`absolute top-2 right-2 w-8 h-8 rounded-full backdrop-blur-md border shadow-md flex items-center justify-center transition-all duration-200 z-10 cursor-pointer ${
              liked
                ? 'bg-rose-500 text-white border-rose-500 scale-105 shadow-rose-500/30'
                : 'bg-white/90 dark:bg-slate-900/90 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 border-slate-200/70 dark:border-slate-700/70'
            } hover:scale-115 active:scale-90`}
          >
            <Heart className={`w-3.5 h-3.5 transition-transform ${liked ? 'fill-current' : ''}`} />
          </button>

          {/* Center-Bottom Quick View Hover Slider */}
          <Link
            to={`/products/${p.slug || p.id}`}
            className="absolute inset-x-2 bottom-2 flex items-center justify-center opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300 z-10"
          >
            <span className="px-3 py-1 rounded-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md text-foreground text-[11px] font-bold shadow-lg border border-slate-200 dark:border-slate-800 flex items-center gap-1.5 hover:text-primary transition-colors">
              <Eye className="w-3 h-3 text-primary" />
              <span>{t('Quick View', 'មើលរហ័ស')}</span>
            </span>
          </Link>
        </div>

        {/* Card Body Details */}
        <div className="min-w-0 !m-0 p-3.5 sm:p-4 space-y-2.5">
          {/* Brand & Star Rating Row */}
          <div className="flex items-center justify-between gap-1 text-[10px]">
            <Link
              to={`/products?brand=${encodeURIComponent(brandName)}`}
              className="font-bold text-muted-foreground uppercase tracking-wider hover:text-primary transition-colors truncate flex items-center gap-1 max-w-[62%]"
            >
              <ShieldCheck className="w-2.5 h-2.5 text-blue-500 shrink-0" />
              <span className="truncate">{brandName}</span>
            </Link>

            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded-full shrink-0">
              <Star className="w-2.5 h-2.5 fill-amber-500" />
              <span>{ratingValue.toFixed(1)}</span>
              <span className="text-[9px] text-muted-foreground font-normal">({reviewsCount})</span>
            </div>
          </div>

          {/* Product Title */}
          <Link
            to={`/products/${p.slug || p.id}`}
            className="font-bold text-[13px] sm:text-sm text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors line-clamp-2 block leading-snug min-h-[2.25rem]"
          >
            {p.name}
          </Link>

          {/* Price & Live Stock Indicator */}
          <div className="flex items-center justify-between gap-2 pt-1">
            <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {formatPrice(effPrice)}
              </span>
              {hasDiscount && (
                <span className="text-xs text-muted-foreground line-through font-mono">
                  {formatPrice(p.selling_price)}
                </span>
              )}
            </div>

            {/* Smart Live Stock Badge */}
            <div className="shrink-0">
              {isOutOfStock ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-500 bg-rose-500/10 px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                  {t('Out of stock', 'អស់ស្តុក')}
                </span>
              ) : isLowStock ? (
                  <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                  {t(`Only ${p.stock_quantity} left`, `នៅសល់ ${p.stock_quantity}`)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {p.stock_quantity} {t('in stock', 'ក្នុងស្តុក')}
                </span>
              )}
            </div>
          </div>

          {/* Fast Delivery & Points Perk Chips */}
          <div className="flex items-center gap-1.5 text-[9px] font-medium text-muted-foreground pt-0.5 border-t border-slate-100 dark:border-slate-800/80">
            <span className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
              <Truck className="w-2.5 h-2.5 text-primary" />
              <span>{t('Fast Delivery', 'ដឹកជញ្ជូនរហ័ស')}</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-semibold">
              <Sparkles className="w-2.5 h-2.5" />
              <span>+5 Pts</span>
            </span>
          </div>
        </div>
      </div>

      {/* Card Action Buttons Footer */}
      <div className="!m-0 p-3.5 pt-0 sm:p-4 sm:pt-0 flex items-center gap-1.5">
        <Button
          size="sm"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          className={`flex-1 h-9 rounded-xl text-xs font-bold gap-1.5 transition-all shadow-md active:scale-[0.98] ${
            justAdded
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/25'
              : 'bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white shadow-blue-500/20 hover:shadow-lg hover:shadow-blue-500/30'
          }`}
        >
          {justAdded ? (
            <>
              <Check className="w-4 h-4 animate-in zoom-in" />
              <span>{t('Added!', 'បានដាក់ចូល!')}</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-3.5 h-3.5 transition-transform group-hover:scale-110" />
              <span>{t('Add to Cart', 'ដាក់ចូលកន្ត្រក')}</span>
            </>
          )}
        </Button>

        <Link to={`/products/${p.slug || p.id}`}>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-9 p-0 rounded-xl border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-foreground transition-all hover:scale-105 active:scale-95 shadow-xs"
            title={t('View Product Details', 'មើលព័ត៌មានលម្អិត')}
          >
            <ArrowUpRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
