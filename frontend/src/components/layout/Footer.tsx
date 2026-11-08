import { Link } from 'react-router-dom'
import {
  ShoppingBag,
  Mail,
  ShieldCheck,
  Truck,
  RotateCcw,
  Headphones,
  CreditCard,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Logo } from '@/components/ui/logo'

export function Footer() {
  return (
    <footer className="border-t bg-card text-card-foreground">
      {/* Value propositions banner */}
      <div className="border-b bg-muted/40 py-8">
        <div className="container mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Reliable Delivery</p>
              <p className="text-xs text-muted-foreground">Nationwide coverage with GPS dispatch</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Buyer Protection</p>
              <p className="text-xs text-muted-foreground">100% verified authentic multi-vendor</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Hassle-Free Returns</p>
              <p className="text-xs text-muted-foreground">7-day returns on qualifying items</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">24/7 Dedicated Support</p>
              <p className="text-xs text-muted-foreground">Expert resolution desk always online</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Footer Links */}
      <div className="container mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-5 gap-8">
        {/* Brand & Mission */}
        <div className="md:col-span-2 space-y-4">
          <Link to="/" aria-label="TYUSHOP Home">
            <Logo size="md" subtitle="Flagship Enterprise Platform" />
          </Link>
          <p className="text-xs text-muted-foreground leading-relaxed max-w-sm">
            TYUSHOP is a modern multi-vendor e-commerce platform connecting buyers with verified sellers, powered by high-performance Laravel and React architecture.
          </p>

          {/* Newsletter Box */}
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold">Subscribe for vendor promotions & discounts</p>
            <div className="flex gap-2 max-w-sm">
              <Input
                type="email"
                placeholder="Enter your email address"
                className="h-9 text-xs"
              />
              <Button size="sm" className="h-9 px-4 text-xs">
                Subscribe
              </Button>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            Explore
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li><Link to="/products" className="hover:text-primary transition-colors">All Products</Link></li>
            <li><Link to="/categories" className="hover:text-primary transition-colors">Categories</Link></li>
            <li><Link to="/brands" className="hover:text-primary transition-colors">Featured Brands</Link></li>
            <li><Link to="/cart" className="hover:text-primary transition-colors">Shopping Cart</Link></li>
            <li><Link to="/wishlist" className="hover:text-primary transition-colors">My Wishlist</Link></li>
          </ul>
        </div>

        {/* Customer Care */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            Help & Company
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li><Link to="/about" className="hover:text-primary transition-colors">About TYUSHOP</Link></li>
            <li><Link to="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
            <li><Link to="/faq" className="hover:text-primary transition-colors">Frequently Asked Questions</Link></li>
            <li><Link to="/diagnostics" className="hover:text-amber-500 transition-colors font-medium">System Diagnostics</Link></li>
            <li><a href="#terms" className="hover:text-primary transition-colors">Terms of Service</a></li>
          </ul>
        </div>

        {/* Merchant & Drivers */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3">
            Vendor & Partners
          </h4>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li><Link to="/register" className="hover:text-primary transition-colors">Register as Seller</Link></li>
            <li><Link to="/dashboard/seller" className="hover:text-primary transition-colors">Seller Dashboard Preview</Link></li>
            <li><Link to="/dashboard/delivery" className="hover:text-primary transition-colors">Delivery Fleet Preview</Link></li>
            <li><Link to="/dashboard/warehouse" className="hover:text-primary transition-colors">Warehouse Desk Preview</Link></li>
            <li><Link to="/dashboard/admin" className="hover:text-primary transition-colors">Admin Portal Preview</Link></li>
          </ul>
        </div>
      </div>

      {/* Bottom Legal bar */}
      <div className="border-t py-6 bg-muted/20">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <p>© 2026 TYUSHOP Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-primary" /> Supported Payments: KHQR Bakong, Visa, Mastercard (Phase 2)
            </span>
          </div>
        </div>
      </div>
    </footer>
  )
}
