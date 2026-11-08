import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, HelpCircle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const faqs = [
  {
    q: 'What is MegaCommerce?',
    a: 'MegaCommerce is a modern multi-vendor marketplace platform built for scale, supporting independent sellers, regional warehouses, dispatch drivers, and customer ordering.',
  },
  {
    q: 'What features are active in Phase 1?',
    a: 'Phase 1 establishes the complete foundation: Laravel 12 API with /api/v1 versioning, PostgreSQL database with Eloquent role/permission models and seeders, React TypeScript UI design system, authentication forms with validation, dashboard layout shells, and Docker environment recipes.',
  },
  {
    q: 'How does seller onboarding work?',
    a: 'In Phase 2, sellers can register via the portal, submit business verification documents, configure their digital storefront, and link Bakong KHQR merchant accounts.',
  },
  {
    q: 'What payment options will be supported in Phase 2?',
    a: 'MegaCommerce will support Bakong KHQR real-time payment gateway, standard Credit/Debit Cards (Visa/Mastercard), Cash on Delivery (COD), and digital merchant payouts.',
  },
  {
    q: 'Where can I inspect the live backend health status?',
    a: 'You can navigate to the API Diagnostics page (/diagnostics) at any time to verify live PostgreSQL connection status, database latency, and system health checks.',
  },
]

export function FaqPage() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-3xl">
      <div className="border-b pb-6">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">Home</Link> / <span className="text-foreground font-medium">FAQ</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Frequently Asked Questions</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Everything you need to know about MegaCommerce Phase 1 architecture and roadmap.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, idx) => {
          const isOpen = openIdx === idx
          return (
            <Card key={idx} className="overflow-hidden">
              <button
                type="button"
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                className="w-full text-left p-4 flex items-center justify-between gap-4 font-semibold text-sm hover:bg-muted/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-primary shrink-0" />
                  {faq.q}
                </span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform shrink-0',
                    isOpen && 'rotate-180 text-primary'
                  )}
                />
              </button>
              {isOpen && (
                <CardContent className="px-4 pb-4 pt-0 text-xs text-muted-foreground leading-relaxed">
                  {faq.a}
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}

