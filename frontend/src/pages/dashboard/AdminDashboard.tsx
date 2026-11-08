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
  Coins,
  ArrowRight,
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

        {/* Currency & Exchange Rate Quick Access Card */}
        <Card className="rounded-3xl border shadow-sm bg-gradient-to-r from-indigo-50/70 via-slate-50 to-purple-50/70 dark:from-indigo-950/30 dark:via-slate-900/40 dark:to-purple-950/30">
          <CardContent className="p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-indigo-600/20 font-black">
                <Coins className="w-6 h-6" />
              </div>
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <h3 className="font-black text-sm text-foreground">Currency & Exchange Rate Customization</h3>
                  <Badge className="bg-indigo-600 text-white text-[10px]">USD / KHR</Badge>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Admin can customize default currency, edit the Cambodian market exchange rate (1$ = ? ៛), and control shopper currency visibility.
                </p>
              </div>
            </div>
            <Link to="/admin/currency" className="shrink-0">
              <Button size="sm" className="rounded-xl h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm">
                <span>Configure Currency</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </CardContent>
        </Card>

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

