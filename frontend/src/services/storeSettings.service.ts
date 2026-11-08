import { api } from '@/lib/api'

export interface StoreCurrencySettings {
  default_currency: 'USD' | 'KHR'
  usd_to_khr_rate: number
  allowed_currencies: 'BOTH' | 'USD_ONLY' | 'KHR_ONLY'
  currency_auto_switch_lang?: boolean | string
  store_name?: string
  contact_phone?: string
  support_email?: string
}

interface ApiResponse<T> {
  status: string
  message?: string
  data: T
}

export const storeSettingsService = {
  /**
   * Fetch public store currency configuration & exchange rates
   */
  async getPublicSettings(): Promise<StoreCurrencySettings> {
    try {
      const res = await api.get<ApiResponse<any>>('/store-settings')
      const data = res?.data || {}
      return {
        default_currency: data.default_currency === 'KHR' ? 'KHR' : 'USD',
        usd_to_khr_rate: Number(data.usd_to_khr_rate || 4100),
        allowed_currencies: (data.allowed_currencies as any) || 'BOTH',
        currency_auto_switch_lang:
          data.currency_auto_switch_lang === 'true' || data.currency_auto_switch_lang === true,
        store_name: data.store_name,
        contact_phone: data.contact_phone,
        support_email: data.support_email,
      }
    } catch {
      return {
        default_currency: 'USD',
        usd_to_khr_rate: 4100,
        allowed_currencies: 'BOTH',
        currency_auto_switch_lang: false,
      }
    }
  },

  /**
   * Fetch administrative store settings
   */
  async getAdminSettings(): Promise<StoreCurrencySettings> {
    try {
      const res = await api.get<ApiResponse<any>>('/store-settings')
      const data = res?.data || {}
      return {
        default_currency: data.default_currency === 'KHR' ? 'KHR' : 'USD',
        usd_to_khr_rate: Number(data.usd_to_khr_rate || 4100),
        allowed_currencies: (data.allowed_currencies as any) || 'BOTH',
        currency_auto_switch_lang:
          data.currency_auto_switch_lang === 'true' || data.currency_auto_switch_lang === true,
        store_name: data.store_name,
        contact_phone: data.contact_phone,
        support_email: data.support_email,
      }
    } catch {
      try {
        const res = await api.get<ApiResponse<any>>('/admin/store-settings')
        const data = res?.data || {}
        return {
          default_currency: data.default_currency === 'KHR' ? 'KHR' : 'USD',
          usd_to_khr_rate: Number(data.usd_to_khr_rate || 4100),
          allowed_currencies: (data.allowed_currencies as any) || 'BOTH',
          currency_auto_switch_lang:
            data.currency_auto_switch_lang === 'true' || data.currency_auto_switch_lang === true,
          store_name: data.store_name,
          contact_phone: data.contact_phone,
          support_email: data.support_email,
        }
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
}
