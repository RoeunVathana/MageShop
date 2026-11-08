import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const sampleBrands = [
  { name: 'Apple Inc.', category: 'Consumer Electronics', products: '240 items', logo: '' },
  { name: 'Sony', category: 'Audio & Entertainment', products: '180 items', logo: 'SONY' },
  { name: 'Samsung', category: 'Mobile & Displays', products: '310 items', logo: 'SAMSUNG' },
  { name: 'Nike', category: 'Footwear & Athletic Wear', products: '420 items', logo: 'NIKE' },
  { name: 'Adidas', category: 'Sportswear & Lifestyle', products: '350 items', logo: 'ADIDAS' },
  { name: 'DJI', category: 'Drones & Camera Gimbals', products: '65 items', logo: 'DJI' },
  { name: 'Logitech', category: 'PC & Gaming Peripherals', products: '190 items', logo: 'LOGI' },
  { name: 'Bose', category: 'Premium Acoustics', products: '85 items', logo: 'BOSE' },
]

export function BrandsPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="border-b pb-6">
        <div className="text-xs text-muted-foreground mb-2">
          <Link to="/" className="hover:underline">Home</Link> / <span className="text-foreground font-medium">Brands</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Official Partner Brands</h1>
            <p className="text-xs text-muted-foreground mt-1">
              Verified flagship brands and official manufacturers on MegaCommerce.
            </p>
          </div>
          <Badge variant="outline" className="text-xs">Phase 1 Directory</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {sampleBrands.map((b) => (
          <Link key={b.name} to="/products" className="group">
            <Card className="h-full border hover:border-primary/50 hover:shadow-lg transition-all text-center">
              <CardContent className="p-6 flex flex-col items-center justify-center space-y-2">
                <div className="h-16 w-full rounded-lg bg-muted flex items-center justify-center text-sm font-black tracking-wider text-muted-foreground group-hover:text-primary transition-colors">
                  {b.logo}
                </div>
                <h3 className="font-bold text-sm text-foreground pt-1">{b.name}</h3>
                <p className="text-[11px] text-muted-foreground">{b.category}</p>
                <span className="text-[10px] text-primary font-medium">{b.products}</span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}

