import { api } from '@/lib/api'

export interface MerchantPaymentAccount {
  id: number
  account_type: 'bakong'
  bank_name: string
  account_id: string
  merchant_name: string
  merchant_city: string
  currency: 'USD' | 'KHR' | 'BOTH'
  is_default: boolean
  is_active: boolean
  verified_at?: string | null
  owner?: { id: number; name: string; email: string }
}

export interface PaymentAccountPayload {
  account_type?: 'bakong'
  bank_name: string
  account_id: string
  merchant_name: string
  merchant_city: string
  currency: 'USD' | 'KHR' | 'BOTH'
  is_active: boolean
}

interface PaymentAccountResponse {
  status: string
  message?: string
  data: MerchantPaymentAccount[] | MerchantPaymentAccount
}

export const paymentAccountsService = {
  async list(): Promise<MerchantPaymentAccount[]> {
    const response = await api.get<PaymentAccountResponse>('/payment-accounts')
    return Array.isArray(response.data) ? response.data : []
  },

  async create(payload: PaymentAccountPayload): Promise<MerchantPaymentAccount> {
    const response = await api.post<PaymentAccountResponse>('/payment-accounts', payload)
    return response.data as MerchantPaymentAccount
  },

  async update(id: number, payload: Partial<PaymentAccountPayload>): Promise<MerchantPaymentAccount> {
    const response = await api.patch<PaymentAccountResponse>(`/payment-accounts/${id}`, payload)
    return response.data as MerchantPaymentAccount
  },

  async remove(id: number): Promise<void> {
    await api.delete(`/payment-accounts/${id}`)
  },

  async makeDefault(id: number): Promise<MerchantPaymentAccount> {
    const response = await api.post<PaymentAccountResponse>(`/payment-accounts/${id}/default`)
    return response.data as MerchantPaymentAccount
  },
}
