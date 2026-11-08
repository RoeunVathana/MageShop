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
  RefreshCw,
  Boxes,
  Weight,
  Ruler,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { productService } from '@/services/product.service'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import type { Product, ProductVariantItem } from '@/types/product.types'

export function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const { toast } = useToast()
  const { addToCart, toggleFavorite, isFavorite } = useShopEngagement()

  const [product, setProduct] = useState<Product | null>(null)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariantItem | null>(null)
  const [quantity, setQuantity] = useState<number>(1)
  const [loading, setLoading] = useState<boolean>(true)
  const [activeImage, setActiveImage] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

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
    const itemPrice = selectedVariant ? selectedVariant.selling_price : product.selling_price

    addToCart(
      {
        id: product.id,
        slug: product.slug || String(product.id),
        name: itemTitle,
        price: itemPrice,
        originalPrice: product.discount_price || undefined,
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
    toggleFavorite({
      id: product.id,
      slug: product.slug || String(product.id),
      name: product.name,
      price: product.selling_price,
      originalPrice: product.discount_price || undefined,
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
        <p className="text-sm font-semibold">Loading product information...</p>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center max-w-md space-y-4">
        <AlertCircle className="w-12 h-12 text-destructive mx-auto" />
        <h2 className="text-xl font-bold">Product Not Found</h2>
        <p className="text-xs text-muted-foreground">
          {error || "The product you requested could not be located in our catalog."}
        </p>
        <Link to="/products" className="inline-block mt-4">
          <Button size="sm" variant="outline" className="text-xs">
            Return to Marketplace Catalog
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

  return (
    <div className="container mx-auto px-4 py-8 space-y-10 max-w-7xl">
      {/* Breadcrumb Navigation */}
      <div className="text-xs text-muted-foreground flex items-center flex-wrap gap-1.5 border-b pb-4">
        <Link to="/" className="hover:underline">Home</Link>
        <ChevronRight className="w-3 h-3 opacity-60" />
        <Link to="/products" className="hover:underline">Products</Link>
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
        {/* Product Media Display */}
        <div className="space-y-4">
          <div className="aspect-square rounded-2xl overflow-hidden bg-slate-50/80 dark:bg-slate-900/40 border p-6 flex items-center justify-center relative shadow-sm">
            {activeImage ? (
              <img
                src={activeImage}
                alt={product.name}
                className="w-full h-full object-contain max-h-full max-w-full transition-all"
              />
            ) : (
              <div className="text-center text-muted-foreground p-8">
                <Package className="w-16 h-16 opacity-30 mx-auto mb-2" />
                <p className="text-xs">No media preview available</p>
              </div>
            )}

            {/* Badges Overlay */}
            <div className="absolute top-4 left-4 flex flex-col gap-1.5">
              {product.category && (
                <Badge className="bg-background/90 text-foreground text-xs backdrop-blur font-semibold shadow-xs">
                  {product.category.name}
                </Badge>
              )}
              {product.product_type === 'variable' && (
                <Badge className="bg-purple-600 text-white text-xs font-semibold">
                  Multi-Variant
                </Badge>
              )}
              {product.product_type === 'digital' && (
                <Badge className="bg-blue-600 text-white text-xs font-semibold">
                  Digital Product
                </Badge>
              )}
            </div>
          </div>
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
                  Out of Stock
                </Badge>
              ) : isLowStock ? (
                <Badge className="bg-amber-500 text-white text-xs font-bold">
                  Low Stock: Only {currentStock} Left
                </Badge>
              ) : (
                <Badge className="bg-emerald-600 text-white text-xs font-bold">
                  In Stock ({currentStock} available)
                </Badge>
              )}
            </div>
          </div>

          {/* Pricing Box */}
          <div className="p-5 rounded-2xl bg-muted/40 border space-y-1">
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-foreground">
                ${currentPrice.toFixed(2)}
              </span>
              {product.discount_price && (
                <span className="text-sm text-muted-foreground line-through">
                  ${product.discount_price.toFixed(2)}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Official catalog pricing. All taxes included where applicable.
            </p>
          </div>

          {/* Variable Product Options Selector */}
          {product.variants && product.variants.length > 0 && (
            <div className="space-y-3 p-4 rounded-2xl border bg-card">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-purple-600" />
                  Select Variant / Option:
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
                          ${v.selling_price.toFixed(2)}
                        </span>
                        <span className={isVarOutOfStock ? 'text-destructive font-semibold' : 'text-muted-foreground'}>
                          {isVarOutOfStock ? 'Sold Out' : `${v.stock_quantity} left`}
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
              <h3 className="font-bold text-foreground text-sm">Product Description</h3>
              <p className="whitespace-pre-line">{product.description}</p>
            </div>
          )}

          {/* Quantity and Purchase Actions */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold">Quantity:</span>
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
                ({currentStock} units available)
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
                {isOutOfStock ? 'Currently Out of Stock' : 'Add to Shopping Cart (+5 Pts)'}
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
                {isFavorite(product.id) ? 'Liked ❤️' : 'Favorite'}
              </Button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-wrap items-center justify-between gap-2 text-xs">
              <span>
                🎁 Earn <strong>+5 Points</strong> per order •{' '}
                {currentPrice <= 30 ? (
                  <strong className="text-emerald-600 dark:text-emerald-400">
                    Eligible for 100-Point FREE Redemption!
                  </strong>
                ) : (
                  'Collect 100 points to redeem any item ≤$30 FREE.'
                )}
              </span>
              <Link to="/track-order" className="font-bold text-primary hover:underline">
                Live GPS Delivery Track →
              </Link>
            </div>
          </div>

          {/* Trust Guarantees */}
          <div className="grid grid-cols-3 gap-3 pt-4 border-t text-center text-xs">
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto" />
              <div className="font-bold text-[11px]">100% Authentic</div>
              <div className="text-[10px] text-muted-foreground">Guaranteed Quality</div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <Truck className="w-5 h-5 text-blue-600 mx-auto" />
              <div className="font-bold text-[11px]">Express Shipping</div>
              <div className="text-[10px] text-muted-foreground">Nationwide delivery</div>
            </div>
            <div className="p-3 rounded-xl bg-muted/30 border space-y-1">
              <RotateCcw className="w-5 h-5 text-purple-600 mx-auto" />
              <div className="font-bold text-[11px]">Easy Returns</div>
              <div className="text-[10px] text-muted-foreground">7 days policy</div>
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
