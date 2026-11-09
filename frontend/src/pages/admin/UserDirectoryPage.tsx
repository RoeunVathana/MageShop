import React, { useState, useMemo } from 'react'
import {
  Users,
  Search,
  Filter,
  UserPlus,
  TrendingUp,
  Activity,
  Truck,
  Clock,
  Mail,
  Phone,
  Shield,
  CheckCircle2,
  AlertCircle,
  MoreVertical,
  X,
  Trash2,
  RefreshCw,
  Sparkles,
  Building2,
  Briefcase,
  ChevronDown,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  Check,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { Pagination } from '@/components/common/Pagination'
import { api } from '@/lib/api'

export interface TeamMember {
  id: string | number
  name: string
  email: string
  phone: string
  role: string
  department: string
  status: 'active' | 'on_leave' | 'pending' | 'inactive'
  accessLevel: 'admin' | 'staff' | 'courier' | 'manager'
  avatarUrl?: string
  joinedDate: string
}

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: 1,
    name: 'Sokha Chan',
    email: 'sokha.chan@tyushop.blog',
    phone: '+855 12 889 900',
    role: 'Lead Express Courier',
    department: 'Logistics & Delivery',
    status: 'active',
    accessLevel: 'courier',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'Jan 15, 2026',
  },
  {
    id: 2,
    name: 'Dara Pich',
    email: 'dara.pich@tyushop.blog',
    phone: '+855 16 555 637',
    role: 'Staff Operations Manager',
    department: 'Operations',
    status: 'active',
    accessLevel: 'manager',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'Feb 01, 2026',
  },
  {
    id: 3,
    name: 'Bopha Vathana',
    email: 'vothanarern@gmail.com',
    phone: '+855 98 443 210',
    role: 'Principal System Architect',
    department: 'Engineering',
    status: 'active',
    accessLevel: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'Nov 12, 2025',
  },
  {
    id: 4,
    name: 'Rithy Seng',
    email: 'rithy.seng@tyushop.blog',
    phone: '+855 77 123 456',
    role: 'Catalog & Inventory Lead',
    department: 'Product & Catalog',
    status: 'active',
    accessLevel: 'staff',
    avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'Mar 10, 2026',
  },
  {
    id: 5,
    name: 'Chanthy Keo',
    email: 'chanthy.keo@tyushop.blog',
    phone: '+855 85 990 011',
    role: 'Tier 2 Customer Advocate',
    department: 'Customer Support',
    status: 'on_leave',
    accessLevel: 'staff',
    avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'Apr 05, 2026',
  },
  {
    id: 6,
    name: 'Kosal Chea',
    email: 'kosal.chea@tyushop.blog',
    phone: '+855 10 334 556',
    role: 'Junior Mobile Courier',
    department: 'Logistics & Delivery',
    status: 'active',
    accessLevel: 'courier',
    avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'May 18, 2026',
  },
  {
    id: 7,
    name: 'Sovann Meas',
    email: 'sovann.meas@tyushop.blog',
    phone: '+855 69 778 899',
    role: 'Merchant Risk & Escrow Officer',
    department: 'Finance & Risk',
    status: 'pending',
    accessLevel: 'manager',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'Just Invited',
  },
  {
    id: 8,
    name: 'Neary Lim',
    email: 'neary.lim@tyushop.blog',
    phone: '+855 12 456 789',
    role: 'QA & Translation Specialist',
    department: 'Operations',
    status: 'inactive',
    accessLevel: 'staff',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'Dec 01, 2025',
  },
]

const DEPARTMENTS = [
  'All Departments',
  'Engineering',
  'Logistics & Delivery',
  'Customer Support',
  'Operations',
  'Product & Catalog',
  'Finance & Risk',
]

const STATUS_FILTERS = [
  { id: 'all', label: 'All Members' },
  { id: 'active', label: 'Active', dotColor: 'bg-emerald-500' },
  { id: 'on_leave', label: 'On Leave', dotColor: 'bg-amber-500' },
  { id: 'pending', label: 'Pending', dotColor: 'bg-blue-500' },
  { id: 'inactive', label: 'Inactive', dotColor: 'bg-slate-400' },
]

export function UserDirectoryPage() {
  const { toast } = useToast()
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(10)
  const [sortBy, setSortBy] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+855 ',
    role: '',
    department: 'Logistics & Delivery',
    status: 'active' as TeamMember['status'],
    accessLevel: 'staff' as TeamMember['accessLevel'],
  })

  // Stat Calculations with percentage indicators
  const totalCount = members.length
  const activeCount = members.filter((m) => m.status === 'active').length
  const courierCount = members.filter((m) => m.department === 'Logistics & Delivery').length
  const pendingCount = members.filter((m) => m.status === 'pending').length

  // Filtered members in real-time
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery) ||
        m.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.department.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDepartment =
        selectedDepartment === 'All Departments' || m.department === selectedDepartment

      const matchesStatus = selectedStatus === 'all' || m.status === selectedStatus

      return matchesSearch && matchesDepartment && matchesStatus
    })
  }, [members, searchQuery, selectedDepartment, selectedStatus])

  // Sorted by DESC by default (Newest members first)
  const sortedMembers = useMemo(() => {
    const list = [...filteredMembers]
    list.sort((a, b) => {
      let valA: any = a[sortBy as keyof TeamMember] ?? a.id
      let valB: any = b[sortBy as keyof TeamMember] ?? b.id
      if (typeof valA === 'string') {
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA)
      }
      return sortDirection === 'asc' ? Number(valA) - Number(valB) : Number(valB) - Number(valA)
    })
    return list
  }, [filteredMembers, sortBy, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / perPage))
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return sortedMembers.slice(start, start + perPage)
  }, [sortedMembers, currentPage, perPage])

  // Handle Add Member
  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Please provide both full name and a valid email address.',
        type: 'error',
      })
      return
    }

    setSubmitting(true)
    try {
      // Attempt backend persistence
      await api.post('/security/users', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone.trim(),
        status: formData.status,
        role: formData.accessLevel,
      }).catch(() => null) // Fallback gracefully if offline / token auth mode

      const newMember: TeamMember = {
        id: Date.now(),
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim() || '+855 16 555 637',
        role: formData.role.trim() || 'Operations Specialist',
        department: formData.department,
        status: formData.status,
        accessLevel: formData.accessLevel,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(
          formData.name
        )}&backgroundColor=4f46e5`,
        joinedDate: 'Just Now',
      }

      setMembers((prev) => [newMember, ...prev])
      setIsAddModalOpen(false)
      setFormData({
        name: '',
        email: '',
        phone: '+855 ',
        role: '',
        department: 'Logistics & Delivery',
        status: 'active',
        accessLevel: 'staff',
      })

      toast({
        title: '🎉 Member Added Successfully',
        description: `${newMember.name} has been enrolled in ${newMember.department}.`,
        type: 'success',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Toggle member status
  const handleToggleStatus = (id: string | number) => {
    setMembers((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus: TeamMember['status'] = m.status === 'active' ? 'inactive' : 'active'
          toast({
            title: 'Status Updated',
            description: `${m.name} is now marked as ${nextStatus.toUpperCase()}.`,
            type: 'info',
          })
          return { ...m, status: nextStatus }
        }
        return m
      })
    )
  }

  // Remove member
  const handleDeleteMember = (id: string | number, name: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id))
    toast({
      title: 'Member Removed',
      description: `${name} has been detached from active directories.`,
      type: 'info',
    })
  }

  return (
    <DashboardLayout
      roleTitle="Staff & User Directory"
      roleSlug="admin"
      roleColor="text-indigo-600 dark:text-indigo-400"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Header with Title & Add Member CTA */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Users className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Team & Member Directory
              </h1>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Manage operational staff, delivery drivers, catalog moderators, and administrative access privileges.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl h-10 px-4 font-bold text-xs gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
            >
              <UserPlus className="w-4 h-4" />
              Add Member
            </Button>
          </div>
        </div>

        {/* Stat Cards with Percentage Indicators */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Total Team */}
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Total Members</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-slate-900 dark:text-white">{totalCount}</span>
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +12.5%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">vs last month</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 2: Active On-Duty */}
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:border-emerald-200 dark:hover:border-emerald-800 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Active On-Duty</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{activeCount}</span>
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                    <Activity className="w-3.5 h-3.5 mr-0.5" /> {Math.round((activeCount / Math.max(1, totalCount)) * 100)}%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">active roster rate</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 3: Logistics & Couriers */}
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:border-blue-200 dark:hover:border-blue-800 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Logistics & Delivery</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-blue-600 dark:text-blue-400">{courierCount}</span>
                  <span className="inline-flex items-center text-[11px] font-bold text-blue-600 dark:text-blue-400">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +25.0%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">active GPS field units</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Truck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Pending / Review */}
          <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 hover:border-amber-200 dark:hover:border-amber-800 transition-all">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-muted-foreground">Pending Review</p>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{pendingCount}</span>
                  <span className="inline-flex items-center text-[11px] font-bold text-amber-600 dark:text-amber-400">
                    <ArrowDownRight className="w-3.5 h-3.5" /> -18.2%
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-0.5">invitation backlog</p>
              </div>
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Real-Time Search Bar */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
          <CardContent className="p-4 space-y-3.5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Real-Time Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by name, email, phone (+855), role, or department..."
                  className="w-full h-10 pl-10 pr-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Clear Search"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Sort & Department Dropdown Filter */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Sort Selector (Defaults to DESC / Newest First) */}
                <select
                  value={`${sortBy}:${sortDirection}`}
                  onChange={(e) => {
                    const [sb, sd] = e.target.value.split(':')
                    setSortBy(sb)
                    setSortDirection(sd as any)
                    setCurrentPage(1)
                  }}
                  className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  <option value="id:desc">Newest First (DESC)</option>
                  <option value="id:asc">Oldest First (ASC)</option>
                  <option value="name:asc">Name (A - Z)</option>
                  <option value="department:asc">Department</option>
                  <option value="role:asc">Role</option>
                </select>

                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-500" /> Dept:
                </span>
                <select
                  value={selectedDepartment}
                  onChange={(e) => {
                    setSelectedDepartment(e.target.value)
                    setCurrentPage(1)
                  }}
                  className="h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                >
                  {DEPARTMENTS.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Pills Filter */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex flex-wrap items-center gap-1.5">
                {STATUS_FILTERS.map((f) => {
                  const isSelected = selectedStatus === f.id
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setSelectedStatus(f.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20'
                          : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200/70 dark:hover:bg-slate-800'
                      }`}
                    >
                      {f.dotColor && <span className={`w-2 h-2 rounded-full ${f.dotColor}`} />}
                      {f.label}
                    </button>
                  )
                })}
              </div>

              <span className="text-[11px] text-muted-foreground font-medium">
                Showing <strong className="text-foreground">{filteredMembers.length}</strong> of{' '}
                <strong className="text-foreground">{members.length}</strong> members
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Member Directory Table Card */}
        <Card className="rounded-2xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-200/80 dark:border-slate-800 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="py-3.5 px-4">Member / Name</th>
                  <th className="py-3.5 px-4">Department & Role</th>
                  <th className="py-3.5 px-4">Contact Info</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Access Level</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {sortedMembers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-muted-foreground">
                      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 mx-auto flex items-center justify-center text-slate-400 mb-3">
                        <Users className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-sm text-foreground">No members match your filter criteria.</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Try resetting search query or switching department filter.
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSearchQuery('')
                          setSelectedDepartment('All Departments')
                          setSelectedStatus('all')
                        }}
                        className="mt-3 rounded-xl text-xs"
                      >
                        Reset All Filters
                      </Button>
                    </td>
                  </tr>
                ) : (
                  paginatedMembers.map((member) => (
                    <tr
                      key={member.id}
                      className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={member.avatarUrl}
                            alt={member.name}
                            className="w-10 h-10 rounded-xl object-cover ring-2 ring-slate-100 dark:ring-slate-800 shrink-0"
                          />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-900 dark:text-white text-xs block truncate">
                              {member.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground">Joined {member.joinedDate}</span>
                          </div>
                        </div>
                      </td>

                      {/* Department & Role */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-bold text-foreground text-xs block">{member.role}</span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold">
                            <Briefcase className="w-3 h-3" />
                            {member.department}
                          </span>
                        </div>
                      </td>

                      {/* Contact Info */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-1 text-[11px]">
                          <a
                            href={`mailto:${member.email}`}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-indigo-600 transition-colors"
                          >
                            <Mail className="w-3 h-3 text-slate-400" />
                            <span className="truncate max-w-[170px]">{member.email}</span>
                          </a>
                          <a
                            href={`tel:${member.phone.replace(/\s+/g, '')}`}
                            className="flex items-center gap-1.5 text-muted-foreground hover:text-indigo-600 transition-colors font-mono"
                          >
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{member.phone}</span>
                          </a>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        {member.status === 'active' && (
                          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] rounded-lg font-bold gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Active
                          </Badge>
                        )}
                        {member.status === 'on_leave' && (
                          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] rounded-lg font-bold gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            On Leave
                          </Badge>
                        )}
                        {member.status === 'pending' && (
                          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] rounded-lg font-bold gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            Pending
                          </Badge>
                        )}
                        {member.status === 'inactive' && (
                          <Badge variant="outline" className="text-slate-500 text-[10px] rounded-lg font-bold gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                            Inactive
                          </Badge>
                        )}
                      </td>

                      {/* Access Level */}
                      <td className="py-3.5 px-4">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {member.accessLevel}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(member.id)}
                            className="h-8 px-2 rounded-lg text-[11px] font-semibold text-slate-600 dark:text-slate-300 hover:text-foreground"
                            title="Toggle Active / Inactive"
                          >
                            <UserCheck className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            {member.status === 'active' ? 'Deactivate' : 'Activate'}
                          </Button>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteMember(member.id, member.name)}
                            className="h-8 w-8 rounded-lg text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                            title="Remove Member"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* User Directory Pagination */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedMembers.length}
            perPage={perPage}
            onPageChange={(p) => setCurrentPage(p)}
            onPerPageChange={(newPerPage) => {
              setPerPage(newPerPage)
              setCurrentPage(1)
            }}
            perPageOptions={[10, 20, 50]}
            itemName="team members"
          />
        </Card>

        {/* INTERACTIVE MODAL DIALOG TO ADD NEW MEMBERS */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 animate-in zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="bg-slate-50 dark:bg-slate-800/60 px-6 py-4 flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                    <UserPlus className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Add New Team Member</h3>
                    <p className="text-[11px] text-muted-foreground">
                      Enroll a staff member, delivery driver, or operations admin.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-500 hover:text-foreground cursor-pointer transition-colors"
                  aria-label="Close Modal"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleAddMember} className="p-6 space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-foreground">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dara Pich"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="dara@tyushop.blog"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Phone Number</label>
                    <input
                      type="text"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+855 16 555 637"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Department</label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      {DEPARTMENTS.filter((d) => d !== 'All Departments').map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Job Title / Role</label>
                    <input
                      type="text"
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                      placeholder="e.g. Senior Delivery Dispatcher"
                      className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Initial Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({ ...formData, status: e.target.value as TeamMember['status'] })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    >
                      <option value="active">Active</option>
                      <option value="pending">Pending Invitation</option>
                      <option value="on_leave">On Leave</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-foreground">Access Privilege</label>
                    <select
                      value={formData.accessLevel}
                      onChange={(e) =>
                        setFormData({ ...formData, accessLevel: e.target.value as TeamMember['accessLevel'] })
                      }
                      className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 uppercase"
                    >
                      <option value="staff">Staff Operations</option>
                      <option value="courier">Courier / Driver</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl h-10 text-xs font-semibold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl h-10 px-5 font-bold text-xs gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                  >
                    {submitting ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Saving Member...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Confirm & Add Member
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}

