import { useQuery } from '@tanstack/react-query'
import { healthService } from '@/services/health.service'

export function useHealth() {
  return useQuery({
    queryKey: ['api-health'],
    queryFn: () => healthService.checkHealth(),
    refetchInterval: 30000,
    retry: 2,
  })
}

export function useHealthDetails() {
  return useQuery({
    queryKey: ['api-health-readiness'],
    queryFn: () => healthService.checkReadiness(),
    refetchInterval: 15000,
    retry: 1,
  })
}

