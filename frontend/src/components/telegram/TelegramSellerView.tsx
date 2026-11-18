import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock3, DollarSign, Package, RefreshCw, Store } from 'lucide-react';

import { telegramApi, TelegramSellerDashboard } from '@/services/telegramApi';

export const TelegramSellerView: React.FC = () => {
  const [dashboard, setDashboard] = useState<TelegramSellerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const response = await telegramApi.getSellerDashboard();
      setDashboard(response?.data ?? null);
    } catch (cause: any) {
      setError(cause?.response?.data?.message || cause?.message || 'Seller workspace could not be loaded.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    void loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center space-y-2 pb-24">
        <RefreshCw className="w-8 h-8 text-emerald-500 animate-spin mx-auto" />
        <p className="text-xs text-muted-foreground">Loading your seller workspace...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 pb-24">
        <div className="rounded-2xl border border-rose-300/60 bg-rose-50 dark:bg-rose-950/30 p-4 text-center space-y-3">
          <AlertCircle className="w-7 h-7 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">Seller workspace unavailable</p>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80">{error}</p>
          <button onClick={() => void loadDashboard(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const orders = dashboard?.orders ?? [];

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-600 p-2 text-white"><Store className="w-4 h-4" /></div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold text-foreground">{dashboard?.store.name || 'Seller Workspace'}</h2>
              <p className="text-[11px] text-muted-foreground">Manage your store from Telegram</p>
            </div>
          </div>
        </div>
        <button onClick={() => void loadDashboard(true)} disabled={refreshing} className="rounded-xl bg-muted px-2.5 py-2 text-muted-foreground" title="Refresh seller data">
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Metric label="Gross revenue" value={`$${Number(stats?.gross_revenue ?? 0).toFixed(2)}`} icon={DollarSign} tone="emerald" />
        <Metric label="Pending orders" value={String(stats?.pending_orders ?? 0)} icon={Clock3} tone="amber" />
        <Metric label="Active listings" value={String(stats?.active_listings ?? 0)} icon={Package} tone="indigo" />
        <Metric label="Total listings" value={String(stats?.total_listings ?? 0)} icon={Store} tone="blue" />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">Seller orders</h3>
          <span className="text-[10px] font-bold text-muted-foreground">{orders.length} visible</span>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-7 text-center text-xs text-muted-foreground">Your seller orders will appear here after checkout.</div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-extrabold text-foreground">#{order.order_number}</span>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold capitalize text-emerald-700 dark:text-emerald-300">{order.status.replaceAll('_', ' ')}</span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{order.items?.map((item) => `${item.product_name} × ${item.quantity}`).join(', ') || 'Seller items'}</p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Buyer: {order.customer?.name || 'Customer'}</span>
                  <strong className="text-foreground">${Number(order.items?.reduce((sum, item) => sum + Number(item.total_price || 0), 0) || order.total_amount || 0).toFixed(2)}</strong>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

function Metric({ label, value, icon: Icon, tone }: { label: string; value: string; icon: typeof DollarSign; tone: 'emerald' | 'amber' | 'indigo' | 'blue' }) {
  const tones = {
    emerald: 'bg-emerald-500/10 text-emerald-600',
    amber: 'bg-amber-500/10 text-amber-600',
    indigo: 'bg-indigo-500/10 text-indigo-600',
    blue: 'bg-blue-500/10 text-blue-600',
  };
  return (
    <div className="rounded-2xl border border-border bg-card p-3 space-y-2">
      <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-semibold text-muted-foreground">{label}</span><Icon className={`w-4 h-4 ${tones[tone]}`} /></div>
      <p className="text-base font-extrabold text-foreground">{value}</p>
    </div>
  );
}
