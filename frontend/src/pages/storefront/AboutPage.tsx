import { Link } from 'react-router-dom'
import {
  ShieldCheck,
  Users,
  Globe,
  Cpu,
  Gift,
  Truck,
  Heart,
  Headphones,
  ArrowRight,
  Award,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

export function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      <div className="border-b pb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="max-w-2xl space-y-3">
          <div className="text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">Home</Link> /{' '}
            <span className="text-foreground font-medium">About MegaCommerce</span>
          </div>
          <Badge className="bg-primary/15 text-primary text-xs">
            Cambodia & Southeast Asia Flagship Multi-Vendor Marketplace
          </Badge>
          <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
            About MegaCommerce & Supporter Ecosystem
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            MegaCommerce unites 26 universal product departments, instant Bakong KHQR payments, a generous <strong>100-Point Free Item Loyalty Program</strong>, and <strong>Real-Time Satellite GPS Delivery Tracking</strong> in one secure platform.
          </p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link to="/products">
              <Button className="rounded-xl gap-2 text-xs">
                Explore Catalog <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/track-order">
              <Button variant="outline" className="rounded-xl gap-2 text-xs">
                <Truck className="w-4 h-4 text-primary" /> Watch Live GPS Delivery
              </Button>
            </Link>
            <Link to="/contact">
              <Button variant="outline" className="rounded-xl gap-2 text-xs">
                <Headphones className="w-4 h-4 text-emerald-500" /> Contact 24/7 Supporter
              </Button>
            </Link>
          </div>
        </div>

        {/* Key Stats */}
        <div className="grid grid-cols-2 gap-4 shrink-0">
          <div className="p-4 rounded-2xl border bg-card text-center">
            <div className="text-2xl font-extrabold text-primary">+5 Pts</div>
            <div className="text-[11px] text-muted-foreground">Earned Every Purchase</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center">
            <div className="text-2xl font-extrabold text-emerald-500">100 Pts</div>
            <div className="text-[11px] text-muted-foreground">Free Item Under $20–$30</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center">
            <div className="text-2xl font-extrabold text-purple-500">24/7</div>
            <div className="text-[11px] text-muted-foreground">Live Supporter & GPS</div>
          </div>
          <div className="p-4 rounded-2xl border bg-card text-center">
            <div className="text-2xl font-extrabold text-amber-500">100%</div>
            <div className="text-[11px] text-muted-foreground">Cloud S3 Media Backup</div>
          </div>
        </div>
      </div>

      {/* Core Pillars */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-amber-500/10 text-amber-500">
              <Gift className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">100-Point Free Rewards</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every purchase automatically awards <strong>+5 Loyalty Points</strong>. Collect 100 points to redeem any eligible product priced under <strong>$20–$30 for FREE ($0.00)</strong>!
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-emerald-500/10 text-emerald-500">
              <Truck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">Real-Time GPS Delivery</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Watch your courier move in real time on our interactive Phnom Penh map with live coordinates, speed, ETA, and direct driver phone contact.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-purple-500/10 text-purple-500">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">OWASP Hardened Security</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Protected by Argon2id hashing, HSTS, Content-Security-Policy, WAF query inspection, Sanctum token scopes, and 24/7 self-healing cloud watchdog.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 space-y-2">
            <div className="p-3 w-fit rounded-xl bg-primary/10 text-primary">
              <Headphones className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">24/7 Customer Supporter</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Instant live chat assistant and priority ticket routing for order inquiries, discount coupons, and merchant onboarding.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
