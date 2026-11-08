import { Link } from 'react-router-dom'
import { Heart, ShoppingCart, Eye, Trash2, Gift, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/toast'
import { useShopEngagement } from '@/context/ShopEngagementContext'

export function WishlistPage() {
  const { toast } = useToast()
  const { favorites, toggleFavorite, addToCart, t, formatPrice } = useShopEngagement()

  return (
    <div className="container mx-auto px-4 py-8 space-y-8 max-w-7xl">
      <div className="border-b pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs text-muted-foreground mb-2">
            <Link to="/" className="hover:underline">{t('Home', 'ទំព័រដើម')}</Link> /{' '}
            <span className="text-foreground font-medium">{t('Customer Favorites & Wishlist', 'ទំនិញពេញចិត្ត')}</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2.5">
            <Heart className="w-7 h-7 text-rose-500 fill-rose-500" />
            {t('My Liked & Favorite Products', 'បញ្ជីទំនិញពេញចិត្តរបស់ខ្ញុំ')}
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {t(
              'Items you liked across the store. Move them to your Cart anytime to earn +5 Loyalty Points per purchase!',
              'ទំនិញដែលអ្នកបានរក្សាទុក។ អ្នកអាចដាក់ចូលកន្ត្រកទិញទំនិញគ្រប់ពេល និងទទួលបាន +5 ពិន្ទុរាល់ការបញ្ជាទិញ!'
            )}
          </p>
        </div>
        <Badge variant="outline" className="text-xs px-3 py-1 font-semibold">
          {favorites.length} {t('Items Liked', 'មុខទំនិញ')}
        </Badge>
      </div>

      {favorites.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <Heart className="w-12 h-12 mx-auto text-muted-foreground/30" />
            <div className="space-y-1">
              <h3 className="font-bold text-base">{t('No favorite products saved yet', 'មិនទាន់មានទំនិញពេញចិត្តនៅឡើយទេ')}</h3>
              <p className="text-xs text-muted-foreground">
                {t(
                  'Click the heart icon on any product in our catalog to save it here!',
                  'សូមចុចរូបបេះដូងលើផលិតផលណាមួយក្នុងកាតាឡុក ដើម្បីរក្សាទុកនៅទីនេះ!'
                )}
              </p>
            </div>
            <Link to="/products">
              <Button className="rounded-xl gap-2 font-bold text-xs">
                {t('Browse Products', 'ស្វែងរកផលិតផល')} <ArrowRight className="w-4 h-4" />
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
                    <Badge className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] gap-1 font-bold">
                      <Gift className="w-3 h-3" /> {t('100-Pt Free Eligible (≤$30)', '១០០ ពិន្ទុប្តូរ Free (≤$30)')}
                    </Badge>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      toggleFavorite(item)
                      toast({
                        title: t('Removed from Favorites', 'បានដកចេញពីទំនិញពេញចិត្ត'),
                        description: `${item.name} ${t('was removed from your liked items.', 'ត្រូវបានដកចេញពីបញ្ជី។')}`,
                        type: 'info',
                      })
                    }}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full bg-background/90 backdrop-blur flex items-center justify-center text-rose-500 hover:scale-110 transition-transform cursor-pointer shadow-sm"
                    title="Remove from Favorites"
                  >
                    <Heart className="w-4 h-4 fill-rose-500" />
                  </button>
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm line-clamp-1">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {t('Vendor:', 'ហាងលក់៖')} {item.vendor || 'TYUSHOP Official'}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-primary">
                        {formatPrice(item.price)}
                      </span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-xs line-through text-muted-foreground">
                          {formatPrice(item.originalPrice)}
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
                          title: t('🛒 Added to Cart!', '🛒 បានដាក់ចូលកន្ត្រក!'),
                          description: `${item.name} (+5 Loyalty Pts).`,
                          type: 'success',
                        })
                      }}
                      className="flex-1 h-9 text-xs gap-1.5 rounded-xl font-bold"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" /> {t('Add to Cart', 'ដាក់ចូលកន្ត្រក')}
                    </Button>
                    <Link to={`/products/${item.slug}`}>
                      <Button size="sm" variant="outline" className="h-9 text-xs gap-1 rounded-xl font-semibold px-3">
                        <Eye className="w-3.5 h-3.5" /> {t('View', 'មើល')}
                      </Button>
                    </Link>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => toggleFavorite(item)}
                      className="h-9 w-9 text-muted-foreground hover:text-destructive rounded-xl"
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
