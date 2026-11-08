import React from 'react';
import { Star, ShoppingBag, Check, AlertCircle } from 'lucide-react';
import { ProductItem } from '@/services/telegramApi';
import { useTelegramCartStore } from '@/context/telegramCartStore';

interface TelegramProductCardProps {
  product: ProductItem;
  onSelect?: (product: ProductItem) => void;
}

export const TelegramProductCard: React.FC<TelegramProductCardProps> = ({ product, onSelect }) => {
  const { addItem, items } = useTelegramCartStore();
  const cartItem = items.find((i) => i.product.id === product.id);
  const inCartQty = cartItem?.quantity || 0;

  const isLowStock = product.stock_quantity > 0 && product.stock_quantity <= product.low_stock_threshold;
  const isOutOfStock = product.stock_quantity <= 0;

  const hasDiscount = product.discount_price && Number(product.discount_price) < Number(product.price);
  const regularPrice = Number(product.price);
  const effectivePrice = hasDiscount ? Number(product.discount_price) : regularPrice;

  const discountPercent = hasDiscount
    ? Math.round(((regularPrice - effectivePrice) / regularPrice) * 100)
    : 0;

  const handleAdd = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    addItem(product, 1);
  };

  return (
    <div
      onClick={() => onSelect?.(product)}
      className="group relative bg-card rounded-2xl border border-border/80 overflow-hidden shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between active:scale-[0.99] cursor-pointer"
    >
      {/* Top Media & Badges */}
      <div className="relative aspect-square w-full bg-muted/40 overflow-hidden flex items-center justify-center p-3">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-contain mix-blend-multiply dark:mix-blend-normal group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-400">
            <ShoppingBag className="w-8 h-8 opacity-40" />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-2 left-2 flex flex-col gap-1 items-start">
          {product.is_featured && (
            <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              Featured
            </span>
          )}
          {hasDiscount && (
            <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs">
              -{discountPercent}%
            </span>
          )}
        </div>

        {/* Stock Alert Badge */}
        <div className="absolute top-2 right-2">
          {isOutOfStock ? (
            <span className="bg-slate-800/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
              Sold Out
            </span>
          ) : isLowStock ? (
            <span className="bg-amber-500/90 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center space-x-0.5">
              <AlertCircle className="w-2.5 h-2.5" />
              <span>Only {product.stock_quantity} left</span>
            </span>
          ) : null}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 flex-1 flex flex-col justify-between space-y-2">
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>{product.category?.name || 'Catalog'}</span>
            <span className="font-mono text-[10px]">{product.sku}</span>
          </div>

          <h3 className="font-bold text-xs sm:text-sm text-foreground line-clamp-2 leading-tight">
            {product.name}
          </h3>

          <div className="flex items-center space-x-1 text-[11px] text-amber-500">
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
            <span className="font-semibold">{product.rating || '5.0'}</span>
            <span className="text-muted-foreground text-[10px]">({product.reviews_count || 0})</span>
          </div>
        </div>

        {/* Pricing & Add to Cart Action */}
        <div className="pt-2 border-t border-border/60 flex items-center justify-between">
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-sm sm:text-base font-extrabold text-indigo-600 dark:text-indigo-400">
                ${effectivePrice.toFixed(2)}
              </span>
              {hasDiscount && (
                <span className="text-[11px] text-muted-foreground line-through">
                  ${regularPrice.toFixed(2)}
                </span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground">Bakong KHQR</div>
          </div>

          <button
            onClick={handleAdd}
            disabled={isOutOfStock}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center justify-center transition-all ${
              isOutOfStock
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : inCartQty > 0
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs active:scale-95'
            }`}
            title="Add to Cart"
          >
            {inCartQty > 0 ? (
              <div className="flex items-center space-x-1">
                <Check className="w-3.5 h-3.5" />
                <span className="text-[11px] font-bold">{inCartQty}</span>
              </div>
            ) : (
              <ShoppingBag className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

