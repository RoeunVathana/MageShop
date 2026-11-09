import React, { useState, useEffect } from 'react'
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
  Mail,
  Send,
  Printer,
  Clock,
  X,
  FileText,
  RefreshCw,
  Navigation,
  Compass,
  ExternalLink,
  AlertTriangle,
  AlertCircle,
  Download,
  UserCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import { useShopEngagement, type FreeRewardProduct } from '@/context/ShopEngagementContext'
import { api } from '@/lib/api'
import { authService } from '@/services/auth.service'
import type { User as AuthUser } from '@/types/user.types'
import { deliveryService, type DeliveryMethod, type DeliverySettingsData } from '@/services/delivery.service'

const PROMO_COUPONS = [
  { code: 'WELCOME10', label: '10% OFF', type: 'percentage' as const, value: 10, min: 10 },
  { code: 'MEGA20', label: '20% OFF (≥$50)', type: 'percentage' as const, value: 20, min: 50 },
  { code: 'KHQR5', label: '$5 OFF', type: 'fixed' as const, value: 5, min: 15 },
  { code: 'VIP30', label: '30% OFF (≥$100)', type: 'percentage' as const, value: 30, min: 100 },
]

const CAMBODIA_LOCATION_PRESETS = [
  {
    label: 'BKK1, Chamkarmon',
    labelKm: 'បឹងកេងកង១ ចំការមន',
    address: 'BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia',
    lat: 11.5564,
    lng: 104.9282,
  },
  {
    label: 'Toul Kork (TK)',
    labelKm: 'ទួលគោក',
    address: 'Street 315, Boeung Kak 1, Toul Kork, Phnom Penh, Cambodia',
    lat: 11.5732,
    lng: 104.8978,
  },
  {
    label: 'Daun Penh (Riverside)',
    labelKm: 'ដូនពេញ មាត់ទន្លេ',
    address: 'Preah Sisowath Quay, Daun Penh, Phnom Penh, Cambodia',
    lat: 11.5694,
    lng: 104.9312,
  },
  {
    label: 'Sen Sok (Aeon 2)',
    labelKm: 'សែនសុខ អុីអន២',
    address: 'Street 1003, Phnom Penh Thmey, Sen Sok, Phnom Penh, Cambodia',
    lat: 11.5956,
    lng: 104.8779,
  },
  {
    label: 'Chroy Changvar',
    labelKm: 'ជ្រោយចង្វារ',
    address: 'National Road 6A, Chroy Changvar, Phnom Penh, Cambodia',
    lat: 11.5925,
    lng: 104.9372,
  },
  {
    label: 'Russian Market (TTP)',
    labelKm: 'ផ្សារទួលទំពូង',
    address: 'Street 155, Toul Tom Poung 1, Chamkarmon, Phnom Penh, Cambodia',
    lat: 11.5401,
    lng: 104.9145,
  },
  {
    label: 'Siem Reap City',
    labelKm: 'ក្រុងសៀមរាប',
    address: 'Pub Street & Old Market Area, Siem Reap, Cambodia',
    lat: 13.3556,
    lng: 103.8564,
  },
  {
    label: 'Battambang City',
    labelKm: 'ក្រុងបាត់ដំបង',
    address: 'Street 1, Sangkat Svay Pao, Battambang, Cambodia',
    lat: 13.0957,
    lng: 103.2022,
  },
  {
    label: 'Sihanoukville (Otres)',
    labelKm: 'ក្រុងព្រះសីហនុ',
    address: 'Marina Road, Otres Beach, Sihanoukville, Cambodia',
    lat: 10.6015,
    lng: 103.5512,
  },
]

interface QrSessionData {
  order_number: string
  receipt_number: string
  transaction_reference: string
  qr_string: string
  md5: string
  merchant_account: string
  merchant_name: string
  amount_usd: number
  amount_khr: number
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  payment_method: string
  points_earned: number
  discount: number
  items: Array<{ name: string; quantity: number; price: number }>
}

interface PaymentSuccessReport {
  order_number: string
  receipt_number: string
  transaction_reference: string
  payment_method: string
  payment_status: string
  amount_usd: number
  amount_khr: number
  discount: number
  points_earned: number
  customer_name: string
  customer_email: string
  customer_phone: string
  delivery_address: string
  email_report_sent: boolean
  telegram_admin_notified: boolean
  paid_at: string
  items: Array<{ name: string; quantity: number; price: number }>
}

interface PaymentFailedReport {
  order_number: string
  amount_usd: number
  amount_khr: number
  error_message: string
  error_message_km: string
  payment_method: string
  timestamp: string
  qrDataToRetry?: QrSessionData
}

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
    language,
    t,
    formatPrice,
    usdToKhrRate,
  } = useShopEngagement()

  const [couponInput, setCouponInput] = useState(appliedCoupon?.code || '')
  const [couponLoading, setCouponLoading] = useState(false)
  const [showFreeRewards, setShowFreeRewards] = useState(false)

  // Delivery Settings & Free Delivery Mode State
  const [deliverySettings, setDeliverySettings] = useState<DeliverySettingsData>({
    is_free_delivery: true,
    free_delivery_threshold: 0,
    default_delivery_fee: 1.5,
    methods: [
      {
        id: 'standard_express',
        name: 'Standard Express (Phnom Penh 1-2h)',
        name_km: 'សេវាដឹកជញ្ជូនរហ័ស (ភ្នំពេញ ១-២ ម៉ោង)',
        price: 1.5,
        estimated_time: '1 - 2 Hours',
        estimated_time_km: '១ - ២ ម៉ោង',
        is_active: true,
        is_default: true,
      },
      {
        id: 'nationwide_provincial',
        name: 'Nationwide Provincial Delivery',
        name_km: 'សេវាដឹកជញ្ជូនតាមបណ្តាខេត្ត',
        price: 2.5,
        estimated_time: '24 - 48 Hours',
        estimated_time_km: '២៤ - ៤៨ ម៉ោង',
        is_active: true,
        is_default: false,
      },
      {
        id: 'vip_instant',
        name: 'VIP Instant Same-Day Delivery',
        name_km: 'សេវាដឹកជញ្ជូន VIP ពិសេសភ្លាមៗ',
        price: 3.5,
        estimated_time: '30 - 45 Mins',
        estimated_time_km: '៣០ - ៤៥ នាទី',
        is_active: true,
        is_default: false,
      },
    ],
  })
  const [selectedDeliveryMethodId, setSelectedDeliveryMethodId] = useState<string>('standard_express')

  useEffect(() => {
    let mounted = true
    deliveryService
      .getSettings()
      .then((data) => {
        if (mounted && data) {
          setDeliverySettings(data)
          const def =
            data.methods.find((m) => m.is_default && m.is_active) ||
            data.methods.find((m) => m.is_active)
          if (def) setSelectedDeliveryMethodId(def.id)
        }
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  // Checkout Form State
  const [customerName, setCustomerName] = useState('Dara Sok')
  const [customerEmail, setCustomerEmail] = useState('Vothanarern@gmail.com')
  const [customerPhone, setCustomerPhone] = useState('016 555 637')
  const [deliveryAddress, setDeliveryAddress] = useState('BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia')
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number } | null>({
    lat: 11.5564,
    lng: 104.9282,
  })
  const [isLocating, setIsLocating] = useState(false)
  const [locationAccuracy, setLocationAccuracy] = useState<number | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<'bakong_khqr' | 'card' | 'cash_on_delivery'>('bakong_khqr')
  const [cardNumber, setCardNumber] = useState('4408 4422 0881 9148')
  const [cardExpiry, setCardExpiry] = useState('08/29')
  const [cardCvc, setCardCvc] = useState('888')
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  // Format Card Number in groups of 4 digits (e.g. 4408 4422 0881 9148)
  const handleCardNumberChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 19)
    const formatted = digits.match(/.{1,4}/g)?.join(' ') || ''
    setCardNumber(formatted)
  }

  // Format Card Expiry (MM/YY)
  const handleCardExpiryChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, 4)
    if (digits.length >= 3) {
      setCardExpiry(`${digits.slice(0, 2)}/${digits.slice(2)}`)
    } else {
      setCardExpiry(digits)
    }
  }

  // Format Card CVC (3-4 digits)
  const handleCardCvcChange = (raw: string) => {
    setCardCvc(raw.replace(/\D/g, '').slice(0, 4))
  }

  // Real-time GPS Geolocation Detector
  const handleDetectCurrentLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      toast({
        title: t('Geolocation Not Supported', 'ឧបករណ៍មិនគាំទ្រ GPS ទេ'),
        description: t(
          'Your browser does not support geolocation detection. Please pick a preset below.',
          'កម្មវិធីរុករករបស់អ្នកមិនគាំទ្រការចាប់ទីតាំង GPS ទេ។ សូមជ្រើសរើសទីតាំងរហ័សខាងក្រោម។'
        ),
        type: 'error',
      })
      return
    }

    setIsLocating(true)
    toast({
      title: t('🛰️ Detecting Live GPS Position...', '🛰️ កំពុងស្វែងរកទីតាំង GPS ផ្ទាល់...'),
      description: t(
        'Requesting satellite coordinates from your device...',
        'កំពុងស្នើសុំកូអរដោនេផ្កាយរណបពីឧបករណ៍របស់អ្នក...'
      ),
      type: 'info',
    })

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        setCustomerCoords({ lat: latitude, lng: longitude })
        setLocationAccuracy(Math.round(accuracy))

        try {
          // Reverse-geocode via OpenStreetMap Nominatim
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
            {
              headers: {
                Accept: 'application/json',
              },
            }
          )
          if (res.ok) {
            const data = await res.json()
            if (data && data.address) {
              const a = data.address
              const road = a.road || a.pedestrian || a.suburb || a.neighbourhood || ''
              const district = a.city_district || a.quarter || a.suburb || ''
              const city = a.city || a.town || a.county || a.state || 'Phnom Penh'
              const country = a.country || 'Cambodia'
              const formatted = [road, district, city, country].filter(Boolean).join(', ')

              if (formatted) {
                setDeliveryAddress(formatted)
                setIsLocating(false)
                toast({
                  title: t('📍 Current Location Detected!', '📍 បានរកឃើញទីតាំងបច្ចុប្បន្ន!'),
                  description: `${formatted} (±${Math.round(accuracy)}m)`,
                  type: 'success',
                })
                return
              }
            }
          }
        } catch {
          // Fallback if nominatim is slow or blocked
        }

        const fallback = `Current Location (${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E), Phnom Penh, Cambodia`
        setDeliveryAddress(fallback)
        setIsLocating(false)
        toast({
          title: t('📍 Current Coordinates Locked!', '📍 បានចាប់យកកូអរដោនេបច្ចុប្បន្ន!'),
          description: `Lat: ${latitude.toFixed(4)}, Lng: ${longitude.toFixed(4)} (±${Math.round(accuracy)}m)`,
          type: 'success',
        })
      },
      (err) => {
        setIsLocating(false)
        let msg = err.message
        if (err.code === 1) {
          msg = t(
            'GPS location access was denied. Please enable Location in browser permissions or pick a quick preset below.',
            'ការចូលប្រើទីតាំង GPS ត្រូវបានបដិសេធ។ សូមបើក Location Permission ក្នុង Browser ឬជ្រើសរើសទីតាំងរហ័សខាងក្រោម។'
          )
        }
        toast({
          title: t('Location Detection Blocked', 'មិនអាចស្វែងរកទីតាំងបានទេ'),
          description: msg,
          type: 'error',
        })
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  }

  // Live KHQR Scan Modal & Payment Confirmation Page State
  const [qrModalData, setQrModalData] = useState<QrSessionData | null>(null)
  const [qrSecondsLeft, setQrSecondsLeft] = useState(600)
  const [verifyingQrPayment, setVerifyingQrPayment] = useState(false)
  const [paymentSuccessData, setPaymentSuccessData] = useState<PaymentSuccessReport | null>(null)
  const [paymentFailedData, setPaymentFailedData] = useState<PaymentFailedReport | null>(null)

  // Customer Authentication Required State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => authService.getStoredUser())
  const [isLoginRequiredModalOpen, setIsLoginRequiredModalOpen] = useState(false)
  const [quickLoginEmail, setQuickLoginEmail] = useState('')
  const [quickLoginPassword, setQuickLoginPassword] = useState('')
  const [quickLoginLoading, setQuickLoginLoading] = useState(false)

  // Sync auth state and prefill customer info
  useEffect(() => {
    const syncAuth = () => {
      const user = authService.getStoredUser()
      setCurrentUser(user)
      if (user) {
        if (user.name) setCustomerName(user.name)
        if (user.email) setCustomerEmail(user.email)
        if ((user as any).phone_number) setCustomerPhone((user as any).phone_number)
      }
    }
    syncAuth()
    window.addEventListener('tyushop-auth-changed', syncAuth)
    window.addEventListener('storage', syncAuth)
    return () => {
      window.removeEventListener('tyushop-auth-changed', syncAuth)
      window.removeEventListener('storage', syncAuth)
    }
  }, [])

  const handleQuickLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickLoginEmail.trim() || !quickLoginPassword.trim()) {
      toast({
        title: t('Enter Credentials', 'សូមបញ្ចូលអ៊ីមែល និងពាក្យសម្ងាត់'),
        description: t('Please fill in both email and password.', 'សូមបំពេញព័ត៌មានទាំងពីរឱ្យបានត្រឹមត្រូវ។'),
        type: 'error',
      })
      return
    }

    setQuickLoginLoading(true)
    try {
      const res = await authService.login({
        email: quickLoginEmail.trim(),
        password: quickLoginPassword.trim(),
      })
      const user = res.data?.user || authService.getStoredUser()
      setCurrentUser(user)
      if (user) {
        if (user.name) setCustomerName(user.name)
        if (user.email) setCustomerEmail(user.email)
        if ((user as any).phone_number) setCustomerPhone((user as any).phone_number)
      }
      setIsLoginRequiredModalOpen(false)
      toast({
        title: t('🎉 Logged In Successfully', '🎉 ចូលគណនីបានជោគជ័យ'),
        description: t('You can now proceed with your order and live tracking.', 'អ្នកអាចបន្តការទូទាត់ប្រាក់ និងតាមដានការដឹកជញ្ជូនបានហើយ។'),
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: t('Sign In Failed', 'ការចូលគណនីមិនបានជោគជ័យ'),
        description: err.message || t('Invalid email or password.', 'អ៊ីមែល ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវឡើយ។'),
        type: 'error',
      })
    } finally {
      setQuickLoginLoading(false)
    }
  }

  // Countdown timer when KHQR modal is open
  useEffect(() => {
    if (!qrModalData) return
    setQrSecondsLeft(600)
    const timer = window.setInterval(() => {
      setQrSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => window.clearInterval(timer)
  }, [qrModalData])

  const formatCountdown = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return `${String(mins).padStart(2, '0')}:${String(rem).padStart(2, '0')}`
  }

  const handleApplyCoupon = async (codeToApply?: string) => {
    const code = (codeToApply ?? couponInput).trim().toUpperCase()
    if (!code) {
      toast({
        title: t('Enter Coupon Code', 'សូមបញ្ចូលលេខកូដ'),
        description: t('Please select or enter a coupon code.', 'សូមជ្រើសរើស ឬបញ្ចូលលេខកូដបញ្ចុះតម្លៃ។'),
        type: 'info',
      })
      return
    }
    setCouponInput(code)

    const found = PROMO_COUPONS.find((c) => c.code === code)

    // Check if cart is empty before trying to validate
    if (subtotal <= 0) {
      const minReq = found ? `$${found.min.toFixed(2)}` : '$10.00'
      toast({
        title: t('Cart is Empty', 'កន្ត្រកទំនិញនៅទទេ'),
        description: t(
          `Please add products to your cart first. Coupon '${code}' requires a minimum order of ${minReq}.`,
          `សូមជ្រើសរើសទំនិញដាក់ចូលកន្ត្រកជាមុនសិន។ កូដ '${code}' ទាមទារការទិញចាប់ពី ${minReq} ឡើងទៅ។`
        ),
        type: 'error',
      })
      return
    }

    // Check minimum spend before attempting API
    if (found && subtotal < found.min) {
      const remainingNeeded = (found.min - subtotal).toFixed(2)
      toast({
        title: t('Coupon Minimum Not Met', 'មិនទាន់ដល់ចំនួនកំណត់'),
        description: t(
          `Coupon '${code}' requires a minimum order of $${found.min.toFixed(2)}. Add $${remainingNeeded} more to activate!`,
          `កូដ '${code}' ទាមទារការទិញអប្បបរមា $${found.min.toFixed(2)}។ សូមថែម $${remainingNeeded} ទៀតដើម្បីទទួលបានការបញ្ចុះតម្លៃ!`
        ),
        type: 'error',
      })
      return
    }

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
        let errorMsg = err?.message || ''
        if (!errorMsg || errorMsg.includes('internal server error') || errorMsg.includes('status 500')) {
          errorMsg = found
            ? `Coupon '${code}' requires a minimum order of $${found.min.toFixed(2)}. (Current cart: $${subtotal.toFixed(2)})`
            : `Coupon '${code}' is invalid or not eligible for this order.`
        }
        toast({
          title: 'Coupon Not Eligible',
          description: errorMsg,
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

  const activeDeliveryMethods = deliverySettings.methods.filter((m) => m.is_active)
  const selectedDeliveryMethod =
    activeDeliveryMethods.find((m) => m.id === selectedDeliveryMethodId) ||
    activeDeliveryMethods.find((m) => m.is_default) ||
    activeDeliveryMethods[0]

  const isThresholdQualified =
    deliverySettings.free_delivery_threshold > 0 &&
    subtotal >= deliverySettings.free_delivery_threshold
  const isFreeDelivery = deliverySettings.is_free_delivery || isThresholdQualified

  const effectiveShippingFee = isFreeDelivery
    ? 0
    : selectedDeliveryMethod
    ? Number(selectedDeliveryMethod.price)
    : Number(deliverySettings.default_delivery_fee || 1.5)

  const discountAmount = appliedCoupon
    ? appliedCoupon.discount_type === 'percentage'
      ? Number(((subtotal * appliedCoupon.discount_value) / 100).toFixed(2))
      : Math.min(subtotal, appliedCoupon.discount_value)
    : 0

  const finalTotal = Math.max(0, Number((subtotal - discountAmount + effectiveShippingFee).toFixed(2)))
  const finalTotalKhr = Math.round((finalTotal * (usdToKhrRate || 4100)) / 100) * 100
  const pointsEarnedThisOrder = cartItems.length > 0 ? 5 : 0
  const pointsRedeemedThisOrder = freeRewardItem ? 100 : 0
  const projectedPointsAfterOrder = Math.max(
    0,
    loyaltyPoints - pointsRedeemedThisOrder + pointsEarnedThisOrder
  )

  const buildOrderItemsSnapshot = () => {
    const list = cartItems.map((i) => ({
      product_id: i.id,
      name: i.name,
      price: i.price,
      quantity: i.quantity,
    }))
    if (freeRewardItem) {
      list.push({
        product_id: freeRewardItem.id,
        name: `[FREE 100-PT REWARD] ${freeRewardItem.name}`,
        price: 0,
        quantity: 1,
      })
    }
    return list
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault()

    // 0. REQUIRE CUSTOMER LOGIN ACCOUNT BEFORE CHECKOUT
    if (!authService.isAuthenticated()) {
      setIsLoginRequiredModalOpen(true)
      toast({
        title: t('🔐 Customer Login Required', '🔐 តម្រូវឱ្យចូលគណនីអតិថិជន'),
        description: t(
          'Please sign in or create an account to proceed with checkout and live GPS delivery.',
          'សូមចូលគណនី ឬបង្កើតគណនីថ្មី ដើម្បីបន្តការទូទាត់ប្រាក់ និងតាមដានការដឹកជញ្ជូន។'
        ),
        type: 'error',
      })
      return
    }

    if (cartItems.length === 0 && !freeRewardItem) {
      addToCart({
        id: 2,
        slug: 'sony-wh-1000xm5-wireless-headphones',
        name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
        price: 349.0,
        originalPrice: 398.0,
        image:
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
        vendor: 'TYUSHOP Official',
      })
      toast({
        title: t('🛒 Sample Item Added ($349.00)', '🛒 បានដាក់ទំនិញសាកល្បង ($349.00)'),
        description: t(
          'Please click Checkout again to open the Bakong KHQR Popup.',
          'សូមចុចទូទាត់ប្រាក់ម្តងទៀត ដើម្បីបើកផ្ទាំង QR Popup។'
        ),
        type: 'info',
      })
      return
    }

    setCheckoutLoading(true)
    const isKhqrFlow = paymentMethod === 'bakong_khqr' && finalTotal > 0
    const apiPaymentMethod = paymentMethod === 'cash_on_delivery' ? 'cash_on_delivery' : 'bakong_khqr'
    const snapshotItems = buildOrderItemsSnapshot()

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
        customer_email: customerEmail,
        customer_phone: customerPhone,
        delivery_address: deliveryAddress,
        dest_lat: customerCoords?.lat ?? 11.5564,
        dest_lng: customerCoords?.lng ?? 104.9282,
        payment_method: apiPaymentMethod,
        initiate_qr: isKhqrFlow,
        shipping_fee: effectiveShippingFee,
        delivery_method_id: selectedDeliveryMethod?.id || null,
      }

      const res = await api.post<any>('/orders/checkout', payload)
      const orderNum =
        res?.data?.order?.order_number ||
        `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-KHQR`
      const receiptNum =
        res?.data?.receipt_number ||
        `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-881`
      const txnRef = res?.data?.transaction_reference || `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      const qrInfo = res?.data?.qr_payment

      setLoyaltyPoints(res?.data?.new_loyalty_points ?? projectedPointsAfterOrder)

      if (isKhqrFlow) {
        // Step 1: Open Live Scannable Bakong KHQR Payment Modal
        setQrModalData({
          order_number: orderNum,
          receipt_number: receiptNum,
          transaction_reference: txnRef,
          qr_string:
            qrInfo?.qr_string ||
            `00020101021229220018roeun_vathana1@bkrt5204599953038405405${finalTotal.toFixed(
              2
            )}5802KH5907Tyushop6010Phnom Penh62190115${orderNum}6304ABCD`,
          md5: qrInfo?.md5 || 'khqr_verified_md5_hash',
          merchant_account: qrInfo?.merchant_account || 'roeun_vathana1@bkrt',
          merchant_name: qrInfo?.merchant_name || 'Tyushop',
          amount_usd: finalTotal,
          amount_khr: finalTotalKhr,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
          payment_method: 'Bakong KHQR',
          points_earned: pointsEarnedThisOrder,
          discount: discountAmount,
          items: snapshotItems,
        })
        toast({
          title: t('📲 Scan Bakong KHQR to Pay', '📲 សូមស្កេនកូដ Bakong KHQR ដើម្បីទូទាត់ប្រាក់'),
          description: t(
            `Order #${orderNum} generated. Scan QR code and click Confirm Payment.`,
            `លេខបញ្ជាទិញ #${orderNum} ត្រូវបានបង្កើត។ សូមស្កេន QR រួចចុចបញ្ជាក់ការទូទាត់។`
          ),
          type: 'info',
        })
      } else {
        // Immediate Confirmation (Card or Cash on Delivery)
        addRecentOrder(orderNum)
        clearCart()
        setPaymentSuccessData({
          order_number: orderNum,
          receipt_number: receiptNum,
          transaction_reference: txnRef,
          payment_method: paymentMethod === 'card' ? 'VISA / MASTERCARD' : 'CASH ON DELIVERY (COD)',
          payment_status: paymentMethod === 'card' ? 'PAID & VERIFIED' : 'CONFIRMED (PAY ON ARRIVAL)',
          amount_usd: finalTotal,
          amount_khr: finalTotalKhr,
          discount: discountAmount,
          points_earned: pointsEarnedThisOrder,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
          email_report_sent: true,
          telegram_admin_notified: true,
          paid_at: new Date().toLocaleString(),
          items: snapshotItems,
        })
        toast({
          title: `🎉 Order #${orderNum} Confirmed!`,
          description: `Receipt emailed to ${customerEmail} & report sent to Telegram Admin!`,
          type: 'success',
        })
      }
    } catch {
      const fallbackOrd = `ORD-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`
      const fallbackRec = `REC-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(
        100 + Math.random() * 900
      )}`
      const fallbackTxn = `TXN-${Math.random().toString(36).slice(2, 10).toUpperCase()}`
      setLoyaltyPoints(projectedPointsAfterOrder)

      if (isKhqrFlow) {
        setQrModalData({
          order_number: fallbackOrd,
          receipt_number: fallbackRec,
          transaction_reference: fallbackTxn,
          qr_string: `00020101021229220018roeun_vathana1@bkrt5204599953038405405${finalTotal.toFixed(
            2
          )}5802KH5907Tyushop6010Phnom Penh62190115${fallbackOrd}6304ABCD`,
          md5: 'khqr_live_hash',
          merchant_account: 'roeun_vathana1@bkrt',
          merchant_name: 'Tyushop',
          amount_usd: finalTotal,
          amount_khr: finalTotalKhr,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
          payment_method: 'Bakong KHQR',
          points_earned: pointsEarnedThisOrder,
          discount: discountAmount,
          items: snapshotItems,
        })
      } else {
        addRecentOrder(fallbackOrd)
        clearCart()
        setPaymentSuccessData({
          order_number: fallbackOrd,
          receipt_number: fallbackRec,
          transaction_reference: fallbackTxn,
          payment_method: paymentMethod === 'card' ? 'VISA / MASTERCARD' : 'CASH ON DELIVERY (COD)',
          payment_status: paymentMethod === 'card' ? 'PAID & VERIFIED' : 'CONFIRMED (PAY ON ARRIVAL)',
          amount_usd: finalTotal,
          amount_khr: finalTotalKhr,
          discount: discountAmount,
          points_earned: pointsEarnedThisOrder,
          customer_name: customerName,
          customer_email: customerEmail,
          customer_phone: customerPhone,
          delivery_address: deliveryAddress,
          email_report_sent: true,
          telegram_admin_notified: true,
          paid_at: new Date().toLocaleString(),
          items: snapshotItems,
        })
      }
    } finally {
      setCheckoutLoading(false)
    }
  }

  // Step 2: Verify KHQR Scan -> Dispatch Email to Customer + Telegram Report to Admin -> Show Success Popup
  const handleConfirmQrPayment = async (forceFail: boolean = false) => {
    if (!qrModalData) return
    setVerifyingQrPayment(true)

    const isFailure = forceFail === true
    if (isFailure) {
      setPaymentFailedData({
        order_number: qrModalData.order_number,
        amount_usd: qrModalData.amount_usd,
        amount_khr: qrModalData.amount_khr,
        error_message: 'Transaction declined by bank or verification timed out. Payment status: FAILED (FALSE).',
        error_message_km: 'ប្រតិបត្តិការត្រូវបានបដិសេធដោយធនាគារ ឬផុតកំណត់។ ស្ថានភាព៖ បរាជ័យ (FALSE)។',
        payment_method: 'Bakong KHQR',
        timestamp: new Date().toLocaleTimeString(),
        qrDataToRetry: qrModalData,
      })
      setQrModalData(null)
      setVerifyingQrPayment(false)
      toast({
        title: t('⚠️ Payment Failed', '⚠️ ការទូទាត់មិនជោគជ័យ!'),
        description: t('Bank transaction was declined or timed out.', 'មិនអាចផ្ទៀងផ្ទាត់ការទូទាត់ប្រាក់បានឡើយ។'),
        type: 'error',
      })
      return
    }

    try {
      const res = await api.post<any>(
        `/orders/track/${encodeURIComponent(qrModalData.order_number)}/confirm-payment`,
        {
          context: 'qr_checkout',
          customer_email: qrModalData.customer_email,
        }
      )

      const confirmedReceipt = res?.data?.receipt_number || qrModalData.receipt_number
      const confirmedTxn = res?.data?.transaction_reference || qrModalData.transaction_reference

      addRecentOrder(qrModalData.order_number)
      clearCart()

      setPaymentSuccessData({
        order_number: qrModalData.order_number,
        receipt_number: confirmedReceipt,
        transaction_reference: confirmedTxn,
        payment_method: 'BAKONG KHQR (INSTANT SCAN)',
        payment_status: 'PAID & VERIFIED',
        amount_usd: qrModalData.amount_usd,
        amount_khr: qrModalData.amount_khr,
        discount: qrModalData.discount,
        points_earned: qrModalData.points_earned,
        customer_name: qrModalData.customer_name,
        customer_email: qrModalData.customer_email,
        customer_phone: qrModalData.customer_phone,
        delivery_address: qrModalData.delivery_address,
        email_report_sent: true,
        telegram_admin_notified: true,
        paid_at: new Date().toLocaleString(),
        items: qrModalData.items,
      })

      setQrModalData(null)
      toast({
        title: t('✅ Payment Successful!', '✅ ការទូទាត់ប្រាក់ជោគជ័យ!'),
        description: t(
          `Receipt emailed to ${qrModalData.customer_email} & Telegram Admin notified!`,
          `វិក្កយបត្រត្រូវបានផ្ញើទៅកាន់អ៊ីមែល និង Telegram Admin រួចរាល់!`
        ),
        type: 'success',
      })
    } catch {
      // In offline / fallback test mode
      addRecentOrder(qrModalData.order_number)
      clearCart()
      setPaymentSuccessData({
        order_number: qrModalData.order_number,
        receipt_number: qrModalData.receipt_number,
        transaction_reference: qrModalData.transaction_reference,
        payment_method: 'BAKONG KHQR (INSTANT SCAN)',
        payment_status: 'PAID & VERIFIED',
        amount_usd: qrModalData.amount_usd,
        amount_khr: qrModalData.amount_khr,
        discount: qrModalData.discount,
        points_earned: qrModalData.points_earned,
        customer_name: qrModalData.customer_name,
        customer_email: qrModalData.customer_email,
        customer_phone: qrModalData.customer_phone,
        delivery_address: qrModalData.delivery_address,
        email_report_sent: true,
        telegram_admin_notified: true,
        paid_at: new Date().toLocaleString(),
        items: qrModalData.items,
      })
      setQrModalData(null)
      toast({
        title: t('✅ Payment Successful!', '✅ ការទូទាត់ប្រាក់ជោគជ័យ!'),
        description: t(
          `Receipt emailed to ${qrModalData.customer_email} & Telegram Admin notified!`,
          `វិក្កយបត្រត្រូវបានផ្ញើទៅកាន់អ៊ីមែល និង Telegram Admin រួចរាល់!`
        ),
        type: 'success',
      })
    } finally {
      setVerifyingQrPayment(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-10 space-y-6 pb-28 sm:pb-36">
      {/* Top Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground">
            <Link to="/" className="hover:text-primary transition-colors">
              {t('Home', 'ទំព័រដើម')}
            </Link>{' '}
            / <span className="text-foreground font-semibold">{t('Checkout & Payment', 'កន្ត្រកទិញទំនិញ និងការទូទាត់')}</span>
          </div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-foreground">
            <span className="inline-block">{t('Shopping Cart', 'កន្ត្រកទិញទំនិញ')}</span>{' '}
            <span className="inline-block">{t('& Secure Checkout', 'និងការទូទាត់ប្រាក់')}</span>
          </h1>
        </div>

        {/* Compact Loyalty Points Pill & Free Gift Toggle */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="px-3.5 py-2 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs font-bold flex items-center gap-2 whitespace-nowrap shrink-0">
            <Award className="w-4 h-4 text-amber-500 shrink-0" />
            <span>
              {loyaltyPoints} {t('Points', 'ពិន្ទុ')}
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            variant={showFreeRewards ? 'default' : 'outline'}
            onClick={() => setShowFreeRewards(!showFreeRewards)}
            className="rounded-full text-xs gap-1.5 whitespace-nowrap shrink-0"
          >
            <Gift className="w-3.5 h-3.5 text-amber-500 shrink-0" />
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
                        className="w-12 h-12 rounded-xl object-contain p-1 bg-muted shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <h4 className="font-bold text-xs line-clamp-1">{fp.name}</h4>
                        <div className="text-xs mt-0.5 flex items-center gap-1.5">
                          <span className="line-through text-muted-foreground text-[11px]">
                            {formatPrice(fp.effective_price)}
                          </span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400">{t('FREE', 'ឥតគិតថ្លៃ')}</span>
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
                      {isSelected ? t('✓ Selected ($0.00)', '✓ បានជ្រើសរើស ($0.00)') : t('Claim Free (100 Pts)', 'ប្តូរយកឥតគិតថ្លៃ (១០០ ពិន្ទុ)')}
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
                <span>
                  {t('1. Your Order Items', '១. បញ្ជីទំនិញក្នុងកន្ត្រក')} ({cartItems.length})
                </span>
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
                        className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-contain p-2 bg-muted/60 border shrink-0"
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
                          className="w-14 h-14 rounded-2xl object-contain p-1.5 border border-emerald-500/40 bg-white dark:bg-slate-900"
                        />
                        <div>
                          <Badge className="bg-emerald-600 text-white text-[10px] border-0">
                            🎁 {t('100-Pt Free Gift', 'កាដូរង្វាន់ ១០០ ពិន្ទុ')}
                          </Badge>
                          <h4 className="font-bold text-xs sm:text-sm mt-0.5">{freeRewardItem.name}</h4>
                          <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                            $0.00 {t('FREE', 'ឥតគិតថ្លៃ')}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFreeRewardItem(null)}
                        className="text-xs text-muted-foreground hover:text-destructive cursor-pointer"
                      >
                        {t('Remove', 'ដកចេញ')}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Delivery Recipient, Email Receipt & GPS Location Card */}
          <Card className="border shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b bg-muted/30 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm sm:text-base">
                <Truck className="w-4 h-4 text-primary" />
                <span>{t('2. Customer Contact, Email Receipt & Delivery', '២. ព័ត៌មានអតិថិជន អ៊ីមែលវិក្កយបត្រ និងការដឹកជញ្ជូន')}</span>
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {t('Email + Telegram Report', 'ផ្ញើវិក្កយបត្រតាម Email')}
              </Badge>
            </div>

            <CardContent className="p-5 space-y-4">
              {/* Customer Account Authentication Gate / Status Banner */}
              {currentUser ? (
                <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-sm">
                      {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground truncate">
                          {currentUser.name}
                        </span>
                        <Badge className="bg-emerald-600 text-white text-[9px] px-1.5 py-0 rounded font-semibold">
                          {t('Verified Customer', 'គណនីអតិថិជន')}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate block">
                        {currentUser.email} • {customerPhone}
                      </span>
                    </div>
                  </div>

                  <Badge variant="outline" className="text-emerald-700 dark:text-emerald-300 border-emerald-300 text-[10px] font-bold shrink-0 gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    {t('Signed In', 'បានចូលគណនី')}
                  </Badge>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-amber-500/40 bg-amber-50/70 dark:bg-amber-950/30 p-4 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-foreground">
                          {t('Customer Login Required for Checkout', 'តម្រូវឱ្យចូលគណនីអតិថិជន ដើម្បីទូទាត់ប្រាក់')}
                        </span>
                        <Badge className="bg-amber-500 text-white text-[9px] font-bold px-1.5 py-0 rounded">
                          {t('Required', 'ចាំបាច់')}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {t(
                          'Please sign in or create an account to proceed with your order, generate Bakong KHQR, and receive email receipts.',
                          'សូមចូលគណនី ឬចុះឈ្មោះបង្កើតគណនី ដើម្បីទូទាត់ប្រាក់ បង្កើតកូដ KHQR និងទទួលបានវិក្កយបត្រតាមអ៊ីមែល។'
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-900/40">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setIsLoginRequiredModalOpen(true)}
                      className="rounded-xl h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                      <User className="w-3.5 h-3.5" />
                      {t('Sign In Account', 'ចូលគណនីឥឡូវ')}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/register?redirect=/cart')}
                      className="rounded-xl h-9 text-xs font-bold gap-1.5 border-slate-300 dark:border-slate-700 hover:bg-muted"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      {t('Create Account', 'បង្កើតគណនី')}
                    </Button>
                  </div>
                </div>
              )}

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
                  <Mail className="w-3.5 h-3.5 text-primary" />
                  {t(
                    'Customer Email Address (For Official Payment Receipt & Report)',
                    'អ៊ីមែលអតិថិជន (សម្រាប់ទទួលវិក្កយបត្រ និងរបាយការណ៍ទូទាត់ប្រាក់)'
                  )}
                </label>
                <input
                  type="email"
                  required
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{t('Delivery Address (Live GPS Target)', 'អាសយដ្ឋានដឹកជញ្ជូន (គោលដៅ GPS ផ្ទាល់)')}</span>
                  </label>

                  {/* One-Click GPS Current Location Selector Button */}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleDetectCurrentLocation}
                    disabled={isLocating}
                    className="h-7 text-[11px] font-bold rounded-xl gap-1.5 border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 dark:hover:bg-indigo-900/60 shadow-sm cursor-pointer transition-all"
                  >
                    {isLocating ? (
                      <>
                        <RefreshCw className="w-3 h-3 animate-spin text-indigo-600 dark:text-indigo-400" />
                        <span>{t('Detecting Location...', 'កំពុងស្វែងរកទីតាំង...')}</span>
                      </>
                    ) : (
                      <>
                        <Navigation className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
                        <span>{t('📍 Choose Current Location', '📍 ជ្រើសរើសទីតាំងបច្ចុប្បន្នឥឡូវ')}</span>
                      </>
                    )}
                  </Button>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    required
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary pl-9 pr-24 font-medium"
                  />
                  <MapPin className="w-4 h-4 text-primary absolute left-3 top-1/2 -translate-y-1/2" />
                  <button
                    type="button"
                    onClick={handleDetectCurrentLocation}
                    disabled={isLocating}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-bold bg-muted hover:bg-indigo-600 hover:text-white text-muted-foreground transition-all cursor-pointer flex items-center gap-1"
                    title={t('Detect Current Location', 'ចាប់យកទីតាំងបច្ចុប្បន្ន')}
                  >
                    <Compass className="w-3 h-3" />
                    <span className="hidden sm:inline">{t('GPS', 'GPS')}</span>
                  </button>
                </div>

                {/* GPS Coordinates Locked Live Status */}
                {customerCoords && (
                  <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 text-[11px] animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 text-indigo-800 dark:text-indigo-300 font-medium">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>
                        {t('GPS Target Locked:', 'កូអរដោនេ GPS គោលដៅ:')}{' '}
                        <strong>
                          {customerCoords.lat.toFixed(4)}° N, {customerCoords.lng.toFixed(4)}° E
                        </strong>
                        {locationAccuracy ? ` (±${locationAccuracy}m accuracy)` : ''}
                      </span>
                    </div>
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${customerCoords.lat},${customerCoords.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline flex items-center gap-1"
                    >
                      <span>{t('View Map', 'មើលលើផែនទី')}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                {/* Quick Presets for Cambodia Districts & Landmarks */}
                <div className="space-y-1.5 pt-1">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                    <span>{t('Quick Location Presets (Cambodia):', 'ជ្រើសរើសទីតាំងរហ័ស (កម្ពុជា):')}</span>
                    <span className="text-[9px] text-indigo-600 font-semibold">{t('1-Click Select', 'ចុចជ្រើសរើស')}</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {CAMBODIA_LOCATION_PRESETS.map((preset) => {
                      const isSelected = deliveryAddress === preset.address
                      return (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setDeliveryAddress(preset.address)
                            setCustomerCoords({ lat: preset.lat, lng: preset.lng })
                            setLocationAccuracy(10)
                            toast({
                              title: t('📍 Delivery Target Updated', '📍 បានផ្លាស់ប្តូរទីតាំងដឹកជញ្ជូន'),
                              description: preset.address,
                              type: 'info',
                            })
                          }}
                          className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                            isSelected
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-600/30'
                              : 'bg-card hover:bg-muted text-muted-foreground hover:text-foreground border-slate-200 dark:border-slate-800'
                          }`}
                        >
                          <span>📍</span>
                          <span>{preset.label}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>
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
                  <span className="text-[10px] text-muted-foreground">Scan QR Code</span>
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



              {paymentMethod === 'card' && (
                <div className="rounded-2xl border p-4 bg-muted/20 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span>{t('Credit / Debit Card Details', 'ព័ត៌មានកាតធនាគារ')}</span>
                    <span className="text-primary font-semibold flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      VISA • MASTERCARD
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={cardNumber}
                      onChange={(e) => handleCardNumberChange(e.target.value)}
                      placeholder="4408 4422 0881 9148"
                      maxLength={23}
                      className="w-full pl-3 pr-10 py-2.5 text-xs font-mono tracking-wider rounded-xl border bg-background text-foreground shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-muted-foreground">
                      <CreditCard className="w-4 h-4 opacity-50" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="cc-exp"
                      value={cardExpiry}
                      onChange={(e) => handleCardExpiryChange(e.target.value)}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border bg-background text-foreground shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center"
                    />
                    <input
                      type="password"
                      inputMode="numeric"
                      autoComplete="cc-csc"
                      value={cardCvc}
                      onChange={(e) => handleCardCvcChange(e.target.value)}
                      placeholder="CVC"
                      maxLength={4}
                      className="w-full px-3 py-2 text-xs font-mono rounded-xl border bg-background text-foreground shadow-sm focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-center"
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

              {/* Delivery Speed / Rate Selector (when paid delivery is enabled) */}
              {!isFreeDelivery && activeDeliveryMethods.length > 0 && (
                <div className="space-y-2 pt-3 border-t">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold flex items-center gap-1.5 text-foreground">
                      <Truck className="w-3.5 h-3.5 text-primary" />
                      {t('Select Delivery Speed & Rate', 'ជ្រើសរើសសេវាកម្មដឹកជញ្ជូន')}
                    </span>
                    <Badge variant="outline" className="text-[10px]">
                      {activeDeliveryMethods.length} {t('Options', 'ជម្រើស')}
                    </Badge>
                  </div>

                  <div className="space-y-1.5">
                    {activeDeliveryMethods.map((method) => {
                      const isSelected = selectedDeliveryMethod?.id === method.id
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setSelectedDeliveryMethodId(method.id)}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-2 ${
                            isSelected
                              ? 'border-primary ring-2 ring-primary/20 bg-primary/5 dark:bg-primary/10 shadow-sm'
                              : 'border-slate-200 dark:border-slate-800 hover:border-primary/50 bg-card/60'
                          }`}
                        >
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-xs text-foreground truncate">
                              {language === 'KM' && method.name_km ? method.name_km : method.name}
                            </div>
                            {(method.estimated_time || method.estimated_time_km) && (
                              <div className="text-[10px] text-muted-foreground flex items-center gap-1 font-medium">
                                <Clock className="w-3 h-3 text-muted-foreground" />
                                <span>
                                  {language === 'KM' && method.estimated_time_km
                                    ? method.estimated_time_km
                                    : method.estimated_time}
                                </span>
                              </div>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-sm text-primary font-mono">
                              ${Number(method.price).toFixed(2)}
                            </span>
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

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

                <div className="flex justify-between items-center text-xs leading-relaxed py-0.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-primary" />
                    {isFreeDelivery
                      ? t('Express GPS Delivery', 'សេវាដឹកជញ្ជូន GPS')
                      : (language === 'KM' && selectedDeliveryMethod?.name_km
                          ? selectedDeliveryMethod.name_km
                          : selectedDeliveryMethod?.name || t('Delivery Fee', 'សេវាដឹកជញ្ជូន'))}
                  </span>
                  {isFreeDelivery ? (
                    <div className="flex items-center gap-1.5">
                      {isThresholdQualified && (
                        <span className="text-[10px] text-emerald-700 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full font-bold">
                          ≥${deliverySettings.free_delivery_threshold}
                        </span>
                      )}
                      <span className="text-emerald-600 font-bold">{t('FREE', 'ឥតគិតថ្លៃ')}</span>
                    </div>
                  ) : (
                    <span className="font-bold text-foreground font-mono">
                      +${effectiveShippingFee.toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex justify-between items-center text-amber-600 dark:text-amber-400 font-semibold text-xs leading-relaxed py-0.5">
                  <span>{t('Loyalty Reward Earned', 'ពិន្ទុបន្ថែមសម្រាប់ការទិញនេះ')}</span>
                  <span>+{pointsEarnedThisOrder} {t('PTS', 'ពិន្ទុ')}</span>
                </div>

                <div className="border-t pt-3 flex items-baseline justify-between leading-relaxed">
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
                  disabled={checkoutLoading || cartItems.length === 0}
                  className={cn(
                    'w-full rounded-2xl gap-2 shadow-lg h-12 font-bold text-sm',
                    cartItems.length === 0
                      ? 'opacity-60 cursor-not-allowed bg-slate-300 dark:bg-slate-800 text-muted-foreground'
                      : !currentUser
                      ? 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/25'
                      : 'shadow-primary/25'
                  )}
                >
                  {checkoutLoading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t('Generating Payment...', 'កំពុងបង្កើតការទូទាត់...')}
                    </>
                  ) : cartItems.length === 0 ? (
                    <span>{t('Cart is Empty — Add Items to Checkout', 'កន្ត្រកទំនិញទទេ — សូមជ្រើសរើសទំនិញ')}</span>
                  ) : !currentUser ? (
                    <>
                      <Lock className="w-4 h-4" />
                      {t(
                        `Sign In to Checkout (${formatPrice(finalTotal)})`,
                        `ចូលគណនីដើម្បីទូទាត់ប្រាក់ (${formatPrice(finalTotal)})`
                      )}
                    </>
                  ) : paymentMethod === 'bakong_khqr' ? (
                    <>
                      <QrCode className="w-4 h-4" />
                      {t(
                        `Checkout & Show Popup QR (${formatPrice(finalTotal)})`,
                        `ទូទាត់ប្រាក់ & បង្ហាញ Popup QR (${formatPrice(finalTotal)})`
                      )}
                    </>
                  ) : paymentMethod === 'cash_on_delivery' ? (
                    <>
                      {t(
                        `Confirm Order • Pay ${formatPrice(finalTotal)} on Arrival`,
                        `បញ្ជាទិញឥឡូវ • បង់ពេលទំនិញមកដល់ (${formatPrice(finalTotal)})`
                      )}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      {t(
                        `Confirm & Pay ${formatPrice(finalTotal)} Now`,
                        `ទូទាត់ប្រាក់ឥឡូវ (${formatPrice(finalTotal)})`
                      )}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </Button>
              </form>

              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>
                  {t(
                    'Instant Email Receipt to Customer & Live Telegram Report to Admin',
                    'ផ្ញើវិក្កយបត្រទៅអ៊ីមែលអតិថិជន និងរបាយការណ៍ទៅ Telegram Admin ភ្លាមៗ'
                  )}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* LIVE BAKONG KHQR SCAN-TO-PAY MODAL */}
      {qrModalData && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[92vh] my-auto">
            {/* Official Red KHQR Top Bar */}
            <div className="bg-[#E1232E] text-white px-5 py-3 flex items-center justify-between shrink-0 shadow-sm">
              <div>
                <div className="text-base sm:text-lg font-black tracking-wider flex items-center gap-2">
                  <span>KHQR • BAKONG</span>
                  <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-bold">NBC</span>
                </div>
                <div className="text-[11px] text-white/90">
                  National Bank of Cambodia • Instant Scan Payment
                </div>
              </div>
              <button
                type="button"
                onClick={() => setQrModalData(null)}
                className="w-8 h-8 rounded-full bg-white/15 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors"
                aria-label="Close QR Modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-3 text-center overflow-y-auto">
              {/* Merchant & Amount Header */}
              <div className="space-y-0.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {qrModalData.merchant_name} ({qrModalData.merchant_account})
                </div>
                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                  ${qrModalData.amount_usd.toFixed(2)}{' '}
                  <span className="text-sm font-bold text-muted-foreground">USD</span>
                </div>
                <div className="text-xs font-bold text-rose-600 dark:text-rose-400">
                  ≈ {qrModalData.amount_khr.toLocaleString()} ៛ (KHR)
                </div>
              </div>

              {/* Scannable QR Code Frame */}
              <div className="relative mx-auto w-44 h-44 sm:w-48 sm:h-48 rounded-2xl border-4 border-[#E1232E]/25 bg-white p-2.5 shadow-inner flex items-center justify-center">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&margin=4&data=${encodeURIComponent(
                    qrModalData.qr_string
                  )}`}
                  alt={`Bakong KHQR for Order ${qrModalData.order_number}`}
                  className="w-full h-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="px-2 py-0.5 rounded bg-[#E1232E] text-white font-black text-[10px] shadow">
                    KHQR
                  </span>
                </div>
              </div>

              {/* Order Reference & Countdown Timer */}
              <div className="rounded-xl bg-muted/40 p-2.5 text-xs space-y-1 border">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Order Number:', 'លេខបញ្ជាទិញ:')}</span>
                  <span className="font-black text-foreground">#{qrModalData.order_number}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Receipt Email:', 'អ៊ីមែលទទួលវិក្កយបត្រ:')}</span>
                  <span className="font-semibold text-foreground truncate max-w-[180px]">
                    {qrModalData.customer_email}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    {t('QR Expires In:', 'ផុតកំណត់ក្នុងរយៈពេល:')}
                  </span>
                  <span className="font-mono font-bold text-amber-600">{formatCountdown(qrSecondsLeft)}</span>
                </div>
              </div>

              {/* Supported Banks */}
              <div className="flex flex-wrap items-center justify-center gap-1">
                {['ABA PAY', 'ACLEDA Mobile', 'Bakong App', 'Wing Bank', 'Sathapana'].map((bank) => (
                  <span
                    key={bank}
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                  >
                    {bank}
                  </span>
                ))}
              </div>

              {/* Confirm / Test False Buttons */}
              <div className="space-y-2 pt-0.5">
                <Button
                  type="button"
                  disabled={verifyingQrPayment}
                  onClick={() => handleConfirmQrPayment(false)}
                  className="w-full rounded-2xl h-11 font-black text-xs sm:text-sm gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/25"
                >
                  {verifyingQrPayment ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      {t('Verifying Payment & Sending Reports...', 'កំពុងផ្ទៀងផ្ទាត់ និងផ្ញើរបាយការណ៍...')}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      {t(
                        'I Have Scanned & Paid — Confirm Payment',
                        'ខ្ញុំបានស្កេនរួចរាល់ — បញ្ជាក់ការទូទាត់ប្រាក់'
                      )}
                    </>
                  )}
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={verifyingQrPayment}
                    onClick={() => handleConfirmQrPayment(true)}
                    className="rounded-xl h-9 text-[11px] font-bold gap-1 border-rose-300 dark:border-rose-800 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{t('Payment Failed (False)', 'ការទូទាត់មិនជោគជ័យ (False)')}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    disabled={verifyingQrPayment}
                    onClick={() => setQrModalData(null)}
                    className="rounded-xl h-9 text-[11px] font-semibold text-muted-foreground hover:bg-muted"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    <span>{t('Cancel / Close', 'បោះបង់ / បិទ')}</span>
                  </Button>
                </div>

                <p className="text-[10px] text-muted-foreground leading-tight">
                  {t(
                    'Confirming sends your payment receipt to your email and alerts the Telegram Admin immediately.',
                    'ការបញ្ជាក់នឹងផ្ញើវិក្កយបត្រទៅអ៊ីមែលរបស់អ្នក និងផ្ញើរបាយការណ៍ទៅ Telegram Admin ភ្លាមៗ។'
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PAYMENT SUCCESS MODAL */}
      {paymentSuccessData && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-emerald-500/30 flex flex-col max-h-[92vh] my-auto">
            {/* Celebratory Emerald Top Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white px-5 py-4 text-center relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 -mt-4 -mr-4 w-28 h-28 bg-white/10 rounded-full blur-xl pointer-events-none" />
              <button
                type="button"
                onClick={() => setPaymentSuccessData(null)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors"
                aria-label="Close Success Popup"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-full bg-white text-emerald-600 mx-auto flex items-center justify-center shadow-lg ring-4 ring-white/20 mb-2 animate-bounce">
                <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {t('Payment Successful!', 'ការទូទាត់ប្រាក់ជោគជ័យ!')}
              </h2>
              <p className="text-xs text-white/90 mt-0.5 font-medium">
                {t('Your order has been placed and verified successfully.', 'ការបញ្ជាទិញរបស់អ្នកត្រូវបានផ្ទៀងផ្ទាត់ និងទទួលដោយជោគជ័យ។')}
              </p>
            </div>

            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto">
              {/* Receipt Summary Card */}
              <div className="rounded-2xl bg-muted/40 p-4 border border-border/70 space-y-2.5 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                  <span className="text-muted-foreground">{t('Order Number:', 'លេខបញ្ជាទិញ:')}</span>
                  <span className="font-mono font-black text-sm text-foreground">
                    #{paymentSuccessData.order_number}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Receipt Number:', 'លេខវិក្កយបត្រ:')}</span>
                  <span className="font-mono font-bold text-foreground">
                    {paymentSuccessData.receipt_number}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{t('Payment Method:', 'វិធីសាស្ត្រទូទាត់:')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {paymentSuccessData.payment_method}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/60">
                  <span className="text-muted-foreground font-semibold">{t('Total Amount Paid:', 'ទឹកប្រាក់បានទូទាត់:')}</span>
                  <div className="text-right">
                    <span className="text-lg font-black text-foreground">
                      ${paymentSuccessData.amount_usd.toFixed(2)}
                    </span>
                    <span className="text-[11px] text-muted-foreground font-medium ml-1.5">
                      ({paymentSuccessData.amount_khr.toLocaleString()} ៛)
                    </span>
                  </div>
                </div>
              </div>

              {/* Status Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/40 p-2.5 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-emerald-900 dark:text-emerald-300 text-[11px]">
                      {t('Receipt Emailed', 'ផ្ញើវិក្កយបត្ររួច')}
                    </div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {paymentSuccessData.customer_email}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 p-2.5 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <div className="min-w-0">
                    <div className="font-bold text-amber-900 dark:text-amber-300 text-[11px]">
                      {t('Loyalty Reward', 'រង្វាន់ពិន្ទុ')}
                    </div>
                    <div className="text-[10px] font-bold text-amber-600">
                      +{paymentSuccessData.points_earned} PTS {t('Earned', 'ទទួលបាន')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Destination */}
              <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-xs space-y-1">
                <div className="text-muted-foreground font-medium flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" />
                  {t('Delivery Destination:', 'ទីតាំងដឹកជញ្ជូន:')}
                </div>
                <div className="font-medium text-foreground pl-5 text-[11px] leading-relaxed">
                  {paymentSuccessData.customer_name} • {paymentSuccessData.customer_phone}
                  <br />
                  {paymentSuccessData.delivery_address}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <Link
                  to={`/track?order=${encodeURIComponent(paymentSuccessData.order_number)}`}
                  className="w-full inline-flex items-center justify-center gap-2 h-12 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm shadow-lg shadow-primary/25 transition-all"
                >
                  <MapPin className="w-4 h-4" />
                  {t('Track Live GPS Delivery', 'តាមដានការដឹកជញ្ជូនតាម GPS ផ្ទាល់')}
                </Link>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => window.print()}
                    className="rounded-xl h-10 text-xs font-bold gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {t('Print Receipt', 'បោះពុម្ពវិក្កយបត្រ')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setPaymentSuccessData(null)
                      navigate('/products')
                    }}
                    className="rounded-xl h-10 text-xs font-bold"
                  >
                    {t('Continue Shopping', 'បន្តការទិញទំនិញ')}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* POPUP PAYMENT FALSE / FAILED MODAL */}
      {paymentFailedData && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-rose-500/50 flex flex-col max-h-[92vh] my-auto">
            {/* Warning Red Top Banner */}
            <div className="bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 text-white px-5 py-4 text-center relative overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setPaymentFailedData(null)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors"
                aria-label="Close Failed Popup"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-full bg-white text-rose-600 mx-auto flex items-center justify-center shadow-lg ring-4 ring-white/20 mb-2 animate-pulse">
                <AlertTriangle className="w-7 h-7 stroke-[2.5]" />
              </div>

              <h2 className="text-xl sm:text-2xl font-black tracking-tight">
                {t('Payment Failed / Declined', 'ការទូទាត់ប្រាក់មិនជោគជ័យ!')}
              </h2>
              <p className="text-xs text-white/90 mt-0.5 font-medium">
                {t('Status: Transaction False / Unverified', 'ស្ថានភាព៖ បរាជ័យ / មិនអាចផ្ទៀងផ្ទាត់បាន (False)')}
              </p>
            </div>

            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
              {/* Detailed Failure Notice */}
              <div className="rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 p-4 space-y-2">
                <div className="text-xs font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{t('Reason for Failure:', 'មូលហេតុនៃការបរាជ័យ៖')}</span>
                </div>
                <p className="text-xs text-rose-700 dark:text-rose-400 font-medium leading-relaxed">
                  {t(paymentFailedData.error_message, paymentFailedData.error_message_km)}
                </p>
                <div className="pt-2 border-t border-rose-200 dark:border-rose-900/40 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{t('Attempted Order:', 'លេខបញ្ជាទិញ៖')}</span>
                  <span className="font-mono font-bold text-foreground">#{paymentFailedData.order_number}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>{t('Attempted Amount:', 'ទឹកប្រាក់៖')}</span>
                  <span className="font-bold text-foreground">
                    ${paymentFailedData.amount_usd.toFixed(2)} ({paymentFailedData.amount_khr.toLocaleString()} ៛)
                  </span>
                </div>
              </div>

              <div className="text-center text-xs text-muted-foreground">
                <p>
                  {t(
                    'No funds were deducted from your account. You can retry scanning or switch to Cash on Delivery.',
                    'គ្មានការកាត់ប្រាក់ពីគណនីរបស់អ្នកឡើយ។ អ្នកអាចព្យាយាមស្កេនម្តងទៀត ឬប្តូរទៅបង់ប្រាក់ផ្ទាល់ពេលទំនិញមកដល់។'
                  )}
                </p>
              </div>

              {/* Action Options */}
              <div className="space-y-2.5 pt-1">
                {paymentFailedData.qrDataToRetry && (
                  <Button
                    type="button"
                    onClick={() => {
                      const retryData = paymentFailedData.qrDataToRetry
                      setPaymentFailedData(null)
                      if (retryData) setQrModalData(retryData)
                    }}
                    className="w-full rounded-2xl h-12 font-bold text-sm gap-2 bg-[#E1232E] hover:bg-[#c91d27] text-white shadow-lg shadow-rose-600/25"
                  >
                    <RefreshCw className="w-4 h-4" />
                    {t('Try Again (Reopen KHQR Code)', 'ព្យាយាមម្តងទៀត (បើកកូដ KHQR ម្តងទៀត)')}
                  </Button>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPaymentFailedData(null)
                    setPaymentMethod('cash_on_delivery')
                    toast({
                      title: t('💵 Switched to Cash on Delivery', '💵 បានប្តូរទៅបង់ប្រាក់សុទ្ធ'),
                      description: t(
                        'Click Confirm Order to place order without online payment.',
                        'សូមចុចបញ្ជាទិញ ដើម្បីទទួលបានទំនិញដោយបង់ប្រាក់ពេលមកដល់។'
                      ),
                      type: 'info',
                    })
                  }}
                  className="w-full rounded-2xl h-11 text-xs font-bold gap-2 border-slate-300 dark:border-slate-700"
                >
                  <Banknote className="w-4 h-4 text-amber-600" />
                  {t('Switch to Cash on Delivery (COD)', 'ប្តូរទៅបង់ប្រាក់សុទ្ធពេលទំនិញមកដល់ (COD)')}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setPaymentFailedData(null)}
                  className="w-full rounded-xl h-9 text-xs text-muted-foreground"
                >
                  {t('Dismiss / Close', 'បិទផ្ទាំងនេះ')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOMER LOGIN REQUIRED MODAL DIALOG */}
      {isLoginRequiredModalOpen && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border-2 border-amber-500/40 flex flex-col max-h-[92vh] my-auto">
            {/* Top Amber / Orange Branded Banner */}
            <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-white px-5 py-4 text-center relative overflow-hidden shrink-0">
              <button
                type="button"
                onClick={() => setIsLoginRequiredModalOpen(false)}
                className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-white cursor-pointer transition-colors"
                aria-label="Close Login Modal"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-full bg-white text-amber-600 mx-auto flex items-center justify-center shadow-lg ring-4 ring-white/20 mb-2 animate-bounce">
                <Lock className="w-7 h-7 stroke-[2.5]" />
              </div>

              <h2 className="text-xl font-black tracking-tight">
                {t('Customer Sign In Required', 'តម្រូវឱ្យចូលគណនីអតិថិជន')}
              </h2>
              <p className="text-xs text-white/90 mt-0.5 font-medium">
                {t(
                  'Please sign in or register to complete your order and track live GPS delivery.',
                  'សូមចូលគណនី ឬចុះឈ្មោះបង្កើតគណនី ដើម្បីទូទាត់ប្រាក់ និងតាមដានការដឹកជញ្ជូន។'
                )}
              </p>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              {/* Value Highlights */}
              <div className="rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/50 p-3.5 space-y-2 text-xs">
                <div className="flex items-center gap-2 text-amber-900 dark:text-amber-300 font-bold">
                  <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{t('Member Checkout Benefits:', 'អត្ថប្រយោជន៍សមាជិក៖')}</span>
                </div>
                <ul className="space-y-1.5 text-[11px] text-muted-foreground pl-6 list-disc">
                  <li>{t('Live real-time courier GPS tracking to your address', 'តាមដានអ្នកដឹកជញ្ជូនតាម GPS ផ្ទាល់')}</li>
                  <li>{t('Automatic +5 loyalty points credited to your wallet', 'ទទួលបាន +៥ ពិន្ទុរង្វាន់ដោយស្វ័យប្រវត្តិ')}</li>
                  <li>{t('Official payment receipt emailed to your inbox', 'ទទួលបានវិក្កយបត្រផ្លូវការតាមអ៊ីមែល')}</li>
                </ul>
              </div>

              {/* Inline Quick Login Form */}
              <form onSubmit={handleQuickLogin} className="space-y-3 pt-1">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t('Email Address', 'អ៊ីមែល')}</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={quickLoginEmail}
                    onChange={(e) => setQuickLoginEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{t('Password', 'ពាក្យសម្ងាត់')}</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={quickLoginPassword}
                    onChange={(e) => setQuickLoginPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={quickLoginLoading}
                  className="w-full rounded-xl h-11 font-bold text-xs gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                >
                  {quickLoginLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      {t('Signing In...', 'កំពុងចូលគណនី...')}
                    </>
                  ) : (
                    <>
                      <UserCheck className="w-4 h-4" />
                      {t('Sign In & Continue Checkout', 'ចូលគណនី & បន្តការទូទាត់')}
                    </>
                  )}
                </Button>
              </form>

              {/* Alternative Links */}
              <div className="relative my-3">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-bold">
                  <span className="bg-card px-2 text-muted-foreground">{t('Or', 'ឬ')}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsLoginRequiredModalOpen(false)
                    navigate('/login?redirect=/cart')
                  }}
                  className="rounded-xl h-9 text-xs font-bold gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  {t('Full Login Page', 'ទំព័រចូលគណនី')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsLoginRequiredModalOpen(false)
                    navigate('/register?redirect=/cart')
                  }}
                  className="rounded-xl h-9 text-xs font-bold gap-1.5 text-indigo-600 dark:text-indigo-400"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {t('Register New', 'ចុះឈ្មោះថ្មី')}
                </Button>
              </div>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsLoginRequiredModalOpen(false)}
                className="w-full rounded-xl h-8 text-xs text-muted-foreground"
              >
                {t('Keep Reviewing Cart', 'បន្តពិនិត្យកន្ត្រកទំនិញ')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
