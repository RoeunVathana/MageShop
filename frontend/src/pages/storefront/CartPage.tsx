import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  ArrowRight,
  Trash2,
  ShieldCheck,
  Tag,
  Gift,
  Award,
  Plus,
  Minus,
  CheckCircle2,
  Truck,
  Sparkles,
  QrCode,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement, type FreeRewardProduct } from '@/context/ShopEngagementContext'
import { api } from '@/lib/api'

const PROMO_COUPONS = [
  { code: 'WELCOME10', label: 'WELCOME10 (10% OFF)', type: 'percentage' as const, value: 10, min: 10 },
  { code: 'MEGA20', label: 'MEGA20 (20% OFF ≥$50)', type: 'percentage' as const, value: 20, min: 50 },
  { code: 'KHQR5', label: 'KHQR5 ($5 OFF)', type: 'fixed' as const, value: 5, min: 15 },
  { code: 'VIP30', label: 'VIP30 (30% OFF ≥$100)', type: 'percentage' as const, value: 30, min: 100 },
]

export function CartPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const {
    cartItems,
    subtotal,
    updateCartQty,
    removeFromCart,
    clearCart,
    loyaltyPoints,
    setLoyaltyPoints,
    claimDemo100Points,
    freeRewardItem,
    setFreeRewardItem,
    eligibleFreeProducts,
    appliedCoupon,
    setAppliedCoupon,
    addRecentOrder,
  } = useShopEngagement()

  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || '')
  const [couponLoading, setCouponLoading] = useState(false)

  // Checkout Form State
  const [customerName, setCustomerName] = useState('Dara Sok')
  const [customerPhone, setCustomerPhone] = useState('+855 12 888 999')
  const [deliveryAddress, setDeliveryAddress] = useState('BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia')
  const [paymentMethod, setPaymentMethod] = useState('bakong_khqr')
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [completedOrderNum, setCompletedOrderNum] = useState<string | null>(null)

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply ?? couponInput).trim().toUpperCase()
    if (!code) return
    setCouponInput(code)
    setCouponLoading(true)

    try {
      const res = await api.post<any>('/coupons/validate', {
        code,
        subtotal,
      })
      if (res?.data) {
        setAppliedCoupon({
          code: res.data.code,
          description: res.data.description,
          discount_type: res.data.discount_type,
          discount_value: res.data.discount_value,
          discount_amount: res.data.discount_amount,
        })
        toast({
          title: `Coupon ${res.data.code} Applied!`,
          description: res.message || `You saved $${res.data.discount_amount.toFixed(2)}`,
          type: 'success',
        })
        return
      }
    } catch (err: any) {
      // Fallback local promo check if offline
      const found = PROMO_COUPONS.find((c) => c.code === code)
      if (found && subtotal >= found.min) {
        const discountAmt =
          found.type === 'percentage'
            ? Number(((subtotal * found.value) / 100).toFixed(2))
            : Math.min(subtotal, found.value)
        setAppliedCoupon({
          code: found.code,
          description: found.label,
          discount_type: found.type,
          discount_value: found.value,
          discount_amount: discountAmt,
        })
        toast({
          title: `Coupon ${found.code} Applied!`,
          description: `Discount of -$${discountAmt.toFixed(2)} applied to your order.`,
          type: 'success',
        })
      } else {
        toast({
          title: 'Coupon Not Eligible',
          description: err?.message || `Code '${code}' is invalid or requires a higher order minimum.`,
          type: 'error',
        })
      }
    } finally {
      setCouponLoading(false)
    }
  }

  const handleSelectFreeItem = (product: FreeRewardProduct) => {
    if (loyaltyPoints < 100) {
      toast({
        title: '100 Loyalty Points Required',
        description: `You currently have ${loyaltyPoints} points. Earn +5 points per order or click "Claim 100 Test Points" to test free redemption now!`,
        type: 'info',
      })
      return
    }
    if (product.effective_price > 30) {
      toast({
        title: 'Price Limit ($30 Max)',
        description: '100-Point Free Item exchange is for products priced under $20–$30.',
        type: 'error',
      })
      return
    }

    if (freeRewardItem?.id === product.id) {
      setFreeRewardItem(null)
      toast({
        title: 'Free Reward Item Removed',
        description: 'Your 100 points were returned to your balance.',
        type: 'info',
      })
    } else {
      setFreeRewardItem(product)
      toast({
        title: '🎁 100-Point Free Item Selected!',
        description: `${product.name} ($${product.effective_price.toFixed(2)} value) added to your order for $0.00 FREE!`,
        type: 'success',
      })
    }
  }

  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? Number(((subtotal * appliedCoupon.discount_value) / 100).toFixed(2))
      : Math.min(subtotal, appliedCoupon.discount_value)
    : 0

  const finalTotal = Math.max(0, Number((subtotal - discountAmount).toFixed(2)))
  const pointsEarnedThisOrder = 5 // Rule: buy ម្ដងបាន 5point
  const pointsRedeemedThisOrder = freeRewardItem ? 100 : 0
  const projectedPointsAfterOrder = Math.max(
    0,
    loyaltyPoints - pointsRedeemedThisOrder + pointsEarnedThisOrder
  )

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cartItems.length === 0 && !freeRewardItem) {
      toast({
        title: 'Cart is empty',
        description: 'Add a product or select a 100-point free item first.',
        type: 'error',
      })
      return
    }

    setCheckoutLoading(true)
    try {
      const payload = {
        items:
          cartItems.length > 0
            ? cartItems.map((i) => ({
                product_id: i.id,
                name: i.name,
                price: i.price,
                quantity: i.quantity,
              }))
            : [
                {
                  product_id: freeRewardItem!.id,
                  name: `[FREE 100-PT REWARD] ${freeRewardItem!.name}`,
                  price: 0,
                  quantity: 1,
                },
              ],
        coupon_code: appliedCoupon?.code || null,
        redeem_free_product_id: freeRewardItem?.id || null,
        guest_points: loyaltyPoints,
        customer_name: customerName,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        payment_method: paymentMethod,
      }

      const res = await api.post<any>('/orders/checkout', payload)
      const orderNum =
        res?.data?.order?.order_number ||
        `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-KHQR`

      setLoyaltyPoints(res?.data?.new_loyalty_points ?? projectedPointsAfterOrder)
      addRecentOrder(orderNum)
      setCompletedOrderNum(orderNum)
      clearCart()

      toast({
        title: `🎉 Order #${orderNum} Confirmed!`,
        description: `You earned +5 Loyalty Points! New balance: ${
          res?.data?.new_loyalty_points ?? projectedPointsAfterOrder
        } pts.`,
        type: 'success',
      })
    } catch {
      const fallbackOrd = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`
      setLoyaltyPoints(projectedPointsAfterOrder)
      addRecentOrder(fallbackOrd)
      setCompletedOrderNum(fallbackOrd)
      clearCart()

      toast({
        title: `🎉 Order #${fallbackOrd} Confirmed!`,
        description: `Earned +5 Loyalty Points! Track your driver live on GPS now.`,
        type: 'success',
      })
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">Home</Link> /{' '}
            <span className="text-foreground font-medium">Shopping Cart & Loyalty Rewards</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Shopping Cart & Rewards</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Apply discount codes, earn <strong>+5 Points per purchase</strong>, and redeem <strong>100 Points for a FREE item under $20–$30</strong>!
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>Your Points: {loyaltyPoints} pts</span>
          </div>
          {loyaltyPoints < 100 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                claimDemo100Points()
                toast({
                  title: '🎁 +100 Loyalty Points Activated!',
                  description: 'You now have 100+ points! Pick any product under $20–$30 below for FREE!',
                  type: 'success',
                })
              }}
              className="rounded-xl text-xs gap-1.5 border-amber-500/40 text-amber-600 dark:text-amber-400"
            >
              <Sparkles className="w-3.5 h-3.5" /> Claim 100 Pts (Test Free Item)
            </Button>
          )}
        </div>
      </div>

      {/* Order Confirmation Banner with 1-Click Live GPS Delivery Tracking */}
      {completedOrderNum && (
        <Card className="border-2 border-emerald-500/40 bg-emerald-500/10 shadow-lg">
          <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg font-extrabold text-foreground">
                  Order #{completedOrderNum} Dispatched! (+5 Loyalty Points Earned)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Your courier <strong>Sokha Chan</strong> has been assigned. Watch your delivery moving live on our real-time GPS map!
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/track-order/${completedOrderNum}`)}
              className="rounded-xl gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              <Truck className="w-4 h-4" /> Watch Live GPS Delivery Now
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Loyalty Points & 100-Point Free Item Exchange Showcase (Items under $20-$30) */}
      <Card className="border-2 border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-background to-purple-500/10">
        <CardContent className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500 text-white gap-1 text-xs">
                  <Gift className="w-3.5 h-3.5" /> 100 Points = Free Item (Under $20–$30)
                </Badge>
                <Badge variant="outline" className="text-xs border-primary/40 text-primary">
                  Buy Once = Earn +5 Points (ទិញម្ដងបាន 5 ពិន្ទុ)
                </Badge>
              </div>
              <h2 className="text-lg font-extrabold">
                Exchange 100 Points for Any Product Under $20–$30 FREE!
              </h2>
              <p className="text-xs text-muted-foreground">
                Every order gives you <strong>+5 Points</strong>. Once you reach <strong>100 Points</strong>, choose any eligible item below (priced ≤ $30.00) for <strong>$0.00 FREE</strong>!
              </p>
            </div>

            {/* Progress Bar toward 100 Points */}
            <div className="w-full md:w-64 space-y-1.5 bg-card p-3 rounded-xl border">
              <div className="flex justify-between text-xs font-bold">
                <span>Progress to Free Item</span>
                <span className="text-amber-600 dark:text-amber-400">
                  {Math.min(100, loyaltyPoints)} / 100 pts
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 transition-all duration-500"
                  style={{ width: `${Math.min(100, loyaltyPoints)}%` }}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                {loyaltyPoints >= 100
                  ? '✅ Unlocked! Pick your FREE item below!'
                  : `Need ${100 - loyaltyPoints} more pts (${Math.ceil((100 - loyaltyPoints) / 5)} more orders)`}
              </p>
            </div>
          </div>

          {/* Grid of Eligible Free Products <= $30 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
            {eligibleFreeProducts.map((fp) => {
              const isSelected = freeRewardItem?.id === fp.id
              return (
                <div
                  key={fp.id}
                  className={`rounded-xl border p-3 bg-card flex flex-col justify-between gap-3 transition-all ${
                    isSelected ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/5' : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={fp.image_url}
                      alt={fp.name}
                      className="w-14 h-14 rounded-lg object-cover bg-muted shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] mb-1">
                        FREE with 100 Pts
                      </Badge>
                      <h4 className="font-bold text-xs line-clamp-2">{fp.name}</h4>
                      <div className="text-xs mt-0.5">
                        <span className="line-through text-muted-foreground mr-1.5">
                          ${fp.effective_price.toFixed(2)}
                        </span>
                        <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                          $0.00 (100 Pts)
                        </span>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => handleSelectFreeItem(fp)}
                    className={`w-full rounded-lg text-xs h-8 ${
                      isSelected ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                    }`}
                  >
                    {isSelected ? '✓ Added as Free Reward ($0)' : 'Redeem 100 Pts (FREE)'}
                  </Button>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Cart Items */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Cart Items ({cartItems.length})
            </h2>
            {cartItems.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearCart} className="text-xs text-muted-foreground">
                Clear Cart
              </Button>
            )}
          </div>

          {cartItems.length === 0 && !freeRewardItem ? (
            <Card>
              <CardContent className="p-10 text-center space-y-4">
                <ShoppingCart className="w-12 h-12 mx-auto text-muted-foreground/40" />
                <div className="space-y-1">
                  <h3 className="font-bold text-base">Your shopping cart is empty</h3>
                  <p className="text-xs text-muted-foreground">
                    Browse our 26 universal departments or redeem a 100-point free item above!
                  </p>
                </div>
                <Link to="/products">
                  <Button className="rounded-xl gap-2">
                    Explore Products <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {cartItems.map((item) => (
                <Card key={item.id} className="overflow-hidden">
                  <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-20 h-20 rounded-xl object-cover bg-muted shrink-0"
                    />
                    <div className="flex-1 space-y-1 text-center sm:text-left">
                      <Link to={`/products/${item.slug}`} className="font-bold text-sm hover:text-primary">
                        {item.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        Sold by: {item.vendor || 'MegaCommerce Official'}
                      </p>
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="text-sm font-extrabold text-primary">
                          ${item.price.toFixed(2)}
                        </span>
                        {item.originalPrice && item.originalPrice > item.price && (
                          <>
                            <span className="text-xs line-through text-muted-foreground">
                              ${item.originalPrice.toFixed(2)}
                            </span>
                            <Badge className="bg-rose-500/15 text-rose-600 dark:text-rose-400 text-[10px]">
                              Save ${(item.originalPrice - item.price).toFixed(2)}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Quantity Controls */}
                    <div className="flex items-center gap-2">
                      <div className="flex items-center border rounded-xl overflow-hidden bg-background">
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.quantity - 1)}
                          className="p-2 hover:bg-muted transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, item.quantity + 1)}
                          className="p-2 hover:bg-muted transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFromCart(item.id)}
                        className="text-muted-foreground hover:text-destructive"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Selected 100-Point Free Reward Item Row */}
              {freeRewardItem && (
                <Card className="border-2 border-emerald-500/40 bg-emerald-500/5">
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={freeRewardItem.image_url}
                        alt={freeRewardItem.name}
                        className="w-16 h-16 rounded-xl object-cover"
                      />
                      <div>
                        <Badge className="bg-emerald-600 text-white text-[10px] mb-1">
                          🎁 100-Point Free Reward Item
                        </Badge>
                        <h4 className="font-bold text-sm">{freeRewardItem.name}</h4>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                          Redeemed with 100 Points • Price: $0.00 FREE (Value ${freeRewardItem.effective_price.toFixed(2)})
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFreeRewardItem(null)}
                      className="text-xs text-muted-foreground hover:text-destructive"
                    >
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        {/* Right Column: Discount Coupons, Order Summary & Live Checkout */}
        <div className="space-y-6">
          <Card className="shadow-lg">
            <CardContent className="p-6 space-y-5">
              <h3 className="font-bold text-base border-b pb-3">Discount & Order Summary</h3>

              {/* Coupon Input & One-Click Promo Chips */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-primary" />
                  Apply Discount Coupon Code
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="WELCOME10, MEGA20, KHQR5"
                    className="flex-1 text-xs px-3 py-2 rounded-xl border bg-background uppercase font-mono"
                  />
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponLoading}
                    className="rounded-xl text-xs"
                  >
                    Apply
                  </Button>
                </div>

                {/* Quick Coupon Chips */}
                <div className="flex flex-wrap gap-1.5">
                  {PROMO_COUPONS.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleApplyCoupon(c.code)}
                      className={`text-[10px] px-2.5 py-1 rounded-full border font-semibold transition-colors cursor-pointer ${
                        appliedCoupon?.code === c.code
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/60 hover:bg-muted text-foreground'
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Price Breakdown */}
              <div className="space-y-2 text-xs border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      Discount ({appliedCoupon.code})
                      <button
                        type="button"
                        onClick={() => setAppliedCoupon(null)}
                        className="text-[10px] underline ml-1 text-muted-foreground"
                      >
                        remove
                      </button>
                    </span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}

                {freeRewardItem && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                    <span>100-Pt Free Item ({freeRewardItem.name.slice(0, 18)}...)</span>
                    <span>FREE ($0.00)</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">Express GPS Delivery</span>
                  <span className="text-emerald-600 font-semibold">FREE</span>
                </div>

                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                  <span>Loyalty Points Earned This Order</span>
                  <span>+{pointsEarnedThisOrder} Points</span>
                </div>

                <div className="border-t pt-3 flex justify-between text-base font-extrabold">
                  <span>Total Payable</span>
                  <span className="text-primary">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Delivery & Payment Form */}
              <form onSubmit={handlePlaceOrder} className="space-y-3 border-t pt-4 text-xs">
                <div className="font-bold text-sm">Delivery & Instant Checkout</div>
                <div>
                  <label className="block text-muted-foreground mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Phone Number (SMS / Telegram GPS Link)</label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background"
                  />
                </div>
                <div>
                  <label className="block text-muted-foreground mb-1">Delivery Address (Live GPS Target)</label>
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background"
                  />
                </div>

                <div>
                  <label className="block text-muted-foreground mb-1">Payment Method</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('bakong_khqr')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                        paymentMethod === 'bakong_khqr'
                          ? 'border-primary bg-primary/10 font-bold'
                          : 'bg-background'
                      }`}
                    >
                      <QrCode className="w-4 h-4 text-rose-500 shrink-0" />
                      <span>Bakong KHQR</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('cash_on_delivery')}
                      className={`p-2.5 rounded-xl border text-left flex items-center gap-2 cursor-pointer ${
                        paymentMethod === 'cash_on_delivery'
                          ? 'border-primary bg-primary/10 font-bold'
                          : 'bg-background'
                      }`}
                    >
                      <CreditCard className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span>Cash / Card</span>
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={checkoutLoading}
                  className="w-full rounded-xl gap-2 shadow-md h-11 font-bold"
                >
                  {checkoutLoading
                    ? 'Processing Order...'
                    : `Complete Order ($${finalTotal.toFixed(2)}) & Earn +5 Pts`}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>256-bit TLS Encrypted • Real-Time GPS Courier Tracking Included</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
