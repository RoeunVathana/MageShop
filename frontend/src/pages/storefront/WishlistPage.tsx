import { Link } from 'react-router-dom'
import { Heart, ShoppingBag, Eye, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const sampleWishlist = [
  {
    id: 1,
    slug: 'sony-wh-1000xm5-wireless-headphones',
    title: 'Sony WH-1000XM5 Wireless Noise Cancelling Headphones',
    price: 398.0,
    vendor: 'Sony Sound Hub',
    image: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=300&q=80',
  },
  {
    id: 2,
    slug: 'apple-watch-ultra-2',
    title: 'Apple Watch Ultra 2 GPS + Cellular Titanium Case',
    price: 799.0,
    vendor: 'Official Apple Store',
    image: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=300&q=80',
  },
]

export function WishlistPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="border-b pb-6">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">Home</Link> / <span className="text-foreground font-medium">Wishlist</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Saved Items</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Your saved bookmarks and product alerts. (Phase 1 Foundational UI)
            </p>
          </div>
          <Badge variant="outline" className="text-xs">2 Items Saved</Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {sampleWishlist.map((item) => (
          <Card key={item.id} className="overflow-hidden group hover:shadow-lg transition-all">
            <div className="aspect-video relative bg-muted overflow-hidden">
              <img
                src={item.image}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
              />
            </div>
            <CardContent className="p-4 space-y-3">
              <div className="space-y-1">
                <h3 className="font-semibold text-sm line-clamp-1">{item.title}</h3>
                <p className="text-xs text-muted-foreground">Vendor: {item.vendor}</p>
                <p className="text-base font-bold text-primary">${item.price.toFixed(2)}</p>
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <Link to={`/products/${item.slug}`} className="flex-1">
                  <Button size="sm" variant="outline" className="w-full h-8 text-xs gap-1.5">
                    <Eye className="w-3.5 h-3.5" /> View Item
                  </Button>
                </Link>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

