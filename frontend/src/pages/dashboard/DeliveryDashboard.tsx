import {
  Truck,
  MapPin,
  CheckCircle,
  Navigation,
  Clock,
  Phone,
  AlertCircle,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const deliveryNav: NavItem[] = [
  { label: 'Today Route', href: '/dashboard/delivery', icon: Truck },
  { label: 'Active Delivery', href: '/dashboard/delivery/active', icon: Navigation, badge: 'Live' },
  { label: 'Delivery History', href: '/dashboard/delivery/history', icon: CheckCircle },
  { label: 'Fleet Shift Earnings', href: '/dashboard/delivery/earnings', icon: Clock },
]

export function DeliveryDashboard() {
  return (
    <DashboardLayout
      roleTitle="Delivery Fleet App"
      roleSlug="delivery"
      roleColor="text-amber-500"
      navItems={deliveryNav}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Driver Dispatch & Fulfillment</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Driver ID: <strong className="text-foreground">DRV-1029</strong> • Zone: Phnom Penh Central • Shift: Online
          </p>
        </div>

        {/* Phase 1 GPS Notice */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <span>
            <strong>Phase 1 Notice:</strong> Real-time GPS location streaming via WebSockets (Laravel Reverb) and interactive map routing will be integrated in Phase 2.
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Remaining Stops</p>
                <p className="text-xl font-bold mt-1 text-amber-600">4 stops</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Navigation className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Completed Today</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">12</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <CheckCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Distance Covered</p>
                <p className="text-xl font-bold mt-1">28.4 km</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Truck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Shift Tips & Fare</p>
                <p className="text-xl font-bold mt-1 text-primary">$46.50</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Stop */}
        <Card className="border-primary/40 bg-primary/5">
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground text-xs">Current Priority Stop</Badge>
              <CardTitle className="text-sm font-bold">Stop #13 (Estimated 8 mins away)</CardTitle>
            </div>
            <span className="text-xs font-bold text-foreground">PKG-9021-X</span>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-sm">Recipient: Sopheap Keo</p>
                <p className="text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-primary" /> #42 Street 240, Daun Penh, Phnom Penh
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> Call Customer
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5" /> Confirm Delivery
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

