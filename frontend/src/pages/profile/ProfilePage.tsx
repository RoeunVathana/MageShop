import React, { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  User as UserIcon,
  Mail,
  Phone,
  MapPin,
  Lock,
  Eye,
  EyeOff,
  Camera,
  Upload,
  CheckCircle2,
  AlertCircle,
  Shield,
  ShieldCheck,
  Award,
  Sparkles,
  Save,
  LogOut,
  Smartphone,
  Calendar,
  Building2,
  ExternalLink,
  ChevronRight,
  ArrowLeft,
  X,
  KeyRound,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { authService, UpdateProfilePayload } from '@/services/auth.service'
import type { User } from '@/types/user.types'

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=300&q=80',
  'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=300&q=80',
]

export function ProfilePage() {
  const { t, loyaltyPoints } = useShopEngagement()
  const { toast } = useToast()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<User | null>(() => authService.getStoredUser())
  const [loading, setLoading] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [terminatingSessions, setTerminatingSessions] = useState(false)

  // Form Fields
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [avatarUrl, setAvatarUrl] = useState('')
  const [address, setAddress] = useState('')

  // Password Change Fields
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Custom Avatar URL Input modal/toggle
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false)
  const [customAvatarInput, setCustomAvatarInput] = useState('')

  const isAdmin = authService.isAdmin(user)

  // Sync state on load or when auth changes
  useEffect(() => {
    const syncUser = (currentUser: User | null) => {
      if (currentUser) {
        setUser(currentUser)
        setName(currentUser.name || '')
        setEmail(currentUser.email || '')
        setPhoneNumber(currentUser.phone_number || '')
        setAvatarUrl(currentUser.avatar_url || '')
        setAddress(currentUser.address || '')
      }
    }

    const current = authService.getStoredUser()
    syncUser(current)

    // Also fetch fresh profile from API to ensure fresh DB state
    authService.getCurrentUser().then((res) => {
      if (res?.data?.user) {
        syncUser(res.data.user)
      }
    }).catch(() => {
      // ignore
    })

    const onAuthChange = () => {
      syncUser(authService.getStoredUser())
    }
    window.addEventListener('tyushop-auth-changed', onAuthChange)
    return () => window.removeEventListener('tyushop-auth-changed', onAuthChange)
  }, [])

  // File Upload Handler
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t('Image Too Large', 'ទំហំរូបភាពធំពេក'),
        description: t('Please select an image smaller than 5MB.', 'សូមជ្រើសរើសរូបភាពក្រោម 5MB។'),
        type: 'error',
      })
      return
    }

    setUploadingAvatar(true)
    try {
      const res = await authService.uploadAvatar(file)
      if (res?.data?.user) {
        setUser(res.data.user)
        setAvatarUrl(res.data.user.avatar_url || '')
        toast({
          title: t('Avatar Updated', 'បានផ្លាស់ប្តូររូបភាពគណនី'),
          description: t('Your profile picture has been updated successfully.', 'រូបភាពគណនីរបស់អ្នកត្រូវបានផ្លាស់ប្តូរដោយជោគជ័យ។'),
          type: 'success',
        })
      }
    } catch (err: any) {
      toast({
        title: t('Upload Failed', 'ការបញ្ចូលរូបភាពបរាជ័យ'),
        description: err?.message || t('Could not upload avatar image.', 'មិនអាចបញ្ចូលរូបភាពគណនីបានទេ។'),
        type: 'error',
      })
    } finally {
      setUploadingAvatar(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // Preset Avatar Selection
  const handleSelectPresetAvatar = (url: string) => {
    setAvatarUrl(url)
    toast({
      title: t('Avatar Selected', 'បានជ្រើសរើសរូបភាព'),
      description: t('Click "Save Changes" below to apply this avatar.', 'ចុច "រក្សាទុកការផ្លាស់ប្តូរ" ខាងក្រោមដើម្បីអនុវត្ត។'),
      type: 'info',
    })
  }

  // Remove Avatar Handler
  const handleRemoveAvatar = () => {
    setAvatarUrl('')
    toast({
      title: t('Avatar Cleared', 'បានលុបរូបភាព'),
      description: t('Click "Save Changes" to finalize removing your avatar.', 'ចុច "រក្សាទុកការផ្លាស់ប្តូរ" ដើម្បីលុបរូបភាពជាផ្លូវការ។'),
      type: 'info',
    })
  }

  // Form Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      toast({
        title: t('Validation Error', 'កំហុសទិន្នន័យ'),
        description: t('Full name is required.', 'សូមបញ្ចូលឈ្មោះពេញរបស់អ្នក។'),
        type: 'error',
      })
      return
    }

    if (!email.trim() || !email.includes('@')) {
      toast({
        title: t('Validation Error', 'កំហុសទិន្នន័យ'),
        description: t('A valid email address is required.', 'សូមបញ្ចូលអ៊ីមែលដែលត្រឹមត្រូវ។'),
        type: 'error',
      })
      return
    }

    if (showPasswordSection && newPassword) {
      if (newPassword.length < 8) {
        toast({
          title: t('Password Too Short', 'ពាក្យសម្ងាត់ខ្លីពេក'),
          description: t('New password must be at least 8 characters long.', 'ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងហោចណាស់ 8 តួអក្សរ។'),
          type: 'error',
        })
        return
      }

      if (newPassword !== confirmPassword) {
        toast({
          title: t('Passwords Do Not Match', 'ពាក្យសម្ងាត់មិនត្រូវគ្នាទេ'),
          description: t('Please verify your new password and confirmation match.', 'សូមផ្ទៀងផ្ទាត់ពាក្យសម្ងាត់ថ្មី និងការបញ្ជាក់ឡើងវិញ។'),
          type: 'error',
        })
        return
      }

      if (!currentPassword) {
        toast({
          title: t('Current Password Required', 'ត្រូវការបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្ន'),
          description: t('Please provide your current password to authorize this change.', 'សូមបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្នដើម្បីផ្ទៀងផ្ទាត់។'),
          type: 'error',
        })
        return
      }
    }

    setLoading(true)
    try {
      const payload: UpdateProfilePayload = {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone_number: phoneNumber.trim() || null,
        avatar_url: avatarUrl.trim() || null,
        address: address.trim() || null,
      }

      if (showPasswordSection && newPassword && currentPassword) {
        payload.current_password = currentPassword
        payload.new_password = newPassword
      }

      const res = await authService.updateProfile(payload)
      if (res?.data?.user) {
        setUser(res.data.user)
        toast({
          title: t('Profile Updated', 'បានកែប្រែព័ត៌មានរួចរាល់'),
          description: t('Your account profile has been saved successfully.', 'ព័ត៌មានគណនីរបស់អ្នកត្រូវបានរក្សាទុកដោយជោគជ័យ។'),
          type: 'success',
        })

        // Clear password fields on success
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
        setShowPasswordSection(false)
      }
    } catch (err: any) {
      toast({
        title: t('Update Failed', 'ការកែប្រែមិនបានជោគជ័យ'),
        description: err?.message || t('Could not update profile. Please try again.', 'មិនអាចកែប្រែព័ត៌មានបានទេ។ សូមព្យាយាមម្តងទៀត។'),
        type: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  // Terminate All Other Sessions
  const handleTerminateOtherSessions = async () => {
    if (!window.confirm(t('Are you sure you want to log out all other devices?', 'តើអ្នកពិតជាចង់ចាកចេញពីឧបករណ៍ផ្សេងទៀតទាំងអស់មែនទេ?'))) {
      return
    }

    setTerminatingSessions(true)
    try {
      await authService.logoutAllDevices()
      toast({
        title: t('Sessions Terminated', 'បានបញ្ចប់សម័យកាលទាំងអស់'),
        description: t('All other devices have been logged out securely.', 'គ្រប់ឧបករណ៍ផ្សេងទៀតត្រូវបានចាកចេញដោយសុវត្ថិភាព។'),
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: t('Action Failed', 'សកម្មភាពបរាជ័យ'),
        description: err?.message || t('Could not terminate other sessions.', 'មិនអាចបញ្ចប់សម័យកាលផ្សេងទៀតបានទេ។'),
        type: 'error',
      })
    } finally {
      setTerminatingSessions(false)
    }
  }

  const roleName = user?.roles?.[0]?.name || (isAdmin ? 'SUPER_ADMIN' : 'CUSTOMER')

  const content = (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in-50 duration-200">
      {/* Top Banner / Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link to={isAdmin ? '/dashboard/admin' : '/dashboard/customer'} className="hover:text-indigo-600 transition-colors">
              {isAdmin ? t('Admin Workspace', 'កន្លែងគ្រប់គ្រង Admin') : t('Customer Dashboard', 'ទំព័រដើមអតិថិជន')}
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {t('My Profile & Account Settings', 'ព័ត៌មានគណនី និងការកំណត់ផ្ទាល់ខ្លួន')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <span>{t('Account Profile Settings', 'ការកំណត់ប្រវត្តិរូបផ្ទាល់ខ្លួន')}</span>
            <Badge className="bg-indigo-600/10 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-xs py-0.5">
              {roleName}
            </Badge>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t(
              'Manage your identity, personal profile photo, login credentials, delivery address, and active security sessions.',
              'គ្រប់គ្រងអត្តសញ្ញាណ រូបថតគណនី អ៊ីមែលចូលប្រើប្រាស់ អាសយដ្ឋានដឹកជញ្ជូន និងសុវត្ថិភាពគណនីរបស់អ្នក។'
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="rounded-xl text-xs gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>{t('Back', 'ត្រឡប់ក្រោយ')}</span>
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs gap-1.5 shadow-md shadow-indigo-600/20"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{loading ? t('Saving...', 'កំពុងរក្សាទុក...') : t('Save Changes', 'រក្សាទុកការផ្លាស់ប្តូរ')}</span>
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Avatar & Account Summary Card */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-28 bg-gradient-to-r from-indigo-500 via-purple-600 to-pink-500 relative">
              <div className="absolute top-3 right-3">
                <Badge className="bg-white/20 backdrop-blur-md text-white border-white/30 text-[10px]">
                  {isAdmin ? 'Platform Administrator' : 'Verified Shopper'}
                </Badge>
              </div>
            </div>

            <CardContent className="pt-0 pb-6 px-6 relative">
              {/* Profile Photo Display */}
              <div className="flex flex-col items-center -mt-14 mb-4">
                <div className="relative group">
                  <div className="w-28 h-28 rounded-3xl overflow-hidden ring-4 ring-white dark:ring-slate-900 shadow-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={name || 'User Avatar'}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarUrl('')}
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white flex items-center justify-center font-black text-3xl">
                        {(name || 'U').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Upload button overlay */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingAvatar}
                    title={t('Upload Profile Photo', 'បញ្ចូលរូបថតគណនី')}
                    className="absolute bottom-1 right-1 p-2 rounded-xl bg-indigo-600 text-white shadow-lg hover:bg-indigo-700 active:scale-90 transition-all duration-200 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                  </button>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarFileUpload}
                    className="hidden"
                  />
                </div>

                <h3 className="mt-3 text-lg font-bold text-slate-900 dark:text-white text-center">
                  {name || t('User Account', 'គណនីអ្នកប្រើប្រាស់')}
                </h3>
                <p className="text-xs text-slate-500 text-center truncate max-w-full">
                  {email || 'user@tyushop.blog'}
                </p>

                <div className="flex items-center gap-2 mt-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-bold border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>{t('Active Status', 'ស្ថានភាពសកម្ម')}</span>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[11px] font-bold border border-amber-200 dark:border-amber-800">
                    <Sparkles className="w-3 h-3" />
                    <span>{loyaltyPoints || user?.loyalty_points || 100} Pts</span>
                  </span>
                </div>
              </div>

              {/* Avatar Controls */}
              <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    {t('Choose Avatar Style', 'ជ្រើសរើសរូបតំណាង')}
                  </span>
                  {avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      className="text-[11px] text-rose-500 hover:underline font-medium"
                    >
                      {t('Remove', 'លុបរូបភាព')}
                    </button>
                  )}
                </div>

                {/* Preset Avatar Gallery */}
                <div className="grid grid-cols-4 gap-2">
                  {PRESET_AVATARS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPresetAvatar(preset)}
                      className={`relative rounded-2xl overflow-hidden aspect-square border-2 transition-all duration-200 ${
                        avatarUrl === preset
                          ? 'border-indigo-600 ring-2 ring-indigo-500/30 scale-105'
                          : 'border-slate-200 dark:border-slate-800 hover:border-indigo-400'
                      }`}
                    >
                      <img src={preset} alt={`Avatar preset ${idx + 1}`} className="w-full h-full object-cover" />
                      {avatarUrl === preset && (
                        <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                {/* Direct Image URL input toggle */}
                <div className="pt-2">
                  {!showCustomAvatarInput ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCustomAvatarInput(true)}
                      className="w-full text-[11px] h-8 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                    >
                      {t('+ Use Custom Image URL', '+ ប្រើតំណ URL រូបភាពផ្ទាល់ខ្លួន')}
                    </Button>
                  ) : (
                    <div className="space-y-2 animate-in fade-in-50">
                      <div className="flex gap-1.5">
                        <Input
                          type="url"
                          placeholder="https://example.com/avatar.jpg"
                          value={customAvatarInput}
                          onChange={(e) => setCustomAvatarInput(e.target.value)}
                          className="text-xs h-8 rounded-xl"
                        />
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => {
                            if (customAvatarInput.trim()) {
                              setAvatarUrl(customAvatarInput.trim())
                              setCustomAvatarInput('')
                              setShowCustomAvatarInput(false)
                            }
                          }}
                          className="h-8 px-2.5 text-xs bg-indigo-600 text-white rounded-xl"
                        >
                          {t('Apply', 'អនុវត្ត')}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowCustomAvatarInput(false)}
                          className="h-8 px-2 text-xs rounded-xl"
                        >
                          <X className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Quick Specs */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span>{t('User ID', 'លេខសម្គាល់')}</span>
                  <span className="font-mono font-bold text-slate-800 dark:text-slate-200">#{user?.id || '—'}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{t('Primary Role', 'តួនាទីចម្បង')}</span>
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400">{roleName}</span>
                </div>
                <div className="flex items-center justify-between text-slate-500">
                  <span>{t('Security State', 'ស្ថានភាពសុវត្ថិភាព')}</span>
                  <span className="font-semibold text-emerald-600 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {t('Verified 256-Bit', 'បានផ្ទៀងផ្ទាត់ 256-Bit')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Device & Session Security Card */}
          <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                  {t('Device & Session Control', 'ការគ្រប់គ្រងសម័យកាល និងឧបករណ៍')}
                </h4>
                <p className="text-[11px] text-slate-400">
                  {t('Protect your account from unauthorized logins', 'ការពារគណនីរបស់អ្នកពីការចូលប្រើប្រាស់ដោយគ្មានការអនុញ្ញាត')}
                </p>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleTerminateOtherSessions}
              disabled={terminatingSessions}
              className="w-full text-xs rounded-xl border-rose-200 dark:border-rose-900/40 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>
                {terminatingSessions
                  ? t('Terminating...', 'កំពុងបញ្ចប់...')
                  : t('Log Out All Other Devices', 'ចាកចេញពីឧបករណ៍ផ្សេងទៀតទាំងអស់')}
              </span>
            </Button>
          </Card>
        </div>

        {/* Right Column: Editable Profile Details & Security Form */}
        <div className="lg:col-span-8 space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Card 1: Personal Details */}
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 flex items-center justify-center">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                      {t('1. Personal Profile Information', '១. ព័ត៌មានប្រវត្តិរូបផ្ទាល់ខ្លួន')}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {t('Update your display name, contact email, and telephone number.', 'កែប្រែឈ្មោះបង្ហាញ អ៊ីមែលទំនាក់ទំនង និងលេខទូរស័ព្ទ។')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Full Name */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <span>{t('Full Name *', 'ឈ្មោះពេញ *')}</span>
                    </label>
                    <div className="relative">
                      <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Roeun Vathana"
                        className="pl-9 rounded-xl text-xs h-10 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  {/* Email Address */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{t('Email Address (Login ID) *', 'អាសយដ្ឋានអ៊ីមែល (Login ID) *')}</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="vothanarern@gmail.com"
                        className="pl-9 rounded-xl text-xs h-10 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Phone Number */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{t('Phone Number (Cambodia)', 'លេខទូរស័ព្ទ')}</span>
                      <span className="text-[10px] text-slate-400">{t('Optional', 'ជម្រើស')}</span>
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        type="tel"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value)}
                        placeholder="+855 16 555 637"
                        className="pl-9 rounded-xl text-xs h-10 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>

                  {/* Avatar URL / Direct Link */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                      <span>{t('Avatar Photo URL', 'តំណ URL រូបថត')}</span>
                      <span className="text-[10px] text-slate-400">{t('Optional', 'ជម្រើស')}</span>
                    </label>
                    <div className="relative">
                      <Camera className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://..."
                        className="pl-9 rounded-xl text-xs h-10 border-slate-200 dark:border-slate-700"
                      />
                    </div>
                  </div>
                </div>

                {/* Delivery / Shipping Address */}
                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-indigo-500" />
                      <span>{t('Default Shipping & Delivery Address', 'អាសយដ្ឋានដឹកជញ្ជូនលំនាំដើម')}</span>
                    </span>
                    <span className="text-[10px] text-slate-400">{t('Used for checkout and courier dispatch', 'ប្រើសម្រាប់ការបញ្ជាទិញ និងដឹកជញ្ជូន')}</span>
                  </label>
                  <textarea
                    rows={3}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder={t('e.g. Street 271, Sangkat Phsar Deum Thkov, Khan Chamkarmon, Phnom Penh, Cambodia', 'ឧ. ផ្លូវ ២៧១ សង្កាត់ផ្សារដើមថ្កូវ ខណ្ឌចំការមន រាជធានីភ្នំពេញ')}
                    className="w-full rounded-xl p-3 text-xs border border-slate-200 dark:border-slate-700 bg-transparent focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Card 2: Security & Password Change */}
            <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
              <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                      <KeyRound className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-bold text-slate-900 dark:text-white">
                        {t('2. Security & Password Protection', '២. សុវត្ថិភាព និងការប្តូរពាក្យសម្ងាត់')}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        {t('Keep your TYUSHOP account safeguarded with a strong password.', 'ការពារគណនី TYUSHOP របស់អ្នកជាមួយពាក្យសម្ងាត់រឹងមាំ។')}
                      </CardDescription>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant={showPasswordSection ? 'outline' : 'secondary'}
                    size="sm"
                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                    className="rounded-xl text-xs"
                  >
                    {showPasswordSection ? t('Cancel Change', 'បោះបង់') : t('Change Password', 'ប្តូរពាក្យសម្ងាត់')}
                  </Button>
                </div>
              </CardHeader>

              {showPasswordSection && (
                <CardContent className="p-6 space-y-4 bg-slate-50/50 dark:bg-slate-950/40 animate-in slide-in-from-top-2 duration-200">
                  <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 flex items-start gap-2.5 text-xs text-amber-800 dark:text-amber-300">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      {t(
                        'To change your password, provide your current password for security verification. The new password must be at least 8 characters long.',
                        'ដើម្បីផ្លាស់ប្តូរពាក្យសម្ងាត់ សូមបញ្ចូលពាក្យសម្ងាត់បច្ចុប្បន្នដើម្បីផ្ទៀងផ្ទាត់។ ពាក្យសម្ងាត់ថ្មីត្រូវមានយ៉ាងតិច ៨ តួអក្សរ។'
                      )}
                    </span>
                  </div>

                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {t('Current Account Password *', 'ពាក្យសម្ងាត់បច្ចុប្បន្ន *')}
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <Input
                        type={showCurrentPassword ? 'text' : 'password'}
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="pl-9 pr-10 rounded-xl text-xs h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                      >
                        {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {t('New Password (min 8 chars) *', 'ពាក្យសម្ងាត់ថ្មី (យ៉ាងតិច ៨ តួ) *')}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <Input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-9 pr-10 rounded-xl text-xs h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm New Password */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {t('Confirm New Password *', 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី *')}
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <Input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="••••••••"
                          className="pl-9 pr-10 rounded-xl text-xs h-10 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                        >
                          {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Bottom Actions Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>{t('All changes are recorded in security logs for auditing.', 'រាល់ការផ្លាស់ប្តូរត្រូវបានកត់ត្រាក្នុងកំណត់ហេតុសុវត្ថិភាព។')}</span>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(-1)}
                  className="rounded-xl text-xs flex-1 sm:flex-initial"
                >
                  {t('Cancel', 'បោះបង់')}
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs flex-1 sm:flex-initial gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{loading ? t('Saving...', 'កំពុងរក្សាទុក...') : t('Save Profile Changes', 'រក្សាទុកការផ្លាស់ប្តូរ')}</span>
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  )

  // If user is Admin, render in Admin DashboardLayout with sidebar!
  if (isAdmin) {
    return (
      <DashboardLayout
        roleTitle="Platform Administrator"
        roleSlug="admin"
        roleColor="text-indigo-600 dark:text-indigo-400"
        navItems={adminNavItems}
      >
        {content}
      </DashboardLayout>
    )
  }

  // Otherwise render inside standard responsive wrapper for Customer / Shopper
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-8 px-4 sm:px-6 lg:px-8">
      {content}
    </div>
  )
}
