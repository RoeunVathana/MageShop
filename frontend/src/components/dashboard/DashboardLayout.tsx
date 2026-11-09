import React, { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Bell,
  Menu,
  X,
  LogOut,
  ChevronRight,
  Home,
  ShieldCheck,
  User,
  LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useToast } from '@/components/ui/toast'
import { Logo } from '@/components/ui/logo'
import { cn } from '@/lib/utils'
import { authService } from '@/services/auth.service'

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
  roleColor = 'text-indigo-600 dark:text-indigo-400',
  navItems,
  children,
}: DashboardLayoutProps) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false)
  const [notificationsCount, setNotificationsCount] = useState(3)
  const location = useLocation()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState(() => authService.getStoredUser())

  useEffect(() => {
    const handleAuthChange = () => {
      setCurrentUser(authService.getStoredUser())
    }
    window.addEventListener('tyushop-auth-changed', handleAuthChange)
    return () => window.removeEventListener('tyushop-auth-changed', handleAuthChange)
  }, [])

  const handleNotificationClick = () => {
    toast({
      title: 'Notifications Hub',
      description: 'All system notifications, KHQR payments, and Telegram reports are up to date.',
      type: 'info',
    })
    setNotificationsCount(0)
  }

  const handleLogout = async () => {
    await authService.logout()
    toast({
      title: 'Signed Out',
      description: 'Your session has been securely terminated.',
      type: 'info',
    })
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100">
      {/* Desktop Sticky Sidebar - Permanently pinned to viewport when scrolling page */}
      <aside className="hidden lg:flex flex-col w-68 border-r border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 z-30 shrink-0 sticky top-0 h-screen">
        {/* Brand */}
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200/80 dark:border-slate-800 shrink-0">
          <Link to="/" aria-label="TYUSHOP Home">
            <Logo size="sm" subtitle="WORKSPACE" />
          </Link>
        </div>

        {/* Role Badge Indicator */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/40 shrink-0">
          <div className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Active Workspace
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className={cn('text-sm font-bold', roleColor)}>{roleTitle}</span>
            <Badge
              variant="outline"
              className="text-[10px] rounded-lg border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300 flex items-center gap-1"
            >
              <ShieldCheck className="w-3 h-3" /> Verified
            </Badge>
          </div>
        </div>

        {/* Navigation Items - Self-scrolling if menu exceeds viewport height */}
        <nav className="flex-1 px-4 py-5 space-y-1.5 overflow-y-auto overscroll-contain">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all',
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-sm shadow-indigo-600/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={cn(
                      'text-[10px] px-2 py-0.5 rounded-lg font-bold',
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
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
        <div className="p-4 border-t border-slate-200/80 dark:border-slate-800 space-y-2.5 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
          <Link to="/">
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs gap-2 rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Home className="w-3.5 h-3.5" /> Return to Storefront
            </Button>
          </Link>
          <div className="text-[10px] text-slate-400 text-center">
            TYUSHOP Enterprise • Support 016 555 637
          </div>
        </div>
      </aside>

      {/* Responsive Mobile Drawer Navigation with Backdrop Support */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-white dark:bg-slate-900 h-full shadow-2xl border-r border-slate-200 dark:border-slate-800 flex flex-col p-5 z-10 animate-in slide-in-from-left duration-300">
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <Link to="/" aria-label="TYUSHOP Home">
                <Logo size="sm" subtitle="WORKSPACE" />
              </Link>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileSidebarOpen(false)}
                className="h-8 w-8 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="py-3.5 border-b border-slate-200 dark:border-slate-800">
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Workspace</p>
              <p className={cn('text-xs font-bold mt-0.5', roleColor)}>{roleTitle}</p>
            </div>

            <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.label}
                    to={item.href}
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className={cn(
                      'flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all',
                      isActive
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={cn(
                          'text-[10px] px-2 py-0.5 rounded-lg font-bold',
                          isActive
                            ? 'bg-white/20 text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                )
              })}
            </nav>

            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <Link to="/" onClick={() => setIsMobileSidebarOpen(false)}>
                <Button variant="outline" size="sm" className="w-full text-xs gap-2 rounded-xl">
                  <Home className="w-3.5 h-3.5" /> Return to Storefront
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur sticky top-0 z-20 flex items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={() => setIsMobileSidebarOpen(true)}
              aria-label="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </Button>

            {/* Breadcrumb */}
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Link to="/" className="hover:text-indigo-600 transition-colors">
                Home
              </Link>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-semibold text-slate-800 dark:text-slate-200">{roleTitle}</span>
              <ChevronRight className="w-3.5 h-3.5 hidden sm:inline" />
              <span className="capitalize hidden sm:inline text-indigo-600 dark:text-indigo-400 font-medium">
                {location.pathname.split('/').pop() || 'Overview'}
              </span>
            </div>
          </div>

          {/* Right: Actions, Notifications, Profile, Theme */}
          <div className="flex items-center gap-2.5">
            {/* Notification Icon */}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNotificationClick}
              className="relative rounded-xl h-9 w-9 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Notifications"
            >
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              {notificationsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-indigo-600 text-[9px] font-bold text-white flex items-center justify-center">
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
                className="flex items-center gap-2 rounded-xl pl-2 pr-3 h-9 border-slate-200 dark:border-slate-700"
              >
                {currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser?.name || 'User'}
                    className="w-6 h-6 rounded-lg object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                    {(currentUser?.name || roleTitle).charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="hidden sm:inline text-xs font-semibold">
                  {currentUser?.name || roleTitle}
                </span>
              </Button>

              {isProfileMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setIsProfileMenuOpen(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-slate-800 dark:text-slate-100 shadow-xl z-50 animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-800">
                      <p className="text-xs font-bold truncate">{currentUser?.name || roleTitle}</p>
                      <p className="text-[11px] text-slate-500 truncate">{currentUser?.email}</p>
                    </div>

                    <div className="pt-1.5 space-y-0.5">
                      <Link
                        to={authService.isAdmin(currentUser) ? '/admin/profile' : '/profile'}
                        onClick={() => setIsProfileMenuOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                      >
                        <User className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                        <span>{authService.isAdmin(currentUser) ? 'Edit Admin Profile' : 'Edit My Profile'}</span>
                      </Link>

                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false)
                          handleLogout()
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" /> Sign Out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Area with Generous Whitespace (Full Width) */}
        <main className="flex-1 p-5 sm:p-8 lg:p-10 overflow-y-auto w-full">
          {children}
        </main>
      </div>
    </div>
  )
}
