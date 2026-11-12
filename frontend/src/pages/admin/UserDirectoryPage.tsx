import React, { useState, useMemo, useEffect } from 'react'
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  Shield,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ArrowUpDown,
  Filter,
  UserCheck,
  Trash2,
  Building,
  Truck,
  Sparkles,
  Key,
  XCircle,
  Save,
  RefreshCw,
  Award,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { Pagination } from '@/components/common/Pagination'
import { authService } from '@/services/auth.service'
import { api } from '@/lib/api'

export interface UserRole {
  id: number
  name: string
  slug: string
  description?: string
}

export interface TeamMember {
  id: number
  name: string
  email: string
  phone: string
  role: string
  roles: UserRole[]
  department: string
  status: 'active' | 'on_leave' | 'pending' | 'inactive' | 'suspended'
  accessLevel: 'admin' | 'staff' | 'courier' | 'seller' | 'customer'
  avatarUrl?: string
  joinedDate: string
}

const AVAILABLE_ROLES = [
  {
    slug: 'delivery_driver',
    name: 'DELIVERY_DRIVER',
    title: 'Delivery Driver / Courier',
    department: 'Logistics & Delivery',
    badge: 'Courier / GPS',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: Truck,
    description: 'Access to Delivery Fleet dashboard, order dispatch queue, and real-time GPS tracking.',
  },
  {
    slug: 'staff',
    name: 'STAFF',
    title: 'Operations Staff',
    department: 'Operations & Fulfillment',
    badge: 'Staff',
    color: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30',
    icon: ShieldCheck,
    description: 'Access to Staff portal, order processing, inventory updates, and customer support.',
  },
  {
    slug: 'seller',
    name: 'SELLER',
    title: 'Merchant Seller',
    department: 'Merchant Vendor',
    badge: 'Seller',
    color: 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30',
    icon: Building,
    description: 'Access to Seller dashboard, vendor product listings, and order fulfillment.',
  },
  {
    slug: 'warehouse_manager',
    name: 'WAREHOUSE_MANAGER',
    title: 'Warehouse Manager',
    department: 'Warehouse & Inventory',
    badge: 'Warehouse',
    color: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30',
    icon: Building,
    description: 'Access to physical warehouse receiving, stock valuation, and count audits.',
  },
  {
    slug: 'admin',
    name: 'ADMIN',
    title: 'Platform Administrator',
    department: 'Executive Governance',
    badge: 'Admin',
    color: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30',
    icon: Shield,
    description: 'Full administrative access to manage platform settings, users, finance, and security.',
  },
  {
    slug: 'customer',
    name: 'CUSTOMER',
    title: 'Retail Customer',
    department: 'Shoppers',
    badge: 'Customer',
    color: 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30',
    icon: Users,
    description: 'Standard retail customer account for purchasing items and managing personal profile.',
  },
]

const PERMISSION_OPTIONS = [
  { slug: 'delivery.update', label: 'Update Deliveries & Dispatch', group: 'Logistics' },
  { slug: 'delivery.tracking.view', label: 'Broadcast & View Live GPS', group: 'Logistics' },
  { slug: 'orders.view', label: 'View Customer Orders', group: 'Orders' },
  { slug: 'orders.update', label: 'Update Order Fulfillment Status', group: 'Orders' },
  { slug: 'inventory.adjust', label: 'Adjust Warehouse Stock Levels', group: 'Inventory' },
  { slug: 'products.create', label: 'Create & Edit Catalog Products', group: 'Catalog' },
  { slug: 'staff.manage', label: 'Manage Staff Privileges', group: 'Admin' },
]

const FALLBACK_MEMBERS: TeamMember[] = [
  {
    id: 1,
    name: 'Sokha Chan',
    email: 'sokha.chan@tyushop.blog',
    phone: '+855 12 889 900',
    role: 'DELIVERY_DRIVER',
    roles: [{ id: 4, name: 'DELIVERY_DRIVER', slug: 'delivery_driver' }],
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
    role: 'STAFF',
    roles: [{ id: 3, name: 'STAFF', slug: 'staff' }],
    department: 'Operations & Fulfillment',
    status: 'active',
    accessLevel: 'staff',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'Feb 01, 2026',
  },
  {
    id: 3,
    name: 'Roeun Vathana',
    email: 'vothanarern@gmail.com',
    phone: '+855 16 555 637',
    role: 'SUPER_ADMIN',
    roles: [{ id: 1, name: 'SUPER_ADMIN', slug: 'super_admin' }, { id: 2, name: 'ADMIN', slug: 'admin' }],
    department: 'Executive Governance',
    status: 'active',
    accessLevel: 'admin',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&q=80',
    joinedDate: 'Nov 12, 2025',
  },
]

export function UserDirectoryPage() {
  const { toast } = useToast()

  const [members, setMembers] = useState<TeamMember[]>(FALLBACK_MEMBERS)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDepartment, setSelectedDepartment] = useState('All Departments')
  const [selectedRole, setSelectedRole] = useState('all')
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [perPage, setPerPage] = useState<number>(10)
  const [sortBy, setSortBy] = useState<string>('id')
  const [sortDirection, setSortDirection] = useState<'desc' | 'asc'>('desc')

  // Role Assignment Modal State
  const [selectedMemberForRole, setSelectedMemberForRole] = useState<TeamMember | null>(null)
  const [targetRole, setTargetRole] = useState('staff')
  const [targetPermissions, setTargetPermissions] = useState<string[]>([])
  const [isAssigningRole, setIsAssigningRole] = useState(false)

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '+855 ',
    role: 'staff',
    status: 'active' as TeamMember['status'],
  })

  // Fetch real users from backend
  const fetchUsers = async () => {
    setLoading(true)
    try {
      const res: any = await api.get('/admin/security/users', { params: { per_page: 50 } })
      const rawUsers = res?.data || []

      const mapped: TeamMember[] = rawUsers.map((u: any) => {
        const roles: UserRole[] = u.roles || []
        const primaryRole = roles[0]?.name || (roles[0] as any)?.slug || 'CUSTOMER'
        const roleUpper = primaryRole.toUpperCase()

        let accessLevel: TeamMember['accessLevel'] = 'customer'
        let department = 'Shoppers'

        if (roleUpper.includes('ADMIN') || roleUpper.includes('SUPER')) {
          accessLevel = 'admin'
          department = 'Executive Governance'
        } else if (roleUpper.includes('DELIVERY') || roleUpper.includes('COURIER') || roleUpper.includes('DISPATCH')) {
          accessLevel = 'courier'
          department = 'Logistics & Delivery'
        } else if (roleUpper.includes('SELLER')) {
          accessLevel = 'seller'
          department = 'Merchant Vendor'
        } else if (roleUpper.includes('STAFF') || roleUpper.includes('MANAGER')) {
          accessLevel = 'staff'
          department = 'Operations & Fulfillment'
        }

        return {
          id: u.id,
          name: u.name,
          email: u.email,
          phone: u.phone_number || '+855 16 555 637',
          role: roleUpper,
          roles,
          department,
          status: (u.status as any) || 'active',
          accessLevel,
          avatarUrl: u.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}&backgroundColor=4f46e5`,
          joinedDate: u.created_at ? new Date(u.created_at).toLocaleDateString() : 'Active',
        }
      })

      if (mapped.length > 0) {
        setMembers(mapped)
      }
    } catch (err: any) {
      console.warn('Could not load real users from backend:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Open Role Assignment Modal
  const handleOpenRoleModal = (member: TeamMember) => {
    setSelectedMemberForRole(member)
    const currentSlug = member.roles[0]?.slug || member.role.toLowerCase()
    const matched = AVAILABLE_ROLES.find((r) => r.slug === currentSlug || r.name === member.role)
    setTargetRole(matched ? matched.slug : 'staff')

    if (matched?.slug === 'delivery_driver') {
      setTargetPermissions(['delivery.update', 'delivery.tracking.view', 'orders.view'])
    } else if (matched?.slug === 'staff') {
      setTargetPermissions(['orders.view', 'orders.update', 'inventory.adjust', 'products.create'])
    } else {
      setTargetPermissions(['orders.view'])
    }
  }

  // Submit Role Assignment
  const handleSaveRole = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMemberForRole) return

    setIsAssigningRole(true)
    try {
      await authService.assignRoles(selectedMemberForRole.id, {
        role: targetRole,
        roles: [targetRole.toUpperCase()],
        permissions: targetPermissions,
      })

      const roleObj = AVAILABLE_ROLES.find((r) => r.slug === targetRole)
      toast({
        title: '🎉 Role Assigned Successfully',
        description: `${selectedMemberForRole.name} is now granted the "${roleObj?.title || targetRole}" role with active permissions.`,
        type: 'success',
      })

      setSelectedMemberForRole(null)
      fetchUsers()
    } catch (err: any) {
      toast({
        title: 'Role Assignment Failed',
        description: err?.message || 'Could not update user roles in the database.',
        type: 'error',
      })
    } finally {
      setIsAssigningRole(false)
    }
  }

  // Toggle permission checkbox in modal
  const handleTogglePermission = (permSlug: string) => {
    setTargetPermissions((prev) =>
      prev.includes(permSlug) ? prev.filter((p) => p !== permSlug) : [...prev, permSlug]
    )
  }

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
      await api.post('/admin/security/users', {
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone_number: formData.phone.trim(),
        status: formData.status,
        role: formData.role,
      })

      toast({
        title: '🎉 Account Created & Role Assigned',
        description: `${formData.name} was successfully enrolled as ${formData.role.toUpperCase()}.`,
        type: 'success',
      })

      setIsAddModalOpen(false)
      setFormData({
        name: '',
        email: '',
        phone: '+855 ',
        role: 'staff',
        status: 'active',
      })

      fetchUsers()
    } catch (err: any) {
      toast({
        title: 'Error Enrolling User',
        description: err?.message || 'Could not register user account.',
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Filtered members in real-time
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.phone.includes(searchQuery) ||
        m.role.toLowerCase().includes(searchQuery.toLowerCase())

      const matchesDepartment =
        selectedDepartment === 'All Departments' || m.department === selectedDepartment

      const matchesRole = selectedRole === 'all' || m.role.toLowerCase().includes(selectedRole.toLowerCase())

      return matchesSearch && matchesDepartment && matchesRole
    })
  }, [members, searchQuery, selectedDepartment, selectedRole])

  // Sorted by DESC by default (Newest members first)
  const sortedMembers = useMemo(() => {
    const list = [...filteredMembers]
    list.sort((a, b) => {
      let valA: any = a[sortBy as keyof TeamMember]
      let valB: any = b[sortBy as keyof TeamMember]

      if (sortBy === 'id') {
        valA = Number(a.id)
        valB = Number(b.id)
      } else {
        valA = String(valA || '').toLowerCase()
        valB = String(valB || '').toLowerCase()
      }

      if (valA < valB) return sortDirection === 'asc' ? -1 : 1
      if (valA > valB) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
    return list
  }, [filteredMembers, sortBy, sortDirection])

  const totalPages = Math.max(1, Math.ceil(sortedMembers.length / perPage))
  const paginatedMembers = useMemo(() => {
    const start = (currentPage - 1) * perPage
    return sortedMembers.slice(start, start + perPage)
  }, [sortedMembers, currentPage, perPage])

  const totalCount = members.length
  const courierCount = members.filter((m) => m.accessLevel === 'courier').length
  const staffCount = members.filter((m) => m.accessLevel === 'staff').length
  const adminCount = members.filter((m) => m.accessLevel === 'admin').length

  return (
    <DashboardLayout
      roleTitle="Staff & Role Permissions"
      roleSlug="admin"
      roleColor="text-indigo-600 dark:text-indigo-400"
      navItems={adminNavItems}
    >
      <div className="space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
                <Users className="w-7 h-7 text-indigo-600" />
                <span>User Directory & Role Permissions</span>
              </h1>
              <Badge className="bg-indigo-600 text-white font-bold text-xs">
                {totalCount} Total Accounts
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assign roles and permissions to Staff, Delivery Couriers, Merchants, and Administrators with instant database persistence.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsers}
              disabled={loading}
              className="rounded-xl h-9 text-xs font-bold gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Enroll Member</span>
            </Button>
          </div>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">Delivery Couriers</p>
                <p className="text-xl font-black mt-1 text-emerald-600">{courierCount}</p>
                <p className="text-[10px] text-muted-foreground">Live GPS Fleet Access</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Truck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">Staff Operations</p>
                <p className="text-xl font-black mt-1 text-blue-600">{staffCount}</p>
                <p className="text-[10px] text-muted-foreground">Catalog & Orders Staff</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">Administrators</p>
                <p className="text-xl font-black mt-1 text-purple-600">{adminCount}</p>
                <p className="text-[10px] text-muted-foreground">Super Admin & Admins</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                <Shield className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">Total Accounts</p>
                <p className="text-xl font-black mt-1 text-indigo-600">{totalCount}</p>
                <p className="text-[10px] text-muted-foreground">All Roles in System</p>
              </div>
              <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600">
                <Users className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter & Search Bar */}
        <Card className="rounded-2xl border shadow-sm">
          <CardContent className="p-4 flex flex-col md:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Input
                type="text"
                placeholder="Search by name, email, phone (+855), or role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 h-10 rounded-xl text-xs sm:text-sm"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto shrink-0">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="h-10 px-3 rounded-xl border bg-background text-xs font-bold focus:ring-2 focus:ring-indigo-500/30"
              >
                <option value="all">All Roles</option>
                <option value="delivery_driver">Delivery Driver / Courier</option>
                <option value="staff">Staff Operations</option>
                <option value="seller">Merchant Seller</option>
                <option value="warehouse">Warehouse Manager</option>
                <option value="admin">Administrator</option>
                <option value="customer">Customer</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="rounded-3xl border shadow-sm overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
                <RefreshCw className="w-8 h-8 animate-spin text-indigo-600" />
                <p className="text-xs text-muted-foreground font-semibold">Loading users and roles from database...</p>
              </div>
            ) : paginatedMembers.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                No user accounts found matching your query.
              </div>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-data-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="py-3 px-4">Member Account</th>
                      <th className="py-3 px-4">Assigned Roles</th>
                      <th className="py-3 px-4">Contact</th>
                      <th className="py-3 px-4">Department</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Role Governance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {paginatedMembers.map((member) => {
                      const isCourier = member.role.includes('DELIVERY') || member.role.includes('COURIER')
                      const isStaff = member.role.includes('STAFF')
                      const isAdmin = member.role.includes('ADMIN')
                      const isSeller = member.role.includes('SELLER')

                      return (
                        <tr key={member.id} className="hover:bg-muted/30 transition-colors duration-150">
                          {/* Member */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={member.avatarUrl}
                                alt={member.name}
                                className="w-9 h-9 rounded-xl object-cover border shrink-0 bg-slate-100"
                              />
                              <div>
                                <div className="font-black text-foreground text-xs">{member.name}</div>
                                <div className="text-[11px] text-muted-foreground font-mono">{member.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Assigned Roles */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {member.roles && member.roles.length > 0 ? (
                                member.roles.map((r) => (
                                  <Badge
                                    key={r.slug || r.name}
                                    className="font-bold text-[10px] uppercase bg-indigo-600/10 text-indigo-600 border border-indigo-600/20"
                                  >
                                    {r.name}
                                  </Badge>
                                ))
                              ) : (
                                <Badge
                                  className={
                                    isCourier
                                      ? 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px] font-bold'
                                      : isStaff
                                      ? 'bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px] font-bold'
                                      : isAdmin
                                      ? 'bg-purple-500/15 text-purple-600 border-purple-500/30 text-[10px] font-bold'
                                      : 'bg-muted text-muted-foreground text-[10px] font-bold'
                                  }
                                >
                                  {member.role}
                                </Badge>
                              )}
                            </div>
                          </td>

                          {/* Contact */}
                          <td className="py-3.5 px-4">
                            <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                              <Phone className="w-3 h-3 text-slate-400" />
                              <span>{member.phone}</span>
                            </div>
                          </td>

                          {/* Department */}
                          <td className="py-3.5 px-4 text-muted-foreground font-semibold text-[11px]">
                            {member.department}
                          </td>

                          {/* Status */}
                          <td className="py-3.5 px-4">
                            <Badge
                              className={
                                member.status === 'active'
                                  ? 'bg-emerald-500/15 text-emerald-600 text-[10px] font-bold'
                                  : 'bg-muted text-muted-foreground text-[10px] font-bold'
                              }
                            >
                              {member.status.toUpperCase()}
                            </Badge>
                          </td>

                          {/* Action Button: Assign Role */}
                          <td className="py-3.5 px-4 text-right">
                            <Button
                              size="sm"
                              onClick={() => handleOpenRoleModal(member)}
                              className="h-8 px-3 rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                            >
                              <Shield className="w-3.5 h-3.5" />
                              <span>Assign Role</span>
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

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
              itemName="users"
            />
          </CardContent>
        </Card>

        {/* Interactive Role & Permission Assignment Modal */}
        {selectedMemberForRole && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="relative w-full max-w-xl bg-card rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in-0 zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex items-start justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-foreground">
                        Assign Role & Permissions
                      </h2>
                      <p className="text-xs text-muted-foreground font-semibold">
                        Account: <span className="text-foreground font-black">{selectedMemberForRole.name}</span> ({selectedMemberForRole.email})
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedMemberForRole(null)}
                  className="rounded-full w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <form onSubmit={handleSaveRole} className="space-y-4">
                {/* 1. Select Role */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    Select Target Operational Role
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {AVAILABLE_ROLES.map((role) => {
                      const Icon = role.icon
                      const isSelected = targetRole === role.slug
                      return (
                        <div
                          key={role.slug}
                          onClick={() => {
                            setTargetRole(role.slug)
                            if (role.slug === 'delivery_driver') {
                              setTargetPermissions(['delivery.update', 'delivery.tracking.view', 'orders.view'])
                            } else if (role.slug === 'staff') {
                              setTargetPermissions(['orders.view', 'orders.update', 'inventory.adjust', 'products.create'])
                            }
                          }}
                          className={`p-3 rounded-2xl border cursor-pointer transition-all duration-150 flex items-start gap-2.5 ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/60 dark:bg-indigo-950/40 shadow-xs'
                              : 'border-border bg-card/60 hover:bg-muted/40'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                              isSelected ? 'bg-indigo-600 text-white' : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-foreground flex items-center justify-between">
                              <span>{role.title}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                              {role.description}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Granular Permissions Toggles */}
                <div className="space-y-2 pt-2 border-t">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground flex items-center justify-between">
                    <span>Granular System Permissions</span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {targetPermissions.length} Active
                    </span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {PERMISSION_OPTIONS.map((perm) => {
                      const isChecked = targetPermissions.includes(perm.slug)
                      return (
                        <label
                          key={perm.slug}
                          className={`p-2.5 rounded-xl border flex items-center gap-2 cursor-pointer text-xs font-bold transition-colors ${
                            isChecked
                              ? 'border-indigo-600/60 bg-indigo-50/40 dark:bg-indigo-950/20 text-foreground'
                              : 'border-border bg-card/40 text-muted-foreground hover:bg-muted/30'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePermission(perm.slug)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                          />
                          <div className="min-w-0">
                            <span className="block text-xs truncate">{perm.label}</span>
                            <span className="text-[9.5px] font-semibold text-muted-foreground font-mono">
                              {perm.slug}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="flex items-center justify-end gap-2 pt-4 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedMemberForRole(null)}
                    disabled={isAssigningRole}
                    className="rounded-xl h-10 text-xs font-bold"
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    disabled={isAssigningRole}
                    className="rounded-xl h-10 px-5 text-xs font-black gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isAssigningRole ? 'Assigning...' : 'Save Role & Permissions'}</span>
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Add Member Modal */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
            <div className="relative w-full max-w-lg bg-card rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <span>Enroll New Team Member</span>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <form onSubmit={handleAddMember} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Full Name</label>
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Sokha Chan"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="rounded-xl h-10 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Email Address</label>
                    <Input
                      type="email"
                      required
                      placeholder="name@tyushop.blog"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="rounded-xl h-10 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">Phone Number</label>
                    <Input
                      type="text"
                      placeholder="+855 12 345 678"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="rounded-xl h-10 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">Role Privilege</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-bold focus:ring-2 focus:ring-indigo-500/30 uppercase"
                  >
                    <option value="delivery_driver">Delivery Driver / Courier (Live GPS)</option>
                    <option value="staff">Operations Staff</option>
                    <option value="seller">Merchant Seller</option>
                    <option value="warehouse_manager">Warehouse Manager</option>
                    <option value="admin">Platform Administrator</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl h-10 text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl h-10 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {submitting ? 'Creating...' : 'Enroll Account'}
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
