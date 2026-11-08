import {
  Layers,
  CheckSquare,
  HelpCircle,
  FileText,
  Clock,
  UserCheck,
} from 'lucide-react'
import { DashboardLayout, NavItem } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

const staffNav: NavItem[] = [
  { label: 'Work Queue', href: '/dashboard/staff', icon: Layers },
  { label: 'Catalog Reviews', href: '/dashboard/staff/catalog', icon: CheckSquare, badge: '9 pending' },
  { label: 'Support Tickets', href: '/dashboard/staff/tickets', icon: HelpCircle, badge: '3 open' },
  { label: 'Content Moderation', href: '/dashboard/staff/moderation', icon: FileText },
]

export function StaffDashboard() {
  return (
    <DashboardLayout
      roleTitle="Staff Operations Desk"
      roleSlug="staff"
      roleColor="text-indigo-500"
      navItems={staffNav}
    >
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight">Support & Catalog Operations</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Internal operations desk for moderation, support escalation, and vendor catalog validation.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Product Audits Assigned</p>
                <p className="text-xl font-bold mt-1 text-indigo-600">9</p>
              </div>
              <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-500">
                <CheckSquare className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Open Tickets</p>
                <p className="text-xl font-bold mt-1 text-rose-600">3</p>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
                <HelpCircle className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Resolved Today</p>
                <p className="text-xl font-bold mt-1 text-emerald-600">24</p>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
                <UserCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Avg Response Time</p>
                <p className="text-xl font-bold mt-1">14m</p>
              </div>
              <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
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

