import React, { useCallback, useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Mail,
  MapPin,
  Minus,
  Navigation,
  Phone,
  Plus,
  QrCode,
  RefreshCw,
  Send,
  ShieldCheck,
  ShoppingBag,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useTelegramCartStore } from '@/context/telegramCartStore';
import { StoreSettings, telegramApi } from '@/services/telegramApi';

interface TelegramProfile {
  user?: {
    name?: string;
    email?: string;
    phone_number?: string | null;
  };
  telegram?: {
    first_name?: string;
  };
}

interface TelegramCheckoutData {
  order?: {
    order_number?: string;
    total_amount?: number | string;
    payment_status?: string;
  };
  receipt_number?: string;
  transaction_reference?: string;
  email_status?: string;
  payment_status?: string;
  points_earned?: number;
  qr_payment?: {
    qr_string?: string;
    md5?: string;
    amount_usd?: number;
    amount_khr?: number;
    expires_in_seconds?: number;
  };
}

interface TelegramCartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings?: StoreSettings;
  userProfile?: TelegramProfile | null;
}

const errorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    if (response?.data?.message) return response.data.message;
  }
  return error instanceof Error ? error.message : 'Telegram checkout could not be completed. Please try again.';
};

export const TelegramCartDrawer: React.FC<TelegramCartDrawerProps> = ({
  isOpen,
  onClose,
  storeSettings,
  userProfile,
}) => {
  const { items, updateQuantity, removeItem, clearCart, subtotal } = useTelegramCartStore();
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [checkoutComplete, setCheckoutComplete] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [checkoutData, setCheckoutData] = useState<TelegramCheckoutData | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerCoords, setCustomerCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const idempotencyKeyRef = useRef<string | null>(null);

  const cartSubtotal = subtotal();
  const shippingFee = cartSubtotal > 50 || cartSubtotal === 0 ? 0 : 2.5;
  const grandTotal = cartSubtotal + shippingFee;
  const orderNumber = checkoutData?.order?.order_number;
  const qrAmount = Number(checkoutData?.qr_payment?.amount_usd ?? checkoutData?.order?.total_amount ?? grandTotal);

  useEffect(() => {
    const profileName = userProfile?.user?.name || userProfile?.telegram?.first_name || '';
    const profilePhone = userProfile?.user?.phone_number || '';
    const profileEmail = userProfile?.user?.email || '';
    setCustomerName((current) => current || profileName);
    setCustomerPhone((current) => current || profilePhone);
    setCustomerEmail((current) => current || (profileEmail.includes('@megacommerce.internal') ? '' : profileEmail));
  }, [userProfile]);

  const handleDetectCurrentLocation = () => {
    if (!navigator.geolocation) {
      setCheckoutError('Your device does not support GPS location. Please use a device with location services enabled.');
      return;
    }
    setIsLocating(true);
    setCheckoutError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setCustomerCoords({ lat: latitude, lng: longitude, accuracy });
        if (!deliveryAddress.trim()) {
          setDeliveryAddress(`Current GPS location (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`);
        }
        setIsLocating(false);
      },
      (error) => {
        setIsLocating(false);
        setCheckoutError(error.code === 1 ? 'Location permission was denied. Enable location access, then try again.' : error.message || 'Unable to read your current GPS location.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  useEffect(() => {
    const qrString = checkoutData?.qr_payment?.qr_string;
    if (!qrString) {
      setQrImage('');
      return undefined;
    }

    let cancelled = false;
    QRCode.toDataURL(qrString, {
      width: 240,
      margin: 2,
      errorCorrectionLevel: 'M',
      color: { dark: '#0f172a', light: '#ffffff' },
    })
      .then((dataUrl) => {
        if (!cancelled) setQrImage(dataUrl);
      })
      .catch(() => {
        if (!cancelled) setCheckoutError('The Bakong QR image could not be generated. Please create a new checkout.');
      });

    return () => {
      cancelled = true;
    };
  }, [checkoutData?.qr_payment?.qr_string]);

  const markPaymentComplete = useCallback((data: TelegramCheckoutData) => {
    setCheckoutData(data);
    setIsCheckingOut(false);
    setCheckoutComplete(true);
    setCheckoutError('');
    clearCart();
    idempotencyKeyRef.current = null;
    if (window.Telegram?.WebApp?.HapticFeedback) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('success');
    }
  }, [clearCart]);

  const confirmPayment = useCallback(async (silent = false) => {
    if (!orderNumber || isConfirming) return;
    setIsConfirming(true);
    if (!silent) setCheckoutError('');
    try {
      const response = await telegramApi.confirmPayment(orderNumber);
      const data = (response?.data ?? response) as TelegramCheckoutData;
      const paymentStatus = String(data.payment_status ?? data.order?.payment_status ?? '').toLowerCase();
      if (paymentStatus === 'paid' || paymentStatus === 'completed') {
        markPaymentComplete(data);
      } else if (!silent) {
        setCheckoutError('Bakong has not confirmed this payment yet. Please wait a few seconds after scanning and try again.');
      }
    } catch (error) {
      if (!silent) setCheckoutError(errorMessage(error));
    } finally {
      setIsConfirming(false);
    }
  }, [isConfirming, markPaymentComplete, orderNumber]);

  useEffect(() => {
    if (!isCheckingOut || !orderNumber) return undefined;
    const timer = window.setInterval(() => {
      void confirmPayment(true);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [confirmPayment, isCheckingOut, orderNumber]);

  const handleCheckout = async () => {
    if (!items.length || isSubmitting) return;
    if (!customerName.trim() || !customerPhone.trim() || !deliveryAddress.trim()) {
      setCheckoutError('Please enter your name, phone number, and delivery address before paying.');
      return;
    }
    const email = customerEmail.trim().toLowerCase();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      setCheckoutError('Please enter a valid email address so we can send your receipt and order report.');
      return;
    }
    if (!customerCoords) {
      setCheckoutError('Use Current GPS Location before paying so your courier can be tracked in real time.');
      return;
    }

    setIsSubmitting(true);
    setCheckoutError('');
    idempotencyKeyRef.current ||= `tg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    try {
      const response = await telegramApi.createCheckout({
        items: items.map(({ product, quantity }) => ({ product_id: product.id, quantity })),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_email: email,
        delivery_address: deliveryAddress.trim(),
        dest_lat: customerCoords.lat,
        dest_lng: customerCoords.lng,
        payment_method: 'bakong_khqr',
        idempotency_key: idempotencyKeyRef.current,
      });
      const data = (response?.data ?? response) as TelegramCheckoutData;
      const paymentStatus = String(data.payment_status ?? data.order?.payment_status ?? '').toLowerCase();
      if (!data.order?.order_number) throw new Error('The server did not return an order number. Please try again.');

      setCheckoutData(data);
      if (paymentStatus === 'paid' || paymentStatus === 'completed') {
        markPaymentComplete(data);
      } else if (data.qr_payment?.qr_string) {
        setIsCheckingOut(true);
      } else {
        throw new Error('Bakong payment QR was not created. Your order was not marked as paid. Please try again.');
      }
    } catch (error) {
      setCheckoutError(errorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCheckout = () => {
    setIsCheckingOut(false);
    setIsSubmitting(false);
    setIsConfirming(false);
    setCheckoutComplete(false);
    setCheckoutError('');
    setCheckoutData(null);
    setQrImage('');
    idempotencyKeyRef.current = null;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2147483000] isolate flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-background w-full max-w-md mx-auto max-h-[92vh] rounded-t-3xl flex flex-col border-t border-border shadow-2xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-card/60">
          <div className="flex items-center space-x-2 min-w-0">
            <ShoppingBag className="w-5 h-5 text-indigo-600 shrink-0" />
            <h2 className="font-bold text-sm text-foreground truncate">{storeSettings?.store_name || 'TYUSHOP'} Shopping Bag</h2>
            <span className="text-xs bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded-full font-semibold shrink-0">{items.length} items</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" aria-label="Close shopping bag"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {checkoutComplete ? (
            <div className="text-center py-8 space-y-3">
              <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 mx-auto flex items-center justify-center"><CheckCircle2 className="w-10 h-10" /></div>
              <h3 className="text-lg font-bold text-foreground">Payment Verified!</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">Order <strong className="text-foreground">#{orderNumber}</strong> was verified by Bakong. Your receipt and admin Telegram report are being dispatched.</p>
              <a href={`/track-order/${encodeURIComponent(orderNumber || '')}`} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-md hover:bg-indigo-700"> <MapPin className="w-3.5 h-3.5" /> Track live GPS delivery</a>
              <div className="grid grid-cols-2 gap-2 text-left text-[10px] max-w-xs mx-auto">
                <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 p-2 text-emerald-800 dark:text-emerald-300"><Mail className="w-3.5 h-3.5 mb-1" /> Receipt Email<div className="font-bold">{checkoutData?.email_status === 'sent' ? 'Sent' : 'Processing'}</div></div>
                <div className="rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/50 p-2 text-sky-800 dark:text-sky-300"><Send className="w-3.5 h-3.5 mb-1" /> Admin Telegram<div className="font-bold">Processing</div></div>
              </div>
              <button onClick={() => { resetCheckout(); onClose(); }} className="mt-3 bg-indigo-600 text-white font-semibold text-xs px-5 py-2 rounded-xl shadow-xs">Continue Shopping</button>
            </div>
          ) : isCheckingOut ? (
            <div className="text-center py-4 space-y-4">
              <div className="w-64 h-64 mx-auto bg-white p-3 rounded-2xl border-2 border-indigo-500 shadow-md flex items-center justify-center">{qrImage ? <img src={qrImage} alt="Bakong KHQR payment code" className="w-full h-full object-contain" /> : <RefreshCw className="w-10 h-10 text-indigo-600 animate-spin" />}</div>
              <div>
                <div className="inline-flex items-center gap-1.5 text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1"><QrCode className="w-3.5 h-3.5" /> Bakong KHQR</div>
                <h4 className="font-bold text-sm text-foreground">Scan to Pay</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Order #{orderNumber}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Amount: <strong className="text-indigo-600 font-extrabold">${qrAmount.toFixed(2)} USD</strong></p>
                <div className="mt-2 inline-flex items-center space-x-1 text-[11px] text-emerald-600 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" /><span>Waiting for Bakong confirmation...</span></div>
              </div>
              {checkoutError && <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800/50 p-3 text-left text-[11px] text-amber-800 dark:text-amber-300"><AlertCircle className="inline w-3.5 h-3.5 mr-1" />{checkoutError}</div>}
              <button onClick={() => void confirmPayment(false)} disabled={isConfirming} className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2">{isConfirming ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}{isConfirming ? 'Verifying with Bakong...' : 'I Have Paid — Verify Payment'}</button>
              <button onClick={() => { setIsCheckingOut(false); setCheckoutError(''); }} className="text-xs text-muted-foreground hover:text-foreground font-semibold">Back to checkout details</button>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 space-y-2"><ShoppingBag className="w-12 h-12 text-muted-foreground/30 mx-auto" /><h3 className="font-semibold text-sm text-foreground">Your bag is empty</h3><p className="text-xs text-muted-foreground">Add products from our catalog.</p></div>
          ) : (
            <>
              {items.map(({ product, quantity }) => {
                const price = product.discount_price ? Number(product.discount_price) : Number(product.price);
                return (
                  <div key={product.id} className="flex items-center justify-between bg-card p-3 rounded-2xl border border-border/80 shadow-2xs">
                    <div className="flex items-center space-x-3 min-w-0"><div className="w-12 h-12 rounded-xl bg-muted/60 p-1 flex-shrink-0 flex items-center justify-center">{product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-full object-contain" /> : <ShoppingBag className="w-5 h-5 text-muted-foreground" />}</div><div className="min-w-0"><h4 className="font-bold text-xs text-foreground truncate">{product.name}</h4><div className="text-[11px] font-extrabold text-indigo-600 dark:text-indigo-400 mt-0.5">${price.toFixed(2)}</div></div></div>
                    <div className="flex items-center space-x-2 flex-shrink-0"><div className="flex items-center space-x-1 bg-muted rounded-xl p-1"><button onClick={() => updateQuantity(product.id, quantity - 1)} className="w-6 h-6 rounded-lg bg-card flex items-center justify-center text-foreground hover:bg-muted-foreground/10"><Minus className="w-3 h-3" /></button><span className="w-6 text-center font-bold text-xs text-foreground">{quantity}</span><button onClick={() => updateQuantity(product.id, quantity + 1)} disabled={quantity >= product.stock_quantity} className="w-6 h-6 rounded-lg bg-card flex items-center justify-center text-foreground hover:bg-muted-foreground/10 disabled:opacity-30"><Plus className="w-3 h-3" /></button></div><button onClick={() => removeItem(product.id)} className="p-1.5 text-rose-500 hover:text-rose-600 transition-colors" title="Remove"><Trash2 className="w-4 h-4" /></button></div>
                  </div>
                );
              })}
              <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/60 dark:bg-indigo-950/20 p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-800 dark:text-indigo-300"><ShieldCheck className="w-4 h-4" /> Contact and delivery information</div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-semibold text-muted-foreground"><User className="inline w-3 h-3 mr-1" />Name<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Full name" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500" /></label>
                  <label className="text-[10px] font-semibold text-muted-foreground"><Phone className="inline w-3 h-3 mr-1" />Phone<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} placeholder="0xx xxx xxx" inputMode="tel" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500" /></label>
                </div>
                <label className="block text-[10px] font-semibold text-muted-foreground"><Mail className="inline w-3 h-3 mr-1" />Email receipt (required)<input required type="email" autoComplete="email" value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)} placeholder="you@example.com" className="mt-1 w-full rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500" /></label>
                <label className="block text-[10px] font-semibold text-muted-foreground"><MapPin className="inline w-3 h-3 mr-1" />Delivery address<textarea value={deliveryAddress} onChange={(event) => setDeliveryAddress(event.target.value)} placeholder="House number, street, district, city" rows={2} className="mt-1 w-full resize-none rounded-lg border border-border bg-background px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-indigo-500" /></label>
                <button type="button" onClick={handleDetectCurrentLocation} disabled={isLocating} className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-3 py-2 text-[11px] font-bold text-indigo-700 shadow-sm hover:bg-indigo-50 disabled:opacity-60 dark:border-indigo-800 dark:bg-slate-900 dark:text-indigo-300 dark:hover:bg-indigo-950/50"><Navigation className="w-3.5 h-3.5" />{isLocating ? 'Detecting current GPS...' : 'Use Current GPS Location'}</button>
                {customerCoords && <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-[10px] font-semibold text-emerald-800 dark:border-emerald-800/50 dark:bg-emerald-950/30 dark:text-emerald-300"><span>GPS locked: {customerCoords.lat.toFixed(5)}, {customerCoords.lng.toFixed(5)}{customerCoords.accuracy ? ` (±${Math.round(customerCoords.accuracy)}m)` : ''}</span><a href={`https://www.google.com/maps/search/?api=1&query=${customerCoords.lat},${customerCoords.lng}`} target="_blank" rel="noopener noreferrer" className="font-bold underline">View map</a></div>}
              </div>
              {checkoutError && <div className="rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/30 dark:border-rose-800/50 p-3 text-[11px] text-rose-800 dark:text-rose-300"><AlertCircle className="inline w-3.5 h-3.5 mr-1" />{checkoutError}</div>}
            </>
          )}
        </div>

        {items.length > 0 && !isCheckingOut && !checkoutComplete && (
          <div className="p-4 border-t border-border bg-card/80 space-y-3">
            <div className="space-y-1 text-xs"><div className="flex justify-between text-muted-foreground"><span>Subtotal:</span><span>${cartSubtotal.toFixed(2)}</span></div><div className="flex justify-between text-muted-foreground"><span>Shipping:</span><span>{shippingFee === 0 ? <span className="text-emerald-500 font-semibold">FREE</span> : `$${shippingFee.toFixed(2)}`}</span></div><div className="flex justify-between text-sm font-extrabold text-foreground pt-1 border-t border-border/60"><span>Total Amount:</span><span className="text-indigo-600 dark:text-indigo-400 font-black">${grandTotal.toFixed(2)} USD</span></div></div>
            <button onClick={() => void handleCheckout()} disabled={isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs py-3 rounded-xl shadow-md flex items-center justify-center space-x-2 active:scale-98 transition-all">{isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}<span>{isSubmitting ? 'Creating secure KHQR...' : 'Checkout with Bakong KHQR'}</span>{!isSubmitting && <ArrowRight className="w-3.5 h-3.5" />}</button>
          </div>
        )}
      </div>
    </div>
  );
};
