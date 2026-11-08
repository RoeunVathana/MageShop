import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  Bell,
  Menu,
  X,
  User,
  LogOut,
  ChevronRight,
  ShieldAlert,
  Home,
  CheckCircle2,
  LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useToast } from '@/components/ui/toast'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: string
}

interface DashboardLayoutProps {
  roleTitle: string
  roleSlug: string
  roleColor?: string
  navItems: NavItem[]
  children: React.ReactNode
}

export function DashboardLayout({
  roleTitle,
  roleSlug,
  roleColor = 'text-primary',
  navItems,
  children,
}: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [notificationsCount, setNotificationsCount] = useState(3)
  const location = useLocation()
  const { toast } = useToast()

  const handleNotificationClick = () => {
    toast({
      title: 'Notifications Hub (Phase 1 Preview)',
      description: 'Real-time WebSocket notifications with Laravel Reverb connect in Phase 2.',
      type: 'info',
    })
    setNotificationsCount(0)
  }

  const handleLogout = () => {
    toast({
      title: 'Logout Action',
      description: 'Session termination and Sanctum token revocation simulate in Phase 1.',
      type: 'info',
    })
  }

  return (
    <div className="min-h-screen flex bg-muted/20 text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 border-r bg-card z-30 shrink-0">
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b">
          <Link to="/" aria-label="TYUSHOP Home">
            <Logo size="sm" subtitle="WORKSPACE" />
          </Link>
        </div>

        {/* Role Badge Indicator */}
        <div className="px-6 py-4 border-b bg-muted/40">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            Active Workspace
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className={cn('text-sm font-bold', roleColor)}>{roleTitle}</span>
            <Badge variant="outline" className="text-[10px]">
              Phase 1 Shell
            </Badge>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  'flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground font-semibold shadow-sm'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-1.5 py-0.5 rounded font-bold',
                      isActive ? 'bg-primary-foreground/20 text-white' : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* Storefront return link & footer */}
        <div className="p-4 border-t space-y-2">
          <Link to="/">
            <Button variant="outline" size="sm" className="w-full text-xs gap-2">
              <Home className="w-3.5 h-3.5" /> Return to Storefront
            </Button>
          </Link>
          <div className="text-[10px] text-muted-foreground text-center">
            TYUSHOP v1.0 • Phase 1
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-64 bg-card h-full shadow-2xl flex flex-col p-4 z-10 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between pb-3 border-b">
              <Link to="/" aria-label="TYUSHOP Home">
                <Logo size="sm" subtitle="WORKSPACE" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="h-8 w-8 rounded-full"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="py-3 border-b">
              <p className="text-[10px] text-muted-foreground uppercase font-bold">Workspace</p>
              <p className={cn('text-xs font-bold mt-0.5', roleColor)}>{roleTitle}</p>
            </div>

            <nav className="flex-1 py-3 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium',
                      isActive
                        ? 'bg-primary text-primary-foreground font-semibold'
                        : 'text-muted-foreground hover:bg-muted'
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                  </Link>
                )
              })}
            </nav>

            <div className="pt-3 border-t">
              <Link to="/" onClick={() => setIsMobileSidebarOpen(false)}>
                <Button variant="outline" size="sm" className="w-full text-xs gap-2">
                  <Home className="w-3.5 h-3.5" /> Return Storefront
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b bg-card/90 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsMobileSidebarOpen(true)}
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Link to="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-foreground">{roleTitle}</span>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="capitalize">{location.pathname.split('/').pop() || 'Overview'}</span>
            </div>
          </div>

          {/* Right: Actions, Notifications, Profile, Theme */}
          <div className="flex items-center gap-2">
            {/* Notification Icon */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotificationClick}
              className="relative rounded-full h-9 w-9"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-muted-foreground" />
              {notificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-rose-500 text-[9px] font-bold text-white flex items-center justify-center animate-pulse">
                  {notificationsCount}
                </span>
              )}
            </Button>

            {/* Theme Toggle */}
            <ThemeToggle />

            {/* Profile Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-2 rounded-full pl-2 pr-3 h-9"
              >
                <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                  {roleTitle.charAt(0)}
                </div>
                <span className="hidden sm:inline text-xs font-semibold">{roleTitle} Demo</span>
              </Button>

              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-card p-2 text-card-foreground shadow-xl z-50">
                    <div className="px-3 py-2 border-b">
                      <p className="text-xs font-bold">{roleTitle} Preview</p>
                      <p className="text-[11px] text-muted-foreground">demo.{roleSlug}@megacommerce.local</p>
                    </div>

                    <div className="py-1">
                      <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase">
                        Switch Dashboard Shell
                      </div>
                      {[
                        { name: 'Customer', url: '/dashboard/customer' },
                        { name: 'Seller', url: '/dashboard/seller' },
                        { name: 'Admin', url: '/dashboard/admin' },
                        { name: 'Staff', url: '/dashboard/staff' },
                        { name: 'Driver', url: '/dashboard/delivery' },
                        { name: 'Warehouse', url: '/dashboard/warehouse' },
                      ].map((item) => (
                        <Link
                          key={item.name}
                          to={item.url}
                          onClick={() => setIsProfileMenuOpen(false)}
                          className="block px-3 py-1 text-xs hover:bg-muted rounded-md"
                        >
                          {item.name} Dashboard
                        </Link>
                      ))}
                    </div>

                    <div className="pt-1 border-t">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out Placeholder
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Phase 1 Demo Banner */}
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-2.5 flex items-center gap-2 text-xs text-amber-800 dark:text-amber-200">
          <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
          <span>
            <strong>Phase 1 Shell Notice:</strong> This dashboard is an unauthenticated preview component. Protected route guards and role authorization activate in Phase 2.
          </span>
        </div>

        {/* Page Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

