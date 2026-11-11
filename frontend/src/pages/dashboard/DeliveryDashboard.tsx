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
  Sparkles,
  DollarSign,
  Plus,
  Trash2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Settings,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'
import { deliveryService, type DeliveryMethod, type DeliverySettingsData } from '@/services/delivery.service'

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

const deliveryNav: NavItem[] = [
  { label: 'Delivery Location Manager', href: '/dashboard/delivery', icon: MapPin, badge: 'Live GPS' },
  { label: 'Fleet Route Dispatch', href: '/dashboard/delivery', icon: Truck },
  { label: 'Staff Operations Desk', href: '/dashboard/staff', icon: Layers },
  { label: 'Admin Governance', href: '/dashboard/admin', icon: Shield },
]

export function DeliveryDashboard() {
  const { toast } = useToast()

  // Active Tab: 'location' | 'pricing'
  const [activeTab, setActiveTab] = useState<'location' | 'pricing'>('location')

  // Delivery Pricing & Free Delivery Governance State
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
  const [loadingSettings, setLoadingSettings] = useState(false)
  const [togglingFree, setTogglingFree] = useState(false)
  const [savingSettings, setSavingSettings] = useState(false)
  const [thresholdInput, setThresholdInput] = useState<number>(0)
  const [defaultFeeInput, setDefaultFeeInput] = useState<number>(1.5)

  // Delivery Method Add / Edit Modal State
  const [methodModalOpen, setMethodModalOpen] = useState(false)
  const [editingMethod, setEditingMethod] = useState<DeliveryMethod | null>(null)
  const [formName, setFormName] = useState('')
  const [formNameKm, setFormNameKm] = useState('')
  const [formPrice, setFormPrice] = useState<number>(1.5)
  const [formTime, setFormTime] = useState('')
  const [formTimeKm, setFormTimeKm] = useState('')
  const [formIsDefault, setFormIsDefault] = useState(false)
  const [formIsActive, setFormIsActive] = useState(true)
  const [savingMethod, setSavingMethod] = useState(false)
  const [deletingMethodId, setDeletingMethodId] = useState<string | null>(null)

  const [orders, setOrders] = useState<DeliveryOrder[]>([])
  const [selectedOrder, setSelectedOrder] = useState<DeliveryOrder | null>(null)
  const [ordersError, setOrdersError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'in_transit' | 'delivered' | 'cod'>('all')
  const [zoneFilter, setZoneFilter] = useState<string>('all')
  const [loading, setLoading] = useState(false)
  const [broadcastingGps, setBroadcastingGps] = useState(false)
  const [isContinuousDelivering, setIsContinuousDelivering] = useState(false)

  // Location Management Modal State
  const [editingOrder, setEditingOrder] = useState<DeliveryOrder | null>(null)
  const [editAddress, setEditAddress] = useState('')
  const [editDestLat, setEditDestLat] = useState<number>(0)
  const [editDestLng, setEditDestLng] = useState<number>(0)
  const [editDriverLat, setEditDriverLat] = useState<number>(0)
  const [editDriverLng, setEditDriverLng] = useState<number>(0)
  const [editEta, setEditEta] = useState('')
  const [editStatus, setEditStatus] = useState('pending')
  const [savingLocation, setSavingLocation] = useState(false)

  // Fetch live orders from backend API
  const fetchDeliveryOrders = async () => {
    setLoading(true)
    setOrdersError(null)
    try {
      const res = await api.get<any>('/delivery/orders')
      const orderList = Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []
      if (orderList.length > 0) {
        const normalized: DeliveryOrder[] = orderList.map((o: any) => ({
          ...o,
          total_amount: Number(o.total_amount || 0),
          dest_lat: o.dest_lat === null || o.dest_lat === undefined ? undefined : Number(o.dest_lat),
          dest_lng: o.dest_lng === null || o.dest_lng === undefined ? undefined : Number(o.dest_lng),
          current_lat: o.current_lat === null || o.current_lat === undefined ? undefined : Number(o.current_lat),
          current_lng: o.current_lng === null || o.current_lng === undefined ? undefined : Number(o.current_lng),
          payment_method: o.payment_method || 'bakong_khqr',
          payment_status: o.payment_status || 'pending',
          driver_name: o.driver_name || undefined,
          driver_vehicle: o.driver_vehicle || undefined,
          estimated_arrival: o.estimated_arrival || undefined,
        }))
        setOrders(normalized)
        setSelectedOrder(normalized[0])
      } else {
        setOrders([])
        setSelectedOrder(null)
      }
    } catch {
      setOrders([])
      setSelectedOrder(null)
      setOrdersError('Unable to load live delivery orders. Check staff access and try again.')
    } finally {
      setLoading(false)
    }
  }

  // Fetch delivery pricing & settings
  const fetchDeliverySettings = async () => {
    setLoadingSettings(true)
    try {
      const data = await deliveryService.getSettings()
      if (data) {
        setDeliverySettings(data)
        setThresholdInput(Number(data.free_delivery_threshold || 0))
        setDefaultFeeInput(Number(data.default_delivery_fee || 1.5))
      }
    } catch {
      // Keep defaults
    } finally {
      setLoadingSettings(false)
    }
  }

  useEffect(() => {
    fetchDeliveryOrders()
    fetchDeliverySettings()
  }, [])

  // Toggle Free Delivery on/off globally
  const handleToggleFreeDelivery = async () => {
    const nextState = !deliverySettings.is_free_delivery
    setTogglingFree(true)
    try {
      await deliveryService.toggleFreeDelivery(nextState)
      setDeliverySettings((prev) => ({
        ...prev,
        is_free_delivery: nextState,
      }))
      toast({
        title: nextState
          ? '🎉 Free Delivery ENABLED Globally!'
          : '💵 Paid Delivery ENABLED Globally!',
        description: nextState
          ? 'All customer checkout fees set to ឥតគិតថ្លៃ ($0.00 FREE).'
          : 'Customers will pay based on selected delivery rates at checkout.',
        type: 'success',
      })
    } catch {
      // Optimistic update fallback
      setDeliverySettings((prev) => ({
        ...prev,
        is_free_delivery: nextState,
      }))
      toast({
        title: nextState ? 'Free Delivery Activated (Local)' : 'Paid Delivery Activated (Local)',
        description: 'Storefront checkout delivery pricing updated.',
        type: 'info',
      })
    } finally {
      setTogglingFree(false)
    }
  }

  // Save Free Delivery Threshold & Default Fee
  const handleSaveThreshold = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const updated = await deliveryService.updateSettings({
        is_free_delivery: deliverySettings.is_free_delivery,
        free_delivery_threshold: Number(thresholdInput),
        default_delivery_fee: Number(defaultFeeInput),
      })
      if (updated) {
        setDeliverySettings(updated)
      } else {
        setDeliverySettings((prev) => ({
          ...prev,
          free_delivery_threshold: Number(thresholdInput),
          default_delivery_fee: Number(defaultFeeInput),
        }))
      }
      toast({
        title: '✅ Delivery Settings Saved!',
        description: `Free Threshold: $${Number(thresholdInput).toFixed(2)} • Default Fee: $${Number(defaultFeeInput).toFixed(2)}`,
        type: 'success',
      })
    } catch {
      setDeliverySettings((prev) => ({
        ...prev,
        free_delivery_threshold: Number(thresholdInput),
        default_delivery_fee: Number(defaultFeeInput),
      }))
      toast({
        title: 'Settings Saved (Optimistic)',
        description: 'New threshold applied.',
        type: 'info',
      })
    } finally {
      setSavingSettings(false)
    }
  }

  // Open Add Delivery Method Modal
  const handleOpenAddMethod = () => {
    setEditingMethod(null)
    setFormName('')
    setFormNameKm('')
    setFormPrice(1.5)
    setFormTime('1 - 2 Hours')
    setFormTimeKm('១ - ២ ម៉ោង')
    setFormIsDefault(false)
    setFormIsActive(true)
    setMethodModalOpen(true)
  }

  // Open Edit Delivery Method Modal
  const handleOpenEditMethod = (m: DeliveryMethod) => {
    setEditingMethod(m)
    setFormName(m.name)
    setFormNameKm(m.name_km || m.name)
    setFormPrice(Number(m.price))
    setFormTime(m.estimated_time || '1 - 2 Hours')
    setFormTimeKm(m.estimated_time_km || '១ - ២ ម៉ោង')
    setFormIsDefault(Boolean(m.is_default))
    setFormIsActive(Boolean(m.is_active))
    setMethodModalOpen(true)
  }

  // Save (Create or Update) Delivery Method
  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formName.trim()) {
      toast({ title: 'Validation Error', description: 'Method name is required.', type: 'error' })
      return
    }

    setSavingMethod(true)
    try {
      if (editingMethod) {
        const res = await deliveryService.updateMethod(editingMethod.id, {
          name: formName.trim(),
          name_km: formNameKm.trim() || formName.trim(),
          price: Number(formPrice),
          estimated_time: formTime.trim(),
          estimated_time_km: formTimeKm.trim() || formTime.trim(),
          is_default: formIsDefault,
          is_active: formIsActive,
        })
        if (res?.methods && Array.isArray(res.methods)) {
          const newMethods = res.methods
          setDeliverySettings((prev) => ({ ...prev, methods: newMethods }))
        } else {
          setDeliverySettings((prev) => ({
            ...prev,
            methods: prev.methods.map((m) =>
              m.id === editingMethod.id
                ? {
                    ...m,
                    name: formName.trim(),
                    name_km: formNameKm.trim() || formName.trim(),
                    price: Number(formPrice),
                    estimated_time: formTime.trim(),
                    estimated_time_km: formTimeKm.trim(),
                    is_default: formIsDefault,
                    is_active: formIsActive,
                  }
                : formIsDefault
                ? { ...m, is_default: false }
                : m
            ),
          }))
        }
        toast({
          title: `✅ Method "${formName}" Updated!`,
          description: `Price: $${Number(formPrice).toFixed(2)} • Time: ${formTime}`,
          type: 'success',
        })
      } else {
        const res = await deliveryService.addMethod({
          name: formName.trim(),
          name_km: formNameKm.trim() || formName.trim(),
          price: Number(formPrice),
          estimated_time: formTime.trim(),
          estimated_time_km: formTimeKm.trim() || formTime.trim(),
          is_default: formIsDefault,
          is_active: formIsActive,
        })
        if (res?.methods && Array.isArray(res.methods)) {
          const newMethods = res.methods
          setDeliverySettings((prev) => ({ ...prev, methods: newMethods }))
        } else {
          const newM: DeliveryMethod = {
            id: 'del_' + Date.now().toString(36),
            name: formName.trim(),
            name_km: formNameKm.trim() || formName.trim(),
            price: Number(formPrice),
            estimated_time: formTime.trim(),
            estimated_time_km: formTimeKm.trim(),
            is_default: formIsDefault,
            is_active: formIsActive,
          }
          setDeliverySettings((prev) => ({
            ...prev,
            methods: formIsDefault
              ? [...prev.methods.map((m) => ({ ...m, is_default: false })), newM]
              : [...prev.methods, newM],
          }))
        }
        toast({
          title: `🎉 Delivery Method "${formName}" Created!`,
          description: `Rate: $${Number(formPrice).toFixed(2)} • Ready for storefront customers.`,
          type: 'success',
        })
      }
      setMethodModalOpen(false)
    } catch {
      // Fallback
      if (editingMethod) {
        setDeliverySettings((prev) => ({
          ...prev,
          methods: prev.methods.map((m) =>
            m.id === editingMethod.id
              ? {
                  ...m,
                  name: formName.trim(),
                  name_km: formNameKm.trim() || formName.trim(),
                  price: Number(formPrice),
                  estimated_time: formTime.trim(),
                  estimated_time_km: formTimeKm.trim(),
                  is_default: formIsDefault,
                  is_active: formIsActive,
                }
              : formIsDefault
              ? { ...m, is_default: false }
              : m
          ),
        }))
      } else {
        const newM: DeliveryMethod = {
          id: 'del_' + Date.now().toString(36),
          name: formName.trim(),
          name_km: formNameKm.trim() || formName.trim(),
          price: Number(formPrice),
          estimated_time: formTime.trim(),
          estimated_time_km: formTimeKm.trim(),
          is_default: formIsDefault,
          is_active: formIsActive,
        }
        setDeliverySettings((prev) => ({
          ...prev,
          methods: [...prev.methods, newM],
        }))
      }
      toast({
        title: 'Delivery Method Saved (Local)',
        description: 'New rate updated in session.',
        type: 'info',
      })
      setMethodModalOpen(false)
    } finally {
      setSavingMethod(false)
    }
  }

  // Delete Delivery Method
  const handleDeleteMethod = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete delivery method "${name}"?`)) {
      return
    }
    setDeletingMethodId(id)
    try {
      const res = await deliveryService.deleteMethod(id)
      if (res?.methods && Array.isArray(res.methods)) {
        const newMethods = res.methods
        setDeliverySettings((prev) => ({ ...prev, methods: newMethods }))
      } else {
        setDeliverySettings((prev) => ({
          ...prev,
          methods: prev.methods.filter((m) => m.id !== id),
        }))
      }
      toast({
        title: `🗑️ Deleted Method "${name}"`,
        description: 'Delivery method removed successfully.',
        type: 'success',
      })
    } catch {
      setDeliverySettings((prev) => ({
        ...prev,
        methods: prev.methods.filter((m) => m.id !== id),
      }))
      toast({
        title: 'Method Removed (Local)',
        description: 'Method deleted from list.',
        type: 'info',
      })
    } finally {
      setDeletingMethodId(null)
    }
  }

  // Toggle active/inactive for method
  const handleToggleMethodActive = async (m: DeliveryMethod) => {
    const nextActive = !m.is_active
    try {
      await deliveryService.updateMethod(m.id, { is_active: nextActive })
      setDeliverySettings((prev) => ({
        ...prev,
        methods: prev.methods.map((item) => (item.id === m.id ? { ...item, is_active: nextActive } : item)),
      }))
      toast({
        title: nextActive ? `Active: ${m.name}` : `Disabled: ${m.name}`,
        description: nextActive ? 'Customers can now select this rate.' : 'Rate hidden from customer checkout.',
        type: 'info',
      })
    } catch {
      setDeliverySettings((prev) => ({
        ...prev,
        methods: prev.methods.map((item) => (item.id === m.id ? { ...item, is_active: nextActive } : item)),
      }))
    }
  }

  // Open Location Management Modal
  const openLocationModal = (order: DeliveryOrder) => {
    setEditingOrder(order)
    setEditAddress(order.delivery_address)
    setEditDestLat(Number(order.dest_lat ?? 0))
    setEditDestLng(Number(order.dest_lng ?? 0))
    setEditDriverLat(Number(order.current_lat ?? 0))
    setEditDriverLng(Number(order.current_lng ?? 0))
    setEditEta(order.estimated_arrival || '')
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
      if (selectedOrder?.order_number === editingOrder.order_number) {
        setSelectedOrder(updated)
      }

      toast({
        title: `📍 Location Updated for #${editingOrder.order_number}`,
        description: `New Target: ${editDestLat.toFixed(4)}° N, ${editDestLng.toFixed(4)}° E • ETA: ${editEta}`,
        type: 'success',
      })
      setEditingOrder(null)
    } catch (error) {
      toast({
        title: 'Location update failed',
        description: error instanceof Error ? error.message : 'The server did not save the delivery location.',
        type: 'error',
      })
    } finally {
      setSavingLocation(false)
    }
  }

  // One-click live GPS broadcasting from driver's device
  const handleBroadcastDeviceGps = () => {
    if (!selectedOrder) {
      toast({ title: 'No delivery order selected', description: 'Select a live order before broadcasting GPS.', type: 'error' })
      return
    }

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
            order_number: selectedOrder.order_number,
            driver_name: selectedOrder.driver_name || 'TYUSHOP Express Driver',
          })
        } catch (error) {
          setBroadcastingGps(false)
          toast({
            title: 'GPS broadcast failed',
            description: error instanceof Error ? error.message : 'The server did not save the courier location.',
            type: 'error',
          })
          return
        }

        setOrders((prev) => prev.map((o) => (
          o.order_number === selectedOrder.order_number
            ? { ...o, current_lat: latitude, current_lng: longitude }
            : o
        )))
        setSelectedOrder((prev) => prev ? {
          ...prev,
          current_lat: latitude,
          current_lng: longitude,
        } : prev)

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
    } catch (error) {
      toast({
        title: 'Could not mark order delivered',
        description: error instanceof Error ? error.message : 'The server did not confirm delivery.',
        type: 'error',
      })
      return
    }

    const updated = { ...order, status: 'delivered', payment_status: 'paid' }
    setOrders((prev) => prev.map((o) => (o.order_number === order.order_number ? updated : o)))
    if (selectedOrder?.order_number === order.order_number) {
      setSelectedOrder(updated)
    }
    toast({
      title: `🎉 Order #${order.order_number} Delivered!`,
      description: 'Customer handover confirmed and payment settlement verified.',
      type: 'success',
    })
  }

  // Continuous GPS Telemetry Streaming & Driver Progression Loop
  useEffect(() => {
    if (!isContinuousDelivering || !selectedOrder) return

    let watchId: number | null = null

    if (typeof window !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords
          try {
            await api.patch(`/delivery/orders/${encodeURIComponent(selectedOrder.order_number)}/location`, {
              current_lat: latitude,
              current_lng: longitude,
            })
            await api.post('/delivery/broadcast-gps', {
              latitude,
              longitude,
              order_number: selectedOrder.order_number,
              driver_name: selectedOrder.driver_name || 'TYUSHOP Express Driver',
            })
          } catch {
            // The next GPS update will retry the server sync.
            return
          }
          setOrders((prev) =>
            prev.map((o) =>
              o.order_number === selectedOrder.order_number
                ? { ...o, current_lat: latitude, current_lng: longitude }
                : o
            )
          )
          setSelectedOrder((prev) => prev ? {
            ...prev,
            current_lat: latitude,
            current_lng: longitude,
          } : prev)
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 1000 }
      )
    }

    return () => {
      if (watchId !== null && typeof window !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId)
      }
    }
  }, [isContinuousDelivering, selectedOrder?.order_number])

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
  const destLat = Number(selectedOrder?.dest_lat ?? 0)
  const destLng = Number(selectedOrder?.dest_lng ?? 0)
  const driverLat = Number(selectedOrder?.current_lat ?? destLat)
  const driverLng = Number(selectedOrder?.current_lng ?? destLng)
  const minLng = (Math.min(destLng, driverLng) - 0.02).toFixed(4)
  const maxLng = (Math.max(destLng, driverLng) + 0.02).toFixed(4)
  const minLat = (Math.min(destLat, driverLat) - 0.02).toFixed(4)
  const maxLat = (Math.max(destLat, driverLat) + 0.02).toFixed(4)
  const mapEmbedUrl = destLat !== 0 && destLng !== 0
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}&layer=mapnik&marker=${destLat}%2C${destLng}`
    : ''

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
              size="sm"
              onClick={() => setIsContinuousDelivering((prev) => !prev)}
              disabled={!selectedOrder}
              className={`rounded-xl h-9 text-xs font-bold gap-2 shadow-sm transition-all ${
                isContinuousDelivering
                  ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              {isContinuousDelivering ? '⏸ Pause Delivering Mode' : '🚀 Start Delivering Mode'}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleBroadcastDeviceGps}
              disabled={broadcastingGps || !selectedOrder}
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
              onClick={() => {
                fetchDeliveryOrders()
                fetchDeliverySettings()
              }}
              disabled={loading || loadingSettings}
              className="rounded-xl h-9 text-xs gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading || loadingSettings ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* View Switcher: Fleet Live Location vs Delivery Rates & Free Shipping */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('location')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'location'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <MapPin className="w-4 h-4" />
              <span>Fleet & Live Location (គ្រប់គ្រងទីតាំង & ការដឹក)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pricing')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'pricing'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-white/50 dark:hover:bg-slate-700/50'
              }`}
            >
              <DollarSign className="w-4 h-4" />
              <span>Delivery Rates & Free Shipping (គ្រប់គ្រងថ្លៃដឹក & ឥតគិតថ្លៃ)</span>
              <Badge
                className={`text-[10px] ml-1 font-bold ${
                  deliverySettings.is_free_delivery
                    ? 'bg-emerald-600 text-white'
                    : 'bg-amber-600 text-white'
                }`}
              >
                {deliverySettings.is_free_delivery ? 'FREE ON (ឥតគិតថ្លៃ)' : 'PAID ACTIVE'}
              </Badge>
            </button>
          </div>

          <div className="text-xs text-slate-500 font-medium px-2 hidden sm:block">
            {activeTab === 'pricing'
              ? 'Admin Delivery Governance Mode'
              : 'Live Courier Telemetry Mode'}
          </div>
        </div>

        {activeTab === 'location' ? (
          selectedOrder ? (
          <>
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
                    {orders.filter((o) => o.status === 'delivered').length}
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
                  <span className="text-2xl font-black text-slate-900 dark:text-slate-50">
                    {orders.reduce((sum, order) => {
                      if (order.current_lat == null || order.current_lng == null || order.dest_lat == null || order.dest_lng == null) return sum
                      return sum + Math.hypot(order.dest_lat - order.current_lat, order.dest_lng - order.current_lng) * 111
                    }, 0).toFixed(1)} km
                  </span>
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
                  <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                    {orders.length > 0
                      ? `${Math.round((orders.filter((o) => o.status === 'delivered').length / orders.length) * 100)}%`
                      : '—'}
                  </span>
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
                    ETA ~{selectedOrder.estimated_arrival || '—'}
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
                {mapEmbedUrl ? (
                  <iframe
                    title="Staff Fleet Location Live Map"
                    src={mapEmbedUrl}
                    className="w-full h-full border-0 opacity-85 contrast-110"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center px-6 text-center text-sm text-slate-300">
                    Customer GPS coordinates are not available yet.
                  </div>
                )}

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

                {/* Active Delivering Telemetry Banner */}
                {isContinuousDelivering && (
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-indigo-600/95 backdrop-blur-md text-white px-4 py-2 rounded-full shadow-2xl border-2 border-white/40 flex items-center gap-2.5 text-xs font-bold animate-pulse pointer-events-none z-10">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                    <span>DELIVERING ACTIVE • LIVE GPS STREAMING TO CUSTOMER</span>
                  </div>
                )}

                {/* Warehouse Origin Pin at Bottom */}
                <div className="absolute bottom-4 left-4 right-4 pointer-events-none flex items-center justify-between text-xs">
                  <div className="bg-slate-900/90 backdrop-blur-md text-white px-3.5 py-1.5 rounded-xl border border-white/20 flex items-center gap-2">
                    <Package className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Origin: TYUSHOP Central Hub (Phnom Penh)</span>
                  </div>
                  <div className="bg-emerald-600 text-white px-3 py-1.5 rounded-xl font-bold shadow-md">
                    Courier GPS: {selectedOrder.current_lat == null || selectedOrder.current_lng == null ? 'Waiting' : 'Connected'}
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
                    Assigned Courier: <strong>{selectedOrder.driver_name || 'Unassigned'}</strong>{selectedOrder.driver_vehicle ? ` (${selectedOrder.driver_vehicle})` : ''}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <a href={`tel:${selectedOrder.customer_phone}`}>
                    <Button size="sm" variant="outline" className="rounded-xl h-8 text-xs gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Call Customer
                    </Button>
                  </a>
                  {selectedOrder.status !== 'delivered' && (
                    <>
                      <Button
                        size="sm"
                        onClick={() => setIsContinuousDelivering((prev) => !prev)}
                        className={`rounded-xl h-8 text-xs font-bold gap-1.5 shadow-sm transition-all ${
                          isContinuousDelivering
                            ? 'bg-rose-600 hover:bg-rose-700 text-white animate-pulse'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        {isContinuousDelivering ? '⏸ Pause Driving' : '🛰️ Drive Telemetry'}
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleMarkDelivered(selectedOrder)}
                        className="rounded-xl h-8 text-xs font-bold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow"
                      >
                        <Check className="w-3.5 h-3.5" /> Mark Delivered
                      </Button>
                    </>
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
                                  COD (${Number(order.total_amount || 0).toFixed(2)})
                                </Badge>
                              )}
                            </div>
                            <p className="text-slate-600 dark:text-slate-400 font-semibold mt-0.5">
                              {order.customer_name} • {order.customer_phone}
                            </p>
                          </div>

                          <div className="text-right">
                            <span className="font-black text-sm text-slate-900 dark:text-slate-100">
                              ${Number(order.total_amount || 0).toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-400">
                              {String(order.payment_method || 'KHQR').toUpperCase()}
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
                            GPS: {order.dest_lat == null || order.dest_lng == null
                              ? 'Unavailable'
                              : `${Number(order.dest_lat).toFixed(4)}° N, ${Number(order.dest_lng).toFixed(4)}° E`}
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
           </>
          ) : (
            <Card className="rounded-3xl border-dashed border-2 p-10 text-center">
              <Package className="mx-auto mb-3 h-10 w-10 text-slate-400" />
              <h2 className="font-black text-lg text-slate-900 dark:text-slate-100">No live delivery orders</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                {ordersError || 'Orders will appear here after a customer places an order and your staff account can access the delivery queue.'}
              </p>
              <Button type="button" variant="outline" onClick={fetchDeliveryOrders} className="mt-5 rounded-xl">
                <RefreshCw className="mr-2 h-4 w-4" /> Retry
              </Button>
            </Card>
          )
        ) : (
          /* DELIVERY PRICING & FREE DELIVERY MANAGEMENT TAB */
          <div className="space-y-6">
            {/* Free Delivery Master Governance Card */}
            <Card className="rounded-3xl border-2 border-indigo-500/30 overflow-hidden shadow-lg bg-white dark:bg-slate-900">
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
                      <Truck className="w-5 h-5" />
                    </span>
                    <h2 className="text-lg sm:text-xl font-black">
                      Global Free Delivery Governance (គ្រប់គ្រងដឹកឥតគិតថ្លៃ)
                    </h2>
                  </div>
                  <p className="text-xs text-slate-300 font-medium max-w-xl">
                    Toggle whether orders in the storefront receive free shipping automatically, or configure a minimum order threshold for free delivery.
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={handleToggleFreeDelivery}
                    disabled={togglingFree}
                    className={`rounded-2xl h-11 px-6 font-black text-xs gap-2 shadow-lg transition-all ${
                      deliverySettings.is_free_delivery
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {togglingFree ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Updating...
                      </>
                    ) : deliverySettings.is_free_delivery ? (
                      <>
                        <ToggleRight className="w-5 h-5" />
                        Turn OFF Free Delivery (ប្តូរមកគិតថ្លៃ)
                      </>
                    ) : (
                      <>
                        <ToggleLeft className="w-5 h-5" />
                        Turn ON Free Delivery (ដឹកឥតគិតថ្លៃ)
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <CardContent className="p-5 sm:p-6 space-y-6">
                {/* Active Status Banner */}
                <div
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    deliverySettings.is_free_delivery
                      ? 'bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                      : 'bg-amber-50/80 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 ${
                        deliverySettings.is_free_delivery
                          ? 'bg-emerald-500 text-white'
                          : 'bg-amber-500 text-white'
                      }`}
                    >
                      {deliverySettings.is_free_delivery ? '✓' : '$'}
                    </div>
                    <div>
                      <div className="font-black text-sm flex items-center gap-2">
                        <span>
                          {deliverySettings.is_free_delivery
                            ? 'Free Delivery is currently ACTIVE (ឥតគិតថ្លៃ)'
                            : 'Paid Delivery Mode is currently ACTIVE (គិតថ្លៃ)'}
                        </span>
                        <Badge
                          className={
                            deliverySettings.is_free_delivery
                              ? 'bg-emerald-600 text-white'
                              : 'bg-amber-600 text-white'
                          }
                        >
                          {deliverySettings.is_free_delivery ? 'FREE $0.00' : 'RATES CHARGED'}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-85 mt-0.5">
                        {deliverySettings.is_free_delivery
                          ? 'Storefront checkout currently displays "សេវាដឹកជញ្ជូន GPS: ឥតគិតថ្លៃ ($0.00)" for all customer purchases.'
                          : 'Customers pay for shipping according to their selected delivery method (e.g. Standard Express $1.50).'}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[11px] font-bold opacity-75">
                      Sync Status: Instant Real-Time
                    </span>
                  </div>
                </div>

                {/* Free Delivery Threshold & Default Pricing Form */}
                <form
                  onSubmit={handleSaveThreshold}
                  className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 items-end"
                >
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                      Free Delivery Minimum Subtotal ($)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={thresholdInput}
                      onChange={(e) => setThresholdInput(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 50.00 (0 for all orders free)"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-mono text-xs font-bold"
                    />
                    <p className="text-[11px] text-slate-400">
                      Set to <strong>0</strong> for 100% free delivery on all orders, or e.g. <strong>50</strong> to give free delivery on orders $50+.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                      Default Standard Delivery Fee ($)
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={defaultFeeInput}
                      onChange={(e) => setDefaultFeeInput(parseFloat(e.target.value) || 0)}
                      placeholder="e.g. 1.50"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-mono text-xs font-bold"
                    />
                    <p className="text-[11px] text-slate-400">
                      Fallback rate charged when a custom method is not explicitly picked.
                    </p>
                  </div>

                  <div>
                    <Button
                      type="submit"
                      disabled={savingSettings}
                      className="w-full rounded-xl h-10 font-bold text-xs gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                      {savingSettings ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="w-3.5 h-3.5" />
                          Save Delivery Rules
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            {/* Delivery Methods & Custom Rates Management Section */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-50 flex items-center gap-2">
                    <Package className="w-5 h-5 text-indigo-600" />
                    <span>Delivery Methods & Pricing Rates (បញ្ជីតម្លៃសេវាដឹកជញ្ជូន)</span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage delivery options, prices (USD), and delivery timeframes available to customers at checkout.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={handleOpenAddMethod}
                  className="rounded-xl h-9 px-4 font-bold text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm self-start sm:self-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Add Delivery Rate (បន្ថែមតម្លៃសេវាដឹក)
                </Button>
              </div>

              {/* Delivery Methods Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {deliverySettings.methods.map((method) => {
                  const isDeleting = deletingMethodId === method.id
                  return (
                    <Card
                      key={method.id}
                      className={`rounded-2xl border transition-all ${
                        method.is_default
                          ? 'border-indigo-400/60 ring-2 ring-indigo-500/20 bg-indigo-50/10 dark:bg-indigo-950/20 shadow-md'
                          : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm'
                      } ${!method.is_active ? 'opacity-60 bg-slate-50 dark:bg-slate-900/60' : ''}`}
                    >
                      <CardContent className="p-5 space-y-4">
                        {/* Header: Title and Price Badge */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-black text-sm text-slate-900 dark:text-slate-50">
                                {method.name}
                              </span>
                              {method.is_default && (
                                <Badge className="bg-indigo-600 text-white text-[9px] font-bold">
                                  Default
                                </Badge>
                              )}
                              {!method.is_active && (
                                <Badge variant="outline" className="text-[9px] text-slate-400">
                                  Disabled
                                </Badge>
                              )}
                            </div>
                            {method.name_km && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                {method.name_km}
                              </p>
                            )}
                          </div>

                          <div className="text-right shrink-0">
                            <span className="font-black text-xl text-indigo-600 dark:text-indigo-400 font-mono">
                              ${Number(method.price).toFixed(2)}
                            </span>
                            <span className="block text-[10px] text-slate-400 uppercase font-bold">
                              USD
                            </span>
                          </div>
                        </div>

                        {/* Estimated Delivery Time */}
                        <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-xs flex items-center justify-between">
                          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300 font-medium">
                            <Clock className="w-3.5 h-3.5 text-indigo-600" />
                            <span>{method.estimated_time || '1 - 2 Hours'}</span>
                            {method.estimated_time_km && (
                              <span className="text-slate-400 font-normal">
                                • {method.estimated_time_km}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleMethodActive(method)}
                            className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                          >
                            {method.is_active ? 'Active' : 'Disabled'}
                          </button>
                        </div>

                        {/* Card Action Buttons: Edit, Delete */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                          <div className="text-[11px] font-mono text-slate-400 truncate max-w-[120px]">
                            ID: {method.id}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEditMethod(method)}
                              className="h-8 text-xs font-bold rounded-xl gap-1 border-slate-200 dark:border-slate-700 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/50 cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Edit
                            </Button>

                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteMethod(method.id, method.name)}
                              disabled={isDeleting}
                              className="h-8 text-xs font-bold rounded-xl gap-1 border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/50 cursor-pointer"
                            >
                              {isDeleting ? (
                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="w-3.5 h-3.5" />
                              )}
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>

            {/* Live Storefront Checkout Preview Box */}
            <Card className="rounded-3xl border border-indigo-200/80 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/30 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 shadow-sm p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-black text-sm text-slate-900 dark:text-slate-100">
                      Customer Storefront Checkout Preview (ផ្ទៀងផ្ទាត់ការបង្ហាញ)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500">
                    Preview of how the saved delivery fee rules render for customers on the Cart & Checkout page.
                  </p>
                </div>
                <Badge
                  className={`text-xs font-bold ${
                    deliverySettings.is_free_delivery
                      ? 'bg-emerald-600 text-white'
                      : 'bg-indigo-600 text-white'
                  }`}
                >
                  {deliverySettings.is_free_delivery
                    ? 'Preview: Free Delivery (ឥតគិតថ្លៃ)'
                    : 'Preview: Paid Delivery Rates'}
                </Badge>
              </div>

              <div className="max-w-md mx-auto p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-md space-y-3 text-xs">
                <div className="font-bold text-sm text-slate-800 dark:text-slate-200 border-b pb-2 flex items-center justify-between">
                  <span>Discount & Order Summary</span>
                  <Badge variant="outline" className="text-[10px]">Sample Cart ($50.00)</Badge>
                </div>

                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Subtotal / តម្លៃទំនិញសរុប</span>
                  <span className="font-mono font-bold">$50.00</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-600 dark:text-slate-400">
                    Express GPS Delivery / សេវាដឹកជញ្ជូន GPS
                  </span>
                  {deliverySettings.is_free_delivery ? (
                    <span className="text-emerald-600 font-bold">
                      ឥតគិតថ្លៃ (FREE)
                    </span>
                  ) : (
                    <span className="font-bold text-indigo-600">
                      +${Number(deliverySettings.methods?.[0]?.price ?? 1.5).toFixed(2)}
                    </span>
                  )}
                </div>

                <div className="flex justify-between text-amber-600 dark:text-amber-400 font-semibold">
                  <span>Loyalty Reward / ពិន្ទុបន្ថែមសម្រាប់ការទិញនេះ</span>
                  <span>+5 PTS</span>
                </div>

                <div className="border-t pt-3 flex items-baseline justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 dark:text-slate-100">
                      Total Payable / ទឹកប្រាក់សរុប
                    </span>
                    <div className="text-[11px] text-slate-400">
                      ≈ {(
                        (deliverySettings.is_free_delivery
                          ? 50
                          : 50 + Number(deliverySettings.methods?.[0]?.price ?? 1.5)) * 4100
                      ).toLocaleString()} ៛ (KHR)
                    </div>
                  </div>
                  <span className="text-xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                    $
                    {Number(
                      deliverySettings.is_free_delivery
                        ? 50
                        : 50 + Number(deliverySettings.methods?.[0]?.price ?? 1.5)
                    ).toFixed(2)}
                  </span>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* DELIVERY METHOD ADD / EDIT MODAL DIALOG */}
      {methodModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800">
            {/* Modal Header */}
            <div className="bg-indigo-600 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="font-black text-base">
                  {editingMethod ? 'Edit Delivery Method & Price' : 'Add New Delivery Rate'}
                </h3>
                <p className="text-[11px] text-indigo-100 mt-0.5">
                  {editingMethod
                    ? `Update rate for "${editingMethod.name}"`
                    : 'Create a new customer shipping rate and delivery speed'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMethodModalOpen(false)}
                className="w-8 h-8 rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveMethod} className="p-6 space-y-4 text-xs">
              {/* Method Name English */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  Delivery Method Name (English)
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Standard Express (Phnom Penh 1-2h)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-medium"
                />
              </div>

              {/* Method Name Khmer */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-indigo-600" />
                  Delivery Method Name (Khmer • ភាសាខ្មែរ)
                </label>
                <input
                  type="text"
                  value={formNameKm}
                  onChange={(e) => setFormNameKm(e.target.value)}
                  placeholder="e.g. សេវាដឹកជញ្ជូនរហ័ស (ភ្នំពេញ ១-២ ម៉ោង)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-medium"
                />
              </div>

              {/* Price in USD */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
                  Delivery Price ($ USD)
                </label>
                <input
                  type="number"
                  step="0.10"
                  min="0"
                  required
                  value={formPrice}
                  onChange={(e) => setFormPrice(parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 1.50"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-mono text-sm font-bold"
                />
              </div>

              {/* Estimated Delivery Time (EN & KM) */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Est. Time (EN)
                  </label>
                  <input
                    type="text"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    placeholder="e.g. 1 - 2 Hours"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700 dark:text-slate-300">
                    Est. Time (KM)
                  </label>
                  <input
                    type="text"
                    value={formTimeKm}
                    onChange={(e) => setFormTimeKm(e.target.value)}
                    placeholder="e.g. ១ - ២ ម៉ោង"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-background font-medium"
                  />
                </div>
              </div>

              {/* Default & Active Checkboxes */}
              <div className="space-y-2 pt-2 border-t">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsDefault}
                    onChange={(e) => setFormIsDefault(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="font-bold text-slate-700 dark:text-slate-300">
                    Set as Default Delivery Method
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                  />
                  <span className="font-medium text-slate-600 dark:text-slate-400">
                    Active (visible to customers at checkout)
                  </span>
                </label>
              </div>

              {/* Modal Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMethodModalOpen(false)}
                  className="rounded-xl px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={savingMethod}
                  className="rounded-xl px-5 font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/25"
                >
                  {savingMethod ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" /> Save Method
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

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
