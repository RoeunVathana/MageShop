import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Tag,
  Truck,
} from 'lucide-react';
import { ProductItem } from '@/services/telegramApi';
import { useTelegramCartStore } from '@/context/telegramCartStore';
import { useShopEngagement } from '@/context/ShopEngagementContext';
import { localizeCategoryName, localizeProductName } from './telegramCatalogI18n';

interface TelegramProductDetailProps {
  product: ProductItem;
  isLoading?: boolean;
  onClose: () => void;
}

export const TelegramProductDetail: React.FC<TelegramProductDetailProps> = ({
  product,
  isLoading = false,
  onClose,
}) => {
  const { addItem, items } = useTelegramCartStore();
  const { language, t } = useShopEngagement();
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);

  const displayName = localizeProductName(product, language);
  const displayCategory = localizeCategoryName(product.category, language);
  const cartItem = items.find((item) => item.product.id === product.id);
  const availableStock = Math.max(0, Number(product.available_stock ?? product.stock_quantity ?? 0));
  const isOutOfStock = availableStock <= 0;
  const isLowStock = availableStock > 0 && availableStock <= product.low_stock_threshold;

  const regularPrice = Number(product.price || 0);
  const discountPrice = product.discount_price == null ? null : Number(product.discount_price);
  const hasDiscount = discountPrice !== null && discountPrice > 0 && discountPrice < regularPrice;
  const effectivePrice = hasDiscount ? discountPrice : regularPrice;
  const discountPercent = hasDiscount
    ? Math.round(((regularPrice - effectivePrice) / regularPrice) * 100)
    : 0;

  const gallery = useMemo(() => {
    const images = [product.image_url, ...(product.gallery_urls || [])]
      .filter((image): image is string => Boolean(image))
      .filter((image, index, allImages) => allImages.indexOf(image) === index);
    return images;
  }, [product.gallery_urls, product.image_url]);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    webApp?.BackButton?.show?.();
    webApp?.BackButton?.onClick?.(onClose);

    return () => {
      webApp?.BackButton?.offClick?.(onClose);
      webApp?.BackButton?.hide?.();
    };
  }, [onClose]);

  const updateQuantity = (nextQuantity: number) => {
    setQuantity(Math.max(1, Math.min(availableStock || 1, nextQuantity)));
    window.Telegram?.WebApp?.HapticFeedback?.selectionChanged?.();
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addItem(product, quantity);
    window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred?.('success');
  };

  const currentImage = gallery[selectedImage];

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-slate-950/60 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={displayName}>
      <div className="flex h-full w-full max-w-md flex-col overflow-hidden bg-background text-foreground shadow-2xl">
        <header className="flex shrink-0 items-center justify-between border-b border-border/70 bg-background/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 items-center gap-2 rounded-xl px-2 text-xs font-bold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label={t('Back to products', 'ត្រឡប់ទៅទំនិញ')}
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{t('Product details', 'ព័ត៌មានលម្អិតទំនិញ')}</span>
          </button>
          <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
            TYUSHOP
          </span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto pb-28">
          <div className="relative aspect-square w-full overflow-hidden bg-muted/60">
            {currentImage ? (
              <img src={currentImage} alt={displayName} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-indigo-400">
                <ShoppingBag className="h-16 w-16 opacity-30" />
              </div>
            )}

            <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
              {product.is_featured && (
                <span className="rounded-full bg-indigo-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                  {t('Featured', 'ពេញនិយម')}
                </span>
              )}
              {hasDiscount && (
                <span className="rounded-full bg-rose-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                  -{discountPercent}%
                </span>
              )}
            </div>

            <div className="absolute right-3 top-3">
              {isOutOfStock ? (
                <span className="rounded-lg bg-slate-900/85 px-2 py-1 text-[10px] font-bold text-white">
                  {t('Sold Out', 'អស់ពីស្តុក')}
                </span>
              ) : isLowStock ? (
                <span className="flex items-center gap-1 rounded-lg bg-amber-500/95 px-2 py-1 text-[10px] font-bold text-white">
                  <AlertCircle className="h-3 w-3" />
                  {t(`${availableStock} left`, `នៅសល់ ${availableStock}`)}
                </span>
              ) : null}
            </div>
          </div>

          {gallery.length > 1 && (
            <div className="flex gap-2 overflow-x-auto border-b border-border/60 bg-background px-4 py-3 no-scrollbar">
              {gallery.map((image, index) => (
                <button
                  type="button"
                  key={image}
                  onClick={() => setSelectedImage(index)}
                  className={`h-14 w-14 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
                    selectedImage === index ? 'border-indigo-600 shadow-sm' : 'border-transparent opacity-70 hover:opacity-100'
                  }`}
                  aria-label={t(`View image ${index + 1}`, `មើលរូបភាព ${index + 1}`)}
                >
                  <img src={image} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="space-y-5 p-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                <span className="rounded-full bg-muted px-2 py-1 font-semibold">{displayCategory || t('Catalog', 'កាតាឡុក')}</span>
                <span className="font-mono">SKU: {product.sku}</span>
              </div>
              <h1 className="text-xl font-black leading-tight text-foreground">{displayName}</h1>
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <span className="flex items-center gap-1 font-bold text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                  {product.rating || '5.0'}
                  <span className="font-medium text-muted-foreground">({product.reviews_count || 0})</span>
                </span>
                <span className={`font-semibold ${isOutOfStock ? 'text-rose-600' : isLowStock ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {isOutOfStock ? t('Out of stock', 'អស់ពីស្តុក') : t(`${availableStock} in stock`, `មាន ${availableStock} ក្នុងស្តុក`)}
                </span>
              </div>
            </div>

            <div className="flex items-end justify-between gap-3 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-3.5 dark:border-indigo-900/50 dark:bg-indigo-950/30">
              <div>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-indigo-700 dark:text-indigo-300">${effectivePrice.toFixed(2)}</span>
                  {hasDiscount && <span className="text-xs text-muted-foreground line-through">${regularPrice.toFixed(2)}</span>}
                </div>
                <span className="text-[10px] font-semibold text-muted-foreground">{t('Bakong KHQR available at checkout', 'អាចទូទាត់តាមបាគង KHQR')}</span>
              </div>
              <Tag className="h-5 w-5 shrink-0 text-indigo-500" />
            </div>

            <section className="space-y-2">
              <h2 className="text-sm font-black">{t('About this product', 'អំពីទំនិញនេះ')}</h2>
              <p className="whitespace-pre-line text-xs leading-6 text-muted-foreground">
                {product.description || t('No product description is available yet.', 'មិនទាន់មានការពិពណ៌នាទំនិញនៅឡើយទេ។')}
              </p>
            </section>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card p-2.5">
                <Truck className="h-4 w-4 shrink-0 text-indigo-500" />
                <span className="text-muted-foreground">{t('GPS delivery', 'ដឹកជញ្ជូន GPS')}</span>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-card p-2.5">
                <Check className="h-4 w-4 shrink-0 text-emerald-500" />
                <span className="text-muted-foreground">{t('Verified item', 'ទំនិញបានផ្ទៀងផ្ទាត់')}</span>
              </div>
            </div>

            {isLoading && (
              <p className="text-center text-[11px] font-semibold text-indigo-600 dark:text-indigo-300">
                {t('Loading the latest product details…', 'កំពុងផ្ទុកព័ត៌មានទំនិញចុងក្រោយ…')}
              </p>
            )}
          </div>
        </div>

        <footer className="absolute inset-x-0 bottom-0 mx-auto flex max-w-md items-center gap-2 border-t border-border/70 bg-background/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur">
          <div className="flex h-11 items-center rounded-xl border border-border bg-muted/50 px-1">
            <button
              type="button"
              onClick={() => updateQuantity(quantity - 1)}
              disabled={quantity <= 1 || isOutOfStock}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background disabled:opacity-40"
              aria-label={t('Decrease quantity', 'បន្ថយបរិមាណ')}
            >
              <Minus className="h-3.5 w-3.5" />
            </button>
            <span className="w-7 text-center text-sm font-black">{quantity}</span>
            <button
              type="button"
              onClick={() => updateQuantity(quantity + 1)}
              disabled={quantity >= availableStock || isOutOfStock}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-background disabled:opacity-40"
              aria-label={t('Increase quantity', 'បង្កើនបរិមាណ')}
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleAddToCart}
            disabled={isOutOfStock}
            className={`flex h-11 min-w-0 flex-1 items-center justify-center gap-2 rounded-xl px-3 text-xs font-black text-white shadow-sm transition-all active:scale-[0.98] ${
              isOutOfStock ? 'cursor-not-allowed bg-muted text-muted-foreground shadow-none' : cartItem ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
            }`}
          >
            {cartItem ? <Check className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
            <span>{cartItem ? t(`In cart (${cartItem.quantity})`, `ក្នុងកន្ត្រក (${cartItem.quantity})`) : t('Add to cart', 'បន្ថែមទៅកន្ត្រក')}</span>
          </button>
        </footer>
      </div>
    </div>
  );
};
