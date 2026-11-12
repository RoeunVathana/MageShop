import React, { useState, useEffect } from 'react'
import {
  Key,
  Mail,
  Lock,
  Shield,
  Users,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Plus,
  Search,
  Send,
  Clock,
  X,
  Sparkles,
} from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { adminNavItems } from '@/components/admin/adminNav'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'
import { Pagination } from '@/components/common/Pagination'
import {
  securityService,
  type ApiToken,
  type SecurityUser,
  type SentOtp,
  type EmailSettings,
  type TelegramSettings,
  type CreatedApiTokenData,
} from '@/services/security.service'

export function AdminSecurityPage() {
  const { toast } = useToast()
  const [activeTab, setActiveTab] = useState<'tokens' | 'users' | 'email'>('tokens')

  // --- TAB 1: API TOKENS STATE ---
  const [tokens, setTokens] = useState<ApiToken[]>([])
  const [tokensLoading, setTokensLoading] = useState(false)
  const [tokenSearch, setTokenSearch] = useState('')
  const [tokensPage, setTokensPage] = useState(1)
  const [tokensTotalPages, setTokensTotalPages] = useState(1)
  const [tokensTotalCount, setTokensTotalCount] = useState(0)
  const [tokensPerPage, setTokensPerPage] = useState(10)
  const [isCreateTokenOpen, setIsCreateTokenOpen] = useState(false)
  const [newTokenName, setNewTokenName] = useState('')
  const [newTokenAbilities, setNewTokenAbilities] = useState<string[]>(['*'])
  const [newTokenExpiryDays, setNewTokenExpiryDays] = useState<number | null>(30)
  const [creatingToken, setCreatingToken] = useState(false)
  const [revealedToken, setRevealedToken] = useState<CreatedApiTokenData | null>(null)
  const [copiedToken, setCopiedToken] = useState(false)
  const [showPlainToken, setShowPlainToken] = useState(true)

  // --- TELEGRAM BOT API TOKEN KEY & WEBHOOK STATE ---
  const [telegramSettings, setTelegramSettings] = useState<TelegramSettings>({
    telegram_bot_token_set: false,
    telegram_bot_token_masked: '',
    telegram_bot_username: 'TyuShopBot',
    telegram_admin_chat_id: '',
    telegram_webhook_secret: 'tyushop_sec_token_99182a',
    telegram_mini_app_url: 'https://tyushop.blog/telegram-app',
    telegram_webhook_url: 'https://mageshop-production.up.railway.app/api/v1/telegram/webhook',
  })
  const [botTokenInput, setBotTokenInput] = useState('')
  const [showBotTokenMask, setShowBotTokenMask] = useState(false)
  const [registerWebhookOnSave, setRegisterWebhookOnSave] = useState(true)
  const [savingTelegram, setSavingTelegram] = useState(false)
  const [testingTelegram, setTestingTelegram] = useState(false)
  const [testTelegramChatId, setTestTelegramChatId] = useState('')

  // --- TAB 2: USER EMAIL & PASSWORD STATE ---
  const [users, setUsers] = useState<SecurityUser[]>([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [userSearch, setUserSearch] = useState('')
  const [usersPage, setUsersPage] = useState(1)
  const [usersTotalPages, setUsersTotalPages] = useState(1)
  const [usersTotalCount, setUsersTotalCount] = useState(0)
  const [usersPerPage, setUsersPerPage] = useState(10)
  const [selectedUserForEmail, setSelectedUserForEmail] = useState<SecurityUser | null>(null)
  const [newEmailValue, setNewEmailValue] = useState('')
  const [savingEmail, setSavingEmail] = useState(false)

  const [selectedUserForPassword, setSelectedUserForPassword] = useState<SecurityUser | null>(null)
  const [newPasswordValue, setNewPasswordValue] = useState('')
  const [showPasswordMask, setShowPasswordMask] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [sendingOtpUserId, setSendingOtpUserId] = useState<number | null>(null)

  // --- TAB 3: EMAIL SETTINGS & SENT OTP STATE ---
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    mail_mailer: 'smtp',
    mail_host: 'smtp.resend.com',
    mail_port: 587,
    mail_username: 'resend',
    mail_password_set: false,
    mail_encryption: 'tls',
    mail_from_address: 'noreply@tyushop.blog',
    mail_from_name: 'TYUSHOP',
  })
  const [mailPasswordInput, setMailPasswordInput] = useState('')
  const [emailSettingsLoading, setEmailSettingsLoading] = useState(false)
  const [savingEmailSettings, setSavingEmailSettings] = useState(false)

  const [testEmailAddress, setTestEmailAddress] = useState('')
  const [sendingTestEmail, setSendingTestEmail] = useState(false)

  const [sentOtps, setSentOtps] = useState<SentOtp[]>([])
  const [otpsLoading, setOtpsLoading] = useState(false)
  const [otpsPage, setOtpsPage] = useState(1)
  const [otpsTotalPages, setOtpsTotalPages] = useState(1)
  const [otpsTotalCount, setOtpsTotalCount] = useState(0)
  const [otpsPerPage, setOtpsPerPage] = useState(10)
  const [directOtpEmail, setDirectOtpEmail] = useState('')
  const [dispatchingDirectOtp, setDispatchingDirectOtp] = useState(false)

  // Fetch Tokens & Telegram Settings
  const fetchTokens = async () => {
    setTokensLoading(true)
    try {
      const [tokensRes, tgRes] = await Promise.all([
        securityService.getApiTokens({
          search: tokenSearch.trim() || undefined,
          page: tokensPage,
          per_page: tokensPerPage,
        }),
        securityService.getTelegramSettings().catch(() => null),
      ])
      if (tokensRes?.data) {
        setTokens(tokensRes.data)
        if ((tokensRes as any)?.meta) {
          setTokensTotalPages((tokensRes as any).meta.last_page)
          setTokensTotalCount((tokensRes as any).meta.total)
        } else {
          setTokensTotalCount(tokensRes.data.length)
          setTokensTotalPages(Math.ceil(tokensRes.data.length / tokensPerPage) || 1)
        }
      }
      if (tgRes?.data) {
        setTelegramSettings(tgRes.data)
        if (!testTelegramChatId && tgRes.data.telegram_admin_chat_id) {
          setTestTelegramChatId(tgRes.data.telegram_admin_chat_id)
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error loading Telegram & API tokens',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setTokensLoading(false)
    }
  }

  const handleSaveTelegramSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingTelegram(true)
    try {
      const res = await securityService.updateTelegramSettings({
        telegram_bot_token: botTokenInput.trim() || undefined,
        telegram_bot_username: telegramSettings.telegram_bot_username,
        telegram_admin_chat_id: telegramSettings.telegram_admin_chat_id,
        telegram_webhook_secret: telegramSettings.telegram_webhook_secret,
        telegram_mini_app_url: telegramSettings.telegram_mini_app_url,
        telegram_webhook_url: telegramSettings.telegram_webhook_url,
        register_webhook: registerWebhookOnSave,
      })
      if (res.data) {
        setTelegramSettings(res.data)
      }
      setBotTokenInput('')
      toast({
        title: 'Telegram API Token Saved ✅',
        description: res.message || 'Telegram Bot API Token Key & Webhook configuration updated.',
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Failed to save Telegram settings',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setSavingTelegram(false)
    }
  }

  const handleTestTelegramConnection = async () => {
    setTestingTelegram(true)
    try {
      const res = await securityService.testTelegramBotConnection(
        testTelegramChatId.trim() || telegramSettings.telegram_admin_chat_id || undefined
      )
      toast({
        title: 'Telegram Bot Verified 🤖',
        description: res.message || 'Telegram Bot API Token Key is valid and connected!',
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Telegram Bot Test Failed',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setTestingTelegram(false)
    }
  }

  // Fetch Users
  const fetchUsers = async () => {
    setUsersLoading(true)
    try {
      const res = await securityService.getUsers({
        search: userSearch.trim() || undefined,
        page: usersPage,
      })
      if (res.data) {
        setUsers(res.data)
        if ((res as any)?.meta) {
          setUsersTotalPages((res as any).meta.last_page)
          setUsersTotalCount((res as any).meta.total)
        } else {
          setUsersTotalCount(res.data.length)
          setUsersTotalPages(Math.ceil(res.data.length / usersPerPage) || 1)
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error loading users',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setUsersLoading(false)
    }
  }

  // Fetch Email Settings & Sent OTPs
  const fetchEmailData = async () => {
    setEmailSettingsLoading(true)
    setOtpsLoading(true)
    try {
      const [settingsRes, otpsRes] = await Promise.all([
        securityService.getEmailSettings(),
        securityService.getSentOtps({ page: otpsPage }),
      ])
      if (settingsRes.data) setEmailSettings(settingsRes.data)
      if (otpsRes.data) {
        setSentOtps(otpsRes.data)
        if ((otpsRes as any)?.meta) {
          setOtpsTotalPages((otpsRes as any).meta.last_page)
          setOtpsTotalCount((otpsRes as any).meta.total)
        } else {
          setOtpsTotalCount(otpsRes.data.length)
          setOtpsTotalPages(Math.ceil(otpsRes.data.length / otpsPerPage) || 1)
        }
      }
    } catch (err: any) {
      toast({
        title: 'Error loading email & OTP data',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setEmailSettingsLoading(false)
      setOtpsLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'tokens') fetchTokens()
    if (activeTab === 'users') fetchUsers()
    if (activeTab === 'email') fetchEmailData()
  }, [activeTab, tokensPage, tokensPerPage, usersPage, otpsPage])

  // Create Token Action
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTokenName.trim()) {
      toast({ title: 'Validation Error', description: 'Token name is required', type: 'error' })
      return
    }

    setCreatingToken(true)
    try {
      const res = await securityService.createApiToken({
        name: newTokenName.trim(),
        abilities: newTokenAbilities,
        expires_in_days: newTokenExpiryDays,
      })

      if (res.data) setRevealedToken(res.data)
      setIsCreateTokenOpen(false)
      setNewTokenName('')
      fetchTokens()
      toast({
        title: 'API Token Key Created',
        description: 'New token key generated. Be sure to copy it now!',
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'Token Creation Failed',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setCreatingToken(false)
    }
  }

  // Revoke Token Action
  const handleRevokeToken = async (id: number, name: string) => {
    if (!confirm(`Are you sure you want to permanently revoke API token "${name}"?`)) return

    try {
      await securityService.revokeApiToken(id)
      toast({ title: 'Token Revoked', description: `API token "${name}" has been revoked.`, type: 'info' })
      fetchTokens()
    } catch (err: any) {
      toast({ title: 'Revocation Failed', description: err.message, type: 'error' })
    }
  }

  // Regenerate Token Action
  const handleRegenerateToken = async (id: number, name: string) => {
    if (!confirm(`Regenerate token "${name}"? The previous key will stop working immediately.`)) return

    try {
      const res = await securityService.regenerateApiToken(id)
      if (res.data) setRevealedToken(res.data)
      toast({
        title: 'Token Regenerated',
        description: `New key issued for "${name}". Copy the secret now.`,
        type: 'success',
      })
      fetchTokens()
    } catch (err: any) {
      toast({ title: 'Regeneration Failed', description: err.message, type: 'error' })
    }
  }

  // Copy Revealed Token
  const handleCopyToken = () => {
    if (!revealedToken) return
    navigator.clipboard.writeText(revealedToken.plain_text_token)
    setCopiedToken(true)
    setTimeout(() => setCopiedToken(false), 3000)
    toast({ title: 'Token Copied to Clipboard', type: 'success' })
  }

  // Update Email Action
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserForEmail || !newEmailValue.trim()) return

    setSavingEmail(true)
    try {
      await securityService.updateUserEmail(selectedUserForEmail.id, newEmailValue.trim())
      toast({ title: 'Email Updated', description: `User email updated to ${newEmailValue}`, type: 'success' })
      setSelectedUserForEmail(null)
      fetchUsers()
    } catch (err: any) {
      toast({ title: 'Update Failed', description: err.response?.data?.message || err.message, type: 'error' })
    } finally {
      setSavingEmail(false)
    }
  }

  // Update Password Action
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUserForPassword || !newPasswordValue.trim()) return

    setSavingPassword(true)
    try {
      await securityService.updateUserPassword(selectedUserForPassword.id, newPasswordValue.trim())
      toast({
        title: 'Password Set Successfully',
        description: `Secure password set for ${selectedUserForPassword.name}. Previous sessions revoked.`,
        type: 'success',
      })
      setSelectedUserForPassword(null)
      setNewPasswordValue('')
    } catch (err: any) {
      toast({
        title: 'Password Update Failed',
        description: err.response?.data?.message || 'Must be at least 8 characters with letters and numbers.',
        type: 'error',
      })
    } finally {
      setSavingPassword(false)
    }
  }

  // Send OTP to User
  const handleSendUserOtp = async (user: SecurityUser) => {
    setSendingOtpUserId(user.id)
    try {
      await securityService.sendUserOtp(user.id)
      toast({
        title: 'OTP Code Dispatched',
        description: `6-digit verification OTP dispatched to ${user.email}`,
        type: 'success',
      })
    } catch (err: any) {
      toast({
        title: 'OTP Dispatch Failed',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setSendingOtpUserId(null)
    }
  }

  // Direct OTP Dispatch
  const handleDirectOtpDispatch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!directOtpEmail.trim()) return

    setDispatchingDirectOtp(true)
    try {
      await securityService.dispatchDirectOtp(directOtpEmail.trim())
      toast({
        title: 'OTP Sent',
        description: `Recovery OTP sent to ${directOtpEmail.trim()}`,
        type: 'success',
      })
      setDirectOtpEmail('')
      fetchEmailData()
    } catch (err: any) {
      toast({ title: 'Dispatch Failed', description: err.response?.data?.message || err.message, type: 'error' })
    } finally {
      setDispatchingDirectOtp(false)
    }
  }

  // Invalidate OTP
  const handleInvalidateOtp = async (id: number, email: string) => {
    try {
      await securityService.invalidateOtp(id)
      toast({ title: 'OTP Invalidated', description: `OTP for ${email} marked as used/cancelled.`, type: 'info' })
      fetchEmailData()
    } catch (err: any) {
      toast({ title: 'Action Failed', description: err.message, type: 'error' })
    }
  }

  // Save Email / SMTP Settings
  const handleSaveEmailSettings = async (e: React.FormEvent) => {
    e.preventDefault()
    setSavingEmailSettings(true)
    try {
      const payload: any = {
        mail_mailer: emailSettings.mail_mailer,
        mail_host: emailSettings.mail_host,
        mail_port: Number(emailSettings.mail_port),
        mail_username: emailSettings.mail_username,
        mail_encryption: emailSettings.mail_encryption,
        mail_from_address: emailSettings.mail_from_address,
        mail_from_name: emailSettings.mail_from_name,
      }
      if (mailPasswordInput.trim()) {
        payload.mail_password = mailPasswordInput.trim()
      }

      const res = await securityService.updateEmailSettings(payload)
      if (res.data) setEmailSettings(res.data)
      setMailPasswordInput('')
      toast({ title: 'SMTP Settings Saved', description: 'Mail configuration updated successfully.', type: 'success' })
    } catch (err: any) {
      toast({ title: 'Failed to Save Settings', description: err.message, type: 'error' })
    } finally {
      setSavingEmailSettings(false)
    }
  }

  // Send Test OTP Email
  const handleSendTestEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!testEmailAddress.trim()) {
      toast({ title: 'Validation Error', description: 'Enter a valid test email address.', type: 'error' })
      return
    }

    setSendingTestEmail(true)
    try {
      const res = await securityService.sendTestEmailOtp(testEmailAddress.trim())
      toast({
        title: 'Test Email Delivered',
        description: res.data?.recipient
          ? `Verified SMTP delivery to ${res.data.recipient}!`
          : 'Verified SMTP delivery!',
        type: 'success',
      })
      fetchEmailData()
    } catch (err: any) {
      toast({
        title: 'SMTP Delivery Failed',
        description: err.response?.data?.message || err.message,
        type: 'error',
      })
    } finally {
      setSendingTestEmail(false)
    }
  }

  return (
    <DashboardLayout
      roleTitle="Admin Security & API Governance"
      roleSlug="admin"
      roleColor="text-purple-500"
      navItems={adminNavItems}
    >
      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-foreground flex items-center gap-2">
              <Shield className="w-6 h-6 text-purple-500" />
              Manage Telegram API Token Key, Email & OTP Security
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Configure your Telegram Bot API Token Key (@BotFather), webhook URL, admin chat ID, developer API tokens, and 6-digit OTP mailers.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (activeTab === 'tokens') fetchTokens()
                if (activeTab === 'users') fetchUsers()
                if (activeTab === 'email') fetchEmailData()
              }}
              className="gap-1.5 text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            {activeTab === 'tokens' && (
              <Button
                size="sm"
                onClick={() => setIsCreateTokenOpen(true)}
                className="gap-1.5 text-xs bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Plus className="w-3.5 h-3.5" /> Generate Bearer Token
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('tokens')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'tokens'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Key className="w-4 h-4" />
            <span>Config Manage Telegram API Token Key</span>
            <Badge variant={activeTab === 'tokens' ? 'outline' : 'secondary'} className="text-[10px] ml-1">
              {telegramSettings.telegram_bot_token_set ? 'ACTIVE' : 'SETUP'}
            </Badge>
          </button>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'users'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Manage Email, Password & OTP</span>
          </button>

          <button
            onClick={() => setActiveTab('email')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'email'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>SMTP Settings & Sent OTP Logs</span>
          </button>
        </div>

        {/* --- TAB 1: TELEGRAM API TOKEN KEY & BEARER TOKENS --- */}
        {activeTab === 'tokens' && (
          <div className="space-y-6">
            {/* Telegram Bot API Token Key & Webhook Configuration */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-purple-500/30 shadow-md">
                <CardHeader className="pb-3 border-b bg-purple-500/5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Key className="w-4 h-4 text-purple-600" />
                        Configure & Manage Telegram Bot API Token Key
                      </CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        Connect your Telegram Bot token from <strong>@BotFather</strong> to power 6-digit OTP password recovery, order notifications, and the TYUSHOP Telegram Mini App.
                      </CardDescription>
                    </div>
                    <Badge
                      className={
                        telegramSettings.telegram_bot_token_set
                          ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0'
                          : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0'
                      }
                    >
                      {telegramSettings.telegram_bot_token_set ? 'TOKEN CONFIGURED' : 'NOT SET'}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4">
                  <form onSubmit={handleSaveTelegramSettings} className="space-y-4">
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-foreground">
                          Telegram Bot API Token Key (from @BotFather) *
                        </label>
                        {telegramSettings.telegram_bot_token_masked && (
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400">
                            Active: {telegramSettings.telegram_bot_token_masked}
                          </span>
                        )}
                      </div>
                      <div className="relative flex items-center">
                        <input
                          type={showBotTokenMask ? 'text' : 'password'}
                          value={botTokenInput}
                          onChange={(e) => setBotTokenInput(e.target.value)}
                          placeholder={
                            telegramSettings.telegram_bot_token_set
                              ? '•••••••••••••••••••••••••••• (Leave blank to keep current Bot Token)'
                              : 'e.g. 7812345678:AAH1234567890abcdefghijklmnopqrstuv'
                          }
                          className="w-full pl-3 pr-10 py-2 text-xs font-mono rounded-lg border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-purple-500"
                        />
                        <button
                          type="button"
                          onClick={() => setShowBotTokenMask(!showBotTokenMask)}
                          className="absolute right-3 text-muted-foreground hover:text-foreground"
                        >
                          {showBotTokenMask ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Bot Username (@)</label>
                        <input
                          type="text"
                          value={telegramSettings.telegram_bot_username}
                          onChange={(e) =>
                            setTelegramSettings({ ...telegramSettings, telegram_bot_username: e.target.value })
                          }
                          placeholder="TyuShopBot"
                          className="w-full px-3 py-2 text-xs rounded-lg border bg-background text-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Admin Telegram Chat ID</label>
                        <input
                          type="text"
                          value={telegramSettings.telegram_admin_chat_id}
                          onChange={(e) =>
                            setTelegramSettings({ ...telegramSettings, telegram_admin_chat_id: e.target.value })
                          }
                          placeholder="e.g. 123456789"
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border bg-background text-foreground"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Webhook Endpoint URL</label>
                        <input
                          type="url"
                          value={telegramSettings.telegram_webhook_url}
                          onChange={(e) =>
                            setTelegramSettings({ ...telegramSettings, telegram_webhook_url: e.target.value })
                          }
                          placeholder="https://mageshop-production.up.railway.app/api/v1/telegram/webhook"
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border bg-background text-foreground"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-semibold text-foreground">Telegram Mini App URL</label>
                        <input
                          type="url"
                          value={telegramSettings.telegram_mini_app_url}
                          onChange={(e) =>
                            setTelegramSettings({ ...telegramSettings, telegram_mini_app_url: e.target.value })
                          }
                          placeholder="https://tyushop.blog/telegram-app"
                          className="w-full px-3 py-2 text-xs font-mono rounded-lg border bg-background text-foreground"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-foreground">Webhook Secret Token</label>
                      <input
                        type="text"
                        value={telegramSettings.telegram_webhook_secret}
                        onChange={(e) =>
                          setTelegramSettings({ ...telegramSettings, telegram_webhook_secret: e.target.value })
                        }
                        placeholder="tyushop_sec_token_99182a"
                        className="w-full px-3 py-2 text-xs font-mono rounded-lg border bg-background text-foreground"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t">
                      <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                        <input
                          type="checkbox"
                          checked={registerWebhookOnSave}
                          onChange={(e) => setRegisterWebhookOnSave(e.target.checked)}
                          className="rounded border-input text-purple-600 focus:ring-purple-500"
                        />
                        <span>Automatically register Telegram Webhook URL on save</span>
                      </label>

                      <Button
                        type="submit"
                        disabled={savingTelegram}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs gap-1.5"
                      >
                        {savingTelegram ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Saving Token...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5" /> Save Telegram API Token Key
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>

              {/* Live Telegram Bot & OTP Verification Card */}
              <Card className="border-emerald-500/30 shadow-md flex flex-col justify-between">
                <CardHeader className="pb-3 border-b bg-emerald-500/5">
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Send className="w-4 h-4 text-emerald-500" />
                    Test Telegram Bot & OTP
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5">
                    Verify your Telegram Bot API Token Key with <code>getMe</code> and dispatch a live 6-digit test OTP message to Telegram.
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-foreground">
                      Target Telegram Chat ID (Optional)
                    </label>
                    <input
                      type="text"
                      value={testTelegramChatId}
                      onChange={(e) => setTestTelegramChatId(e.target.value)}
                      placeholder={telegramSettings.telegram_admin_chat_id || 'Enter your Telegram Chat ID...'}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border bg-background text-foreground"
                    />
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Send <code>/start</code> to your bot first, then enter your Chat ID to receive a live test 6-digit OTP on Telegram.
                    </p>
                  </div>

                  <Button
                    type="button"
                    onClick={handleTestTelegramConnection}
                    disabled={testingTelegram}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  >
                    {testingTelegram ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Testing Telegram API...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" /> Test Bot Token & Send OTP
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* One-Time Token Reveal Banner */}
            {revealedToken && (
              <Card className="border-purple-500 bg-purple-500/10 text-foreground relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-500" />
                      <CardTitle className="text-sm font-bold text-purple-700 dark:text-purple-300">
                        New API Token Generated: "{revealedToken.name}"
                      </CardTitle>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRevealedToken(null)}
                      className="h-7 w-7 p-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <CardDescription className="text-xs">
                    Please copy this secret key now. For security purposes, this token will{' '}
                    <strong className="text-foreground">never be displayed again</strong>.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 bg-background/80 backdrop-blur-md p-2.5 rounded-lg border">
                    <input
                      type={showPlainToken ? 'text' : 'password'}
                      readOnly
                      value={revealedToken.plain_text_token}
                      className="bg-transparent flex-1 font-mono text-xs text-foreground outline-none select-all"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPlainToken(!showPlainToken)}
                      className="h-8 w-8 p-0"
                    >
                      {showPlainToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleCopyToken}
                      className="gap-1 text-xs bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {copiedToken ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedToken ? 'Copied!' : 'Copy Key'}
                    </Button>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      Owner: <strong>{revealedToken.user.name}</strong> ({revealedToken.user.email})
                    </span>
                    <span>
                      Expires: <strong>{revealedToken.expires_at ? new Date(revealedToken.expires_at).toLocaleDateString() : 'Never'}</strong>
                    </span>
                    <span>
                      Abilities: <strong>{revealedToken.abilities.join(', ')}</strong>
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Search Filter */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search token name or user..."
                  value={tokenSearch}
                  onChange={(e) => setTokenSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchTokens()}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                />
              </div>
              <Button size="sm" variant="secondary" onClick={fetchTokens} className="text-xs">
                Search
              </Button>
            </div>

            {/* Tokens Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">Active Personal Access Tokens</CardTitle>
                <CardDescription className="text-xs">
                  Tokens grant direct authenticated API access to TYUSHOP REST services via Bearer Authentication.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="dashboard-table-scroll">
                  <table className="dashboard-data-table w-full text-left text-xs">
                    <thead className="bg-muted/50 border-y text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">Token Name & Scopes</th>
                        <th className="py-2.5 px-4">Assigned User</th>
                        <th className="py-2.5 px-4">Created</th>
                        <th className="py-2.5 px-4">Last Used</th>
                        <th className="py-2.5 px-4">Expiration</th>
                        <th className="py-2.5 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {tokensLoading ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                            Loading API Tokens...
                          </td>
                        </tr>
                      ) : tokens.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-muted-foreground">
                            No API tokens registered. Click <strong>Generate API Token</strong> to issue one.
                          </td>
                        </tr>
                      ) : (
                        tokens.map((token) => (
                          <tr key={token.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-foreground flex items-center gap-1.5">
                                <Key className="w-3.5 h-3.5 text-purple-500" />
                                {token.name}
                              </div>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {token.abilities.map((ab) => (
                                  <Badge key={ab} variant="secondary" className="text-[10px] px-1.5 py-0">
                                    {ab}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {token.user ? (
                                <div>
                                  <div className="font-semibold text-foreground">{token.user.name}</div>
                                  <div className="text-[11px] text-muted-foreground">{token.user.email}</div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground italic">System / Deleted</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(token.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {token.last_used_at ? new Date(token.last_used_at).toLocaleString() : 'Never'}
                            </td>
                            <td className="py-3 px-4">
                              {token.expires_at ? (
                                <Badge variant={token.is_expired ? 'destructive' : 'outline'} className="text-[10px]">
                                  {token.is_expired ? 'Expired' : new Date(token.expires_at).toLocaleDateString()}
                                </Badge>
                              ) : (
                                <span className="text-muted-foreground text-[11px]">No Expiry</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRegenerateToken(token.id, token.name)}
                                  className="h-7 text-xs gap-1"
                                  title="Regenerate token key"
                                >
                                  <RefreshCw className="w-3 h-3" /> Regenerate
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRevokeToken(token.id, token.name)}
                                  className="h-7 text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 gap-1"
                                  title="Revoke token"
                                >
                                  <Trash2 className="w-3 h-3" /> Revoke
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* API Tokens Pagination */}
                <Pagination
                  currentPage={tokensPage}
                  totalPages={tokensTotalPages}
                  totalItems={tokensTotalCount}
                  perPage={tokensPerPage}
                  onPageChange={(p) => setTokensPage(p)}
                  onPerPageChange={(newPerPage) => {
                    setTokensPerPage(newPerPage)
                    setTokensPage(1)
                  }}
                  itemName="API tokens"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* --- TAB 2: USER EMAIL, PASSWORD & OTP --- */}
        {activeTab === 'users' && (
          <div className="space-y-6">
            {/* Search Filter */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-sm">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search user by name, email, or phone..."
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                  className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border bg-background text-foreground"
                />
              </div>
              <Button size="sm" variant="secondary" onClick={fetchUsers} className="text-xs">
                Search
              </Button>
            </div>

            {/* Users Table */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold">User Credentials & OTP Dispatch Center</CardTitle>
                <CardDescription className="text-xs">
                  Direct administrative management to update email addresses, assign Argon2id hashed passwords, and dispatch instant 6-digit OTP verification codes.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="dashboard-table-scroll">
                  <table className="dashboard-data-table w-full text-left text-xs">
                    <thead className="bg-muted/50 border-y text-muted-foreground font-semibold">
                      <tr>
                        <th className="py-2.5 px-4">User Details</th>
                        <th className="py-2.5 px-4">Assigned Roles</th>
                        <th className="py-2.5 px-4">Status & Verification</th>
                        <th className="py-2.5 px-4">Registered</th>
                        <th className="py-2.5 px-4 text-right">Administrative Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {usersLoading ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-500" />
                            Loading User Records...
                          </td>
                        </tr>
                      ) : users.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-muted-foreground">
                            No matching user accounts found.
                          </td>
                        </tr>
                      ) : (
                        users.map((u) => (
                          <tr key={u.id} className="hover:bg-muted/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-foreground">{u.name}</div>
                              <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                                <span>{u.email}</span>
                                {u.is_email_verified ? (
                                  <span title="Verified">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  </span>
                                ) : (
                                  <span title="Unverified">
                                    <AlertCircle className="w-3 h-3 text-amber-500" />
                                  </span>
                                )}
                              </div>
                              {u.phone_number && (
                                <div className="text-[10px] text-muted-foreground">{u.phone_number}</div>
                              )}
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-wrap gap-1">
                                {u.roles.map((r) => (
                                  <Badge key={r.slug} variant="secondary" className="text-[10px] uppercase font-bold">
                                    {r.name}
                                  </Badge>
                                ))}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex flex-col gap-1 items-start">
                                <Badge
                                  variant={u.status === 'active' ? 'outline' : 'destructive'}
                                  className="text-[10px] capitalize"
                                >
                                  {u.status}
                                </Badge>
                                <span className="text-[10px] text-muted-foreground">
                                  {u.is_email_verified ? 'Email Verified' : 'Pending Verification'}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-muted-foreground">
                              {new Date(u.created_at).toLocaleDateString()}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserForEmail(u)
                                    setNewEmailValue(u.email)
                                  }}
                                  className="h-7 text-xs gap-1"
                                >
                                  <Mail className="w-3 h-3" /> Update Email
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedUserForPassword(u)
                                    setNewPasswordValue('')
                                  }}
                                  className="h-7 text-xs gap-1"
                                >
                                  <Lock className="w-3 h-3" /> Set Password
                                </Button>

                                <Button
                                  size="sm"
                                  disabled={sendingOtpUserId === u.id}
                                  onClick={() => handleSendUserOtp(u)}
                                  className="h-7 text-xs gap-1 bg-purple-600 hover:bg-purple-700 text-white"
                                >
                                  {sendingOtpUserId === u.id ? (
                                    <RefreshCw className="w-3 h-3 animate-spin" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                  Send OTP
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Registered Users Pagination */}
                <Pagination
                  currentPage={usersPage}
                  totalPages={usersTotalPages}
                  totalItems={usersTotalCount}
                  perPage={usersPerPage}
                  onPageChange={(p) => setUsersPage(p)}
                  onPerPageChange={(newPerPage) => {
                    setUsersPerPage(newPerPage)
                    setUsersPage(1)
                  }}
                  itemName="registered users"
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* --- TAB 3: EMAIL SETTINGS & SENT OTP LOGS --- */}
        {activeTab === 'email' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: SMTP Configuration & Deliverability Test */}
              <div className="lg:col-span-6 space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base font-bold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-purple-500" />
                        SMTP & Email Service Provider Config
                      </span>
                      {emailSettingsLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-500" />}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Configure outbound mail for OTPs and order invoices. For Resend, use SMTP with host
                      <code className="mx-1 rounded bg-muted px-1">smtp.resend.com</code>, username
                      <code className="mx-1 rounded bg-muted px-1">resend</code>, and your Resend API key as the password.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSaveEmailSettings} className="space-y-3 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold block mb-1">Mail Driver</label>
                          <select
                            value={emailSettings.mail_mailer}
                            onChange={(e) => setEmailSettings({ ...emailSettings, mail_mailer: e.target.value })}
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                          >
                            <option value="smtp">SMTP (Recommended)</option>
                            <option value="sendmail">Sendmail</option>
                            <option value="log">Log (Testing)</option>
                          </select>
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">SMTP Host</label>
                          <input
                            type="text"
                            value={emailSettings.mail_host}
                            onChange={(e) => setEmailSettings({ ...emailSettings, mail_host: e.target.value })}
                            placeholder="smtp.resend.com"
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="font-semibold block mb-1">Port</label>
                          <input
                            type="number"
                            value={emailSettings.mail_port}
                            onChange={(e) => setEmailSettings({ ...emailSettings, mail_port: Number(e.target.value) })}
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="font-semibold block mb-1">Encryption</label>
                          <select
                            value={emailSettings.mail_encryption}
                            onChange={(e) => setEmailSettings({ ...emailSettings, mail_encryption: e.target.value })}
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                          >
                            <option value="tls">TLS (STARTTLS)</option>
                            <option value="ssl">SSL</option>
                            <option value="none">None</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold block mb-1">SMTP Username</label>
                          <input
                            type="text"
                            value={emailSettings.mail_username}
                            onChange={(e) => setEmailSettings({ ...emailSettings, mail_username: e.target.value })}
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">
                            SMTP Password{' '}
                            {emailSettings.mail_password_set && (
                              <span className="text-[10px] text-emerald-500 font-normal">(Configured)</span>
                            )}
                          </label>
                          <input
                            type="password"
                            placeholder={emailSettings.mail_password_set ? '••••••••••••' : 'Enter API Key / Password'}
                            value={mailPasswordInput}
                            onChange={(e) => setMailPasswordInput(e.target.value)}
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="font-semibold block mb-1">From Email Address</label>
                          <input
                            type="email"
                            value={emailSettings.mail_from_address}
                            onChange={(e) => setEmailSettings({ ...emailSettings, mail_from_address: e.target.value })}
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                          />
                        </div>
                        <div>
                          <label className="font-semibold block mb-1">From Sender Name</label>
                          <input
                            type="text"
                            value={emailSettings.mail_from_name}
                            onChange={(e) => setEmailSettings({ ...emailSettings, mail_from_name: e.target.value })}
                            className="w-full p-2 border rounded-md bg-background text-foreground"
                          />
                        </div>
                      </div>

                      <div className="pt-2">
                        <Button
                          type="submit"
                          disabled={savingEmailSettings}
                          className="w-full text-xs bg-purple-600 hover:bg-purple-700 text-white"
                        >
                          {savingEmailSettings ? 'Saving Settings...' : 'Save Email & SMTP Settings'}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>

                {/* SMTP Deliverability Test Card */}
                <Card className="border-emerald-500/40 bg-emerald-500/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                      <Send className="w-4 h-4" />
                      Live SMTP OTP Deliverability Test
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Send a real-time OTP verification email to test inbound deliverability and server connectivity.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSendTestEmail} className="flex gap-2">
                      <input
                        type="email"
                        required
                        placeholder="your-email@example.com"
                        value={testEmailAddress}
                        onChange={(e) => setTestEmailAddress(e.target.value)}
                        className="flex-1 p-2 text-xs border rounded-md bg-background text-foreground"
                      />
                      <Button
                        type="submit"
                        disabled={sendingTestEmail}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white shrink-0"
                      >
                        {sendingTestEmail ? 'Sending...' : 'Send Test OTP'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>

              {/* Right Column: Sent OTP Delivery & Audit Log */}
              <div className="lg:col-span-6 space-y-6">
                <Card>
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-bold flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-500" />
                        Dispatched OTP Codes & Verification Logs
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Audit history of 6-digit recovery codes sent by TYUSHOP.
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Direct Dispatch Bar */}
                    <form onSubmit={handleDirectOtpDispatch} className="flex gap-2 pb-2 border-b">
                      <input
                        type="email"
                        required
                        placeholder="Dispatch OTP to any email..."
                        value={directOtpEmail}
                        onChange={(e) => setDirectOtpEmail(e.target.value)}
                        className="flex-1 p-2 text-xs border rounded-md bg-background text-foreground"
                      />
                      <Button
                        type="submit"
                        disabled={dispatchingDirectOtp}
                        className="text-xs bg-purple-600 hover:bg-purple-700 text-white shrink-0"
                      >
                        {dispatchingDirectOtp ? 'Sending...' : 'Dispatch OTP'}
                      </Button>
                    </form>

                    {/* Sent OTP Table */}
                    <div className="dashboard-table-scroll max-h-[460px] overflow-y-auto">
                      <table className="dashboard-data-table w-full text-left text-xs">
                        <thead className="bg-muted/50 border-b text-muted-foreground font-semibold sticky top-0">
                          <tr>
                            <th className="py-2 px-3">Recipient</th>
                            <th className="py-2 px-3">Status</th>
                            <th className="py-2 px-3">Expires</th>
                            <th className="py-2 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {otpsLoading ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-muted-foreground">
                                Loading Sent OTP Logs...
                              </td>
                            </tr>
                          ) : sentOtps.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="py-6 text-center text-muted-foreground">
                                No OTPs dispatched yet.
                              </td>
                            </tr>
                          ) : (
                            sentOtps.map((otp) => (
                              <tr key={otp.id} className="hover:bg-muted/20">
                                <td className="py-2.5 px-3">
                                  <div className="font-semibold text-foreground">{otp.email}</div>
                                  <div className="text-[10px] text-muted-foreground">
                                    {new Date(otp.created_at).toLocaleTimeString()} ({otp.attempts} attempts)
                                  </div>
                                </td>
                                <td className="py-2.5 px-3">
                                  {otp.is_used ? (
                                    <Badge variant="secondary" className="text-[10px]">
                                      Used / Closed
                                    </Badge>
                                  ) : otp.is_expired ? (
                                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                      Expired
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] text-emerald-500 border-emerald-500">
                                      Active Code
                                    </Badge>
                                  )}
                                </td>
                                <td className="py-2.5 px-3 text-muted-foreground text-[11px]">
                                  {new Date(otp.expires_at).toLocaleTimeString()}
                                </td>
                                <td className="py-2.5 px-3 text-right">
                                  {!otp.is_used && !otp.is_expired ? (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleInvalidateOtp(otp.id, otp.email)}
                                      className="h-6 text-[10px] text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    >
                                      Invalidate
                                    </Button>
                                  ) : (
                                    <span className="text-[10px] text-muted-foreground">—</span>
                                  )}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* Dispatched OTPs Pagination */}
                    <Pagination
                      currentPage={otpsPage}
                      totalPages={otpsTotalPages}
                      totalItems={otpsTotalCount}
                      perPage={otpsPerPage}
                      onPageChange={(p) => setOtpsPage(p)}
                      onPerPageChange={(newPerPage) => {
                        setOtpsPerPage(newPerPage)
                        setOtpsPage(1)
                      }}
                      itemName="dispatched OTPs"
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* --- MODAL: CREATE API TOKEN --- */}
        {isCreateTokenOpen && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-2xl border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Key className="w-4 h-4 text-purple-500" />
                  Generate New Personal Access Token
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setIsCreateTokenOpen(false)} className="h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateToken} className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">Token Name / Description</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g., Mobile POS Worker, ERP Integration Key"
                      value={newTokenName}
                      onChange={(e) => setNewTokenName(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background text-foreground"
                    />
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Token Scope / Abilities</label>
                    <div className="space-y-1.5 p-3 rounded-lg border bg-muted/20">
                      {[
                        { label: 'Full Administrator Access (*)', value: '*' },
                        { label: 'Read Products & Catalog', value: 'read:products' },
                        { label: 'Manage Stock & Inventory', value: 'write:inventory' },
                        { label: 'View & Process Orders', value: 'manage:orders' },
                      ].map((item) => (
                        <label key={item.value} className="flex items-center gap-2 cursor-pointer text-xs">
                          <input
                            type="checkbox"
                            checked={newTokenAbilities.includes(item.value)}
                            onChange={(e) => {
                              if (item.value === '*') {
                                setNewTokenAbilities(e.target.checked ? ['*'] : [])
                              } else {
                                const withoutWildcard = newTokenAbilities.filter((a) => a !== '*')
                                if (e.target.checked) {
                                  setNewTokenAbilities([...withoutWildcard, item.value])
                                } else {
                                  setNewTokenAbilities(withoutWildcard.filter((a) => a !== item.value))
                                }
                              }
                            }}
                            className="rounded text-purple-600"
                          />
                          <span>{item.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="font-semibold block mb-1">Expiration Period</label>
                    <select
                      value={newTokenExpiryDays === null ? 'never' : newTokenExpiryDays}
                      onChange={(e) => {
                        const val = e.target.value
                        setNewTokenExpiryDays(val === 'never' ? null : Number(val))
                      }}
                      className="w-full p-2 border rounded-md bg-background text-foreground"
                    >
                      <option value={7}>7 Days</option>
                      <option value={30}>30 Days (Recommended)</option>
                      <option value={90}>90 Days</option>
                      <option value={365}>1 Year</option>
                      <option value="never">No Expiration</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={() => setIsCreateTokenOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={creatingToken} className="bg-purple-600 hover:bg-purple-700 text-white">
                      {creatingToken ? 'Generating...' : 'Issue API Key'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* --- MODAL: UPDATE USER EMAIL --- */}
        {selectedUserForEmail && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-2xl border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Mail className="w-4 h-4 text-purple-500" />
                  Update User Email Address
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUserForEmail(null)} className="h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveEmail} className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">User</label>
                    <p className="text-muted-foreground">{selectedUserForEmail.name}</p>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">New Email Address</label>
                    <input
                      type="email"
                      required
                      value={newEmailValue}
                      onChange={(e) => setNewEmailValue(e.target.value)}
                      className="w-full p-2 border rounded-md bg-background text-foreground"
                    />
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={() => setSelectedUserForEmail(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingEmail} className="bg-purple-600 hover:bg-purple-700 text-white">
                      {savingEmail ? 'Saving...' : 'Update Email'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {/* --- MODAL: UPDATE USER PASSWORD --- */}
        {selectedUserForPassword && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full shadow-2xl border">
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Lock className="w-4 h-4 text-purple-500" />
                  Assign New Password
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setSelectedUserForPassword(null)} className="h-7 w-7 p-0">
                  <X className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSavePassword} className="space-y-4 text-xs">
                  <div>
                    <label className="font-semibold block mb-1">User Account</label>
                    <p className="text-muted-foreground">
                      {selectedUserForPassword.name} ({selectedUserForPassword.email})
                    </p>
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">New Password (Min 8 Chars, Mixed Case, Numbers)</label>
                    <div className="relative">
                      <input
                        type={showPasswordMask ? 'text' : 'password'}
                        required
                        placeholder="Enter secure password..."
                        value={newPasswordValue}
                        onChange={(e) => setNewPasswordValue(e.target.value)}
                        className="w-full p-2 pr-9 border rounded-md bg-background text-foreground"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowPasswordMask(!showPasswordMask)}
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                      >
                        {showPasswordMask ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" type="button" onClick={() => setSelectedUserForPassword(null)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={savingPassword} className="bg-purple-600 hover:bg-purple-700 text-white">
                      {savingPassword ? 'Updating...' : 'Set Password'}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
