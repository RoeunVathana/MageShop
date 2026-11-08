import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProductItem } from '@/services/telegramApi';

export interface CartItem {
  product: ProductItem;
  quantity: number;
}

interface TelegramCartState {
  items: CartItem[];
  addItem: (product: ProductItem, quantity?: number) => void;
  removeItem: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void;
  clearCart: () => void;
  totalItems: () => number;
  subtotal: () => number;
}

export const useTelegramCartStore = create<TelegramCartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (product: ProductItem, quantity = 1) => {
        const current = get().items;
        const existingIndex = current.findIndex((item) => item.product.id === product.id);

        if (existingIndex > -1) {
          const updated = [...current];
          const newQty = updated[existingIndex].quantity + quantity;
          // Don't exceed product stock
          updated[existingIndex].quantity = Math.min(newQty, product.stock_quantity);
          set({ items: updated });
        } else {
          set({
            items: [...current, { product, quantity: Math.min(quantity, product.stock_quantity) }],
          });
        }

        // Trigger Telegram haptic feedback if available
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
        }
      },
      removeItem: (productId: number) => {
        set({ items: get().items.filter((item) => item.product.id !== productId) });
        if (window.Telegram?.WebApp?.HapticFeedback) {
          window.Telegram.WebApp.HapticFeedback.selectionChanged();
        }
      },
      updateQuantity: (productId: number, quantity: number) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }

        const updated = get().items.map((item) => {
          if (item.product.id === productId) {
            return {
              ...item,
              quantity: Math.min(quantity, item.product.stock_quantity),
            };
          }
          return item;
        });

        set({ items: updated });
      },
      clearCart: () => set({ items: [] }),
      totalItems: () => get().items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: () =>
        get().items.reduce((sum, item) => {
          const price = item.product.discount_price
            ? Number(item.product.discount_price)
            : Number(item.product.price);
          return sum + price * item.quantity;
        }, 0),
    }),
    {
      name: 'megacommerce_tg_cart',
    }
  )
);

