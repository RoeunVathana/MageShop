import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Eye, Trash2, Gift, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'

export function WishlistPage() {
  const { toast } = useToast()
  const { favorites, toggleFavorite, addToCart } = useShopEngagement()

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">Home</Link> /{' '}
            <span className="text-foreground font-medium">Customer Favorites & Wishlist</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            My Liked & Favorite Products
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Items you liked across the store. Move them to your Cart anytime to earn +5 Loyalty Points per purchase!
          </p>
        </div>
        <Badge variant="outline" className="text-xs px-3 py-1">
          {favorites.length} {favorites.length === 1 ? 'Item' : 'Items'} Liked
        </Badge>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <div className="space-y-1">
              <h3 className="font-bold text-base">No favorite products saved yet</h3>
              <p className="text-xs text-muted-foreground">
                Click the heart icon on any product in our catalog to save it here!
              </p>
            </div>
            <Link to="/products">
              <Button className="rounded-xl gap-2">
                Browse Products <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {favorites.map((item) => {
            const isFreeEligible = item.price <= 30
            return (
              <Card key={item.id} className="overflow-hidden group hover:shadow-xl transition-all">
                <div className="aspect-square relative bg-slate-50/80 dark:bg-slate-900/40 p-4 overflow-hidden flex items-center justify-center">
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-full h-full object-contain max-h-full max-w-full group-hover:scale-105 transition-transform"
                    loading="lazy"
                  />
                  {isFreeEligible && (
                    <Badge className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] gap-1">
                      <Gift className="w-3 h-3" /> 100-Pt Free Eligible (≤$30)
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      toggleFavorite(item)
                      toast({
                        title: 'Removed from Favorites',
                        description: `${item.name} was removed from your liked items.`,
                        type: 'info',
                      })
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center text-rose-500 hover:scale-110 transition-transform cursor-pointer"
                    title="Remove from Favorites"
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </button>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      Vendor: {item.vendor || 'TYUSHOP Official'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold text-primary">
                        ${item.price.toFixed(2)}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-xs line-through text-muted-foreground">
                          ${item.originalPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t">
                    <Button
                      size="sm"
                      onClick={() => {
                        addToCart({
                          id: item.id,
                          slug: item.slug,
                          name: item.name,
                          price: item.price,
                          originalPrice: item.originalPrice,
                          image: item.image,
                          vendor: item.vendor,
                        })
                        toast({
                          title: 'Added to Cart!',
                          description: `${item.name} added to your shopping cart.`,
                          type: 'success',
                        })
                      }}
                      className="flex-1 h-8 text-xs gap-1.5 rounded-lg"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> Add to Cart
                    </Button>
                    <Link to={`/products/${item.slug}`}>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1 rounded-lg">
                        <Eye className="w-3.5 h-3.5" /> View
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleFavorite(item)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
