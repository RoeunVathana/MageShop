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
import { useShopEngagement } from '@/context/ShopEngagementContext'

const warehouseNav: NavItem[] = [
  { label: 'Dock Overview', labelKm: 'ទិដ្ឋភាពទូទៅចំណត', href: '/dashboard/warehouse', icon: Boxes },
  { label: 'Inbound Shipments', labelKm: 'ទំនិញចូល', href: '/dashboard/warehouse/inbound', icon: ArrowDownToLine, badge: '5 trucks', badgeKm: 'ឡាន ៥' },
  { label: 'Outbound Picking', labelKm: 'ជ្រើសរើសទំនិញចេញ', href: '/dashboard/warehouse/picking', icon: ArrowUpFromLine, badge: '18 orders', badgeKm: 'បញ្ជាទិញ ១៨' },
  { label: 'Bin Stock Inventory', labelKm: 'ស្តុកក្នុងឃ្លាំង', href: '/dashboard/warehouse/inventory', icon: Barcode },
  { label: 'Return Logistics', labelKm: 'ការដឹកជញ្ជូនត្រឡប់', href: '/dashboard/warehouse/returns', icon: RotateCcw },
]

export function WarehouseDashboard() {
  const { t } = useShopEngagement()
  return (
    <DashboardLayout
      roleTitle="Warehouse Hub"
      roleTitleKm="មជ្ឈមណ្ឌលឃ្លាំង"
      roleSlug="warehouse"
      roleColor="text-teal-500"
      navItems={warehouseNav}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">{t('Fulfillment Facility Hub #01', 'មជ្ឈមណ្ឌលរៀបចំទំនិញ #០១')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {t('Phnom Penh South Distribution Center • Facility Capacity: 74% Occupied', 'មជ្ឈមណ្ឌលចែកចាយភាគខាងត្បូងភ្នំពេញ • សមត្ថភាពកន្លែងប្រើប្រាស់៖ ៧៤%')}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('Inbound Pallets', 'ប៉ាឡែតទំនិញចូល')}</p>
                <p className="text-xl font-bold mt-1 text-teal-600">32 {t('pallets', 'ប៉ាឡែត')}</p>
              </div>
              <div className="p-2.5 rounded-lg bg-teal-500/10 text-teal-500">
                <ArrowDownToLine className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('Picking Slips Ready', 'ប័ណ្ណជ្រើសរើសត្រៀមរួច')}</p>
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
                <p className="text-xs text-muted-foreground">{t('Dispatched Trucks', 'ឡានបានបញ្ជូន')}</p>
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
                <p className="text-xs text-muted-foreground">{t('RMA Return Scans', 'ស្កេនទំនិញត្រឡប់ RMA')}</p>
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
            <CardTitle className="text-base font-bold">{t('Active Warehouse Dock Slots', 'ចំណតឃ្លាំងកំពុងប្រើ')}</CardTitle>
            <Badge variant="outline" className="text-xs">{t('Phase 1 Mock Logistics', 'គំរូភស្តុភារ ដំណាក់កាល ១')}</Badge>
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

