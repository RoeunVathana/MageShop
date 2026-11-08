import { Link } from 'react-router-dom'
import {
  Layers,
  CheckSquare,
  HelpCircle,
  FileText,
  Clock,
  UserCheck,
  MapPin,
  Truck,
  ExternalLink,
  Users,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const staffNav: NavItem[] = [
  { label: 'Work Queue', href: '/dashboard/staff', icon: Layers },
  { label: 'Staff & User Directory', href: '/dashboard/admin/users', icon: Users, badge: 'New' },
  { label: 'Delivery Location Manager', href: '/dashboard/delivery', icon: MapPin, badge: 'Live GPS' },
  { label: 'Catalog Reviews', href: '/dashboard/staff', icon: CheckSquare, badge: '9 pending' },
  { label: 'Support Tickets', href: '/dashboard/staff', icon: HelpCircle, badge: '3 open' },
  { label: 'Content Moderation', href: '/dashboard/staff', icon: FileText },
]

export function StaffDashboard() {
  return (
    <DashboardLayout
      roleTitle="Staff Operations Desk"
      roleSlug="staff"
      roleColor="text-indigo-600 dark:text-indigo-400"
      navItems={staffNav}
    >
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Support, Catalog & Location Operations
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Internal operations desk for moderation, support escalation, team members, and courier delivery dispatch.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link to="/dashboard/admin/users">
              <Button variant="outline" className="rounded-xl h-9 text-xs font-bold gap-2">
                <Users className="w-4 h-4 text-indigo-600" /> Team Directory
              </Button>
            </Link>
            <Link to="/dashboard/delivery">
              <Button className="rounded-xl h-9 text-xs font-bold gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                <MapPin className="w-4 h-4" /> Open Delivery Manager
              </Button>
            </Link>
          </div>
        </div>

        {/* Stat Cards with percentage indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Product Audits Assigned</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-xl font-bold text-indigo-600">9</p>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600">
                    <ArrowUpRight className="w-3 h-3" /> +14.2%
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-500">
                <CheckSquare className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Open Tickets</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-xl font-bold text-rose-600">3</p>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600">
                    <ArrowDownRight className="w-3 h-3" /> -25.0%
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-500">
                <HelpCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Resolved Today</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-xl font-bold text-emerald-600">24</p>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600">
                    <ArrowUpRight className="w-3 h-3" /> +18.5%
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500">
                <UserCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Avg Response Time</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <p className="text-xl font-bold text-foreground">14m</p>
                  <span className="inline-flex items-center text-[10px] font-bold text-emerald-600">
                    <ArrowDownRight className="w-3 h-3" /> -4m faster
                  </span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-3 flex flex-row items-center justify-between">
            <CardTitle className="text-base font-bold">Assigned Review Items</CardTitle>
            <Badge variant="outline" className="text-xs">Phase 1 Mock Work Queue</Badge>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              {
                id: 'AUD-8821',
                item: 'Apple MacBook Pro Listing Update (Spec Audit)',
                merchant: 'Official Apple Store',
                priority: 'High',
              },
              {
                id: 'AUD-8820',
                item: 'Vendor Store Description Translation (Khmer / English)',
                merchant: 'Sony Sound Hub',
                priority: 'Normal',
              },
            ].map((task) => (
              <div
                key={task.id}
                className="p-3.5 rounded-xl border bg-card/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <span className="font-bold">{task.id}</span>
                  <p className="font-medium text-foreground mt-0.5">{task.item}</p>
                  <p className="text-muted-foreground">Merchant: {task.merchant}</p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs">
                  Process Audit
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  )
}

