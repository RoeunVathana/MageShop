import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { productService } from '@/services/product.service'
import type { Product } from '@/types/product.types'
import {
  DollarSign,
  Tag,
  Percent,
  Sparkles,
  Gift,
  AlertCircle,
  CheckCircle2,
  Loader2,
  TrendingUp,
  Zap,
  ShoppingBag,
} from 'lucide-react'

interface ProductPriceDialogProps {
  isOpen: boolean
  onClose: () => void
  product: Product | null
  onSuccess: (updatedProduct: Product) => void
}

export function ProductPriceDialog({
  isOpen,
  onClose,
  product,
  onSuccess,
}: ProductPriceDialogProps) {
  const { toast } = useToast()

  const [sellingPrice, setSellingPrice] = useState<string>('')
  const [discountPrice, setDiscountPrice] = useState<string>('')
  const [costPrice, setCostPrice] = useState<string>('')
  const [isFlashSale, setIsFlashSale] = useState<boolean>(false)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      setSellingPrice(String(product.selling_price ?? product.price ?? '0'))
      setDiscountPrice(
        product.discount_price !== null && product.discount_price !== undefined
          ? String(product.discount_price)
          : ''
      )
      setCostPrice(
        product.cost_price !== null && product.cost_price !== undefined
          ? String(product.cost_price)
          : ''
      )
      setIsFlashSale(Boolean(product.is_flash_sale))
      setErrorMessage(null)
    }
  }, [product, isOpen])

  if (!product) return null

  const regularNum = parseFloat(sellingPrice) || 0
  const discountNum = discountPrice.trim() !== '' ? parseFloat(discountPrice) : null
  const costNum = parseFloat(costPrice) || 0

  const hasDiscount =
    discountNum !== null &&
    !isNaN(discountNum) &&
    discountNum > 0 &&
    discountNum < regularNum

  const customerPrice = hasDiscount ? (discountNum as number) : regularNum
  const savingsAmount = hasDiscount ? regularNum - (discountNum as number) : 0
  const savingsPercent =
    hasDiscount && regularNum > 0
      ? Math.round((savingsAmount / regularNum) * 100)
      : 0

  // Free Reward Eligibility (Threshold $30)
  const isRewardEligible = customerPrice <= 30 && customerPrice > 0

  // Profit calculations
  const grossProfit = customerPrice - costNum
  const profitMargin =
    customerPrice > 0 ? ((grossProfit / customerPrice) * 100).toFixed(1) : '0'

  const applyDiscountPreset = (percent: number) => {
    if (regularNum <= 0) return
    const discounted = Math.round(regularNum * (1 - percent / 100) * 100) / 100
    setDiscountPrice(discounted.toFixed(2))
  }

  const clearDiscount = () => {
    setDiscountPrice('')
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (isNaN(regularNum) || regularNum <= 0) {
      setErrorMessage('Regular selling price must be greater than $0.00.')
      return
    }

    if (discountNum !== null && (isNaN(discountNum) || discountNum < 0)) {
      setErrorMessage('Discount price cannot be negative.')
      return
    }

    if (discountNum !== null && discountNum >= regularNum) {
      setErrorMessage('Customer discount price must be lower than regular selling price.')
      return
    }

    if (costNum < 0) {
      setErrorMessage('Cost price cannot be negative.')
      return
    }

    setIsSubmitting(true)

    try {
      const payload = {
        selling_price: regularNum,
        discount_price: discountNum !== null && discountNum > 0 ? discountNum : null,
        cost_price: costNum > 0 ? costNum : undefined,
        is_flash_sale: isFlashSale,
      }

      const updated = await productService.updateProduct(product.id, payload)

      toast({
        title: 'Price Updated Successfully',
        description: `Customer will now see $${customerPrice.toFixed(2)} for "${product.name}".`,
        type: 'success',
      })

      onSuccess(updated)
      onClose()
    } catch (err: any) {
      setErrorMessage(err?.response?.data?.message || err?.message || 'Failed to update product price.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <DollarSign className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-black">
                Manage Product Price & Customer Offer
              </DialogTitle>
              <DialogDescription className="text-xs">
                Set customer selling price, promotional discount, and view live storefront simulation.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Product Quick Header Card */}
        <div className="p-3 rounded-xl border bg-muted/40 flex items-center gap-3">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="w-12 h-12 rounded-lg object-contain bg-white dark:bg-black/30 p-1 border shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center font-bold text-muted-foreground shrink-0">
              <ShoppingBag className="w-6 h-6 opacity-40" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-xs sm:text-sm line-clamp-1">{product.name}</h4>
            <div className="flex items-center gap-2 mt-0.5 text-[11px] text-muted-foreground font-mono">
              <span>SKU: {product.sku}</span>
              <span>•</span>
              <span>Stock: {product.stock_quantity ?? product.available_stock}</span>
              {product.brand && (
                <>
                  <span>•</span>
                  <span className="font-sans font-semibold text-foreground/80">{product.brand}</span>
                </>
              )}
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 pt-1">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pricing Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Regular Selling Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Regular Selling Price (USD) *</span>
                <span className="text-[10px] text-muted-foreground font-normal">Catalog standard</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0.00"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className="pl-7 font-mono font-bold text-sm h-10"
                />
              </div>
            </div>

            {/* Customer Discount Price */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                  <Tag className="w-3.5 h-3.5" /> Customer Sale Price (USD)
                </span>
                <span className="text-[10px] text-muted-foreground font-normal">Optional</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Leave empty for regular price"
                  value={discountPrice}
                  onChange={(e) => setDiscountPrice(e.target.value)}
                  className="pl-7 font-mono font-bold text-sm h-10 border-emerald-500/30 focus-visible:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Quick Discount Presets */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1">
              <Percent className="w-3 h-3" /> Quick Discount Shortcuts:
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[5, 10, 15, 20, 25, 30, 50].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => applyDiscountPreset(pct)}
                  disabled={regularNum <= 0}
                  className="px-2 py-1 rounded-md text-[11px] font-bold border bg-card hover:bg-muted/80 text-foreground transition-colors disabled:opacity-40"
                >
                  {pct}% OFF
                </button>
              ))}
              {discountPrice && (
                <button
                  type="button"
                  onClick={clearDiscount}
                  className="px-2 py-1 rounded-md text-[11px] font-bold text-destructive hover:bg-destructive/10 transition-colors ml-auto"
                >
                  Clear Discount
                </button>
              )}
            </div>
          </div>

          {/* Cost Price & Flash Sale Option */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-foreground flex items-center justify-between">
                <span>Cost Price (USD)</span>
                <span className="text-[10px] text-muted-foreground font-normal">Internal only</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-muted-foreground font-bold text-sm">$</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className="pl-7 font-mono text-sm h-10"
                />
              </div>
            </div>

            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2.5 p-2.5 rounded-xl border bg-card hover:bg-muted/30 cursor-pointer transition-colors h-10">
                <input
                  type="checkbox"
                  checked={isFlashSale}
                  onChange={(e) => setIsFlashSale(e.target.checked)}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-bold flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Mark as Flash Sale Deal
                </span>
              </label>
            </div>
          </div>

          {/* Live Customer Storefront Preview Card */}
          <div className="rounded-2xl border-2 border-dashed border-primary/20 p-4 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-primary flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Customer Storefront Preview
              </span>
              <span className="text-[10px] text-muted-foreground">What shoppers will see</span>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-3 rounded-xl border">
              <div>
                <span className="text-[10px] text-muted-foreground uppercase font-bold block">
                  Customer Price
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    ${customerPrice.toFixed(2)}
                  </span>
                  {hasDiscount && (
                    <span className="text-xs text-muted-foreground line-through font-mono">
                      ${regularNum.toFixed(2)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5">
                {hasDiscount && (
                  <Badge className="bg-rose-500 text-white font-black text-xs px-2 py-0.5 shadow-sm">
                    {savingsPercent}% OFF (Save ${savingsAmount.toFixed(2)})
                  </Badge>
                )}
                {isFlashSale && (
                  <Badge className="bg-amber-500 text-black font-black text-xs px-2 py-0.5">
                    ⚡ Flash Deal
                  </Badge>
                )}
                {isRewardEligible ? (
                  <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-600 dark:text-amber-400 gap-1 font-bold">
                    <Gift className="w-3 h-3" /> 100 Pts Free Eligible (≤$30)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">
                    Standard Item (&gt;$30)
                  </Badge>
                )}
              </div>
            </div>

            {/* Admin Financial Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-border/50">
              <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Est. Gross Profit:</span>
                <span className={`font-mono font-bold ${grossProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                  ${grossProfit.toFixed(2)} / unit
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-background/50">
                <span className="text-muted-foreground">Profit Margin:</span>
                <span className="font-mono font-bold text-foreground">
                  {profitMargin}%
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-700 text-white gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Prices...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Update Price for Customer
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
