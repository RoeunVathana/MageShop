import { Link } from 'react-router-dom'
import { ShieldCheck, Users, Globe, Cpu } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <div className="border-b pb-6">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">Home</Link> / <span className="text-foreground font-medium">About</span>
        </div>
        <div className="max-w-2xl space-y-2">
          <Badge variant="outline" className="text-xs">Phase 1 Foundation</Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            About MegaCommerce Platform
          </h1>
          <p className="text-sm text-muted-foreground">
            A large-scale multi-vendor e-commerce platform engineered with a robust Laravel API, PostgreSQL, and React TypeScript frontend.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
              <Cpu className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">Modern Stack</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Decoupled architecture using Laravel 12 REST API (/api/v1), PostgreSQL 18, and Vite React with TypeScript.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-500">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">Multi-Vendor Hub</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Engineered for six key roles: Super Admin, Admin, Staff, Seller merchants, Customers, and Delivery fleet.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">Sanctum Security</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Tokenized authentication with Laravel Sanctum, CSRF cookie verification, and role/permission matrix.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-amber-500/10 text-amber-500">
              <Globe className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">Ready for Scale</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Containerized with Docker Compose, Redis caching, asynchronous queues, and Reverb WebSocket real-time events.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

