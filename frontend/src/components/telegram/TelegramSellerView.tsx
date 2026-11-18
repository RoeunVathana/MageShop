import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock3, DollarSign, Package, RefreshCw, Store } from 'lucide-react';

import { telegramApi, TelegramSellerDashboard } from '@/services/telegramApi';
import { useShopEngagement } from '@/context/ShopEngagementContext';
import { localizeProductName } from './telegramCatalogI18n';

export const TelegramSellerView: React.FC = () => {
  const { language, t } = useShopEngagement();
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
      setError(cause?.response?.data?.message || cause?.message || t('Seller workspace could not be loaded.', 'មិនអាចផ្ទុកកន្លែងធ្វើការអ្នកលក់បានទេ។'));
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
        <p className="text-xs text-muted-foreground">{t('Loading your seller workspace...', 'កំពុងផ្ទុកកន្លែងធ្វើការអ្នកលក់...')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 pb-24">
        <div className="rounded-2xl border border-rose-300/60 bg-rose-50 dark:bg-rose-950/30 p-4 text-center space-y-3">
          <AlertCircle className="w-7 h-7 text-rose-500 mx-auto" />
          <p className="text-sm font-semibold text-rose-800 dark:text-rose-200">{t('Seller workspace unavailable', 'កន្លែងធ្វើការអ្នកលក់មិនអាចប្រើបាន')}</p>
          <p className="text-xs text-rose-700/80 dark:text-rose-300/80">{error}</p>
          <button onClick={() => void loadDashboard(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white">
            <RefreshCw className="w-3.5 h-3.5" /> {t('Retry', 'ព្យាយាមម្តងទៀត')}
          </button>
        </div>
      </div>
    );
  }

  const stats = dashboard?.stats;
  const orders = dashboard?.orders ?? [];

  const getStatusLabel = (status: unknown) => {
    const normalized = String(status || 'pending').toLowerCase().replaceAll('-', '_');
    const labels: Record<string, [string, string]> = {
      pending: ['Pending', 'កំពុងរង់ចាំ'],
      paid: ['Paid', 'បានទូទាត់'],
      processing: ['Processing', 'កំពុងរៀបចំ'],
      shipped: ['In Transit', 'កំពុងដឹកជញ្ជូន'],
      delivered: ['Delivered', 'បានដឹកជញ្ជូន'],
      completed: ['Completed', 'បានបញ្ចប់'],
      cancelled: ['Cancelled', 'បានលុបចោល'],
    };
    const label = labels[normalized];
    return label ? t(label[0], label[1]) : normalized.replaceAll('_', ' ');
  };

  return (
    <div className="p-4 space-y-4 pb-24">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-600 p-2 text-white"><Store className="w-4 h-4" /></div>
            <div className="min-w-0">
              <h2 className="truncate text-base font-extrabold text-foreground">{dashboard?.store.name || t('Seller Workspace', 'កន្លែងធ្វើការអ្នកលក់')}</h2>
              <p className="text-[11px] text-muted-foreground">{t('Manage your store from Telegram', 'គ្រប់គ្រងហាងរបស់អ្នកពី Telegram')}</p>
            </div>
          </div>
        </div>
        <button onClick={() => void loadDashboard(true)} disabled={refreshing} className="rounded-xl bg-muted px-2.5 py-2 text-muted-foreground" title={t('Refresh seller data', 'ធ្វើបច្ចុប្បន្នភាពទិន្នន័យអ្នកលក់')} aria-label={t('Refresh seller data', 'ធ្វើបច្ចុប្បន្នភាពទិន្នន័យអ្នកលក់')}>
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <Metric label={t('Gross revenue', 'ចំណូលសរុប')} value={`$${Number(stats?.gross_revenue ?? 0).toFixed(2)}`} icon={DollarSign} tone="emerald" />
        <Metric label={t('Pending orders', 'ការបញ្ជាទិញរង់ចាំ')} value={String(stats?.pending_orders ?? 0)} icon={Clock3} tone="amber" />
        <Metric label={t('Active listings', 'ទំនិញកំពុងលក់')} value={String(stats?.active_listings ?? 0)} icon={Package} tone="indigo" />
        <Metric label={t('Total listings', 'ទំនិញសរុប')} value={String(stats?.total_listings ?? 0)} icon={Store} tone="blue" />
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-foreground">{t('Seller orders', 'ការបញ្ជាទិញអ្នកលក់')}</h3>
          <span className="text-[10px] font-bold text-muted-foreground">{orders.length} {t('visible', 'បង្ហាញ')}</span>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-7 text-center text-xs text-muted-foreground">{t('Your seller orders will appear here after checkout.', 'ការបញ្ជាទិញរបស់អ្នកលក់នឹងបង្ហាញនៅទីនេះបន្ទាប់ពីការទូទាត់។')}</div>
        ) : (
          <div className="space-y-2">
            {orders.map((order) => (
              <div key={order.id} className="rounded-2xl border border-border bg-card p-3.5 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs font-extrabold text-foreground">#{order.order_number}</span>
                  <span className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[10px] font-bold capitalize text-emerald-700 dark:text-emerald-300">{getStatusLabel(order.status)}</span>
                </div>
                <p className="truncate text-[11px] text-muted-foreground">{order.items?.map((item) => `${localizeProductName({ name: item.product_name }, language)} × ${item.quantity}`).join(', ') || t('Seller items', 'ទំនិញអ្នកលក់')}</p>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{t('Buyer', 'អ្នកទិញ')}: {order.customer?.name || t('Customer', 'អតិថិជន')}</span>
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
