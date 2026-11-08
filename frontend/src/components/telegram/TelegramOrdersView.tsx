import React from 'react';
import { Package, Download, ExternalLink, QrCode, CheckCircle2, Clock, Truck } from 'lucide-react';
import { telegramApi } from '@/services/telegramApi';

interface TelegramOrdersViewProps {
  orders: any[];
  onStartShopping?: () => void;
}

export const TelegramOrdersView: React.FC<TelegramOrdersViewProps> = ({ orders, onStartShopping }) => {
  if (!orders || orders.length === 0) {
    return (
      <div className="p-6 text-center py-16 space-y-3">
        <div className="w-16 h-16 rounded-full bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-500 mx-auto">
          <Package className="w-8 h-8 opacity-70" />
        </div>
        <h3 className="font-bold text-sm text-foreground">No orders recorded yet</h3>
        <p className="text-xs text-muted-foreground max-w-xs mx-auto">
          Explore genuine electronics and lifestyle products with instant Bakong KHQR checkout.
        </p>
        <button
          onClick={onStartShopping}
          className="mt-2 bg-indigo-600 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs"
        >
          Browse Products
        </button>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered':
      case 'completed':
        return (
          <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <CheckCircle2 className="w-2.5 h-2.5" />
            <span>Delivered</span>
          </span>
        );
      case 'shipped':
      case 'out_for_delivery':
        return (
          <span className="inline-flex items-center space-x-1 bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Truck className="w-2.5 h-2.5" />
            <span>In Transit</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
            <Clock className="w-2.5 h-2.5" />
            <span>Processing</span>
          </span>
        );
    }
  };

  return (
    <div className="p-4 space-y-3 pb-24">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-foreground">Order History & Invoices</h2>
        <span className="text-xs text-muted-foreground">{orders.length} orders</span>
      </div>

      <div className="space-y-3">
        {orders.map((ord) => {
          const receiptUrl = telegramApi.getReceiptDownloadUrl(ord.order_number, 'pdf');
          return (
            <div
              key={ord.id}
              className="bg-card rounded-2xl border border-border/80 p-3.5 space-y-2.5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-mono text-xs font-bold text-foreground">
                    #{ord.order_number}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {new Date(ord.created_at).toLocaleDateString()} • {ord.payment_method?.toUpperCase()}
                  </div>
                </div>

                {getStatusBadge(ord.status)}
              </div>

              <div className="flex items-center justify-between text-xs py-1 border-t border-border/60">
                <span className="text-muted-foreground">Settled Amount:</span>
                <span className="font-extrabold text-indigo-600 dark:text-indigo-400">
                  ${Number(ord.total_amount).toFixed(2)} USD
                </span>
              </div>

              {ord.tracking_number && (
                <div className="text-[11px] bg-muted/60 p-2 rounded-xl flex items-center justify-between">
                  <span className="text-muted-foreground">Tracking Code:</span>
                  <span className="font-mono font-bold text-foreground">{ord.tracking_number}</span>
                </div>
              )}

              <div className="pt-1 flex items-center justify-end space-x-2">
                <a
                  href={receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF Receipt</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

