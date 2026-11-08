import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  CheckCircle2,
  XCircle,
  Database,
  Server,
  RefreshCw,
  Clock,
  Layers,
  ArrowLeft,
  SlidersHorizontal,
} from 'lucide-react'
import { useHealth, useHealthDetails } from '@/hooks/useHealth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function DiagnosticsPage() {
  const { data: health, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useHealth()
  const { data: readiness, isLoading: readyLoading, isError: readyError, refetch: refetchReady } = useHealthDetails()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await Promise.all([refetchHealth(), refetchReady()])
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const isConnected = !healthError && health?.status === 'ok'
  const dbConnected = readiness?.dependencies?.database?.status === 'healthy'

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-5xl">
      {/* Header */}
      <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:underline inline-flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Storefront
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <SlidersHorizontal className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System Diagnostics</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Real-time connectivity and health telemetry between React and Laravel API.
              </p>
            </div>
          </div>
        </div>

        <Button
          onClick={handleRefresh}
          disabled={isRefreshing || healthLoading}
          className="gap-2 rounded-xl text-xs font-semibold shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* Primary Connectivity Status Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Backend API Status */}
        <Card className={`border-2 ${isConnected ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-rose-500/50 bg-rose-500/5'}`}>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Laravel API
              </span>
              {isConnected ? (
                <Badge variant="success" className="text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Connected
                </Badge>
              ) : (
                <Badge variant="destructive" className="text-xs gap-1">
                  <XCircle className="w-3 h-3" /> Offline
                </Badge>
              )}
            </div>
            <div>
              <div className="text-xl font-black">
                {healthLoading ? 'Probing...' : health?.application || 'Connection Failed'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Endpoint: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">/api/v1/health</code>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* PostgreSQL Database Status */}
        <Card className={`border-2 ${dbConnected ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-amber-500/50 bg-amber-500/5'}`}>
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                PostgreSQL DB
              </span>
              {dbConnected ? (
                <Badge variant="success" className="text-xs gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Healthy
                </Badge>
              ) : (
                <Badge variant="warning" className="text-xs gap-1">
                  Pending / Degraded
                </Badge>
              )}
            </div>
            <div>
              <div className="text-xl font-black">
                {readiness?.dependencies?.database?.driver ? `Driver: ${readiness.dependencies.database.driver}` : 'Checking...'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Query Latency: <strong className="text-foreground">{readiness?.dependencies?.database?.latency_ms ?? 0} ms</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Environment Configuration */}
        <Card className="border">
          <CardContent className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Frontend Env
              </span>
              <Badge variant="outline" className="text-xs">
                Vite React
              </Badge>
            </div>
            <div>
              <div className="text-sm font-bold truncate">
                Base: {import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1'}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Mode: <strong className="text-foreground">{import.meta.env.MODE || 'development'}</strong>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Telemetry Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Server className="w-4 h-4 text-primary" /> Dependency Health Telemetry
          </CardTitle>
          <CardDescription className="text-xs">
            Live telemetry breakdown reported by Laravel health controller.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Database className="w-4 h-4 text-primary" /> Database Service
              </div>
              <p className="text-muted-foreground">PostgreSQL 18</p>
              <p className="text-[11px] text-muted-foreground">
                Status: <span className="font-semibold text-emerald-600">{readiness?.dependencies?.database?.status || 'N/A'}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Activity className="w-4 h-4 text-amber-500" /> Redis Cache / Queue
              </div>
              <p className="text-muted-foreground">Predis Client</p>
              <p className="text-[11px] text-muted-foreground">
                Status: <span className="font-semibold text-amber-600">{readiness?.dependencies?.redis?.status || 'idle_fallback'}</span>
              </p>
            </div>

            <div className="p-4 rounded-xl border bg-muted/20 space-y-1">
              <div className="flex items-center gap-2 font-bold text-foreground">
                <Layers className="w-4 h-4 text-purple-500" /> Storage Engine
              </div>
              <p className="text-muted-foreground">Local Filesystem</p>
              <p className="text-[11px] text-muted-foreground">
                Status: <span className="font-semibold text-emerald-600">{readiness?.dependencies?.storage?.status || 'healthy'}</span>
              </p>
            </div>
          </div>

          {/* Raw JSON inspection */}
          <div className="pt-2">
            <p className="text-xs font-bold text-muted-foreground mb-1 uppercase tracking-wider">
              Raw Endpoint Payload (/api/v1/health/ready)
            </p>
            <pre className="p-4 rounded-xl bg-slate-950 text-emerald-400 font-mono text-[11px] overflow-x-auto max-h-64">
              {JSON.stringify(readiness || { error: 'No payload' }, null, 2)}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

