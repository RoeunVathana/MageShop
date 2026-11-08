import {
  Store,
  DollarSign,
  Package,
  TrendingUp,
  PlusCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const sellerNav: NavItem[] = [
  { label: 'Store Overview', href: '/dashboard/seller', icon: Store },
  { label: 'Product Catalog', href: '/dashboard/seller/products', icon: Package, badge: '48 items' },
  { label: 'Orders & Fulfillment', href: '/dashboard/seller/orders', icon: Clock, badge: '6 pending' },
  { label: 'Revenue & Payouts', href: '/dashboard/seller/payouts', icon: DollarSign },
  { label: 'Analytics & Growth', href: '/dashboard/seller/analytics', icon: TrendingUp },
]

export function SellerDashboard() {
  return (
    <DashboardLayout
      roleTitle="Seller Merchant Hub"
      roleSlug="seller"
      roleColor="text-emerald-500"
      navItems={sellerNav}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Apex Digital Storefront</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Multi-Vendor Merchant ID: <strong className="text-foreground">VND-84920</strong> • Status: Verified Official
            </p>
          </div>
          <Button size="sm" className="gap-1.5 rounded-lg text-xs font-semibold">
            <PlusCircle className="w-3.5 h-3.5" /> Add New Listing
          </Button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">30-Day Gross Volume</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">$24,850.00</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Pending Orders</p>
                <p className="text-xl font-bold mt-1 text-amber-600">6</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Listings</p>
                <p className="text-xl font-bold mt-1">48</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Package className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Bakong Payout Balance</p>
                <p className="text-xl font-bold mt-1 text-primary">$4,120.00</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                <TrendingUp className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Store Orders Queue */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Store Fulfillment Queue</CardTitle>
            <Badge variant="outline" className="text-xs">Phase 1 Mock Dispatch</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                id: 'ORD-5541',
                customer: 'Sarah Jenkins',
                product: 'Sony WH-1000XM5 (Qty: 1)',
                amount: '$398.00',
                status: 'Awaiting Package Pick-up',
                badgeVariant: 'warning' as const,
              },
              {
                id: 'ORD-5539',
                customer: 'David Chan',
                product: 'Sony DualSense Edge Wireless Controller',
                amount: '$199.99',
                status: 'Dispatched to Fleet',
                badgeVariant: 'success' as const,
              },
            ].map((ord) => (
              <div
                key={ord.id}
                className="p-3.5 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{ord.id}</span>
                    <Badge variant={ord.badgeVariant} className="text-[10px]">
                      {ord.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{ord.product} • Buyer: {ord.customer}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-sm">{ord.amount}</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs">
                    Print Label
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

