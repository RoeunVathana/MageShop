import React, { useState } from 'react';
import {
  X,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
} from 'lucide-react';
import { useTelegramCartStore } from '@/context/telegramCartStore';
import { StoreSettings } from '@/services/telegramApi';

interface TelegramCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings?: StoreSettings;
}

export const TelegramCartDrawer: React.FC<TelegramCartDrawerProps> = ({
  isOpen,
  onClose,
  storeSettings,
}) => {
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useTelegramCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  const cartSubtotal = subtotal();
  const shippingFee = cartSubtotal > 50 || cartSubtotal === 0 ? 0 : 2.5;
  const grandTotal = cartSubtotal + shippingFee;

  const handleCheckout = () => {
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
    setIsCheckingOut(true);
    // Simulate instant Bakong payment confirmation
    setTimeout(() => {
      setCheckoutComplete(true);
      clearCart();
    }, 1800);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-background w-full max-w-md mx-auto max-h-[90vh] rounded-t-3xl flex flex-col border-t border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/60">
          <div className="flex items-center space-x-2">
            <ShoppingBag className="w-5 h-5 text-indigo-600" />
            <h2 className="font-bold text-sm text-foreground">Shopping Bag</h2>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold">
              {items.length} items
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {checkoutComplete ? (
            <div className="text-center py-10 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h3 className="text-lg font-bold text-foreground">Payment Settled!</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Your order has been paid via Bakong KHQR. An official PDF invoice has been issued and will be dispatched.
              </p>
              <button
                onClick={() => {
                  setCheckoutComplete(false);
                  setIsCheckingOut(false);
                  onClose();
                }}
                className="mt-3 bg-indigo-600 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-xs"
              >
                Continue Shopping
              </button>
            </div>
          ) : isCheckingOut ? (
            <div className="text-center py-8 space-y-4">
              <div className="w-48 h-48 mx-auto bg-white p-3 rounded-2xl border-2 border-indigo-500 shadow-md flex flex-col items-center justify-center">
                <QrCode className="w-32 h-32 text-slate-900" />
                <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mt-1">
                  Bakong KHQR
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm text-foreground">Waiting for KHQR Scan</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Amount: <strong className="text-indigo-600 font-extrabold">${grandTotal.toFixed(2)} USD</strong>
                </p>
                <div className="mt-2 inline-flex items-center space-x-1 text-[11px] text-emerald-600 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span>Connecting to NBC Bakong Switch...</span>
                </div>
              </div>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 space-y-2">
              <ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto" />
              <h3 className="font-semibold text-sm text-foreground">Your bag is empty</h3>
              <p className="text-xs text-muted-foreground">Add products from our flagship catalog!</p>
            </div>
          ) : (
            items.map(({ product, quantity }) => {
              const price = product.discount_price ? Number(product.discount_price) : Number(product.price);
              return (
                <div
                  key={product.id}
                  className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border/80 shadow-2xs"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div className="w-12 h-12 rounded-xl bg-muted/60 p-1 flex-shrink-0 flex items-center justify-center">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" />
                      ) : (
                        <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-foreground truncate">{product.name}</h4>
                      <div className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">
                        ${price.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <div className="flex items-center space-x-1 bg-muted rounded-xl p-1">
                      <button
                        onClick={() => updateQuantity(product.id, quantity - 1)}
                        className="w-6 h-6 rounded-lg bg-card flex items-center justify-center text-foreground hover:bg-muted-foreground/10"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center font-bold text-xs text-foreground">{quantity}</span>
                      <button
                        onClick={() => updateQuantity(product.id, quantity + 1)}
                        disabled={quantity >= product.stock_quantity}
                        className="w-6 h-6 rounded-lg bg-card flex items-center justify-center text-foreground hover:bg-muted-foreground/10 disabled:opacity-30"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(product.id)}
                      className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors"
                      title="Remove"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary & Checkout */}
        {items.length > 0 && !isCheckingOut && !checkoutComplete && (
          <div className="p-4 border-t border-border bg-card/80 space-y-3">
            <div className="space-y-1 text-xs">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Shipping:</span>
                <span>{shippingFee === 0 ? <span className="text-emerald-500 font-semibold">FREE</span> : `$${shippingFee.toFixed(2)}`}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-foreground pt-1 border-t border-border/60">
                <span>Total Amount:</span>
                <span className="text-indigo-600 dark:text-indigo-400 font-black">
                  ${grandTotal.toFixed(2)} USD
                </span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-3 rounded-xl shadow-md flex items-center justify-center space-x-2 active:scale-98 transition-all"
            >
              <QrCode className="w-4 h-4" />
              <span>Checkout with Bakong KHQR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

