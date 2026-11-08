import {
  PackageCheck,
  Boxes,
  Barcode,
  Truck,
  RotateCcw,
  ArrowDownToLine,
  ArrowUpFromLine,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const warehouseNav: NavItem[] = [
  { label: 'Dock Overview', href: '/dashboard/warehouse', icon: Boxes },
  { label: 'Inbound Shipments', href: '/dashboard/warehouse/inbound', icon: ArrowDownToLine, badge: '5 trucks' },
  { label: 'Outbound Picking', href: '/dashboard/warehouse/picking', icon: ArrowUpFromLine, badge: '18 orders' },
  { label: 'Bin Stock Inventory', href: '/dashboard/warehouse/inventory', icon: Barcode },
  { label: 'Return Logistics', href: '/dashboard/warehouse/returns', icon: RotateCcw },
]

export function WarehouseDashboard() {
  return (
    <DashboardLayout
      roleTitle="Warehouse Hub"
      roleSlug="warehouse"
      roleColor="text-teal-500"
      navItems={warehouseNav}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Fulfillment Facility Hub #01</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Phnom Penh South Distribution Center • Facility Capacity: 74% Occupied
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Inbound Pallets</p>
                <p className="text-xl font-bold mt-1 text-teal-600">32 pallets</p>
              </div>
              <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-500">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Picking Slips Ready</p>
                <p className="text-xl font-bold mt-1 text-indigo-600">18</p>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                <Barcode className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Dispatched Trucks</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">9</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Truck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">RMA Return Scans</p>
                <p className="text-xl font-bold mt-1 text-amber-600">4</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                <RotateCcw className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Active Warehouse Dock Slots</CardTitle>
            <Badge variant="outline" className="text-xs">Phase 1 Mock Logistics</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { dock: 'Dock Bay A-02', carrier: 'Mekong Express Fleet', items: 'Sony Electronics Restock', status: 'Unloading (60%)' },
              { dock: 'Dock Bay B-05', carrier: 'Phnom Penh Local Dispatch', items: 'Outbound Customer Batches', status: 'Staged for Pickup' },
            ].map((dock) => (
              <div
                key={dock.dock}
                className="p-3.5 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold">{dock.dock}</span>
                  <p className="font-medium text-foreground mt-0.5">{dock.carrier} • {dock.items}</p>
                </div>
                <Badge variant="outline" className="text-[10px] w-fit">
                  {dock.status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

