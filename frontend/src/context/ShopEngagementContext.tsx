import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '@/lib/api'

export interface CartItem {
  id: number
  slug: string
  name: string
  price: number
  originalPrice?: number
  quantity: number
  image: string
  vendor?: string
}

export interface FavoriteItem {
  id: number
  slug: string
  name: string
  price: number
  originalPrice?: number
  image: string
  vendor?: string
  category?: string
}

export interface FreeRewardProduct {
  id: number
  name: string
  slug: string
  sku: string
  price: number
  discount_price: number | null
  effective_price: number
  image_url: string
  points_cost: number
}

export interface AppliedCoupon {
  code: string
  description: string
  discount_type: 'percentage' | 'fixed'
  discount_value: number
  discount_amount: number
}

interface ShopEngagementContextType {
  // Cart
  cartItems: CartItem[]
  cartCount: number
  subtotal: number
  addToCart: (item: Omit<CartItem, 'quantity'>, qty?: number) => void
  removeFromCart: (id: number) => void
  updateCartQty: (id: number, qty: number) => void
  clearCart: () => void

  // Favorites / Customer Likes
  favorites: FavoriteItem[]
  favoritesCount: number
  toggleFavorite: (item: FavoriteItem) => boolean
  isFavorite: (id: number) => boolean

  // Loyalty Points (Earn +5 pts/buy, 100 pts = Free Item <= $30)
  loyaltyPoints: number
  setLoyaltyPoints: React.Dispatch<React.SetStateAction<number>>
  addLoyaltyPoints: (pts: number) => void
  claimDemo100Points: () => void
  freeRewardItem: FreeRewardProduct | null
  setFreeRewardItem: (item: FreeRewardProduct | null) => void
  eligibleFreeProducts: FreeRewardProduct[]

  // Discount Coupons
  appliedCoupon: AppliedCoupon | null
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void

  // Recent Tracked Orders
  recentOrders: string[]
  addRecentOrder: (orderNum: string) => void

  // Language (EN / KM) & Currency (USD / KHR)
  language: 'EN' | 'KM'
  setLanguage: (lang: 'EN' | 'KM') => void
  t: (en: string, km: string) => string
  currency: 'USD' | 'KHR'
  setCurrency: (curr: 'USD' | 'KHR') => void
  formatPrice: (usdAmount: number) => string
}

const DEFAULT_CART: CartItem[] = [
  {
    id: 2,
    slug: 'sony-wh-1000xm5-wireless-headphones',
    name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    price: 349.0,
    originalPrice: 398.0,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    vendor: 'Sony Sound Hub',
  },
  {
    id: 8,
    slug: 'jbl-go-3-portable-bluetooth-speaker',
    name: 'JBL GO 3 Portable Waterproof Bluetooth Speaker',
    price: 24.99,
    originalPrice: 29.0,
    quantity: 1,
    image: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=400&q=80',
    vendor: 'JBL Official Store',
  },
]

const DEFAULT_FAVORITES: FavoriteItem[] = [
  {
    id: 2,
    slug: 'sony-wh-1000xm5-wireless-headphones',
    name: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    price: 349.0,
    originalPrice: 398.0,
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=400&q=80',
    vendor: 'Sony Sound Hub',
    category: 'Audio & Headphones',
  },
  {
    id: 4,
    slug: 'apple-watch-ultra-2-titanium',
    name: 'Apple Watch Ultra 2 GPS + Cellular Titanium Case',
    price: 799.0,
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=400&q=80',
    vendor: 'Official Apple Store',
    category: 'Wearables',
  },
  {
    id: 7,
    slug: 'anker-powerline-iii-usbc-cable',
    name: 'Anker PowerLine III USB-C Fast Charging Cable (100W)',
    price: 14.5,
    originalPrice: 18.0,
    image: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80',
    vendor: 'Anker Official',
    category: 'Accessories (100-Pt Free Eligible)',
  },
]

const FALLBACK_FREE_PRODUCTS: FreeRewardProduct[] = [
  {
    id: 7,
    name: 'Anker PowerLine III USB-C Fast Charging Cable (100W)',
    slug: 'anker-powerline-iii-usbc-cable',
    sku: 'RWD-ANK-015',
    price: 18.0,
    discount_price: 14.5,
    effective_price: 14.5,
    image_url: 'https://images.unsplash.com/photo-1583863788434-e58a36330cf0?auto=format&fit=crop&w=400&q=80',
    points_cost: 100,
  },
  {
    id: 9,
    name: 'Xiaomi Mi Dual-Mode Silent Wireless Mouse',
    slug: 'xiaomi-mi-wireless-silent-mouse',
    sku: 'RWD-XIA-022',
    price: 22.0,
    discount_price: 19.0,
    effective_price: 19.0,
    image_url: 'https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?auto=format&fit=crop&w=400&q=80',
    points_cost: 100,
  },
  {
    id: 8,
    name: 'JBL GO 3 Portable Waterproof Bluetooth Speaker',
    slug: 'jbl-go-3-portable-bluetooth-speaker',
    sku: 'RWD-JBL-029',
    price: 29.0,
    discount_price: 24.99,
    effective_price: 24.99,
    image_url: 'https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=400&q=80',
    points_cost: 100,
  },
  {
    id: 10,
    name: 'MegaBasics Insulated Stainless Steel Travel Tumbler (750ml)',
    slug: 'megabasics-stainless-travel-tumbler',
    sku: 'RWD-MGB-019',
    price: 19.5,
    discount_price: 16.0,
    effective_price: 16.0,
    image_url: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=400&q=80',
    points_cost: 100,
  },
]

const ShopEngagementContext = createContext<ShopEngagementContextType | undefined>(undefined)

export function ShopEngagementProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('megacommerce_cart')
      return saved ? JSON.parse(saved) : DEFAULT_CART
    } catch {
      return DEFAULT_CART
    }
  })

  const [favorites, setFavorites] = useState<FavoriteItem[]>(() => {
    try {
      const saved = localStorage.getItem('megacommerce_favorites')
      return saved ? JSON.parse(saved) : DEFAULT_FAVORITES
    } catch {
      return DEFAULT_FAVORITES
    }
  })

  const [loyaltyPoints, setLoyaltyPoints] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('megacommerce_loyalty_points')
      return saved !== null ? Number(saved) : 95 // Start at 95 pts so 1 order (+5 pts) hits 100 pts!
    } catch {
      return 95
    }
  })

  const [freeRewardItem, setFreeRewardItem] = useState<FreeRewardProduct | null>(null)
  const [eligibleFreeProducts, setEligibleFreeProducts] = useState<FreeRewardProduct[]>(FALLBACK_FREE_PRODUCTS)
  const [appliedCoupon, setAppliedCoupon] = useState<AppliedCoupon | null>(null)
  const [recentOrders, setRecentOrders] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('megacommerce_recent_orders')
      return saved ? JSON.parse(saved) : ['ORD-20261108-KHQR1']
    } catch {
      return ['ORD-20261108-KHQR1']
    }
  })

  const [language, setLanguageState] = useState<'EN' | 'KM'>(() => {
    try {
      const saved = localStorage.getItem('megacommerce_language')
      return saved === 'KM' ? 'KM' : 'EN'
    } catch {
      return 'EN'
    }
  })

  const [currency, setCurrencyState] = useState<'USD' | 'KHR'>(() => {
    try {
      const saved = localStorage.getItem('megacommerce_currency')
      return saved === 'KHR' ? 'KHR' : 'USD'
    } catch {
      return 'USD'
    }
  })

  const setLanguage = (lang: 'EN' | 'KM') => {
    setLanguageState(lang)
    try {
      localStorage.setItem('megacommerce_language', lang)
      document.documentElement.lang = lang === 'KM' ? 'km' : 'en'
    } catch {
      // ignore storage errors
    }
  }

  const setCurrency = (curr: 'USD' | 'KHR') => {
    setCurrencyState(curr)
    try {
      localStorage.setItem('megacommerce_currency', curr)
    } catch {
      // ignore storage errors
    }
  }

  useEffect(() => {
    document.documentElement.lang = language === 'KM' ? 'km' : 'en'
  }, [language])

  const t = (en: string, km: string): string => (language === 'KM' ? km : en)

  const formatPrice = (usdAmount: number): string => {
    const safeUsd = Number(usdAmount || 0)
    if (currency === 'KHR') {
      const khrAmount = Math.round((safeUsd * 4100) / 100) * 100
      return `${khrAmount.toLocaleString()} ៛`
    }
    return `$${safeUsd.toFixed(2)}`
  }

  useEffect(() => {
    localStorage.setItem('megacommerce_cart', JSON.stringify(cartItems))
  }, [cartItems])

  useEffect(() => {
    localStorage.setItem('megacommerce_favorites', JSON.stringify(favorites))
  }, [favorites])

  useEffect(() => {
    localStorage.setItem('megacommerce_loyalty_points', String(loyaltyPoints))
  }, [loyaltyPoints])

  useEffect(() => {
    localStorage.setItem('megacommerce_recent_orders', JSON.stringify(recentOrders))
  }, [recentOrders])

  // Fetch live eligible free reward products (<= $30) from backend
  useEffect(() => {
    api
      .get<any>(`/loyalty/summary?guest_points=${loyaltyPoints}`)
      .then((res) => {
        if (res?.data?.eligible_free_products?.length > 0) {
          setEligibleFreeProducts(res.data.eligible_free_products)
        }
      })
      .catch(() => {
        // Keep fallback eligible products
      })
  }, [])

  const addToCart = (item: Omit<CartItem, 'quantity'>, qty = 1) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => i.id === item.id || i.slug === item.slug)
      if (existing) {
        return prev.map((i) =>
          i.id === item.id || i.slug === item.slug ? { ...i, quantity: i.quantity + qty } : i
        )
      }
      return [...prev, { ...item, quantity: qty }]
    })
  }

  const removeFromCart = (id: number) => {
    setCartItems((prev) => prev.filter((i) => i.id !== id))
  }

  const updateCartQty = (id: number, qty: number) => {
    if (qty <= 0) {
      removeFromCart(id)
      return
    }
    setCartItems((prev) => prev.map((i) => (i.id === id ? { ...i, quantity: qty } : i)))
  }

  const clearCart = () => {
    setCartItems([])
    setAppliedCoupon(null)
    setFreeRewardItem(null)
  }

  const toggleFavorite = (item: FavoriteItem): boolean => {
    const exists = favorites.some((f) => f.id === item.id || f.slug === item.slug)
    if (exists) {
      setFavorites((prev) => prev.filter((f) => f.id !== item.id && f.slug !== item.slug))
    } else {
      setFavorites((prev) => [item, ...prev])
    }
    api.post('/wishlist/toggle', { product_id: item.id }).catch(() => {})
    return !exists
  }

  const isFavorite = (id: number) => favorites.some((f) => f.id === id)

  const addLoyaltyPoints = (pts: number) => {
    setLoyaltyPoints((prev) => Math.max(0, prev + pts))
  }

  const claimDemo100Points = () => {
    setLoyaltyPoints((prev) => (prev < 100 ? 105 : prev + 25))
  }

  const addRecentOrder = (orderNum: string) => {
    setRecentOrders((prev) => [orderNum, ...prev.filter((o) => o !== orderNum)].slice(0, 8))
  }

  const cartCount = cartItems.reduce((sum, i) => sum + i.quantity, 0)
  const subtotal = cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <ShopEngagementContext.Provider
      value={{
        cartItems,
        cartCount,
        subtotal,
        addToCart,
        removeFromCart,
        updateCartQty,
        clearCart,
        favorites,
        favoritesCount: favorites.length,
        toggleFavorite,
        isFavorite,
        loyaltyPoints,
        setLoyaltyPoints,
        addLoyaltyPoints,
        claimDemo100Points,
        freeRewardItem,
        setFreeRewardItem,
        eligibleFreeProducts,
        appliedCoupon,
        setAppliedCoupon,
        recentOrders,
        addRecentOrder,
        language,
        setLanguage,
        t,
        currency,
        setCurrency,
        formatPrice,
      }}
    >
      {children}
    </ShopEngagementContext.Provider>
  )
}

export function useShopEngagement() {
  const ctx = useContext(ShopEngagementContext)
  if (!ctx) {
    throw new Error('useShopEngagement must be used within a ShopEngagementProvider')
  }
  return ctx
}

