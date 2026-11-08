import { api } from '@/lib/api'
import type { HealthDetailsResponse, HealthResponse } from '@/types/api.types'

export const healthService = {
  /**
   * Basic health check returning { status: 'ok', application: 'MegaCommerce API' }
   */
  checkHealth: async (): Promise<HealthResponse> => {
    return api.get<HealthResponse>('/health')
  },

  /**
   * Detailed dependency readiness check (PostgreSQL, Redis, Storage)
   */
  checkReadiness: async (): Promise<HealthDetailsResponse> => {
    return api.get<HealthDetailsResponse>('/health/ready')
  },
}

