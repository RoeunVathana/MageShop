import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Attach Bearer token when available from Telegram authentication
export const setTelegramAuthToken = (token: string | null) => {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    sessionStorage.setItem('tg_auth_token', token);
  } else {
    delete api.defaults.headers.common['Authorization'];
    sessionStorage.removeItem('tg_auth_token');
  }
};

// Initialize with stored session token if available
const savedToken = sessionStorage.getItem('tg_auth_token');
if (savedToken) {
  api.defaults.headers.common['Authorization'] = `Bearer ${savedToken}`;
}

export interface StoreSettings {
  store_name: string;
  store_description: string;
  store_address: string;
  contact_phone: string;
  support_email: string;
  default_currency: string;
  country: string;
  brand_color: string;
  return_policy_days: string | number;
  shipping_policy: string;
  telegram_bot_username?: string;
  telegram_support_contact?: string;
}

export interface ProductItem {
  id: number;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: string | number;
  discount_price?: string | number | null;
  stock_quantity: number;
  low_stock_threshold: number;
  rating: string | number;
  reviews_count: number;
  image_url?: string;
  gallery_urls?: string[];
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  is_flash_sale: boolean;
  category?: {
    id: number;
    name: string;
    slug: string;
  };
}

export interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  icon?: string;
  description?: string;
  products_count: number;
}

export interface AiChatMessage {
  id?: string;
  sender: 'user' | 'assistant' | 'system';
  message: string;
  tool_calls?: Array<{
    tool: string;
    params: any;
    result: any;
  }>;
  created_at?: string;
}

export const telegramApi = {
  // Store Settings
  getStoreSettings: async (): Promise<StoreSettings> => {
    const res = await api.get('/store-settings');
    return res.data.data;
  },

  // Telegram WebApp Authentication
  authenticate: async (initData: string, demoMode = false, demoRole = 'customer') => {
    const res = await api.post('/telegram/auth', {
      init_data: initData,
      demo_mode: demoMode,
      demo_role: demoRole,
    });
    if (res.data?.data?.token) {
      setTelegramAuthToken(res.data.data.token);
    }
    return res.data;
  },

  // Customer Profile
  getProfile: async () => {
    const res = await api.get('/telegram/profile');
    return res.data.data;
  },

  // Products
  getProducts: async (params?: { category?: string; tab?: string; search?: string; limit?: number }) => {
    const res = await api.get('/telegram/products', { params });
    return res.data;
  },

  getProduct: async (idOrSku: string | number) => {
    const res = await api.get(`/telegram/products/${idOrSku}`);
    return res.data.data;
  },

  // Categories
  getCategories: async (): Promise<CategoryItem[]> => {
    const res = await api.get('/telegram/categories');
    return res.data.data;
  },

  // AI Chat
  sendAiMessage: async (payload: { message: string; session_id?: number; language?: 'en' | 'km' }) => {
    const res = await api.post('/telegram/ai/chat', payload);
    return res.data.data;
  },

  // Admin APIs
  getAdminStock: async (lowStockOnly = false) => {
    const res = await api.get('/telegram/admin/stock', {
      params: { low_stock: lowStockOnly ? 1 : 0 },
    });
    return res.data;
  },

  adjustAdminStock: async (payload: { product_id: number; delta: number; reason?: string }) => {
    const res = await api.post('/telegram/admin/stock-adjust', payload);
    return res.data;
  },

  getAdminSalesSummary: async () => {
    const res = await api.get('/telegram/admin/sales-summary');
    return res.data.data;
  },

  // Receipt Download URL
  getReceiptDownloadUrl: (orderNumber: string, format = 'pdf') => {
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';
    return `${baseUrl}/orders/${orderNumber}/receipt?format=${format}`;
  },
};

