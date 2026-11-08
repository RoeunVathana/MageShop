import {
  ShoppingBag,
  Heart,
  MapPin,
  Clock,
  Package,
  CreditCard,
  ChevronRight,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const customerNav: NavItem[] = [
  { label: 'Overview', href: '/dashboard/customer', icon: ShoppingBag },
  { label: 'My Orders', href: '/dashboard/customer/orders', icon: Package, badge: '2 active' },
  { label: 'Wishlist', href: '/wishlist', icon: Heart },
  { label: 'Saved Addresses', href: '/dashboard/customer/addresses', icon: MapPin },
  { label: 'Payment Methods', href: '/dashboard/customer/payments', icon: CreditCard },
]

export function CustomerDashboard() {
  return (
    <DashboardLayout
      roleTitle="Customer Portal"
      roleSlug="customer"
      roleColor="text-blue-500"
      navItems={customerNav}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Customer Account Overview</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Track recent orders, manage wishlist, and update delivery preferences.
          </p>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Orders</p>
                <p className="text-xl font-bold mt-1">14</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                <ShoppingBag className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Deliveries</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">2</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Package className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Wishlist Items</p>
                <p className="text-xl font-bold mt-1">8</p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
                <Heart className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Reward Points</p>
                <p className="text-xl font-bold mt-1 text-amber-600">450</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                <CreditCard className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Orders Mockup */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Recent Orders</CardTitle>
            <Badge variant="outline" className="text-xs">Phase 1 Mock Records</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                id: 'ORD-2026-9041',
                items: 'Apple MacBook Pro 16" M3 Max',
                vendor: 'Official Apple Store',
                date: 'Nov 7, 2026',
                status: 'In Transit (Out for Delivery)',
                badgeVariant: 'warning' as const,
                total: '$3,499.00',
              },
              {
                id: 'ORD-2026-8812',
                items: 'Sony WH-1000XM5 Wireless Headphones',
                vendor: 'Sony Sound Hub',
                date: 'Oct 28, 2026',
                status: 'Delivered',
                badgeVariant: 'success' as const,
                total: '$398.00',
              },
            ].map((ord) => (
              <div
                key={ord.id}
                className="p-4 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground">{ord.id}</span>
                    <Badge variant={ord.badgeVariant} className="text-[10px]">
                      {ord.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground">{ord.items} • Sold by {ord.vendor}</p>
                  <p className="text-[11px] text-muted-foreground">Placed on {ord.date}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-bold text-sm text-foreground">{ord.total}</span>
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    View Details
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

