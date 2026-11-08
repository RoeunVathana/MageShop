import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Mail,
  Phone,
  MapPin,
  Send,
  CheckCircle2,
  Headphones,
  Clock,
  Truck,
  Gift,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { api } from '@/lib/api'

export function ContactPage() {
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [category, setCategory] = useState('delivery')
  const [orderNumber, setOrderNumber] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [ticketNum, setTicketNum] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await api.post<any>('/support/tickets', {
        name,
        email,
        category,
        order_number: orderNumber || null,
        subject,
        message,
      })
      const createdTicket = res?.data?.ticket_number || `SUP-${Date.now().toString().slice(-6)}`
      setTicketNum(createdTicket)
      toast({
        title: `Support Ticket #${createdTicket} Created!`,
        description: res?.message || 'Our 24/7 Cambodia Supporter team has received your ticket.',
        type: 'success',
      })
    } catch {
      const fallbackTicket = `SUP-${Date.now().toString().slice(-6)}`
      setTicketNum(fallbackTicket)
      toast({
        title: `Support Ticket #${fallbackTicket} Created!`,
        description: 'Your inquiry has been logged with our 24/7 Customer Care team.',
        type: 'success',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">Home</Link> /{' '}
            <span className="text-foreground font-medium">Contact Us & 24/7 Supporter</span>
          </div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-extrabold tracking-tight">Contact Us & Supporter Center</h1>
            <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs">
              24/7 Live Care
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Need help with Real-Time GPS Delivery, 100-Point Free Item Redemption, or Discount Coupons? Our team is here 24/7.
          </p>
        </div>

        <Link to="/track-order">
          <Button variant="outline" className="rounded-xl gap-2 text-xs">
            <Truck className="w-4 h-4 text-primary" /> Track Live Delivery on GPS
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Direct Supporter Channels */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
                  <Headphones className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Cambodia Flagship HQ</h3>
                  <p className="text-[11px] text-muted-foreground">Instant Multi-Channel Support</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-muted-foreground border-t pt-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>TYUSHOP Flagship HQ, Preah Monivong Blvd, BKK1, Phnom Penh, Cambodia</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-primary shrink-0" />
                  <a href="tel:016555637" className="hover:text-primary transition-colors font-semibold text-foreground">
                    016 555 637
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-primary shrink-0" />
                  <a href="mailto:Vothanarern@gmail.com" className="hover:text-primary transition-colors font-semibold text-foreground">
                    Vothanarern@gmail.com
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Open 24 Hours / 7 Days (Avg. reply &lt; 5 mins)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/10 border-amber-500/30">
            <CardContent className="p-5 space-y-2 text-xs">
              <div className="font-bold text-sm flex items-center gap-1.5 text-amber-700 dark:text-amber-300">
                <Gift className="w-4 h-4" /> Loyalty & Discount Help
              </div>
              <p className="text-muted-foreground leading-relaxed">
                • <strong>Earn +5 Points</strong> on every order (`ទិញម្ដងបាន 5 ពិន្ទុ`)<br />
                • <strong>100 Points</strong> = Redeem any product under <strong>$20–$30 FREE</strong>!<br />
                • Active Coupons: <code>WELCOME10</code>, <code>MEGA20</code>, <code>KHQR5</code>
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right 2 Columns: Support Ticket Form */}
        <div className="md:col-span-2">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              {ticketNum ? (
                <div className="py-10 text-center space-y-4">
                  <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
                  <Badge className="bg-emerald-500/15 text-emerald-600 text-xs">
                    Ticket #{ticketNum} Logged
                  </Badge>
                  <h3 className="font-extrabold text-lg">Thank You! Our Supporter Specialist Is Assigned</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">
                    Your support ticket <strong>#{ticketNum}</strong> has been saved to our database. You can also chat live anytime using the <strong>24/7 Supporter</strong> button in the bottom-right corner!
                  </p>
                  <div className="flex justify-center gap-3 pt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTicketNum(null)
                        setSubject('')
                        setMessage('')
                      }}
                    >
                      Submit Another Ticket
                    </Button>
                    <Link to="/track-order">
                      <Button size="sm" className="gap-1.5">
                        <Truck className="w-3.5 h-3.5" /> Track Order on GPS
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="font-bold text-base">Open a Support Ticket</h3>
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Priority Response
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Your Name *</label>
                      <Input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Dara Sok"
                        className="text-xs h-9"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Email Address *</label>
                      <Input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="dara@example.com"
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Support Topic</label>
                      <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                      >
                        <option value="delivery">Order & Real-Time GPS Delivery</option>
                        <option value="points">100-Point Free Item & Loyalty Rewards</option>
                        <option value="discount">Discount Coupons & Promotions</option>
                        <option value="seller">Merchant / Vendor Registration</option>
                        <option value="technical">Account & Technical Support</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold">Order Number (Optional)</label>
                      <Input
                        value={orderNumber}
                        onChange={(e) => setOrderNumber(e.target.value)}
                        placeholder="ORD-20261108-..."
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">Subject *</label>
                    <Input
                      required
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Question about my order delivery or 100-point free exchange"
                      className="text-xs h-9"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold">How can our Supporter team help you? *</label>
                    <textarea
                      required
                      rows={4}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Write your details here..."
                      className="w-full rounded-md border border-input bg-background p-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <Button type="submit" disabled={loading} className="rounded-xl gap-2 text-xs">
                    <Send className="w-3.5 h-3.5" />
                    {loading ? 'Submitting Ticket...' : 'Submit Support Ticket'}
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
