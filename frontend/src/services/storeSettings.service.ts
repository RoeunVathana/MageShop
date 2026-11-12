import { api, publicApiClient } from '@/lib/api'
import { cachedRead } from '@/lib/read-cache'

export interface StoreCurrencySettings {
  default_currency: 'USD' | 'KHR'
  usd_to_khr_rate: number
  allowed_currencies: 'BOTH' | 'USD_ONLY' | 'KHR_ONLY'
  currency_auto_switch_lang?: boolean | string
  store_name?: string
  store_description?: string
  store_address?: string
  company_city?: string
  company_country?: string
  company_postal_code?: string
  company_latitude?: number | string
  company_longitude?: number | string
  company_map_embed_url?: string
  company_google_maps_url?: string
  business_hours?: string
  contact_phone?: string
  support_email?: string
  business_email?: string
  tax_id?: string
  telegram_bot_username?: string
  telegram_support_contact?: string
  google_client_id?: string
  google_client_secret?: string
  google_callback_url?: string
  google_is_configured?: boolean
  bakong_account_id?: string
  bakong_merchant_name?: string
  merchant_phone?: string
  bakong_api_url?: string
  bakong_api_enabled?: boolean | string
  bakong_api_token_configured?: boolean
  bakong_api_token_masked?: string
}

interface ApiResponse<T> {
  status: string
  message?: string
  data: T
}

export const storeSettingsService = {
  /**
   * Helper to format data uniformly
   */
  mapSettingData(data: any): StoreCurrencySettings {
    const lat = data.company_latitude ?? 11.5564
    const lng = data.company_longitude ?? 104.9282
    const defaultGoogleMapsUrl = `https://maps.google.com/?q=${lat},${lng}`

    return {
      default_currency: data.default_currency === 'KHR' ? 'KHR' : 'USD',
      usd_to_khr_rate: Number(data.usd_to_khr_rate || 4100),
      allowed_currencies: (data.allowed_currencies as any) || 'BOTH',
      currency_auto_switch_lang:
        data.currency_auto_switch_lang === 'true' || data.currency_auto_switch_lang === true,
      store_name: data.store_name || 'TYUSHOP Official Flagship',
      store_description: data.store_description || 'Cambodia & Southeast Asia Verified Multi-Vendor Flagship Marketplace',
      store_address: data.store_address || 'Preah Monivong Blvd, Sangkat Boeung Keng Kang 1, Khan Chamkarmon, Phnom Penh, Cambodia',
      company_city: data.company_city || 'Phnom Penh',
      company_country: data.company_country || 'Cambodia',
      company_postal_code: data.company_postal_code || '120101',
      company_latitude: Number(lat),
      company_longitude: Number(lng),
      company_map_embed_url: data.company_map_embed_url || '',
      company_google_maps_url: data.company_google_maps_url || defaultGoogleMapsUrl,
      business_hours: data.business_hours || 'Mon - Sun: 8:00 AM - 10:00 PM (24/7 Supporter Care)',
      contact_phone: data.contact_phone || '016 555 637',
      support_email: data.support_email || 'Vothanarern@gmail.com',
      business_email: data.business_email || 'business@megacommerce.local',
      tax_id: data.tax_id || 'KHM-VAT-9024881',
      telegram_bot_username: data.telegram_bot_username || 'MegaCommerceAiBot',
      telegram_support_contact: data.telegram_support_contact || '@MegaCommerceSupport',
      google_client_id: data.google_client_id,
      google_client_secret: data.google_client_secret,
      google_callback_url: data.google_callback_url || 'https://api.tyushop.blog/api/v1/auth/google/callback',
      google_is_configured: data.google_is_configured,
      bakong_account_id: data.bakong_account_id || 'roeun_vathana1@bkrt',
      bakong_merchant_name: data.bakong_merchant_name || 'Tyushop',
      merchant_phone: data.merchant_phone || '855976554143',
      bakong_api_url: data.bakong_api_url || 'https://api-bakong.nbc.gov.kh',
      bakong_api_enabled: data.bakong_api_enabled === 'false' || data.bakong_api_enabled === false ? false : true,
      bakong_api_token_configured: Boolean(data.bakong_api_token_configured),
      bakong_api_token_masked: data.bakong_api_token_masked || '',
    }
  },

  /**
   * Fetch public store currency configuration, company location & exchange rates
   */
  async getPublicSettings(): Promise<StoreCurrencySettings> {
    return cachedRead('public:store-settings', async () => {
      try {
        const response = await publicApiClient.get<ApiResponse<any>>('/store-settings')
        return this.mapSettingData(response.data?.data || {})
      } catch {
        return this.mapSettingData({})
      }
    }, 60_000)
  },

  /**
   * Fetch administrative store settings
   */
  async getAdminSettings(): Promise<StoreCurrencySettings> {
    try {
      const res = await api.get<ApiResponse<any>>('/admin/store-settings')
      return this.mapSettingData(res?.data || {})
    } catch {
      try {
        const res = await api.get<ApiResponse<any>>('/store-settings')
        return this.mapSettingData(res?.data || {})
      } catch {
        return this.getPublicSettings()
      }
    }
  },

  /**
   * Update store currency configuration (Admin authorized)
   */
  async updateCurrencySettings(settings: {
    default_currency: 'USD' | 'KHR'
    usd_to_khr_rate: number
    allowed_currencies: 'BOTH' | 'USD_ONLY' | 'KHR_ONLY'
    currency_auto_switch_lang?: boolean
  }): Promise<{ status: string; message: string; data?: any }> {
    const payload = {
      default_currency: settings.default_currency,
      usd_to_khr_rate: settings.usd_to_khr_rate,
      allowed_currencies: settings.allowed_currencies,
      currency_auto_switch_lang: settings.currency_auto_switch_lang ? 'true' : 'false',
    }

    try {
      return await api.patch<any>('/store-settings', payload)
    } catch {
      try {
        return await api.patch<any>('/admin/store-settings', payload)
      } catch {
        try {
          return await api.post<any>('/store-settings/currency', payload)
        } catch {
          return await api.post<any>('/admin/store-settings/currency', payload)
        }
      }
    }
  },

  /**
   * Update company profile, headquarters location & GPS coordinates
   */
  async updateCompanySettings(settings: {
    store_name?: string
    store_description?: string
    store_address?: string
    company_city?: string
    company_country?: string
    company_postal_code?: string
    company_latitude?: number | string
    company_longitude?: number | string
    company_map_embed_url?: string
    company_google_maps_url?: string
    business_hours?: string
    contact_phone?: string
    support_email?: string
    business_email?: string
    telegram_support_contact?: string
    tax_id?: string
  }): Promise<{ status: string; message: string; data?: any }> {
    // Use the explicit admin route so permission failures and validation
    // errors are returned to the admin instead of being hidden by fallbacks.
    return api.patch<any>('/admin/store-settings', settings)
  },

  /**
   * Update Google OAuth Client ID & Secret
   */
  async updateGoogleSettings(googleSettings: {
    google_client_id: string
    google_client_secret: string
    google_auth_enabled?: boolean
  }): Promise<{ status: string; message: string; data?: any }> {
    const payload = {
      google_client_id: googleSettings.google_client_id,
      google_client_secret: googleSettings.google_client_secret,
      google_auth_enabled: googleSettings.google_auth_enabled ? 'true' : 'false',
    }

    try {
      return await api.patch<any>('/store-settings', payload)
    } catch {
      try {
        return await api.patch<any>('/admin/store-settings', payload)
      } catch {
        return await api.post<any>('/store-settings', payload)
      }
    }
  },
}
