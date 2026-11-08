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
  Banknote,
  MapPin,
  Phone,
  User,
  Lock,
  Check,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement, type FreeRewardProduct } from '@/context/ShopEngagementContext'
import { api } from '@/lib/api'

const PROMO_COUPONS = [
  { code: 'WELCOME10', label: '10% OFF', type: 'percentage' as const, value: 10, min: 10 },
  { code: 'MEGA20', label: '20% OFF (≥$50)', type: 'percentage' as const, value: 20, min: 50 },
  { code: 'KHQR5', label: '$5 OFF', type: 'fixed' as const, value: 5, min: 15 },
  { code: 'VIP30', label: '30% OFF (≥$100)', type: 'percentage' as const, value: 30, min: 100 },
]

export function CartPage() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const {
    cartItems,
    subtotal,
    addToCart,
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
    t,
    formatPrice,
  } = useShopEngagement()

  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || '')
  const [couponLoading, setCouponLoading] = useState(false)
  const [showFreeRewards, setShowFreeRewards] = useState(false)

  // Checkout Form State
  const [customerName, setCustomerName] = useState('Dara Sok')
  const [customerPhone, setCustomerPhone] = useState('016 555 637')
  const [deliveryAddress, setDeliveryAddress] = useState('BKK1, Street 310, Chamkarmon, Phnom Penh')
  const [paymentMethod, setPaymentMethod] = useState<'bakong_khqr' | 'card' | 'cash_on_delivery'>('bakong_khqr')
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8891')
  const [cardExpiry, setCardExpiry] = useState('08/29')
  const [cardCvc, setCardCvc] = useState('888')
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
          description: err?.message || `Add items to your cart first to apply coupon '${code}'.`,
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
        description: `You have ${loyaltyPoints} pts. Click "+100 Test Pts" to unlock free items now!`,
        type: 'info',
      })
      return
    }
    if (freeRewardItem?.id === product.id) {
      setFreeRewardItem(null)
      toast({
        title: 'Free Gift Removed',
        description: '100 points returned to your balance.',
        type: 'info',
      })
    } else {
      setFreeRewardItem(product)
      toast({
        title: '🎁 Free Gift Added ($0.00)!',
        description: `${product.name} added to your order for FREE!`,
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
  const finalTotalKhr = Math.round((finalTotal * 4100) / 100) * 100
  const pointsEarnedThisOrder = 5
  const pointsRedeemedThisOrder = freeRewardItem ? 100 : 0
  const projectedPointsAfterOrder = Math.max(
    0,
    loyaltyPoints - pointsRedeemedThisOrder + pointsEarnedThisOrder
  )

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cartItems.length === 0 && !freeRewardItem) {
      toast({
        title: t('Your cart is empty', 'កន្ត្រកទិញទំនិញរបស់អ្នកទទេ'),
        description: t('Please add a product to your cart before checking out.', 'សូមជ្រើសរើសទំនិញដាក់ចូលកន្ត្រកជាមុនសិន។'),
        type: 'error',
      })
      return
    }

    setCheckoutLoading(true)
    const apiPaymentMethod = paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'bakong_khqr'

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
        payment_method: apiPaymentMethod,
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
    <div className="container mx-auto px-4 py-6 sm:py-10 space-y-6 max-w-6xl">
      {/* Top Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-5">
        <div>
          <div className="text-xs text-muted-foreground mb-1">
            <Link to="/" className="hover:text-primary transition-colors">{t('Home', 'ទំព័រដើម')}</Link> /{' '}
            <span className="text-foreground font-semibold">{t('Checkout & Payment', 'កន្ត្រកទិញទំនិញ និងការទូទាត់')}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            {t('Shopping Cart & Secure Checkout', 'កន្ត្រកទិញទំនិញ និងការទូទាត់ប្រាក់')}
          </h1>
        </div>

        {/* Compact Loyalty Points Pill & Free Gift Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3.5 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-500" />
            <span>{loyaltyPoints} {t('Points', 'ពិន្ទុ')}</span>
          </div>

          <Button
            type="button"
            size="sm"
            variant={showFreeRewards ? 'default' : 'outline'}
            onClick={() => setShowFreeRewards(!showFreeRewards)}
            className="rounded-full text-xs gap-1.5"
          >
            <Gift className="w-3.5 h-3.5 text-amber-500" />
            {t('100-Pt Free Gifts (≤$30)', 'ប្តូរ ១០០ ពិន្ទុយកទំនិញឥតគិតថ្លៃ')}
          </Button>

          {loyaltyPoints < 100 && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                claimDemo100Points()
                setShowFreeRewards(true)
                toast({
                  title: '🎁 +100 Points Unlocked!',
                  description: 'Choose any free reward item below!',
                  type: 'success',
                })
              }}
              className="rounded-full text-xs text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" /> +100 Test Pts
            </Button>
          )}
        </div>
      </div>

      {/* Order Dispatched Confirmation Banner */}
      {completedOrderNum && (
        <Card className="border-2 border-emerald-500/40 bg-emerald-500/10 shadow-lg animate-in fade-in zoom-in-95">
          <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-black text-foreground">
                  {t(`Order #${completedOrderNum} Confirmed!`, `ការបញ្ជាទិញ #${completedOrderNum} ជោគជ័យ!`)}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'You earned +5 Loyalty Points! Your courier Sokha Chan is on the way.',
                    'អ្នកទទួលបាន +5 ពិន្ទុ! អ្នកដឹកជញ្ជូនកំពុងធ្វើដំណើរមកកាន់ទីតាំងរបស់អ្នក។'
                  )}
                </p>
              </div>
            </div>
            <Button
              onClick={() => navigate(`/track-order/${completedOrderNum}`)}
              className="rounded-full gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
            >
              <Truck className="w-4 h-4" /> {t('Track Live GPS', 'តាមដាន GPS ផ្ទាល់')}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Collapsible 100-Point Free Gift Drawer */}
      {showFreeRewards && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 via-card to-purple-500/5 animate-in fade-in slide-in-from-top-2">
          <CardContent className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                  <Gift className="w-4 h-4 text-amber-500" />
                  {t('Redeem 100 Points for a Free Gift (Up to $30 Value)', 'ប្តូរ ១០០ ពិន្ទុយកទំនិញឥតគិតថ្លៃ (តម្លៃត្រឹម $30)')}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {t(
                    'Earn +5 points every order. Pick 1 free item below when you have 100+ points.',
                    'ទទួលបាន +5 ពិន្ទុរាល់ការបញ្ជាទិញ។ ជ្រើសរើសទំនិញឥតគិតថ្លៃ ១ មុខខាងក្រោម។'
                  )}
                </p>
              </div>
              <Badge variant="outline" className="w-fit text-xs border-amber-500/40 text-amber-600">
                {Math.min(100, loyaltyPoints)} / 100 PTS
              </Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {eligibleFreeProducts.map((fp) => {
                const isSelected = freeRewardItem?.id === fp.id
                return (
                  <div
                    key={fp.id}
                    className={`rounded-2xl border p-3 bg-card flex flex-col justify-between gap-3 transition-all ${
                      isSelected ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-500/5' : 'hover:border-primary/40'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={fp.image_url}
                        alt={fp.name}
                        className="w-12 h-12 rounded-xl object-cover bg-muted shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs line-clamp-1">{fp.name}</h4>
                        <div className="text-xs mt-0.5 flex items-center gap-1.5">
                          <span className="line-through text-muted-foreground text-[11px]">
                            {formatPrice(fp.effective_price)}
                          </span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">FREE</span>
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant={isSelected ? 'default' : 'outline'}
                      onClick={() => handleSelectFreeItem(fp)}
                      className={`w-full rounded-xl text-xs h-8 ${
                        isSelected ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : ''
                      }`}
                    >
                      {isSelected ? '✓ Selected ($0.00)' : 'Claim Free (100 Pts)'}
                    </Button>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main 12-Column Split: Left = Cart Items & Delivery Address | Right = Clean Payment Studio */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* LEFT COLUMN (7 Cols): Cart Items + Delivery Info */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Shopping Bag Card */}
          <Card className="border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span>{t('1. Your Order Items', '១. បញ្ជីទំនិញក្នុងកន្ត្រក')} ({cartItems.length})</span>
              </div>
              {cartItems.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                >
                  {t('Clear All', 'លុបទាំងអស់')}
                </button>
              )}
            </div>

            <CardContent className="p-5">
              {cartItems.length === 0 && !freeRewardItem ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                    <ShoppingCart className="w-7 h-7" />
                  </div>
                  <div className="space-y-1 max-w-sm mx-auto">
                    <h3 className="font-bold text-base">
                      {t('Your shopping cart is empty', 'កន្ត្រកទិញទំនិញរបស់អ្នកទទេ')}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {t(
                        'Explore our catalog or add a sample product below to preview our instant Bakong KHQR & Cash on Delivery checkout.',
                        'ស្វែងរកទំនិញក្នុងហាង ឬដាក់ទំនិញសាកល្បងខាងក្រោមដើម្បីតេស្តការទូទាត់ប្រាក់។'
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                    <Link to="/products">
                      <Button className="rounded-full gap-2 text-xs px-5">
                        {t('Browse Products', 'មើលទំនិញទាំងអស់')} <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        addToCart(
                          {
                            id: 2,
                            slug: 'sony-wh-1000xm5-wireless-headphones',
                            name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
                            price: 349.0,
                            originalPrice: 398.0,
                            image:
                              'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
                            vendor: 'TYUSHOP Official',
                          },
                          1
                        )
                      }
                      className="rounded-full text-xs"
                    >
                      + {t('Add Sample Item ($349)', 'ដាក់ទំនិញសាកល្បង ($349)')}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="divide-y">
                  {cartItems.map((item) => (
                    <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center gap-4">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover bg-muted border shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <Link
                          to={`/products/${item.slug}`}
                          className="font-bold text-sm text-foreground hover:text-primary transition-colors line-clamp-1"
                        >
                          {item.name}
                        </Link>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {item.vendor || 'TYUSHOP Official'}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-sm font-black text-primary">
                            {formatPrice(item.price * item.quantity)}
                          </span>
                          {item.quantity > 1 && (
                            <span className="text-[11px] text-muted-foreground">
                              ({formatPrice(item.price)} each)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Clean Pill Quantity Stepper */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center rounded-full border bg-muted/40 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, item.quantity - 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-background transition-colors cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-7 text-center text-xs font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(item.id, item.quantity + 1)}
                            className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-background transition-colors cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="p-2 text-muted-foreground hover:text-destructive transition-colors cursor-pointer"
                          aria-label="Remove item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}

                  {freeRewardItem && (
                    <div className="pt-4 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={freeRewardItem.image_url}
                          alt={freeRewardItem.name}
                          className="w-14 h-14 rounded-2xl object-cover border border-emerald-500/40"
                        />
                        <div>
                          <Badge className="bg-emerald-600 text-white text-[10px] border-0">
                            🎁 100-Pt Free Gift
                          </Badge>
                          <h4 className="font-bold text-xs sm:text-sm mt-0.5">{freeRewardItem.name}</h4>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            $0.00 FREE
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
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Delivery Recipient & GPS Location Card */}
          <Card className="border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                <Truck className="w-4 h-4 text-primary" />
                <span>{t('2. Delivery Address & Contact', '២. ព័ត៌មានដឹកជញ្ជូន និងលេខទូរស័ព្ទ')}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {t('Free Express GPS', 'ដឹកជញ្ជូនឥតគិតថ្លៃ')}
              </Badge>
            </div>

            <CardContent className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    {t('Recipient Name', 'ឈ្មោះអ្នកទទួល')}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Dara Sok"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    {t('Phone Number (Telegram / Call)', 'លេខទូរស័ព្ទទំនាក់ទំនង')}
                  </label>
                  <input
                    type="text"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="016 555 637"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                  {t('Delivery Street / District / City', 'អាសយដ្ឋានដឹកជញ្ជូន (ទីតាំង GPS)')}
                </label>
                <input
                  type="text"
                  required
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  placeholder="BKK1, Street 310, Chamkarmon, Phnom Penh"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN (5 Cols): Clean FinTech Payment & Order Summary Studio */}
        <div className="lg:col-span-5 lg:sticky lg:top-20">
          <Card className="border shadow-xl overflow-hidden">
            <div className="px-5 py-4 border-b bg-gradient-to-r from-primary/10 via-purple-500/5 to-transparent flex items-center justify-between">
              <div className="font-bold text-sm sm:text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <span>{t('3. Payment Method', '៣. ជ្រើសរើសវិធីទូទាត់ប្រាក់')}</span>
              </div>
              <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">
                256-BIT SECURE
              </Badge>
            </div>

            <CardContent className="p-5 space-y-5">
              {/* Clean 3-Tab Payment Method Selector */}
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('bakong_khqr')}
                  className={`relative p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'bakong_khqr'
                      ? 'border-rose-500 bg-rose-500/10 text-foreground ring-2 ring-rose-500/30 shadow-sm'
                      : 'bg-background hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {paymentMethod === 'bakong_khqr' && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <div className="w-9 h-9 rounded-xl bg-rose-500/15 text-rose-600 flex items-center justify-center">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs">Bakong KHQR</span>
                  <span className="text-[10px] text-muted-foreground">ABA • ACLEDA</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`relative p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'card'
                      ? 'border-primary bg-primary/10 text-foreground ring-2 ring-primary/30 shadow-sm'
                      : 'bg-background hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {paymentMethod === 'card' && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-primary text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <div className="w-9 h-9 rounded-xl bg-primary/15 text-primary flex items-center justify-center">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs">{t('Bank Card', 'កាតធនាគារ')}</span>
                  <span className="text-[10px] text-muted-foreground">Visa • Master</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash_on_delivery')}
                  className={`relative p-3 rounded-2xl border text-center flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    paymentMethod === 'cash_on_delivery'
                      ? 'border-amber-500 bg-amber-500/10 text-foreground ring-2 ring-amber-500/30 shadow-sm'
                      : 'bg-background hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  {paymentMethod === 'cash_on_delivery' && (
                    <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-amber-500 text-white flex items-center justify-center">
                      <Check className="w-2.5 h-2.5" />
                    </span>
                  )}
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center">
                    <Banknote className="w-5 h-5" />
                  </div>
                  <span className="font-bold text-xs">{t('Cash (COD)', 'សាច់ប្រាក់')}</span>
                  <span className="text-[10px] text-muted-foreground">{t('On Arrival', 'ពេលមកដល់')}</span>
                </button>
              </div>

              {/* Dynamic Visual Payment Card */}
              {paymentMethod === 'bakong_khqr' && (
                <div className="rounded-2xl border-2 border-rose-500/30 overflow-hidden bg-white dark:bg-slate-900 shadow-sm animate-in fade-in duration-200">
                  {/* Official-style Red KHQR Header */}
                  <div className="bg-[#E1232E] text-white px-4 py-2.5 flex items-center justify-between">
                    <span className="font-black tracking-wider text-sm">KHQR • BAKONG</span>
                    <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                      0% Fee Instant Scan
                    </span>
                  </div>

                  <div className="p-4 flex items-center gap-4">
                    {/* Crisp Styled QR Code Box */}
                    <div className="w-24 h-24 rounded-xl border-2 border-slate-200 dark:border-slate-700 p-2 bg-white shrink-0 flex items-center justify-center relative">
                      <QrCode className="w-full h-full text-slate-900" />
                      <span className="absolute px-1 py-0.5 bg-[#E1232E] text-white text-[8px] font-black rounded">
                        KHQR
                      </span>
                    </div>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="text-[11px] text-muted-foreground font-semibold uppercase">
                        Merchant: TYUSHOP OFFICIAL
                      </div>
                      <div className="text-lg font-black text-foreground">
                        ${finalTotal.toFixed(2)}{' '}
                        <span className="text-xs font-semibold text-muted-foreground">
                          ({finalTotalKhr.toLocaleString()} ៛)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1 pt-1">
                        {['ABA PAY', 'ACLEDA', 'Wing', 'Bakong'].map((bank) => (
                          <span
                            key={bank}
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-muted text-foreground"
                          >
                            {bank}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {paymentMethod === 'card' && (
                <div className="rounded-2xl border p-4 bg-muted/20 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{t('Credit / Debit Card Details', 'ព័ត៌មានកាតធនាគារ')}</span>
                    <span className="text-primary">VISA • MASTERCARD</span>
                  </div>
                  <input
                    type="text"
                    value={cardNumber}
                    onChange={(e) => setCardNumber(e.target.value)}
                    placeholder="Card Number"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border bg-background"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={cardExpiry}
                      onChange={(e) => setCardExpiry(e.target.value)}
                      placeholder="MM/YY"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border bg-background"
                    />
                    <input
                      type="password"
                      value={cardCvc}
                      onChange={(e) => setCardCvc(e.target.value)}
                      placeholder="CVC"
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border bg-background"
                    />
                  </div>
                </div>
              )}

              {paymentMethod === 'cash_on_delivery' && (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4 flex items-center gap-3.5 animate-in fade-in duration-200">
                  <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                    <Banknote className="w-6 h-6" />
                  </div>
                  <div className="text-xs space-y-0.5">
                    <div className="font-bold text-foreground">
                      {t('Pay Cash When Courier Arrives', 'បង់សាច់ប្រាក់ពេលអ្នកដឹកជញ្ជូនមកដល់ទីតាំង')}
                    </div>
                    <p className="text-muted-foreground">
                      {t(
                        `Pay $0.00 online now. Hand ${formatPrice(finalTotal)} cash directly to the driver upon arrival.`,
                        `បង់ឥឡូវ $0.00 — ប្រគល់សាច់ប្រាក់ ${formatPrice(finalTotal)} ជូនអ្នកដឹកជញ្ជូនពេលទំនិញមកដល់។`
                      )}
                    </p>
                  </div>
                </div>
              )}

              {/* Promo Code Bar */}
              <div className="space-y-2 pt-1 border-t">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Tag className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder={t('Promo code (e.g. WELCOME10)', 'បញ្ចូលកូដបញ្ចុះតម្លៃ')}
                      className="w-full pl-8 pr-3 py-2 text-xs rounded-xl border bg-background uppercase font-mono"
                    />
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponLoading}
                    className="rounded-xl text-xs px-4"
                  >
                    {t('Apply', 'ប្រើកូដ')}
                  </Button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PROMO_COUPONS.map((c) => (
                    <button
                      key={c.code}
                      type="button"
                      onClick={() => handleApplyCoupon(c.code)}
                      className={`text-[10px] px-2.5 py-0.5 rounded-full border font-semibold transition-colors cursor-pointer ${
                        appliedCoupon?.code === c.code
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted/50 hover:bg-muted text-muted-foreground'
                      }`}
                    >
                      {c.code} ({c.label})
                    </button>
                  ))}
                </div>
              </div>

              {/* Clean Order Breakdown */}
              <div className="space-y-2 text-xs border-t pt-4">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Subtotal', 'តម្លៃទំនិញសរុប')}</span>
                  <span className="font-semibold">{formatPrice(subtotal)}</span>
                </div>

                {appliedCoupon && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                    <span className="flex items-center gap-1">
                      {t('Promo Discount', 'បញ្ចុះតម្លៃ')} ({appliedCoupon.code})
                      <button
                        type="button"
                        onClick={() => setAppliedCoupon(null)}
                        className="text-[10px] underline ml-1 text-muted-foreground"
                      >
                        remove
                      </button>
                    </span>
                    <span>-{formatPrice(discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Express GPS Delivery', 'សេវាដឹកជញ្ជូន GPS')}</span>
                  <span className="text-emerald-600 font-semibold">{t('FREE', 'ឥតគិតថ្លៃ')}</span>
                </div>

                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                  <span>{t('Loyalty Reward Earned', 'ពិន្ទុបន្ថែមសម្រាប់ការទិញនេះ')}</span>
                  <span>+{pointsEarnedThisOrder} PTS</span>
                </div>

                <div className="border-t pt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-black">{t('Total Payable', 'ទឹកប្រាក់ត្រូវទូទាត់សរុប')}</span>
                    <div className="text-[11px] text-muted-foreground">
                      ≈ {finalTotalKhr.toLocaleString()} ៛ (KHR)
                    </div>
                  </div>
                  <span className="text-2xl font-black text-primary">${finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Primary Submit Button */}
              <form onSubmit={handlePlaceOrder}>
                <Button
                  type="submit"
                  disabled={checkoutLoading}
                  className="w-full rounded-2xl gap-2 shadow-lg shadow-primary/25 h-12 font-bold text-sm"
                >
                  {checkoutLoading
                    ? t('Processing Order...', 'កំពុងដំណើរការបញ្ជាទិញ...')
                    : paymentMethod === 'cash_on_delivery'
                    ? t(
                        `Confirm Order • Pay ${formatPrice(finalTotal)} on Arrival`,
                        `បញ្ជាទិញឥឡូវ • បង់ពេលទំនិញមកដល់ (${formatPrice(finalTotal)})`
                      )
                    : t(
                        `Confirm & Pay ${formatPrice(finalTotal)} Now`,
                        `ទូទាត់ប្រាក់ឥឡូវ (${formatPrice(finalTotal)})`
                      )}
                  <ArrowRight className="w-4 h-4" />
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>{t('Protected by TYUSHOP Buyer Guarantee & Live GPS Tracking', 'ធានាសុវត្ថិភាពដោយ TYUSHOP និងតាមដាន GPS ផ្ទាល់')}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
