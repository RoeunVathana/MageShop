import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Bot, CheckCircle2, Eye, EyeOff, KeyRound, Save, Send, ShieldCheck } from 'lucide-react'
import { DashboardLayout } from '@/components/dashboard/DashboardLayout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'
import { securityService, type SellerTelegramSettings } from '@/services/security.service'
import { sellerNav } from './SellerDashboard'

export function SellerTelegramSettingsPage() {
  const { toast } = useToast()
  const { t } = useShopEngagement()
  const [settings, setSettings] = useState<SellerTelegramSettings>({
    telegram_bot_token_set: false,
    telegram_bot_token_masked: '',
    telegram_bot_username: 'TyuShopBot',
  })
  const [tokenInput, setTokenInput] = useState('')
  const [username, setUsername] = useState('TyuShopBot')
  const [showToken, setShowToken] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    let mounted = true
    securityService.getSellerTelegramSettings()
      .then((response) => {
        if (!mounted || !response.data) return
        setSettings(response.data)
        setUsername(response.data.telegram_bot_username)
      })
      .catch((error: any) => {
        toast({ title: 'Telegram settings unavailable', description: error?.message || 'Could not load Telegram bot settings.', type: 'error' })
      })
      .finally(() => {
        if (mounted) setLoading(false)
      })
    return () => { mounted = false }
  }, [toast])

  const handleSave = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await securityService.updateSellerTelegramSettings({
        telegram_bot_token: tokenInput.trim() || undefined,
        telegram_bot_username: username.trim() || undefined,
      })
      if (response.data) setSettings(response.data)
      setTokenInput('')
      toast({ title: 'Telegram bot settings saved', description: response.message || 'The seller Telegram bot configuration was updated.', type: 'success' })
    } catch (error: any) {
      toast({ title: 'Could not save Telegram settings', description: error?.response?.data?.message || error?.message || 'Please check the token and try again.', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async () => {
    setTesting(true)
    try {
      const response = await securityService.testSellerTelegramBotConnection()
      toast({ title: 'Telegram bot verified', description: response.message || 'The Telegram bot token is valid.', type: 'success' })
    } catch (error: any) {
      toast({ title: 'Telegram bot test failed', description: error?.response?.data?.message || error?.message || 'Telegram rejected the bot token.', type: 'error' })
    } finally {
      setTesting(false)
    }
  }

  return (
    <DashboardLayout
      roleTitle="Seller Merchant Hub"
      roleTitleKm="មជ្ឈមណ្ឌលអ្នកលក់"
      roleSlug="seller"
      roleColor="text-emerald-500"
      navItems={sellerNav}
    >
      <div className="max-w-3xl space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-emerald-600" />
            <h1 className="text-2xl font-black tracking-tight">{t('Telegram Bot Settings', 'ការកំណត់ Telegram Bot')}</h1>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{t('Update the Telegram Bot API token used by your seller order notifications.', 'ធ្វើបច្ចុប្បន្នភាព Telegram Bot API token ដែលប្រើសម្រាប់ការជូនដំណឹងការបញ្ជាទិញរបស់អ្នកលក់។')}</p>
        </div>

        <Card className="border-emerald-500/30 shadow-md">
          <CardHeader className="border-b bg-emerald-500/5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="flex items-center gap-2 text-base font-bold"><KeyRound className="h-4 w-4 text-emerald-600" /> Telegram Bot API Token</CardTitle>
                <CardDescription className="mt-1 text-xs">Create or copy this token from @BotFather. The token is never displayed in full.</CardDescription>
              </div>
              <Badge className={settings.telegram_bot_token_set ? 'border-0 bg-emerald-500/15 text-emerald-600' : 'border-0 bg-amber-500/15 text-amber-600'}>
                {settings.telegram_bot_token_set ? 'CONFIGURED' : 'NOT SET'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-5">
            {loading ? <div className="h-32 animate-pulse rounded-xl bg-muted" /> : (
              <form onSubmit={handleSave} className="space-y-5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="text-xs font-bold">New Bot API Token Key</label>
                    {settings.telegram_bot_token_masked && <span className="font-mono text-[11px] text-emerald-600">Active: {settings.telegram_bot_token_masked}</span>}
                  </div>
                  <div className="relative">
                    <input
                      type={showToken ? 'text' : 'password'}
                      value={tokenInput}
                      onChange={(event) => setTokenInput(event.target.value)}
                      placeholder={settings.telegram_bot_token_set ? 'Leave blank to keep the current token' : '123456789:AA...'}
                      className="w-full rounded-lg border bg-background px-3 py-2 pr-10 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      autoComplete="new-password"
                    />
                    <button type="button" onClick={() => setShowToken((value) => !value)} className="absolute right-3 top-2.5 text-muted-foreground hover:text-foreground" aria-label={showToken ? 'Hide token' : 'Show token'}>
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold">Bot Username</label>
                  <input value={username} onChange={(event) => setUsername(event.target.value)} placeholder="TyuShopBot" className="w-full rounded-lg border bg-background px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500" />
                </div>

                <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Admin chat and webhook security settings remain protected.</p>
                  <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handleTest} disabled={testing || !settings.telegram_bot_token_set} className="gap-1.5 text-xs"><Send className="h-3.5 w-3.5" /> {testing ? 'Testing...' : 'Test Bot'}</Button>
                    <Button type="submit" disabled={saving} className="gap-1.5 bg-emerald-600 text-xs hover:bg-emerald-700"><Save className="h-3.5 w-3.5" /> {saving ? 'Saving...' : 'Save Token'}</Button>
                  </div>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <div className="flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-200">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          <p>The server stores the active token and uses it for verified payment/order notifications. Never share the full token in chat or source code.</p>
        </div>
      </div>
    </DashboardLayout>
  )
}
