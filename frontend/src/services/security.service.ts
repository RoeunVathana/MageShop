import { api } from '@/lib/api'
import type { ApiResponse } from '@/types/api.types'

export interface ApiToken {
  id: number
  name: string
  abilities: string[]
  last_used_at: string | null
  expires_at: string | null
  is_expired: boolean
  created_at: string
  user: {
    id: number
    name: string
    email: string
    status: string
  } | null
}

export interface CreateApiTokenPayload {
  name: string
  user_id?: number
  abilities?: string[]
  expires_in_days?: number | null
}

export interface CreatedApiTokenData {
  id: number
  name: string
  plain_text_token: string
  abilities: string[]
  expires_at: string | null
  created_at: string
  user: {
    id: number
    name: string
    email: string
  }
}

export interface SecurityUser {
  id: number
  name: string
  email: string
  phone_number: string | null
  status: string
  is_email_verified: boolean
  email_verified_at: string | null
  created_at: string
  roles: {
    id: number
    name: string
    slug: string
  }[]
}

export interface SentOtp {
  id: number
  email: string
  attempts: number
  is_used: boolean
  is_expired: boolean
  status: 'active' | 'used' | 'expired'
  expires_at: string
  cooldown_until: string | null
  is_cooling_down: boolean
  created_at: string
}

export interface EmailSettings {
  mail_mailer: string
  mail_host: string
  mail_port: number
  mail_username: string
  mail_password_set: boolean
  mail_encryption: string
  mail_from_address: string
  mail_from_name: string
}

export interface UpdateEmailSettingsPayload {
  mail_mailer?: string
  mail_host?: string
  mail_port?: number
  mail_username?: string
  mail_password?: string
  mail_encryption?: string
  mail_from_address?: string
  mail_from_name?: string
}

export interface TelegramSettings {
  telegram_bot_token_set: boolean
  telegram_bot_token_masked: string
  telegram_bot_username: string
  telegram_admin_chat_id: string
  telegram_webhook_secret: string
  telegram_mini_app_url: string
  telegram_webhook_url: string
  webhook_status?: string | null
}

export interface UpdateTelegramSettingsPayload {
  telegram_bot_token?: string
  telegram_bot_username?: string
  telegram_admin_chat_id?: string
  telegram_webhook_secret?: string
  telegram_mini_app_url?: string
  telegram_webhook_url?: string
  register_webhook?: boolean
}

export const securityService = {
  // API Token Management
  getApiTokens: async (params?: { search?: string; page?: number; per_page?: number } | string): Promise<ApiResponse<ApiToken[]>> => {
    const queryParams = typeof params === 'string' ? { search: params } : params
    return api.get<ApiResponse<ApiToken[]>>('/admin/api-tokens', {
      params: queryParams,
    })
  },

  createApiToken: async (payload: CreateApiTokenPayload): Promise<ApiResponse<CreatedApiTokenData>> => {
    return api.post<ApiResponse<CreatedApiTokenData>>('/admin/api-tokens', payload)
  },

  revokeApiToken: async (id: number): Promise<ApiResponse<null>> => {
    return api.delete<ApiResponse<null>>(`/admin/api-tokens/${id}`)
  },

  regenerateApiToken: async (id: number): Promise<ApiResponse<CreatedApiTokenData>> => {
    return api.post<ApiResponse<CreatedApiTokenData>>(`/admin/api-tokens/${id}/regenerate`)
  },

  // User Security: Email, Password, OTP
  getUsers: async (params?: { search?: string; role?: string; page?: number }): Promise<ApiResponse<SecurityUser[]>> => {
    return api.get<ApiResponse<SecurityUser[]>>('/admin/security/users', { params })
  },

  updateUserEmail: async (userId: number, email: string): Promise<ApiResponse<any>> => {
    return api.patch<ApiResponse<any>>(`/admin/security/users/${userId}/email`, { email })
  },

  updateUserPassword: async (userId: number, password: string, revokeTokens: boolean = true): Promise<ApiResponse<null>> => {
    return api.patch<ApiResponse<null>>(`/admin/security/users/${userId}/password`, {
      password,
      revoke_tokens: revokeTokens,
    })
  },

  sendUserOtp: async (userId: number): Promise<ApiResponse<null>> => {
    return api.post<ApiResponse<null>>(`/admin/security/users/${userId}/send-otp`)
  },

  // Sent OTP Management & Audit
  getSentOtps: async (params?: { email?: string; status?: string; page?: number }): Promise<ApiResponse<SentOtp[]>> => {
    return api.get<ApiResponse<SentOtp[]>>('/admin/security/otps', { params })
  },

  dispatchDirectOtp: async (email: string): Promise<ApiResponse<null>> => {
    return api.post<ApiResponse<null>>('/admin/security/otps/dispatch', { email })
  },

  invalidateOtp: async (id: number): Promise<ApiResponse<null>> => {
    return api.post<ApiResponse<null>>(`/admin/security/otps/${id}/invalidate`)
  },

  resendOtp: async (id: number): Promise<ApiResponse<null>> => {
    return api.post<ApiResponse<null>>(`/admin/security/otps/${id}/resend`)
  },

  // Email / SMTP Settings & Deliverability Testing
  getEmailSettings: async (): Promise<ApiResponse<EmailSettings>> => {
    return api.get<ApiResponse<EmailSettings>>('/admin/security/email-settings')
  },

  updateEmailSettings: async (payload: UpdateEmailSettingsPayload): Promise<ApiResponse<EmailSettings>> => {
    return api.patch<ApiResponse<EmailSettings>>('/admin/security/email-settings', payload)
  },

  sendTestEmailOtp: async (testEmail: string): Promise<ApiResponse<{ recipient: string; timestamp: string }>> => {
    return api.post<ApiResponse<{ recipient: string; timestamp: string }>>('/admin/security/email-settings/test-otp', {
      test_email: testEmail,
    })
  },

  // Telegram Bot API Token Key & Webhook Configuration
  getTelegramSettings: async (): Promise<ApiResponse<TelegramSettings>> => {
    return api.get<ApiResponse<TelegramSettings>>('/admin/security/telegram-settings')
  },

  updateTelegramSettings: async (payload: UpdateTelegramSettingsPayload): Promise<ApiResponse<TelegramSettings>> => {
    return api.patch<ApiResponse<TelegramSettings>>('/admin/security/telegram-settings', payload)
  },

  testTelegramBotConnection: async (chatId?: string): Promise<ApiResponse<{ bot_username: string; bot_name: string; message_sent: boolean; chat_id: string }>> => {
    return api.post<ApiResponse<{ bot_username: string; bot_name: string; message_sent: boolean; chat_id: string }>>('/admin/security/telegram-settings/test', {
      chat_id: chatId,
    })
  },
}

