import { Link } from 'react-router-dom'
import { ShoppingCart, ArrowRight, Trash2, ShieldCheck, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'

export function CartPage() {
  const { toast } = useToast()

  const handleCheckoutNotice = () => {
    toast({
      title: 'Checkout Pipeline (Phase 2)',
      description: 'Cart sessions, Bakong KHQR, and payment processors will be implemented in Phase 2.',
      type: 'info',
    })
  }

  const sampleCartItems = [
    {
      id: 1,
      title: 'Apple MacBook Pro 16" M3 Max',
      vendor: 'Official Apple Store',
      price: 3499.0,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=300&q=80',
    },
    {
      id: 2,
      title: 'Sony WH-1000XM5 Noise Cancelling Headphones',
      vendor: 'Sony Sound Hub',
      price: 398.0,
      quantity: 1,
      image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80',
    },
  ]

  const subtotal = sampleCartItems.reduce((acc, i) => acc + i.price * i.quantity, 0)

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="border-b pb-6">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">Home</Link> / <span className="text-foreground font-medium">Cart</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Shopping Cart</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Foundational cart layout with mock multi-vendor items.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">Phase 1 Preview</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Cart Items List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2 p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-700 dark:text-amber-300">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>
              <strong>Phase 1 Notice:</strong> Products and carts are not connected to live business/checkout APIs yet.
            </span>
          </div>

          {sampleCartItems.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardContent className="p-4 flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-20 h-20 rounded-lg object-cover bg-muted shrink-0"
                />
                <div className="flex-1 space-y-1 text-center sm:text-left">
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-muted-foreground">Sold by: {item.vendor}</p>
                  <p className="text-sm font-bold text-primary">${item.price.toFixed(2)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-medium">Qty: {item.quantity}</span>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Order Summary */}
        <div className="space-y-4">
          <Card>
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-base border-b pb-3">Order Summary</h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-semibold">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Shipping</span>
                  <span className="text-emerald-600 font-semibold">Free</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Tax (VAT)</span>
                  <span className="font-semibold">${(subtotal * 0.1).toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>Total</span>
                  <span className="text-primary">${(subtotal * 1.1).toFixed(2)}</span>
                </div>
              </div>

              <Button
                onClick={handleCheckoutNotice}
                className="w-full rounded-xl gap-2 shadow-md"
              >
                Proceed to Checkout <ArrowRight className="w-4 h-4" />
              </Button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Encrypted 256-bit Checkout Gate</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

