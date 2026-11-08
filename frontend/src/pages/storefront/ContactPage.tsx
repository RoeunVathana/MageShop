import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Mail, Phone, MapPin, Send, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/toast'

export function ContactPage() {
  const { toast } = useToast()
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    toast({
      title: 'Message Sent (Phase 1 Mock)',
      description: 'Your inquiry has been received. Our support team will follow up.',
      type: 'success',
    })
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="border-b pb-6">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">Home</Link> / <span className="text-foreground font-medium">Contact</span>
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Contact Customer Care</h1>
        <p className="text-xs text-muted-foreground mt-1">
          Have an inquiry regarding seller registration, order status, or API integrations? Get in touch.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-sm">Headquarters & Support</h3>

              <div className="space-y-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0" />
                  <span>MegaCommerce Tech Hub, Phnom Penh / Singapore</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <span>+1 (800) 555-MEGA / +855 (23) 999-000</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <span>support@megacommerce.local</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card>
            <CardContent className="p-6">
              {submitted ? (
                <div className="py-12 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                  <h3 className="font-bold text-base">Inquiry Submitted</h3>
                  <p className="text-xs text-muted-foreground">
                    This is a Phase 1 sample form. Real contact routing connects with SMTP in Phase 2.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setSubmitted(false)}>
                    Send Another Message
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Your Name</label>
                      <Input required placeholder="Jane Doe" className="text-xs h-9" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Email Address</label>
                      <Input required type="email" placeholder="jane@example.com" className="text-xs h-9" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Subject</label>
                    <Input required placeholder="Vendor inquiry / Platform question" className="text-xs h-9" />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Message</label>
                    <textarea
                      required
                      rows={4}
                      placeholder="Write your message here..."
                      className="w-full rounded-md border border-input bg-background p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <Button type="submit" size="sm" className="gap-2">
                    <Send className="w-3.5 h-3.5" /> Submit Inquiry
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

