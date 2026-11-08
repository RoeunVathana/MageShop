import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  TrendingUp,
  PackageCheck,
  AlertTriangle,
  RefreshCw,
  Plus,
  Minus,
  CheckCircle2,
} from 'lucide-react';
import { telegramApi, ProductItem } from '@/services/telegramApi';

export const TelegramAdminView: React.FC = () => {
  const [summary, setSummary] = useState<any>(null);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adjustingId, setAdjustingId] = useState<number | null>(null);
  const [adjustStatus, setAdjustStatus] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sumRes, stockRes] = await Promise.all([
        telegramApi.getAdminSalesSummary(),
        telegramApi.getAdminStock(),
      ]);
      setSummary(sumRes);
      setProducts(stockRes.data || []);
    } catch (err) {
      console.error('Failed to load admin data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAdjustStock = async (product: ProductItem, delta: number) => {
    setAdjustingId(product.id);
    try {
      const res = await telegramApi.adjustAdminStock({
        product_id: product.id,
        delta: delta,
        reason: `Telegram Staff Adjustment (${delta > 0 ? '+' : ''}${delta})`,
      });

      setAdjustStatus(`Adjusted ${product.sku} by ${delta > 0 ? '+' : ''}${delta}!`);
      setTimeout(() => setAdjustStatus(null), 3000);

      // Refresh stock in local state
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id ? { ...p, stock_quantity: res.data.new_stock } : p
        )
      );

      if (window.Telegram?.WebApp?.HapticFeedback) {
        window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
      }
    } catch (err: any) {
      alert(`Adjustment error: ${err.response?.data?.message || err.message}`);
    } finally {
      setAdjustingId(null);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center space-y-2">
        <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
        <p className="text-xs text-muted-foreground font-medium">Loading staff telemetry...</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4 pb-24">
      {/* Admin Title */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-amber-500 text-white">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Staff Control Deck</h2>
            <p className="text-[10px] text-muted-foreground">Inventory & Sales Supervision</p>
          </div>
        </div>

        <button
          onClick={fetchData}
          className="p-1.5 rounded-lg bg-muted text-muted-foreground hover:text-foreground"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {adjustStatus && (
        <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-500/40 text-emerald-800 dark:text-emerald-200 px-3 py-2 rounded-xl text-xs flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{adjustStatus}</span>
        </div>
      )}

      {/* Analytics Snapshot Cards */}
      {summary && (
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-card p-3 rounded-2xl border border-border space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span>Today's Sales</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
            </div>
            <div className="text-base font-extrabold text-indigo-600 dark:text-indigo-400">
              ${Number(summary.today?.sales || 0).toFixed(2)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {summary.today?.orders || 0} orders settled
            </div>
          </div>

          <div className="bg-card p-3 rounded-2xl border border-border space-y-1 shadow-2xs">
            <div className="flex items-center justify-between text-muted-foreground text-[11px]">
              <span>Low Stock Alerts</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
            </div>
            <div className="text-base font-extrabold text-amber-600 dark:text-amber-400">
              {summary.operations?.low_stock_items || 0} items
            </div>
            <div className="text-[10px] text-muted-foreground">Requires Restock</div>
          </div>
        </div>
      )}

      {/* Product Stock Adjustment Table */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground">Stock Management</h3>

        <div className="space-y-2">
          {products.map((p) => {
            const isLow = p.stock_quantity <= p.low_stock_threshold;
            const isBusy = adjustingId === p.id;
            return (
              <div
                key={p.id}
                className="bg-card p-3 rounded-2xl border border-border flex items-center justify-between shadow-2xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-bold text-xs text-foreground truncate">{p.name}</span>
                    {isLow && (
                      <span className="bg-amber-100 dark:bg-amber-950 text-amber-700 text-[9px] font-bold px-1.5 py-0.2 rounded-md">
                        Low
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-muted-foreground font-mono">
                    {p.sku} • Stock: <strong className="text-foreground">{p.stock_quantity}</strong>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 flex-shrink-0">
                  <button
                    onClick={() => handleAdjustStock(p, -1)}
                    disabled={isBusy || p.stock_quantity <= 0}
                    className="p-1.5 bg-muted hover:bg-muted/80 rounded-lg text-xs font-bold text-foreground disabled:opacity-30"
                    title="Deduct 1"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <button
                    onClick={() => handleAdjustStock(p, 5)}
                    disabled={isBusy}
                    className="px-2 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold rounded-lg text-[10px] hover:bg-indigo-100"
                    title="Add 5"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => handleAdjustStock(p, 10)}
                    disabled={isBusy}
                    className="px-2 py-1 bg-indigo-600 text-white font-bold rounded-lg text-[10px] hover:bg-indigo-700 shadow-xs"
                    title="Add 10"
                  >
                    +10
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

