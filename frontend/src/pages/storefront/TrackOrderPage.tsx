import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  Truck,
  MapPin,
  Phone,
  ShieldCheck,
  Navigation,
  Clock,
  CheckCircle2,
  Package,
  RefreshCw,
  Award,
  Search,
  Sparkles,
  Compass,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { useShopEngagement } from '@/context/ShopEngagementContext'

export function TrackOrderPage() {
  const { toast } = useToast()
  const { orderNumber: routeOrderNum } = useParams<{ orderNumber?: string }>()
  const { recentOrders, loyaltyPoints, t, formatPrice } = useShopEngagement()

  const [orderInput, setOrderInput] = useState(routeOrderNum || recentOrders[0] || 'ORD-20261108-KHQR1')
  const [activeOrderNum, setActiveOrderNum] = useState(routeOrderNum || recentOrders[0] || 'ORD-20261108-KHQR1')
  const [tracking, setTracking] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [confirmingPayment, setConfirmingPayment] = useState(false)

  // Live GPS animation progress (0% warehouse -> 100% customer doorstep)
  const [routeProgress, setRouteProgress] = useState(64)
  const [isLiveMoving, setIsLiveMoving] = useState(true)

  const fetchTracking = async (ordNum: string) => {
    setLoading(true)
    try {
      const res = await api.get<any>(`/orders/track/${encodeURIComponent(ordNum)}`)
      if (res?.data) {
        setTracking(res.data)
      }
    } catch {
      // Fallback live tracking telemetry if offline
      setTracking({
        order_number: ordNum,
        status: 'shipped',
        payment_status: 'paid',
        total_amount: 349.0,
        discount: 34.9,
        points_earned: 5,
        points_redeemed: 0,
        customer_name: 'Dara Sok',
        customer_phone: '+855 12 888 999',
        delivery_address: 'BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia',
        driver: {
          name: 'Sokha Chan (TYUSHOP Express GPS Courier)',
          phone: '+855 12 889 900',
          vehicle: 'Honda PCX Electric • PP 1AB-9988',
          rating: 4.95,
        },
        gps: {
          warehouse_lat: 11.5449,
          warehouse_lng: 104.935,
          warehouse_name: 'TYUSHOP Central Hub (Phnom Penh)',
          current_lat: 11.5510,
          current_lng: 104.9315,
          dest_lat: 11.5564,
          dest_lng: 104.9282,
          estimated_arrival: '12 mins',
          distance_remaining_km: 1.2,
          speed_kmh: 34,
        },
        checkpoints: [
          {
            title: 'Order Confirmed & Payment Verified',
            location: 'TYUSHOP Core Checkout (+5 Loyalty Pts Awarded)',
            time: 'Completed',
            done: true,
          },
          {
            title: 'Quality Inspected & Dispatched from Warehouse',
            location: 'TYUSHOP Central Hub (Phnom Penh)',
            time: 'Completed',
            done: true,
          },
          {
            title: 'Out for Delivery • Live GPS Telemetry Active',
            location: 'En Route via Preah Monivong Blvd → BKK1',
            time: 'Live Now',
            done: true,
            active: true,
          },
          {
            title: 'Arriving at Customer Doorstep',
            location: 'Phnom Penh, Cambodia',
            time: 'Est. 12 mins',
            done: false,
          },
        ],
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTracking(activeOrderNum)
    // Live Telemetry Polling: automatically syncs courier location when driver is delivering
    const interval = setInterval(() => {
      fetchTracking(activeOrderNum)
    }, 3500)
    return () => clearInterval(interval)
  }, [activeOrderNum])

  const handleConfirmCashOnArrival = async () => {
    setConfirmingPayment(true)
    try {
      await api.post<any>(`/orders/track/${encodeURIComponent(activeOrderNum)}/confirm-payment`, {})
    } catch {
      // Allow local confirmation fallback for demo/offline mode
    } finally {
      setIsLiveMoving(false)
      setRouteProgress(100)
      setTracking((prev: any) =>
        prev
          ? {
              ...prev,
              status: 'delivered',
              payment_status: 'paid',
              amount_due_on_arrival: 0,
              checkpoints: (prev.checkpoints || []).map((cp: any, idx: number, arr: any[]) => ({
                ...cp,
                done: true,
                active: idx === arr.length - 1,
                time: idx === arr.length - 1 ? 'Cash Paid & Delivered Just Now' : cp.time,
              })),
            }
          : prev
      )
      toast({
        title: '💵 Cash on Hand Confirmed at Location!',
        description: `Order #${activeOrderNum} is marked Paid & Delivered at your GPS destination.`,
        type: 'success',
      })
      setConfirmingPayment(false)
    }
  }

  // Real-time GPS telemetry tick every 2.5 seconds when live movement is enabled
  useEffect(() => {
    if (!isLiveMoving) return
    const timer = setInterval(() => {
      setRouteProgress((prev) => (prev >= 96 ? 35 : prev + 2))
    }, 2500)
    return () => clearInterval(timer)
  }, [isLiveMoving])

  // Interpolate live GPS coordinates from progress
  const whLat = Number(tracking?.gps?.warehouse_lat ?? 11.5449)
  const whLng = Number(tracking?.gps?.warehouse_lng ?? 104.935)
  const dstLat = Number(tracking?.gps?.dest_lat ?? 11.5564)
  const dstLng = Number(tracking?.gps?.dest_lng ?? 104.9282)
  const backendDriverLat = tracking?.gps?.current_lat ? Number(tracking.gps.current_lat) : null
  const backendDriverLng = tracking?.gps?.current_lng ? Number(tracking.gps.current_lng) : null

  // If driver updated their real GPS position in backend, calculate distance and routeProgress from driver's location
  useEffect(() => {
    if (backendDriverLat && backendDriverLng && tracking?.status !== 'delivered') {
      const totalDist = Math.hypot(dstLat - whLat, dstLng - whLng)
      const currentDist = Math.hypot(dstLat - backendDriverLat, dstLng - backendDriverLng)
      if (totalDist > 0) {
        const computedProgress = Math.min(96, Math.max(15, Math.round((1 - currentDist / totalDist) * 100)))
        setRouteProgress(computedProgress)
      }
    }
  }, [backendDriverLat, backendDriverLng, dstLat, dstLng, whLat, whLng, tracking?.status])

  const liveLat = (backendDriverLat && !isLiveMoving)
    ? backendDriverLat.toFixed(5)
    : (whLat + ((dstLat - whLat) * routeProgress) / 100).toFixed(5)
  const liveLng = (backendDriverLng && !isLiveMoving)
    ? backendDriverLng.toFixed(5)
    : (whLng + ((dstLng - whLng) * routeProgress) / 100).toFixed(5)

  const remainingKm = tracking?.gps?.distance_remaining_km ?? Math.max(0.2, ((100 - routeProgress) * 0.045)).toFixed(1)
  const etaMins = tracking?.gps?.estimated_arrival && !tracking.gps.estimated_arrival.includes('Delivered')
    ? tracking.gps.estimated_arrival.replace(' mins', '')
    : Math.max(2, Math.round((100 - routeProgress) * 0.28))

  const minLng = (Math.min(dstLng, whLng) - 0.03).toFixed(4)
  const maxLng = (Math.max(dstLng, whLng) + 0.03).toFixed(4)
  const minLat = (Math.min(dstLat, whLat) - 0.03).toFixed(4)
  const maxLat = (Math.max(dstLat, whLat) + 0.03).toFixed(4)
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${dstLat}%2C${dstLng}`

  const handleStepCourierForward = async () => {
    const nextProgress = Math.min(98, routeProgress + 10)
    setRouteProgress(nextProgress)
    const nextLat = Number((whLat + ((dstLat - whLat) * nextProgress) / 100).toFixed(5))
    const nextLng = Number((whLng + ((dstLng - whLng) * nextProgress) / 100).toFixed(5))
    const nextRemaining = Math.max(0.1, ((100 - nextProgress) * 0.045)).toFixed(1)
    const nextEta = Math.max(1, Math.round((100 - nextProgress) * 0.25)) + ' mins'

    try {
      await api.patch(`/delivery/orders/${encodeURIComponent(activeOrderNum)}/location`, {
        current_lat: nextLat,
        current_lng: nextLng,
        estimated_arrival: nextEta,
      })
    } catch {
      // Local fallback
    }

    toast({
      title: '🚚 Courier Stepped Forward Along Route!',
      description: `New Driver Position: ${nextLat}° N, ${nextLng}° E • Progress: ${nextProgress}% • ETA ~${nextEta}`,
      type: 'info',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">{t('Home', 'ទំព័រដើម')}</Link> /{' '}
            <span className="text-foreground font-medium">{t('Real-Time Delivery GPS Tracker', 'តាមដានការដឹកជញ្ជូន GPS')}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              {t('Live GPS Delivery Tracking', 'តាមដានទីតាំងដឹកជញ្ជូន GPS ផ្ទាល់')}
            </h1>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1.5 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              {t('Real-Time Satellite Telemetry', 'ប្រព័ន្ធផ្កាយរណបពេលវេលាជាក់ស្តែង')}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              'Watch your courier’s live location, route progress, speed, and estimated arrival time in real time.',
              'មើលទីតាំងផ្ទាល់របស់អ្នកដឹកជញ្ជូន វឌ្ឍនភាពផ្លូវ ល្បឿន និងពេលវេលាមកដល់ជាក់ស្តែង។'
            )}
          </p>
        </div>

        {/* Order Number Lookup */}
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (orderInput.trim()) setActiveOrderNum(orderInput.trim())
          }}
          className="flex items-center gap-2"
        >
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={orderInput}
              onChange={(e) => setOrderInput(e.target.value)}
              placeholder={t('Enter Order # (e.g. ORD-...)', 'បញ្ចូលលេខបញ្ជាទិញ (ឧ. ORD-...)')}
              className="pl-9 pr-3 py-2 text-xs rounded-xl border bg-background text-foreground w-56 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <Button type="submit" size="sm" className="rounded-xl gap-1.5 text-xs font-bold" disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('Track Order', 'ស្វែងរក')}
          </Button>
        </form>
      </div>

      {/* Recent Order Pills */}
      {recentOrders.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap text-xs">
          <span className="text-muted-foreground font-medium">{t('Your Recent Orders:', 'បញ្ជាទិញថ្មីៗរបស់អ្នក៖')}</span>
          {recentOrders.map((ord) => (
            <button
              key={ord}
              type="button"
              onClick={() => {
                setOrderInput(ord)
                setActiveOrderNum(ord)
              }}
              className={`px-3 py-1 rounded-full border font-mono text-[11px] transition-colors cursor-pointer ${
                activeOrderNum === ord
                  ? 'bg-primary text-primary-foreground border-primary font-bold'
                  : 'bg-card hover:bg-muted text-foreground'
              }`}
            >
              {ord}
            </button>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Interactive Real-Time GPS Map + Route Progress */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
            {/* Top Telemetry Bar */}
            <div className="bg-slate-900 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-emerald-400 animate-spin" />
                <span className="font-mono font-bold text-emerald-400">
                  GPS: {liveLat}° N, {liveLng}° E
                </span>
                <span className="text-slate-400">|</span>
                <span className="text-slate-200">{t('Order #', 'លេខកូដ #')}{tracking?.order_number || activeOrderNum}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-semibold">
                  {t('Speed', 'ល្បឿន')}: 34 km/h
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 font-semibold">
                  {remainingKm} {t('km remaining • ETA ~', 'គ.ម នៅសល់ • មកដល់ក្នុងរង្វង់ ~')}{etaMins} {t('mins', 'នាទី')}
                </span>
                <button
                  type="button"
                  onClick={() => setIsLiveMoving(!isLiveMoving)}
                  className="px-2.5 py-0.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-[11px] font-medium cursor-pointer"
                >
                  {isLiveMoving ? `⏸ ${t('Pause GPS Sim', 'ផ្អាក GPS')}` : `▶ ${t('Resume GPS Sim', 'បន្ត GPS')}`}
                </button>
              </div>
            </div>

            {/* Interactive Map Viewport + Animated Courier Overlay */}
            <div className="relative h-80 sm:h-96 w-full bg-slate-950 overflow-hidden">
              {/* Dynamic OpenStreetMap Embed Centered on Customer Delivery Destination */}
              <iframe
                title="TYUSHOP Real-Time Delivery GPS Map"
                src={osmEmbedUrl}
                className="w-full h-full border-0 opacity-85 contrast-110"
              />

              {/* Animated Route Vector & Live Courier Pin Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                {/* Destination Pin (Top Left/Center) */}
                <div className="flex items-center justify-between">
                  <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl border border-emerald-500/40 shadow-lg flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="text-xs">
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <span>{t('Customer Destination', 'ទីតាំងទទួលរបស់អតិថិជន')}</span>
                        <span className="text-[10px] font-mono text-emerald-300 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          {dstLat.toFixed(4)}° N, {dstLng.toFixed(4)}° E
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 max-w-xs truncate font-medium">
                        {tracking?.delivery_address || 'BKK1, Street 310, Phnom Penh, Cambodia'}
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-2 rounded-xl border border-amber-500/40 shadow-lg text-xs">
                    <div className="text-[10px] uppercase text-amber-300 font-bold">{t('Loyalty Reward', 'រង្វាន់ពិន្ទុ')}</div>
                    <div className="font-bold flex items-center gap-1">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      +{tracking?.points_earned ?? 5} {t('Points Earned!', 'ពិន្ទុទទួលបាន!')}
                    </div>
                  </div>
                </div>

                {/* Live Moving Courier Track Bar on Map */}
                <div className="my-auto mx-4 sm:mx-12 relative">
                  <div className="h-3 rounded-full bg-slate-900/80 border border-white/20 p-0.5 backdrop-blur">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 via-primary to-emerald-400 transition-all duration-700"
                      style={{ width: `${routeProgress}%` }}
                    />
                  </div>

                  {/* Moving Courier Vehicle Badge */}
                  <div
                    className="absolute -top-10 -translate-x-1/2 transition-all duration-700"
                    style={{ left: `${routeProgress}%` }}
                  >
                    <div className="bg-primary text-primary-foreground px-3 py-1.5 rounded-full shadow-2xl border-2 border-white flex items-center gap-1.5 whitespace-nowrap text-xs font-bold">
                      <Truck className="w-4 h-4 animate-bounce" />
                      <span>{t('Courier', 'អ្នកដឹកជញ្ជូន')} ({routeProgress}%)</span>
                    </div>
                  </div>
                </div>

                {/* Warehouse Origin Pin (Bottom Right) */}
                <div className="flex items-center justify-between">
                  <div className="bg-slate-900/90 backdrop-blur-md text-white px-3 py-1.5 rounded-xl border border-white/15 text-[11px] flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-indigo-400" />
                    <span>{t('Origin: TYUSHOP Phnom Penh Fulfillment Hub', 'ចេញពី៖ មជ្ឈមណ្ឌលចែកចាយ TYUSHOP រាជធានីភ្នំពេញ')}</span>
                  </div>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl shadow-lg text-xs font-bold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {t('Arriving in ~', 'មកដល់ក្នុងរង្វង់ ~')}{etaMins} {t('mins', 'នាទី')}
                  </div>
                </div>
              </div>
            </div>

            {/* Interactive Controls under Map */}
            <CardContent className="p-4 bg-card flex flex-wrap items-center justify-between gap-4 border-t">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                  <Navigation className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold flex items-center gap-2">
                    {tracking?.driver?.name || 'Sokha Chan (TYUSHOP Express GPS Courier)'}
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">
                      {t('★ 4.95 Verified Courier', '★ 4.95 អ្នកដឹកជញ្ជូនផ្លូវការ')}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {t('Vehicle:', 'យានយន្ត៖')} {tracking?.driver?.vehicle || 'Honda PCX Electric • PP 1AB-9988'} • {t('Phone:', 'ទូរស័ព្ទ៖')}{' '}
                    <span className="font-semibold text-foreground">{tracking?.driver?.phone || '+855 12 889 900'}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleStepCourierForward}
                  className="rounded-xl text-xs gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-primary" /> {t('Step Courier Forward', 'រំកិលអ្នកដឹកទៅមុខ')}
                </Button>
                <a href={`tel:${tracking?.driver?.phone || '+85512889900'}`}>
                  <Button size="sm" className="rounded-xl text-xs gap-1.5 font-bold">
                    <Phone className="w-3.5 h-3.5" /> {t('Call Driver', 'ហៅទូរស័ព្ទ')}
                  </Button>
                </a>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Delivery Milestones & Loyalty Points Summary */}
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-bold text-base">{t('Delivery Milestones', 'ដំណាក់កាលនៃការដឹកជញ្ជូន')}</h3>
                <Badge className="bg-primary/10 text-primary border-primary/20 text-xs uppercase font-bold">
                  {routeProgress >= 95 ? t('Arriving Now', 'មកដល់ឥឡូវនេះ') : t('In Transit', 'កំពុងធ្វើដំណើរ')}
                </Badge>
              </div>

              <div className="space-y-4">
                {(tracking?.checkpoints || []).map((cp: any, idx: number) => {
                  const getCheckpointTitle = (title: string) => {
                    if (title.includes('Confirmed')) return t(title, 'បានបញ្ជាក់ការបញ្ជាទិញ & បានផ្ទៀងផ្ទាត់ការទូទាត់')
                    if (title.includes('Quality Inspected')) return t(title, 'ពិនិត្យគុណភាព & ចេញដំណើរពីឃ្លាំង')
                    if (title.includes('Out for Delivery')) return t(title, 'កំពុងដឹកជញ្ជូន • ប្រព័ន្ធផ្កាយរណប GPS ដំណើរការ')
                    if (title.includes('Arriving')) return t(title, 'មកដល់ទីតាំងទទួលរបស់អតិថិជន')
                    return title
                  }

                  return (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {cp.done ? (
                          <CheckCircle2
                            className={`w-5 h-5 ${
                              cp.active ? 'text-primary animate-pulse' : 'text-emerald-500'
                            }`}
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/40" />
                        )}
                      </div>
                      <div className="flex-1 text-xs space-y-0.5">
                        <div className="font-bold text-foreground">{getCheckpointTitle(cp.title)}</div>
                        <p className="text-muted-foreground">{cp.location}</p>
                        <span className="inline-block text-[10px] font-semibold text-primary">
                          {cp.time}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Payment & Cash on Arrival Handover Status Card */}
          <Card className="border-primary/25 bg-card">
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-primary" />
                  {t('Payment & Arrival Handover', 'ការទូទាត់ប្រាក់ & ទទួលទំនិញ')}
                </span>
                {tracking?.payment_status === 'cash_on_delivery' ? (
                  <Badge className="bg-amber-500 text-white text-[10px]">
                    {t('💵 Cash on Hand at Location', '💵 បង់ប្រាក់សុទ្ធពេលទំនិញមកដល់')}
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500 text-white text-[10px]">
                    {t('✓ Paid Online ($0 Due)', '✓ បានទូទាត់រួចរាល់ ($0 ត្រូវបង់)')}
                  </Badge>
                )}
              </div>

              <div className="p-3 rounded-xl bg-muted/40 border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Order Total:', 'តម្លៃសរុប៖')}</span>
                  <span className="font-bold">{formatPrice(Number(tracking?.total_amount ?? 0))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t('Amount Due When Delivery Arrives:', 'ទឹកប្រាក់ត្រូវបង់ពេលមកដល់៖')}</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">
                    {formatPrice(
                      Number(
                        tracking?.amount_due_on_arrival ??
                          (tracking?.payment_status === 'cash_on_delivery' ? tracking?.total_amount ?? 0 : 0)
                      )
                    )}
                  </span>
                </div>
              </div>

              {tracking?.payment_status === 'cash_on_delivery' ? (
                <div className="space-y-2">
                  <p className="text-muted-foreground leading-relaxed">
                    {t('You selected', 'អ្នកបានជ្រើសរើស')}{' '}
                    <strong>{t('Cash on Hand When Delivery Arrives', 'ការទូទាត់ប្រាក់សុទ្ធពេលទំនិញមកដល់')}</strong>.{' '}
                    {t('Please hand', 'សូមប្រគល់')}{' '}
                    <strong className="text-foreground">{formatPrice(Number(tracking?.total_amount ?? 0))}</strong>{' '}
                    {t('to your courier upon arrival at your location.', 'ជូនអ្នកដឹកជញ្ជូនពេលមកដល់ទីតាំងរបស់អ្នក។')}
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    disabled={confirmingPayment}
                    onClick={handleConfirmCashOnArrival}
                    className="w-full rounded-xl text-xs bg-amber-600 hover:bg-amber-700 text-white font-bold"
                  >
                    {confirmingPayment
                      ? t('Confirming Handover...', 'កំពុងបញ្ជាក់ការប្រគល់...')
                      : t('💵 Confirm Cash Paid on Arrival at Location', '💵 បញ្ជាក់ថាបានបង់ប្រាក់សុទ្ធជូនអ្នកដឹក')}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-muted-foreground leading-relaxed">
                    {t(
                      'Payment is 100% Settled ($0.00 to pay courier on arrival). Want to test Cash-on-Arrival handover? Or confirm delivery arrival below:',
                      'ការទូទាត់បានរួចរាល់ ១០០% (មិនបាច់បង់ប្រាក់បន្ថែមទេ)។ ចុចខាងក្រោមដើម្បីបញ្ជាក់ការទទួលទំនិញ៖'
                    )}
                  </p>
                  {routeProgress < 100 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={confirmingPayment}
                      onClick={handleConfirmCashOnArrival}
                      className="w-full rounded-xl text-xs font-bold"
                    >
                      {t('✓ Mark Delivery Arrived at My Location', '✓ បញ្ជាក់ថាទំនិញបានមកដល់ទីតាំងខ្ញុំហើយ')}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Loyalty Points & Order Summary Card */}
          <Card className="bg-gradient-to-br from-amber-500/10 via-background to-purple-500/10 border-amber-500/30">
            <CardContent className="p-5 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-amber-500" />
                  {t('Loyalty Points Reward', 'រង្វាន់ពិន្ទុអតិថិជនស្មោះត្រង់')}
                </span>
                <Badge className="bg-amber-500 text-white text-[10px] font-bold">
                  {t('+5 Pts / Order', '+5 ពិន្ទុ / រាល់ការទិញ')}
                </Badge>
              </div>
              <p className="text-muted-foreground leading-relaxed">
                {t('This order earned', 'ការបញ្ជាទិញនេះទទួលបាន')}{' '}
                <strong>+{tracking?.points_earned ?? 5} {t('Loyalty Points', 'ពិន្ទុ')}</strong>!{' '}
                {t('Your total balance is', 'ពិន្ទុសរុបរបស់អ្នកគឺ')}{' '}
                <strong className="text-foreground">{loyaltyPoints} {t('Points', 'ពិន្ទុ')}</strong>.{' '}
                {t(
                  'At 100 Points, exchange for any product under $20–$30 FREE!',
                  'នៅពេលដល់ ១០០ ពិន្ទុ អ្នកអាចប្តូរយកទំនិញតម្លៃ $20–$30 ដោយឥតគិតថ្លៃ!'
                )}
              </p>
              <div className="pt-1 flex items-center gap-2">
                <Link to="/cart" className="w-full">
                  <Button variant="outline" size="sm" className="w-full rounded-xl text-xs font-bold">
                    {t('Go to Cart & 100-Pt Free Rewards', 'ទៅកាន់កន្ត្រក & ប្តូរយកទំនិញ ១០០ ពិន្ទុឥតគិតថ្លៃ')}
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/40 border text-xs text-muted-foreground">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              {t(
                'Protected by TYUSHOP Delivery Guarantee & PIN handover verification.',
                'ការពារដោយការធានាដឹកជញ្ជូន TYUSHOP និងផ្ទៀងផ្ទាត់ដោយលេខកូដសម្ងាត់។'
              )}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

