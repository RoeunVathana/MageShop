export interface ApiResponse<T = any> {
  status: 'ok' | 'success' | 'error'
  message?: string
  data?: T
  errors?: Record<string, string[]>
}

export interface ApiErrorResponse {
  status: 'error'
  message: string
  errors?: Record<string, string[]>
  code?: number
}

export interface HealthResponse {
  status: string
  application: string
}

export interface HealthDependency {
  driver?: string
  status: string
  latency_ms?: number
  error?: string | null
  message?: string
}

export interface HealthDetailsResponse {
  status: string
  application: string
  version: string
  timestamp: string
  dependencies: {
    database: HealthDependency
    redis: HealthDependency
    storage: {
      status: string
    }
  }
}

