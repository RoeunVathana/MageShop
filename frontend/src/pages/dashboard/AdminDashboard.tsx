import { Link } from 'react-router-dom'
import {
  Shield,
  Users,
  Store,
  DollarSign,
  Activity,
  AlertTriangle,
  Server,
  Lock,
  Package,
  Boxes,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function AdminDashboard() {
  return (
    <DashboardLayout
      roleTitle="Admin Control Center"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">System & Platform Governance</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Monitor ecosystem performance, vendor compliance, and core microservices.
          </p>
        </div>

        {/* Top metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Platform GMV (M-T-D)</p>
                <p className="text-xl font-bold mt-1 text-purple-600">$482,900</p>
              </div>
              <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
                <DollarSign className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Verified Merchants</p>
                <p className="text-xl font-bold mt-1">128</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
                <Store className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Active Customers</p>
                <p className="text-xl font-bold mt-1">14,250</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Vendor Audits Pending</p>
                <p className="text-xl font-bold mt-1 text-amber-600">4</p>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Vendor Approvals */}
        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Pending Merchant Onboarding Applications</CardTitle>
            <Badge variant="outline" className="text-xs">Mock Application Queue</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                vendor: 'Khmer Heritage Silk Co.',
                rep: 'Sokha Meng',
                taxId: 'KH-VAT-902194',
                category: 'Apparel & Handcrafted',
                status: 'Under Document Verification',
              },
              {
                vendor: 'Mekong Organic Roasters',
                rep: 'Vannak Lim',
                taxId: 'KH-VAT-884102',
                category: 'Specialty Coffee & Beverages',
                status: 'Awaiting Bank Compliance',
              },
            ].map((app) => (
              <div
                key={app.vendor}
                className="p-3.5 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold">{app.vendor}</span>
                    <Badge variant="warning" className="text-[10px]">
                      {app.status}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-0.5">Contact: {app.rep} • {app.category} • Tax: {app.taxId}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" className="h-7 text-xs">
                    Review Application
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

