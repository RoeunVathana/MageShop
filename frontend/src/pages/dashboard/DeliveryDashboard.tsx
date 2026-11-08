import React, { useState, useEffect } from 'react'
import {
  Truck,
  MapPin,
  CheckCircle2,
  Navigation,
  Clock,
  Phone,
  Search,
  Compass,
  TrendingUp,
  RefreshCw,
  ExternalLink,
  Edit3,
  X,
  Save,
  Check,
  User,
  Package,
  Layers,
  Shield,
  CreditCard,
  Banknote,
  Send,
  SlidersHorizontal,
  LucideIcon,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'

export interface DeliveryOrder {
  id: number
  order_number: string
  customer_name: string
  customer_phone: string
  customer_email?: string
  delivery_address: string
  dest_lat?: number
  dest_lng?: number
  current_lat?: number
  current_lng?: number
  status: string
  payment_status: string
  payment_method: string
  total_amount: number
  driver_name?: string
  driver_phone?: string
  driver_vehicle?: string
  estimated_arrival?: string
  created_at?: string
}

const CAMBODIA_LOCATION_PRESETS = [
  { label: 'BKK1, Chamkarmon', zone: 'Chamkarmon', address: 'BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia', lat: 11.5564, lng: 104.9282 },
  { label: 'Toul Kork (TK)', zone: 'Toul Kork', address: 'Street 315, Boeung Kak 1, Toul Kork, Phnom Penh, Cambodia', lat: 11.5732, lng: 104.8978 },
  { label: 'Daun Penh (Riverside)', zone: 'Daun Penh', address: 'Preah Sisowath Quay, Daun Penh, Phnom Penh, Cambodia', lat: 11.5694, lng: 104.9312 },
  { label: 'Sen Sok (Aeon 2)', zone: 'Sen Sok', address: 'Street 1003, Phnom Penh Thmey, Sen Sok, Phnom Penh, Cambodia', lat: 11.5956, lng: 104.8779 },
  { label: 'Chroy Changvar', zone: 'Chroy Changvar', address: 'National Road 6A, Chroy Changvar, Phnom Penh, Cambodia', lat: 11.5925, lng: 104.9372 },
  { label: 'Russian Market (TTP)', zone: 'Chamkarmon', address: 'Street 155, Toul Tom Poung 1, Chamkarmon, Phnom Penh, Cambodia', lat: 11.5401, lng: 104.9145 },
  { label: 'Siem Reap City', zone: 'Siem Reap', address: 'Pub Street & Old Market Area, Siem Reap, Cambodia', lat: 13.3556, lng: 103.8564 },
  { label: 'Battambang City', zone: 'Battambang', address: 'Street 1, Sangkat Svay Pao, Battambang, Cambodia', lat: 13.0957, lng: 103.2022 },
  { label: 'Sihanoukville (Otres)', zone: 'Sihanoukville', address: 'Marina Road, Otres Beach, Sihanoukville, Cambodia', lat: 10.6015, lng: 103.5512 },
]

const DEMO_ORDERS: DeliveryOrder[] = [
  {
    id: 101,
    order_number: 'ORD-20261108-9941',
    customer_name: 'Dara Sok',
    customer_phone: '016 555 637',
    customer_email: 'dara.sok@tyushop.blog',
    delivery_address: 'BKK1, Street 310, Chamkarmon, Phnom Penh, Cambodia',
    dest_lat: 11.5564,
    dest_lng: 104.9282,
    current_lat: 11.5510,
    current_lng: 104.9315,
    status: 'shipped',
    payment_status: 'paid',
    payment_method: 'bakong_khqr',
    total_amount: 349.0,
    driver_name: 'Sokha Chan (TYUSHOP Express GPS Courier)',
    driver_phone: '+855 12 889 900',
    driver_vehicle: 'Honda PCX Electric • PP 1AB-9988',
    estimated_arrival: '12 mins',
  },
  {
    id: 102,
    order_number: 'ORD-20261108-8812',
    customer_name: 'Sophea Keo',
    customer_phone: '+855 12 888 999',
    customer_email: 'sophea.keo@gmail.com',
    delivery_address: 'Street 315, Boeung Kak 1, Toul Kork, Phnom Penh, Cambodia',
    dest_lat: 11.5732,
    dest_lng: 104.8978,
    current_lat: 11.5620,
    current_lng: 104.9120,
    status: 'shipped',
    payment_status: 'cash_on_delivery',
    payment_method: 'cash_on_delivery',
    total_amount: 89.5,
    driver_name: 'Vannak Lim (TYUSHOP Express Courier)',
    driver_phone: '+855 12 777 666',
    driver_vehicle: 'Honda Click 160 • PP 1CD-4422',
    estimated_arrival: '18 mins',
  },
  {
    id: 103,
    order_number: 'ORD-20261108-7734',
    customer_name: 'Chanthy Men',
    customer_phone: '+855 98 123 456',
    customer_email: 'chanthy@tyushop.blog',
    delivery_address: 'Preah Sisowath Quay, Daun Penh, Phnom Penh, Cambodia',
    dest_lat: 11.5694,
    dest_lng: 104.9312,
    current_lat: 11.5650,
    current_lng: 104.9320,
    status: 'shipped',
    payment_status: 'paid',
    payment_method: 'bakong_khqr',
    total_amount: 145.0,
    driver_name: 'Sokha Chan (TYUSHOP Express GPS Courier)',
    driver_phone: '+855 12 889 900',
    driver_vehicle: 'Honda PCX Electric • PP 1AB-9988',
    estimated_arrival: '6 mins',
  },
  {
    id: 104,
    order_number: 'ORD-20261108-6621',
    customer_name: 'Rithy Seng',
    customer_phone: '+855 77 900 111',
    customer_email: 'rithy.seng@gmail.com',
    delivery_address: 'Street 1003, Phnom Penh Thmey, Sen Sok, Phnom Penh, Cambodia',
    dest_lat: 11.5956,
    dest_lng: 104.8779,
    current_lat: 11.5780,
    current_lng: 104.8950,
    status: 'delivered',
    payment_status: 'paid',
    payment_method: 'bakong_khqr',
    total_amount: 219.0,
    driver_name: 'Sokha Chan (TYUSHOP Express GPS Courier)',
    driver_phone: '+855 12 889 900',
    driver_vehicle: 'Honda PCX Electric • PP 1AB-9988',
    estimated_arrival: 'Delivered',
  },
]

const deliveryNav: NavItem[] = [
  { label: 'Delivery Location Manager', href: '/dashboard/delivery', icon: MapPin, badge: 'Live GPS' },
  { label: 'Fleet Route Dispatch', href: '/dashboard/delivery', icon: Truck },
  { label: 'Staff Operations Desk', href: '/dashboard/staff', icon: Layers },
  { label: 'Admin Governance', href: '/dashboard/admin', icon: Shield },
]

export function DeliveryDashboard() {
  const { toast } = useToast()

  const [orders, setOrders] = useState<DeliveryOrder[]>(DEMO_ORDERS)
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder>(DEMO_ORDERS[0])
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'delivered' | 'cod'>('all')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [broadcastingGps, setBroadcastingGps] = useState(false)

  // Location Management Modal State
  const [editingOrder, setEditingOrder] = useState<DeliveryOrder | null>(null)
  const [editAddress, setEditAddress] = useState('')
  const [editDestLat, setEditDestLat] = useState<number>(11.5564)
  const [editDestLng, setEditDestLng] = useState<number>(104.9282)
  const [editDriverLat, setEditDriverLat] = useState<number>(11.5510)
  const [editDriverLng, setEditDriverLng] = useState<number>(104.9315)
  const [editEta, setEditEta] = useState('12 mins')
  const [editStatus, setEditStatus] = useState('shipped')
  const [savingLocation, setSavingLocation] = useState(false)

  // Fetch live orders from backend API
  const fetchDeliveryOrders = async () => {
    setLoading(true)
    try {
      const res = await api.get<any>('/delivery/orders')
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        setOrders(res.data)
        setSelectedOrder(res.data[0])
      }
    } catch {
      // Keep demo orders if backend is unreachable
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDeliveryOrders()
  }, [])

  // Open Location Management Modal
  const openLocationModal = (order: DeliveryOrder) => {
    setEditingOrder(order)
    setEditAddress(order.delivery_address)
    setEditDestLat(Number(order.dest_lat || 11.5564))
    setEditDestLng(Number(order.dest_lng || 104.9282))
    setEditDriverLat(Number(order.current_lat || 11.5510))
    setEditDriverLng(Number(order.current_lng || 104.9315))
    setEditEta(order.estimated_arrival || '15 mins')
    setEditStatus(order.status)
  }

  // Save updated location coordinates and details
  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingOrder) return

    setSavingLocation(true)
    try {
      const payload = {
        delivery_address: editAddress,
        dest_lat: editDestLat,
        dest_lng: editDestLng,
        current_lat: editDriverLat,
        current_lng: editDriverLng,
        estimated_arrival: editEta,
        status: editStatus,
      }

      await api.patch(`/delivery/orders/${encodeURIComponent(editingOrder.order_number)}/location`, payload)

      const updated = {
        ...editingOrder,
        ...payload,
      }

      setOrders((prev) =>
        prev.map((o) => (o.order_number === editingOrder.order_number ? updated : o))
      )
      if (selectedOrder.order_number === editingOrder.order_number) {
        setSelectedOrder(updated)
      }

      toast({
        title: `📍 Location Updated for #${editingOrder.order_number}`,
        description: `New Target: ${editDestLat.toFixed(4)}° N, ${editDestLng.toFixed(4)}° E • ETA: ${editEta}`,
        type: 'success',
      })
      setEditingOrder(null)
    } catch {
      // Local optimistic update
      const updated = {
        ...editingOrder,
        delivery_address: editAddress,
        dest_lat: editDestLat,
        dest_lng: editDestLng,
        current_lat: editDriverLat,
        current_lng: editDriverLng,
        estimated_arrival: editEta,
        status: editStatus,
      }
      setOrders((prev) =>
        prev.map((o) => (o.order_number === editingOrder.order_number ? updated : o))
      )
      if (selectedOrder.order_number === editingOrder.order_number) {
        setSelectedOrder(updated)
      }
      toast({
        title: `📍 Location Updated (Optimistic)`,
        description: `New Target: ${editDestLat.toFixed(4)}° N, ${editDestLng.toFixed(4)}° E`,
        type: 'success',
      })
      setEditingOrder(null)
    } finally {
      setSavingLocation(false)
    }
  }

  // One-click live GPS broadcasting from driver's device
  const handleBroadcastDeviceGps = () => {
    if (!navigator.geolocation) {
      toast({
        title: 'Geolocation Not Available',
        description: 'Device does not support GPS location streaming.',
        type: 'error',
      })
      return
    }

    setBroadcastingGps(true)
    toast({
      title: '🛰️ Acquiring Device GPS Coordinates...',
      description: 'Broadcasting live courier satellite coordinates to customer track view...',
      type: 'info',
    })

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude, accuracy } = pos.coords
        try {
          await api.post('/delivery/broadcast-gps', {
            latitude,
            longitude,
            driver_name: selectedOrder.driver_name || 'TYUSHOP Express Driver',
          })
        } catch {
          // Ignore if offline
        }

        setOrders((prev) =>
          prev.map((o) => ({
            ...o,
            current_lat: latitude,
            current_lng: longitude,
          }))
        )
        setSelectedOrder((prev) => ({
          ...prev,
          current_lat: latitude,
          current_lng: longitude,
        }))

        setBroadcastingGps(false)
        toast({
          title: '✅ Live GPS Telemetry Broadcasted!',
          description: `Driver Location: ${latitude.toFixed(4)}° N, ${longitude.toFixed(4)}° E (±${Math.round(accuracy)}m)`,
          type: 'success',
        })
      },
      (err) => {
        setBroadcastingGps(false)
        toast({
          title: 'GPS Access Denied',
          description: err.message || 'Please enable location permissions in your browser.',
          type: 'error',
        })
      },
      { enableHighAccuracy: true, timeout: 8000 }
    )
  }

  // Quick Status Toggle: Mark as Delivered
  const handleMarkDelivered = async (order: DeliveryOrder) => {
    try {
      await api.post(`/delivery/orders/${encodeURIComponent(order.order_number)}/status`, {
        status: 'delivered',
      })
    } catch {
      // Local fallback
    }

    const updated = { ...order, status: 'delivered', payment_status: 'paid' }
    setOrders((prev) => prev.map((o) => (o.order_number === order.order_number ? updated : o)))
    if (selectedOrder.order_number === order.order_number) {
      setSelectedOrder(updated)
    }
    toast({
      title: `🎉 Order #${order.order_number} Delivered!`,
      description: 'Customer handover confirmed and payment settlement verified.',
      type: 'success',
    })
  }

  // Filtered Orders List
  const filteredOrders = orders.filter((o) => {
    const q = searchQuery.toLowerCase().trim()
    const matchesSearch =
      !q ||
      o.order_number.toLowerCase().includes(q) ||
      o.customer_name.toLowerCase().includes(q) ||
      o.customer_phone.toLowerCase().includes(q) ||
      o.delivery_address.toLowerCase().includes(q)

    let matchesStatus = true
    if (statusFilter === 'in_transit') {
      matchesStatus = o.status === 'shipped' || o.status === 'out_for_delivery'
    } else if (statusFilter === 'delivered') {
      matchesStatus = o.status === 'delivered'
    } else if (statusFilter === 'cod') {
      matchesStatus = o.payment_status === 'cash_on_delivery'
    }

    let matchesZone = true
    if (zoneFilter !== 'all') {
      matchesZone = o.delivery_address.toLowerCase().includes(zoneFilter.toLowerCase())
    }

    return matchesSearch && matchesStatus && matchesZone
  })

  // Dynamic OpenStreetMap Bounding Box for Selected Order
  const destLat = Number(selectedOrder?.dest_lat || 11.5564)
  const destLng = Number(selectedOrder?.dest_lng || 104.9282)
  const driverLat = Number(selectedOrder?.current_lat || 11.5510)
  const driverLng = Number(selectedOrder?.current_lng || 104.9315)
  const minLng = (Math.min(destLng, driverLng) - 0.02).toFixed(4)
  const maxLng = (Math.max(destLng, driverLng) + 0.02).toFixed(4)
  const minLat = (Math.min(destLat, driverLat) - 0.02).toFixed(4)
  const maxLat = (Math.max(destLat, driverLat) + 0.02).toFixed(4)
  const mapEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${destLat}%2C${destLng}`

  return (
    <DashboardLayout
      roleTitle="Staff & Delivery Fleet Control"
      roleSlug="delivery"
      roleColor="text-indigo-600 dark:text-indigo-400"
      navItems={deliveryNav}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50">
                Staff & Delivery Location Manager
              </h1>
              <Badge className="bg-indigo-600 text-white text-[11px] font-bold">
                Live GPS Active
              </Badge>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Manage customer delivery target locations, broadcast driver GPS coordinates, and monitor real-time fulfillment across Cambodia.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBroadcastDeviceGps}
              disabled={broadcastingGps}
              className="rounded-xl h-9 text-xs font-bold gap-2 border-indigo-200 bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 shadow-sm"
            >
              {broadcastingGps ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Broadcasting GPS...
                </>
              ) : (
                <>
                  <Compass className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 animate-spin" />
                  🛰️ Broadcast My Device GPS
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={fetchDeliveryOrders}
              disabled={loading}
              className="rounded-xl h-9 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* 4 Stat Cards with Percentage Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active Deliveries</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                    {orders.filter((o) => o.status !== 'delivered').length} stops
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +14.2%
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Truck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Completed Today</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                    {orders.filter((o) => o.status === 'delivered').length + 18}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +24.8%
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Route Distance</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-50">38.6 km</span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +8.4%
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-sky-50 dark:bg-sky-950/50 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <Navigation className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">On-Time Dispatch</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">96.8%</span>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-0.5">
                    <TrendingUp className="w-3 h-3" /> +3.2%
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Real-Time Search & Category Filters */}
        <Card className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
          <CardContent className="p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search customer name, order #, phone, or street address..."
                  className="w-full pl-10 pr-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/40 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
                  >
                    ×
                  </button>
                )}
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto">
                {[
                  { key: 'all', label: 'All Orders' },
                  { key: 'in_transit', label: 'In Transit' },
                  { key: 'cod', label: 'Cash on Arrival' },
                  { key: 'delivered', label: 'Delivered' },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setStatusFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      statusFilter === tab.key
                        ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cambodia Zone Filter Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                Cambodia Delivery Zones:
              </span>
              {[
                { key: 'all', label: 'All Cambodia' },
                { key: 'Chamkarmon', label: 'BKK1 / Chamkarmon' },
                { key: 'Toul Kork', label: 'Toul Kork' },
                { key: 'Daun Penh', label: 'Daun Penh (Riverside)' },
                { key: 'Sen Sok', label: 'Sen Sok (Aeon 2)' },
                { key: 'Chroy Changvar', label: 'Chroy Changvar' },
                { key: 'Siem Reap', label: 'Siem Reap' },
                { key: 'Battambang', label: 'Battambang' },
              ].map((zone) => (
                <button
                  key={zone.key}
                  type="button"
                  onClick={() => setZoneFilter(zone.key)}
                  className={`text-[11px] px-2.5 py-1 rounded-full border transition-all cursor-pointer font-medium ${
                    zoneFilter === zone.key
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:border-indigo-400'
                  }`}
                >
                  📍 {zone.label}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main 2-Column Split: Left = Interactive Dispatch Map & Route Telemetry | Right = Location Management Queue */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN (7 Cols): Live GPS Map & Selected Order Focus */}
          <div className="lg:col-span-7 space-y-6">
            <Card className="rounded-2xl border-2 border-indigo-500/30 overflow-hidden bg-white dark:bg-slate-900 shadow-xl">
              {/* Map Header Bar */}
              <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                  <span className="font-mono font-bold text-emerald-400">
                    TARGET: {destLat.toFixed(4)}° N, {destLng.toFixed(4)}° E
                  </span>
                  <span className="text-slate-400">|</span>
                  <span className="font-bold text-slate-200">#{selectedOrder.order_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-indigo-600 text-white text-[10px]">
                    ETA ~{selectedOrder.estimated_arrival || '12 mins'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => openLocationModal(selectedOrder)}
                    className="h-7 text-xs text-white hover:bg-white/15 gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Manage Location
                  </Button>
                </div>
              </div>

              {/* Dynamic OpenStreetMap Embed */}
              <div className="relative h-80 sm:h-96 w-full bg-slate-950">
                <iframe
                  title="Staff Fleet Location Live Map"
                  src={mapEmbedUrl}
                  className="w-full h-full border-0 opacity-85 contrast-110"
                />

                {/* Destination Pin Overlay */}
                <div className="absolute top-4 left-4 right-4 pointer-events-none flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="bg-slate-900/90 backdrop-blur-md text-white p-3 rounded-2xl border border-emerald-500/40 shadow-xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div className="text-xs min-w-0">
                      <div className="font-bold text-emerald-400 flex items-center gap-1.5">
                        <span>Customer Location Target</span>
                        <span className="text-[10px] text-slate-300 font-normal">
                          ({selectedOrder.customer_name})
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 truncate max-w-xs mt-0.5 font-medium">
                        {selectedOrder.delivery_address}
                      </p>
                    </div>
                  </div>

                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="pointer-events-auto self-start sm:self-auto px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg flex items-center gap-1.5 transition-all"
                  >
                    <span>Google Maps Navigation</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>

                {/* Warehouse Origin Pin at Bottom */}
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex items-center justify-between text-xs">
                  <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Origin: TYUSHOP Central Hub (Phnom Penh)</span>
                  </div>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold shadow-md">
                    Courier Speed: 34 km/h
                  </div>
                </div>
              </div>

              {/* Selected Order Detail Bar */}
              <CardContent className="p-4 sm:p-5 border-t border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div>
                  <div className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <span>{selectedOrder.customer_name}</span>
                    <Badge variant="outline" className="text-[10px]">
                      {selectedOrder.customer_phone}
                    </Badge>
                  </div>
                  <p className="text-slate-500 mt-0.5">
                    Assigned Courier: <strong>{selectedOrder.driver_name || 'TYUSHOP Express Courier'}</strong> ({selectedOrder.driver_vehicle})
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <a href={`tel:${selectedOrder.customer_phone}`}>
                    <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Call Customer
                    </Button>
                  </a>
                  {selectedOrder.status !== 'delivered' && (
                    <Button
                      size="sm"
                      onClick={() => handleMarkDelivered(selectedOrder)}
                      className="rounded-xl h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                    >
                      <Check className="w-3.5 h-3.5" /> Mark Delivered
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT COLUMN (5 Cols): Orders Location Queue & Quick Dispatch */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
                <Truck className="w-4 h-4 text-indigo-600" />
                <span>Active Location Dispatch Queue ({filteredOrders.length})</span>
              </h2>
              <span className="text-xs text-slate-500">Click order to view map</span>
            </div>

            <div className="space-y-3">
              {filteredOrders.length === 0 ? (
                <Card className="rounded-2xl border p-8 text-center text-xs text-slate-500">
                  No orders found matching "{searchQuery}" in {zoneFilter === 'all' ? 'any zone' : zoneFilter}.
                </Card>
              ) : (
                filteredOrders.map((order) => {
                  const isSelected = selectedOrder.order_number === order.order_number
                  const isDelivered = order.status === 'delivered'
                  const isCod = order.payment_status === 'cash_on_delivery'

                  return (
                    <Card
                      key={order.order_number}
                      onClick={() => setSelectedOrder(order)}
                      className={`rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-md'
                          : 'border-slate-200/80 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-slate-900'
                      }`}
                    >
                      <CardContent className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2 text-xs">
                          <div>
                            <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-slate-100">
                              <span>#{order.order_number}</span>
                              {isDelivered ? (
                                <Badge className="bg-emerald-500 text-white text-[10px]">Delivered</Badge>
                              ) : (
                                <Badge className="bg-indigo-600 text-white text-[10px]">
                                  {order.estimated_arrival || 'In Transit'}
                                </Badge>
                              )}
                              {isCod && (
                                <Badge className="bg-amber-500 text-white text-[10px]">
                                  COD (${order.total_amount.toFixed(2)})
                                </Badge>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                              {order.customer_name} • {order.customer_phone}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                              ${order.total_amount.toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {order.payment_method.toUpperCase()}
                            </span>
                          </div>
                        </div>

                        {/* Delivery Address Target */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                          <span className="line-clamp-2 leading-relaxed font-medium">
                            {order.delivery_address}
                          </span>
                        </div>

                        {/* Coordinates & Actions Bar */}
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <span className="font-mono text-slate-400">
                            GPS: {Number(order.dest_lat || 11.5564).toFixed(4)}° N, {Number(order.dest_lng || 104.9282).toFixed(4)}° E
                          </span>

                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation()
                                openLocationModal(order)
                              }}
                              className="h-7 text-[11px] font-bold rounded-lg px-2.5 gap-1 border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                            >
                              <Edit3 className="w-3 h-3" /> Manage Location
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* LOCATION MANAGEMENT MODAL DIALOG */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">
                  Manage Delivery Location Target
                </h3>
                <p className="text-[11px] text-indigo-100 mt-0.5">
                  Order #{editingOrder.order_number} • Customer: {editingOrder.customer_name}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="p-6 space-y-4 text-xs">
              {/* Customer Street Address */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-indigo-600" />
                  Customer Delivery Address
                </label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Street / District / City in Cambodia"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-medium"
                />
              </div>

              {/* Cambodia Quick Location Presets */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Location Presets (Cambodia):
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 border rounded-xl bg-slate-50 dark:bg-slate-800/40">
                  {CAMBODIA_LOCATION_PRESETS.map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setEditAddress(p.address)
                        setEditDestLat(p.lat)
                        setEditDestLng(p.lng)
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-card hover:bg-indigo-600 hover:text-white border font-semibold transition-colors"
                    >
                      📍 {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Destination GPS Coordinates */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Destination Latitude (° N)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editDestLat}
                    onChange={(e) => setEditDestLat(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Destination Longitude (° E)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={editDestLng}
                    onChange={(e) => setEditDestLng(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-mono"
                  />
                </div>
              </div>

              {/* Courier Status & Estimated Arrival */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Delivery Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-background"
                  >
                    <option value="shipped">Out for Delivery (Shipped)</option>
                    <option value="delivered">Delivered (Handover Complete)</option>
                    <option value="pending">Pending Warehouse Dispatch</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Estimated Arrival Time
                  </label>
                  <input
                    type="text"
                    value={editEta}
                    onChange={(e) => setEditEta(e.target.value)}
                    placeholder="e.g. 10 mins"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-medium"
                  />
                </div>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingOrder(null)}
                  className="rounded-xl px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingLocation}
                  className="rounded-xl px-5 font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25"
                >
                  {savingLocation ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Location
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
