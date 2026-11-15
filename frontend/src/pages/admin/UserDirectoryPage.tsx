import React, { useState, useMemo, useEffect } from 'react'
import {
  Users,
  Search,
  UserPlus,
  Mail,
  Phone,
  Pencil,
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
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { DashboardModal } from '@/components/ui/dashboard-modal'
import { Pagination } from '@/components/common/Pagination'
import { useShopEngagement } from '@/context/ShopEngagementContext'
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
    slug: 'courier',
    name: 'COURIER',
    title: 'Courier / Delivery Operator',
    department: 'Logistics & Delivery',
    badge: 'Courier / GPS',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: Truck,
    description: 'Access assigned delivery routes, live GPS tracking, and cash handover confirmation.',
  },
  {
    slug: 'delivery',
    name: 'DELIVERY',
    title: 'Legacy Delivery Operator',
    department: 'Logistics & Delivery',
    badge: 'Courier / GPS',
    color: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    icon: Truck,
    description: 'Backward-compatible delivery role for assigned routes and cash handover confirmation.',
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

const ROLE_TITLES_KM: Record<string, string> = {
  delivery_driver: 'អ្នកបើកបរដឹកជញ្ជូន / អ្នកនាំសំបុត្រ',
  courier: 'អ្នកនាំសំបុត្រ / ប្រតិបត្តិករដឹកជញ្ជូន',
  delivery: 'ប្រតិបត្តិករដឹកជញ្ជូនចាស់',
  staff: 'បុគ្គលិកប្រតិបត្តិការ',
  seller: 'អ្នកលក់ពាណិជ្ជករ',
  warehouse_manager: 'អ្នកគ្រប់គ្រងឃ្លាំង',
  admin: 'អ្នកគ្រប់គ្រងវេទិកា',
  customer: 'អតិថិជនលក់រាយ',
}

const ROLE_DESCRIPTIONS_KM: Record<string, string> = {
  delivery_driver: 'ចូលប្រើផ្ទាំងគ្រប់គ្រងកងដឹកជញ្ជូន ជួរបញ្ជូនទំនិញ និង GPS ផ្ទាល់។',
  courier: 'ចូលប្រើផ្លូវដឹកជញ្ជូនដែលបានកំណត់ GPS ផ្ទាល់ និងការបញ្ជាក់ប្រគល់សាច់ប្រាក់។',
  delivery: 'តួនាទីដឹកជញ្ជូនដែលអាចប្រើជាមួយប្រព័ន្ធចាស់ សម្រាប់ផ្លូវ និងការប្រគល់សាច់ប្រាក់។',
  staff: 'ចូលប្រើប្រព័ន្ធបុគ្គលិក ដំណើរការបញ្ជាទិញ កែស្តុក និងជំនួយអតិថិជន។',
  seller: 'ចូលប្រើផ្ទាំងអ្នកលក់ បញ្ជីផលិតផល និងការបំពេញការបញ្ជាទិញ។',
  warehouse_manager: 'គ្រប់គ្រងការទទួលទំនិញ ឯកសារស្តុក និងការត្រួតពិនិត្យចំនួនក្នុងឃ្លាំង។',
  admin: 'សិទ្ធិគ្រប់គ្រងពេញលេញលើការកំណត់វេទិកា អ្នកប្រើប្រាស់ ហិរញ្ញវត្ថុ និងសុវត្ថិភាព។',
  customer: 'គណនីអតិថិជនសម្រាប់ទិញទំនិញ និងគ្រប់គ្រងព័ត៌មានផ្ទាល់ខ្លួន។',
}

const PERMISSION_LABELS_KM: Record<string, string> = {
  'delivery.update': 'កែប្រែការដឹកជញ្ជូន និងការបែងចែកផ្លូវ',
  'delivery.tracking.view': 'ផ្សព្វផ្សាយ និងមើល GPS ផ្ទាល់',
  'orders.view': 'មើលការបញ្ជាទិញរបស់អតិថិជន',
  'orders.update': 'កែប្រែស្ថានភាពបំពេញការបញ្ជាទិញ',
  'inventory.adjust': 'កែសម្រួលកម្រិតស្តុកឃ្លាំង',
  'products.create': 'បង្កើត និងកែប្រែផលិតផលកាតាឡុក',
  'staff.manage': 'គ្រប់គ្រងសិទ្ធិបុគ្គលិក',
}

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
  const { t } = useShopEngagement()
  const { toast } = useToast()

  const roleTitle = (role: (typeof AVAILABLE_ROLES)[number]) =>
    t(role.title, ROLE_TITLES_KM[role.slug] || role.title)
  const roleDescription = (role: (typeof AVAILABLE_ROLES)[number]) =>
    t(role.description, ROLE_DESCRIPTIONS_KM[role.slug] || role.description)
  const permissionLabel = (permission: (typeof PERMISSION_OPTIONS)[number]) =>
    t(permission.label, PERMISSION_LABELS_KM[permission.slug] || permission.label)

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
  const [isEmailRoleModalOpen, setIsEmailRoleModalOpen] = useState(false)
  const [roleAssignmentEmail, setRoleAssignmentEmail] = useState('')

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
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    phone: '',
    status: 'active' as TeamMember['status'],
  })
  const [memberToDelete, setMemberToDelete] = useState<TeamMember | null>(null)

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

    if (matched?.slug === 'delivery_driver' || matched?.slug === 'courier' || matched?.slug === 'delivery') {
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
        title: t('🎉 Role Assigned Successfully', '🎉 បានកំណត់តួនាទីដោយជោគជ័យ'),
        description: `${selectedMemberForRole.name} ${t('is now granted the', 'ត្រូវបានកំណត់ជា')} "${roleObj ? roleTitle(roleObj) : targetRole}" ${t('role with active permissions.', 'ជាមួយសិទ្ធិសកម្ម។')}`,
        type: 'success',
      })

      setSelectedMemberForRole(null)
      fetchUsers()
    } catch (err: any) {
      toast({
        title: t('Role Assignment Failed', 'បរាជ័យក្នុងការកំណត់តួនាទី'),
        description: err?.message || t('Could not update user roles in the database.', 'មិនអាចកែប្រែតួនាទីអ្នកប្រើប្រាស់ក្នុងមូលដ្ឋានទិន្នន័យបានទេ។'),
        type: 'error',
      })
    } finally {
      setIsAssigningRole(false)
    }
  }

  // Assign a role to an existing account when the administrator only has the
  // account email. The backend performs the final role-governance check.
  const handleSaveRoleByEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    const email = roleAssignmentEmail.trim().toLowerCase()

    if (!email) {
      toast({
        title: t('Email Required', 'ត្រូវការអ៊ីមែល'),
        description: t('Enter the email address of an existing user account.', 'សូមបញ្ចូលអ៊ីមែលរបស់គណនីអ្នកប្រើប្រាស់ដែលមានស្រាប់។'),
        type: 'error',
      })
      return
    }

    setIsAssigningRole(true)
    try {
      const response: any = await authService.assignRolesByEmail(email, {
        role: targetRole,
        roles: [targetRole.toUpperCase()],
      })
      const roleObj = AVAILABLE_ROLES.find((role) => role.slug === targetRole)
      const assignedName = response?.data?.name || email

      toast({
        title: t('🎉 Role Assigned Successfully', '🎉 បានកំណត់តួនាទីដោយជោគជ័យ'),
        description: `${assignedName} ${t('is now assigned the', 'ត្រូវបានកំណត់ជា')} "${roleObj ? roleTitle(roleObj) : targetRole}" ${t('role.', '។')}`,
        type: 'success',
      })

      setIsEmailRoleModalOpen(false)
      setRoleAssignmentEmail('')
      fetchUsers()
    } catch (err: any) {
      toast({
        title: t('Role Assignment Failed', 'បរាជ័យក្នុងការកំណត់តួនាទី'),
        description: err?.message || t('Could not find or update this user account.', 'រកមិនឃើញ ឬមិនអាចកែប្រែគណនីអ្នកប្រើប្រាស់នេះបានទេ។'),
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
        title: t('Validation Error', 'កំហុសក្នុងការបំពេញទិន្នន័យ'),
        description: t('Please provide both full name and a valid email address.', 'សូមបញ្ចូលឈ្មោះពេញ និងអ៊ីមែលដែលត្រឹមត្រូវ។'),
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
        title: t('🎉 Account Created & Role Assigned', '🎉 បានបង្កើតគណនី និងកំណត់តួនាទីដោយជោគជ័យ'),
        description: `${formData.name} ${t('was successfully enrolled as', 'ត្រូវបានចុះឈ្មោះជា')} ${formData.role.toUpperCase()}.`,
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
        title: t('Error Enrolling User', 'កំហុសក្នុងការចុះឈ្មោះអ្នកប្រើប្រាស់'),
        description: err?.message || t('Could not register user account.', 'មិនអាចចុះឈ្មោះគណនីអ្នកប្រើប្រាស់បានទេ។'),
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleOpenEditMember = (member: TeamMember) => {
    setEditingMember(member)
    setEditFormData({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      status: member.status,
    })
  }

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingMember || !editFormData.name.trim() || !editFormData.email.trim()) {
      toast({
        title: t('Validation Error', 'កំហុសក្នុងការបំពេញទិន្នន័យ'),
        description: t('Please provide a name and valid email address.', 'សូមបញ្ចូលឈ្មោះ និងអ៊ីមែលដែលត្រឹមត្រូវ។'),
        type: 'error',
      })
      return
    }

    setSubmitting(true)
    try {
      await api.patch('/admin/security/users/' + editingMember.id, {
        name: editFormData.name.trim(),
        email: editFormData.email.trim(),
        phone_number: editFormData.phone.trim() || null,
        status: editFormData.status,
      })

      toast({
        title: t('User Updated', 'បានកែប្រែអ្នកប្រើប្រាស់'),
        description: editFormData.name.trim() + ` ${t('was updated successfully.', 'ត្រូវបានកែប្រែដោយជោគជ័យ។')}`,
        type: 'success',
      })
      setEditingMember(null)
      fetchUsers()
    } catch (err: any) {
      toast({
        title: t('Update Failed', 'បរាជ័យក្នុងការកែប្រែ'),
        description: err?.message || t('Could not update this user account.', 'មិនអាចកែប្រែគណនីអ្នកប្រើប្រាស់នេះបានទេ។'),
        type: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteMember = (member: TeamMember) => {
    const currentUser = authService.getStoredUser()
    if (currentUser?.id === member.id) {
      toast({
        title: t('Action Not Allowed', 'សកម្មភាពមិនត្រូវបានអនុញ្ញាត'),
        description: t('You cannot delete your own administrator account.', 'អ្នកមិនអាចលុបគណនីអ្នកគ្រប់គ្រងរបស់ខ្លួនបានទេ។'),
        type: 'error',
      })
      return
    }

    setMemberToDelete(member)
  }

  const confirmDeleteMember = async () => {
    if (!memberToDelete) return
    const member = memberToDelete
    setSubmitting(true)
    try {
      await api.delete('/admin/security/users/' + member.id)
      toast({
        title: t('User Deleted', 'បានលុបអ្នកប្រើប្រាស់'),
        description: member.name + ` ${t('was removed from the directory.', 'ត្រូវបានដកចេញពីបញ្ជី។')}`,
        type: 'success',
      })
      fetchUsers()
      setMemberToDelete(null)
    } catch (err: any) {
      toast({
        title: t('Delete Failed', 'បរាជ័យក្នុងការលុប'),
        description: err?.message || t('Could not delete this user account.', 'មិនអាចលុបគណនីអ្នកប្រើប្រាស់នេះបានទេ។'),
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
      roleTitleKm="សិទ្ធិបុគ្គលិក និងតួនាទី"
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
                <span>{t('User Directory & Role Permissions', 'បញ្ជីអ្នកប្រើប្រាស់ និងសិទ្ធិតួនាទី')}</span>
              </h1>
              <Badge className="bg-indigo-600 text-white font-bold text-xs">
                {totalCount} {t('Total Accounts', 'គណនីសរុប')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('Assign roles and permissions to Staff, Delivery Couriers, Merchants, and Administrators with instant database persistence.', 'កំណត់តួនាទី និងសិទ្ធិដល់បុគ្គលិក អ្នកដឹកជញ្ជូន អ្នកលក់ និងអ្នកគ្រប់គ្រង ដោយរក្សាទុកភ្លាមៗក្នុងមូលដ្ឋានទិន្នន័យ។')}
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
              <span>{t('Refresh', 'ផ្ទុកឡើងវិញ')}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsAddModalOpen(true)}
              className="rounded-xl h-9 text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>{t('Enroll Member', 'បន្ថែមសមាជិក')}</span>
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setRoleAssignmentEmail('')
                setTargetRole('admin')
                setIsEmailRoleModalOpen(true)
              }}
              className="rounded-xl h-9 text-xs font-bold gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-300 dark:hover:bg-indigo-950/40"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>{t('Assign by Email', 'កំណត់តាមអ៊ីមែល')}</span>
            </Button>
          </div>
        </div>

        {/* 4 Stat Overview Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">{t('Delivery Couriers', 'អ្នកដឹកជញ្ជូន')}</p>
                <p className="text-xl font-black mt-1 text-emerald-600">{courierCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('Live GPS Fleet Access', 'សិទ្ធិប្រើ GPS កងដឹកជញ្ជូន')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                <Truck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">{t('Staff Operations', 'ប្រតិបត្តិការបុគ្គលិក')}</p>
                <p className="text-xl font-black mt-1 text-blue-600">{staffCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('Catalog & Orders Staff', 'បុគ្គលិកកាតាឡុក និងការបញ្ជាទិញ')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">{t('Administrators', 'អ្នកគ្រប់គ្រង')}</p>
                <p className="text-xl font-black mt-1 text-purple-600">{adminCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('Super Admin & Admins', 'Super Admin និង Admin')}</p>
              </div>
              <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                <Shield className="w-5 h-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-muted-foreground">{t('Total Accounts', 'គណនីសរុប')}</p>
                <p className="text-xl font-black mt-1 text-indigo-600">{totalCount}</p>
                <p className="text-[10px] text-muted-foreground">{t('All Roles in System', 'តួនាទីទាំងអស់ក្នុងប្រព័ន្ធ')}</p>
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
                placeholder={t('Search by name, email, phone (+855), or role...', 'ស្វែងរកតាមឈ្មោះ អ៊ីមែល ទូរស័ព្ទ (+855) ឬតួនាទី...')}
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
                <option value="all">{t('All Roles', 'តួនាទីទាំងអស់')}</option>
                <option value="delivery_driver">{t('Delivery Driver / Courier', 'អ្នកដឹកជញ្ជូន / Courier')}</option>
                <option value="courier">{t('Courier / Delivery Operator', 'Courier / ប្រតិបត្តិករដឹកជញ្ជូន')}</option>
                <option value="delivery">{t('Legacy Delivery Operator', 'ប្រតិបត្តិករដឹកជញ្ជូនចាស់')}</option>
                <option value="staff">{t('Staff Operations', 'ប្រតិបត្តិការបុគ្គលិក')}</option>
                <option value="seller">{t('Merchant Seller', 'អ្នកលក់ពាណិជ្ជកម្ម')}</option>
                <option value="warehouse">{t('Warehouse Manager', 'អ្នកគ្រប់គ្រងឃ្លាំង')}</option>
                <option value="admin">{t('Administrator', 'អ្នកគ្រប់គ្រង')}</option>
                <option value="customer">{t('Customer', 'អតិថិជន')}</option>
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
                <p className="text-xs text-muted-foreground font-semibold">{t('Loading users and roles from database...', 'កំពុងផ្ទុកអ្នកប្រើប្រាស់ និងតួនាទីពីមូលដ្ឋានទិន្នន័យ...')}</p>
              </div>
            ) : paginatedMembers.length === 0 ? (
              <div className="py-16 text-center text-xs text-muted-foreground">
                {t('No user accounts found matching your query.', 'រកមិនឃើញគណនីអ្នកប្រើប្រាស់ដែលត្រូវនឹងការស្វែងរករបស់អ្នកទេ។')}
              </div>
            ) : (
              <div className="dashboard-table-scroll">
                <table className="dashboard-data-table w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b bg-muted/40 text-muted-foreground font-bold uppercase tracking-wider text-[10.5px]">
                      <th className="py-3 px-4">{t('Member Account', 'គណនីសមាជិក')}</th>
                      <th className="py-3 px-4">{t('Assigned Roles', 'តួនាទីដែលបានកំណត់')}</th>
                      <th className="py-3 px-4">{t('Contact', 'ទំនាក់ទំនង')}</th>
                      <th className="py-3 px-4">{t('Department', 'ផ្នែក')}</th>
                      <th className="py-3 px-4">{t('Status', 'ស្ថានភាព')}</th>
                      <th className="py-3 px-4 text-right min-w-[320px]">{t('Actions', 'សកម្មភាព')}</th>
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

                          {/* Account CRUD & role governance */}
                          <td className="py-3.5 px-4 min-w-[320px] whitespace-nowrap">
                            <div className="flex min-w-max flex-nowrap items-center justify-end gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpenEditMember(member)}
                                disabled={submitting}
                                className="h-8 shrink-0 px-2.5 rounded-xl text-xs font-bold gap-1.5"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                                <span>{t('Edit', 'កែប្រែ')}</span>
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleOpenRoleModal(member)}
                                className="h-8 shrink-0 px-3 rounded-xl text-xs font-bold gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
                              >
                                <Shield className="w-3.5 h-3.5" />
                                <span>{t('Assign Role', 'កំណត់តួនាទី')}</span>
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteMember(member)}
                                disabled={submitting || authService.getStoredUser()?.id === member.id}
                                title={authService.getStoredUser()?.id === member.id
                                  ? t('You cannot delete your own account', 'អ្នកមិនអាចលុបគណនីរបស់ខ្លួនបានទេ')
                                  : t('Delete user', 'លុបអ្នកប្រើប្រាស់')}
                                className="h-8 shrink-0 px-2.5 rounded-xl text-xs font-bold gap-1.5"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>{t('Delete', 'លុប')}</span>
                              </Button>
                            </div>
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
          <DashboardModal onClose={() => setSelectedMemberForRole(null)}>
            <div className="dashboard-modal-panel relative flex min-h-0 w-full max-w-xl flex-col overflow-hidden rounded-3xl border bg-card p-5 shadow-2xl sm:p-6 animate-in fade-in-0 zoom-in-95 duration-200">
              {/* Modal Header */}
              <div className="flex shrink-0 items-start justify-between border-b pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black text-foreground">
                        {t('Assign Role & Permissions', 'កំណត់តួនាទី និងសិទ្ធិ')}
                      </h2>
                      <p className="text-xs text-muted-foreground font-semibold">
                        {t('Account:', 'គណនី៖')} <span className="text-foreground font-black">{selectedMemberForRole.name}</span> ({selectedMemberForRole.email})
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

              <form onSubmit={handleSaveRole} className="flex min-h-0 flex-1 flex-col overflow-hidden pt-5">
                <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain pr-1">
                {/* 1. Select Role */}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    {t('Select Target Operational Role', 'ជ្រើសរើសតួនាទីប្រតិបត្តិការ')}
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
                              <span>{roleTitle(role)}</span>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600" />}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                              {roleDescription(role)}
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
                    <span>{t('Granular System Permissions', 'សិទ្ធិប្រព័ន្ធលម្អិត')}</span>
                    <span className="text-[10px] font-semibold text-muted-foreground">
                      {t(`${targetPermissions.length} Active`, `${targetPermissions.length} សកម្ម`)}
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
                            <span className="block text-xs truncate">{permissionLabel(perm)}</span>
                            <span className="text-[9.5px] font-semibold text-muted-foreground font-mono">
                              {perm.slug}
                            </span>
                          </div>
                        </label>
                      )
                    })}
                  </div>
                </div>
                </div>

                {/* Modal Actions */}
                <div className="flex shrink-0 items-center justify-end gap-2 border-t bg-card pt-4">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setSelectedMemberForRole(null)}
                    disabled={isAssigningRole}
                    className="rounded-xl h-10 text-xs font-bold"
                  >
                    {t('Cancel', 'បោះបង់')}
                  </Button>

                  <Button
                    type="submit"
                    disabled={isAssigningRole}
                    className="rounded-xl h-10 px-5 text-xs font-black gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isAssigningRole ? t('Assigning...', 'កំពុងកំណត់...') : t('Save Role & Permissions', 'រក្សាទុកតួនាទី និងសិទ្ធិ')}</span>
                  </Button>
                </div>
              </form>
            </div>
          </DashboardModal>
        )}

        {/* Assign a role to an existing account by email */}
        {isEmailRoleModalOpen && (
          <DashboardModal onClose={() => setIsEmailRoleModalOpen(false)}>
            <div className="dashboard-modal-panel relative w-full max-w-lg bg-card rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-5 animate-in fade-in-0 zoom-in-95 duration-200">
              <div className="flex items-start justify-between border-b pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-foreground">{t('Assign Role by Email', 'កំណត់តួនាទីតាមអ៊ីមែល')}</h2>
                    <p className="text-xs text-muted-foreground font-semibold">
                      {t('Apply a role to an existing TYUSHOP account.', 'កំណត់តួនាទីដល់គណនី TYUSHOP ដែលមានស្រាប់។')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEmailRoleModalOpen(false)}
                  className="rounded-full w-8 h-8 p-0 text-muted-foreground hover:text-foreground"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <form onSubmit={handleSaveRoleByEmail} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    {t('Existing Account Email', 'អ៊ីមែលគណនីដែលមានស្រាប់')}
                  </label>
                  <Input
                    type="email"
                    required
                    autoFocus
                    placeholder="user@example.com"
                    value={roleAssignmentEmail}
                    onChange={(e) => setRoleAssignmentEmail(e.target.value)}
                    className="rounded-xl h-11 text-sm font-semibold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black uppercase tracking-wider text-foreground">
                    {t('Role to Assign', 'តួនាទីដែលត្រូវកំណត់')}
                  </label>
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    className="w-full h-11 px-3 rounded-xl border bg-background text-sm font-bold focus:ring-2 focus:ring-indigo-500/30"
                  >
                    {AVAILABLE_ROLES.map((role) => (
                      <option key={role.slug} value={role.slug}>
                        {roleTitle(role)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="rounded-2xl border border-amber-300/60 bg-amber-50/70 dark:bg-amber-950/20 px-3.5 py-3 text-[11px] leading-5 text-amber-900 dark:text-amber-200">
                  {t('Only SUPER_ADMIN can grant ADMIN or SUPER_ADMIN. Other administrators will receive a clear permission error.', 'មានតែ SUPER_ADMIN ប៉ុណ្ណោះដែលអាចកំណត់ ADMIN ឬ SUPER_ADMIN។ អ្នកគ្រប់គ្រងផ្សេងទៀតនឹងទទួលបានសារបញ្ជាក់អំពីសិទ្ធិ។')}
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsEmailRoleModalOpen(false)}
                    disabled={isAssigningRole}
                    className="rounded-xl h-10 text-xs font-bold"
                  >
                    {t('Cancel', 'បោះបង់')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAssigningRole}
                    className="rounded-xl h-10 px-5 text-xs font-black gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20"
                  >
                    <Shield className="w-4 h-4" />
                    <span>{isAssigningRole ? t('Assigning...', 'កំពុងកំណត់...') : t('Assign Role', 'កំណត់តួនាទី')}</span>
                  </Button>
                </div>
              </form>
            </div>
          </DashboardModal>
        )}

        {/* Edit Member Modal */}
        {editingMember && (
          <DashboardModal onClose={() => setEditingMember(null)}>
            <div className="dashboard-modal-panel relative w-full max-w-lg bg-card rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <div>
                  <h3 className="text-base font-black text-foreground flex items-center gap-2">
                    <Pencil className="w-5 h-5 text-indigo-600" />
                    <span>{t('Edit User Account', 'កែប្រែគណនីអ្នកប្រើប្រាស់')}</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {t('Update account details and status. Use Assign Role for permissions.', 'កែប្រែព័ត៌មាន និងស្ថានភាពគណនី។ ប្រើ កំណត់តួនាទី ដើម្បីកែសិទ្ធិ។')}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingMember(null)}
                  className="rounded-full w-8 h-8 p-0"
                >
                  <XCircle className="w-5 h-5" />
                </Button>
              </div>

              <form onSubmit={handleUpdateMember} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">{t('Full Name', 'ឈ្មោះពេញ')}</label>
                  <Input
                    type="text"
                    required
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="rounded-xl h-10 text-xs font-semibold"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">{t('Email Address', 'អាសយដ្ឋានអ៊ីមែល')}</label>
                    <Input
                      type="email"
                      required
                      value={editFormData.email}
                      onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                      className="rounded-xl h-10 text-xs font-semibold"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-foreground">{t('Phone Number', 'លេខទូរស័ព្ទ')}</label>
                    <Input
                      type="text"
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      className="rounded-xl h-10 text-xs font-semibold"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-foreground">{t('Account Status', 'ស្ថានភាពគណនី')}</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as TeamMember['status'] })}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-bold focus:ring-2 focus:ring-indigo-500/30"
                  >
                    <option value="active">{t('Active', 'សកម្ម')}</option>
                    <option value="inactive">{t('Inactive', 'អសកម្ម')}</option>
                    <option value="pending">{t('Pending', 'កំពុងរង់ចាំ')}</option>
                    <option value="suspended">{t('Suspended', 'បានផ្អាក')}</option>
                    <option value="on_leave">{t('On Leave', 'ឈប់សម្រាក')}</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditingMember(null)}
                    disabled={submitting}
                    className="rounded-xl h-10 text-xs font-bold"
                  >
                    {t('Cancel', 'បោះបង់')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl h-10 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {submitting ? t('Saving...', 'កំពុងរក្សាទុក...') : t('Save Changes', 'រក្សាទុកការកែប្រែ')}
                  </Button>
                </div>
              </form>
            </div>
          </DashboardModal>
        )}

        {/* Add Member Modal */}
        {isAddModalOpen && (
          <DashboardModal onClose={() => setIsAddModalOpen(false)}>
            <div className="dashboard-modal-panel relative w-full max-w-lg bg-card rounded-3xl border shadow-2xl p-5 sm:p-6 space-y-4">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="text-base font-black text-foreground flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-indigo-600" />
                  <span>{t('Enroll New Team Member', 'បន្ថែមសមាជិកក្រុមថ្មី')}</span>
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
                  <label className="text-xs font-bold text-foreground">{t('Full Name', 'ឈ្មោះពេញ')}</label>
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
                    <label className="text-xs font-bold text-foreground">{t('Email Address', 'អាសយដ្ឋានអ៊ីមែល')}</label>
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
                    <label className="text-xs font-bold text-foreground">{t('Phone Number', 'លេខទូរស័ព្ទ')}</label>
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
                  <label className="text-xs font-bold text-foreground">{t('Role Privilege', 'សិទ្ធិតួនាទី')}</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="w-full h-10 px-3 rounded-xl border bg-background text-xs font-bold focus:ring-2 focus:ring-indigo-500/30 uppercase"
                  >
                    <option value="delivery_driver">{roleTitle(AVAILABLE_ROLES[0])} (Live GPS)</option>
                    <option value="courier">{roleTitle(AVAILABLE_ROLES[1])} (Live GPS)</option>
                    <option value="delivery">{roleTitle(AVAILABLE_ROLES[2])} (Live GPS)</option>
                    <option value="staff">{roleTitle(AVAILABLE_ROLES[3])}</option>
                    <option value="seller">{roleTitle(AVAILABLE_ROLES[4])}</option>
                    <option value="warehouse_manager">{roleTitle(AVAILABLE_ROLES[5])}</option>
                    <option value="admin">{roleTitle(AVAILABLE_ROLES[6])}</option>
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsAddModalOpen(false)}
                    className="rounded-xl h-10 text-xs font-bold"
                  >
                    {t('Cancel', 'បោះបង់')}
                  </Button>
                  <Button
                    type="submit"
                    disabled={submitting}
                    className="rounded-xl h-10 px-5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white"
                  >
                    {submitting ? t('Creating...', 'កំពុងបង្កើត...') : t('Enroll Account', 'បន្ថែមគណនី')}
                  </Button>
                </div>
              </form>
            </div>
          </DashboardModal>
        )}
      </div>
      <ConfirmDialog
        open={memberToDelete !== null}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
        title={t('Delete user account?', 'លុបគណនីអ្នកប្រើប្រាស់?')}
        titleKm="លុបគណនីអ្នកប្រើប្រាស់?"
        description={memberToDelete
          ? t(`Delete "${memberToDelete.name}"? This action cannot be undone.`, `លុប "${memberToDelete.name}"? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។`)
          : ''}
        descriptionKm={memberToDelete ? `លុប "${memberToDelete.name}"? សកម្មភាពនេះមិនអាចត្រឡប់វិញបានទេ។` : ''}
        confirmLabel={t('Delete user', 'លុបអ្នកប្រើប្រាស់')}
        confirmLabelKm="លុបអ្នកប្រើប្រាស់"
        cancelLabel={t('Cancel', 'បោះបង់')}
        cancelLabelKm="បោះបង់"
        onConfirm={confirmDeleteMember}
      />
    </DashboardLayout>
  )
}
