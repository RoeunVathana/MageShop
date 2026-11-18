import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Clock, Download, ExternalLink, MapPin, Navigation, Package, RefreshCw, Truck } from 'lucide-react';
import { telegramApi } from '@/services/telegramApi';

interface TelegramOrdersViewProps {
  orders: any[];
  onStartShopping?: () => void;
}

export const TelegramOrdersView: React.FC<TelegramOrdersViewProps> = ({ orders, onStartShopping }) => {
  const [trackingOrderNumber, setTrackingOrderNumber] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, any> | null>(null);
  const [trackingLoading, setTrackingLoading] = useState(false);
  const [trackingError, setTrackingError] = useState<string | null>(null);

  const viewDelivery = async (orderNumber: string) => {
    if (trackingOrderNumber === orderNumber && tracking) {
      setTrackingOrderNumber(null);
      return;
    }

    setTrackingOrderNumber(orderNumber);
    setTracking(null);
    setTrackingError(null);
    setTrackingLoading(true);
    try {
      const result = await telegramApi.getOrderTracking(orderNumber);
      if (!result) throw new Error('Delivery tracking is not available yet.');
      setTracking(result);
    } catch (error: any) {
      setTrackingError(error?.response?.data?.message || error?.message || 'Unable to load delivery tracking.');
    } finally {
      setTrackingLoading(false);
    }
  };

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
          const isTrackingThisOrder = trackingOrderNumber === ord.order_number;
          const gps = isTrackingThisOrder ? tracking?.gps : null;
          const hasLiveGps = Boolean(gps?.has_live_location && gps?.current_lat !== null && gps?.current_lng !== null);
          const mapUrl = hasLiveGps
            ? `https://www.google.com/maps/search/?api=1&query=${gps.current_lat},${gps.current_lng}`
            : null;
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

              <div className="pt-1 flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => viewDelivery(ord.order_number)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                >
                  {trackingLoading && isTrackingThisOrder ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Truck className="h-3.5 w-3.5" />}
                  <span>{isTrackingThisOrder && tracking ? 'Hide delivery' : 'View delivery'}</span>
                </button>
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

              {isTrackingThisOrder && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs dark:border-emerald-900/70 dark:bg-emerald-950/30">
                  {trackingLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      <span>Loading delivery status…</span>
                    </div>
                  ) : trackingError ? (
                    <div className="flex items-start gap-2 text-rose-700 dark:text-rose-300">
                      <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      <span>{trackingError}</span>
                    </div>
                  ) : tracking ? (
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-emerald-800 dark:text-emerald-200">Delivery status</span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 shadow-xs dark:bg-emerald-950 dark:text-emerald-300">
                          {String(tracking.status || 'processing').replaceAll('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>{tracking.delivery_address || 'Delivery address is not available yet.'}</span>
                      </div>
                      <div className="flex items-start gap-2 text-muted-foreground">
                        <Truck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                        <span>
                          {hasLiveGps
                            ? `Courier GPS is live: ${Number(gps.current_lat).toFixed(5)}, ${Number(gps.current_lng).toFixed(5)}`
                            : 'Courier GPS is waiting for the delivery driver to start broadcasting.'}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-0.5">
                        {mapUrl && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 font-semibold text-white hover:bg-emerald-700"
                          >
                            <Navigation className="h-3.5 w-3.5" />
                            <span>Open live map</span>
                          </a>
                        )}
                        <a
                          href={`/track-order/${encodeURIComponent(ord.order_number)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>Full tracking page</span>
                        </a>
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

