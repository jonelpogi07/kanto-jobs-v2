import useSWR, { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useLocation } from '@/lib/location'
import { api } from '@/services/api'
import type { JobSearchParams } from '@/types'

export function useJobSearch(params: Omit<JobSearchParams, 'lat' | 'lng'>) {
  const { coords } = useLocation()
  const full: JobSearchParams = { ...params, ...coords, size: 50 }
  return useSWR(['/jobs', full], () => api.jobs.search(full), { keepPreviousData: true })
}

export function useJob(id: number) {
  const { coords } = useLocation()
  return useSWR(Number.isFinite(id) ? ['/jobs/:id', id, coords] : null, () => api.jobs.getById(id, coords))
}

export function useMyJobs() {
  const { isAuthenticated } = useAuth()
  return useSWR(isAuthenticated ? '/jobs/mine' : null, () => api.jobs.mine())
}

export function useJobApplications(jobId: number, enabled: boolean) {
  return useSWR(enabled ? ['/jobs/:id/applications', jobId] : null, () => api.jobs.applications(jobId))
}

export function useMyApplications() {
  const { isAuthenticated } = useAuth()
  return useSWR(isAuthenticated ? '/applications/mine' : null, () => api.applications.mine())
}

export function useUserReviews(userId: number | undefined) {
  return useSWR(userId ? ['/users/:id/reviews', userId] : null, () => api.users.reviews(userId!))
}

/** Revalidates every cached query after a write. Small app, so a broad refresh keeps things simple. */
export function useRefreshAll() {
  const { mutate } = useSWRConfig()
  return useCallback(() => mutate(() => true), [mutate])
}
