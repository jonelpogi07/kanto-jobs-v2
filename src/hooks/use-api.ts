import useSWR, { useSWRConfig } from 'swr'
import { useCallback } from 'react'
import { useAuth } from '@/lib/auth'
import { useLocation } from '@/lib/location'
import { api } from '@/services/api'
import type { JobSearchParams } from '@/types'

export function useJobSearch(params: Omit<JobSearchParams, 'lat' | 'lng'>) {
  const { coords } = useLocation()
  const { availableDays: _days, rateType: _rt, ...jobParams } = params as any
  const full: JobSearchParams = { ...jobParams, ...coords, size: 50 }
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

export const CHAT_THREADS_KEY = '/chat/threads'

/** Inbox list. Polls so new messages and unread counts stay live. */
export function useChatThreads() {
  const { isAuthenticated } = useAuth()
  return useSWR(isAuthenticated ? CHAT_THREADS_KEY : null, () => api.chat.threads(), { refreshInterval: 5_000 })
}

/** Conversation messages. Polls for live updates; the API marks the thread read. */
export function useChatMessages(threadId: number | null) {
  return useSWR(threadId ? ['/chat/threads/:id/messages', threadId] : null, () => api.chat.messages(threadId!), {
    refreshInterval: 3_000,
  })
}

/** Revalidates every cached query after a write. Small app, so a broad refresh keeps things simple. */
export function useRefreshAll() {
  const { mutate } = useSWRConfig()
  return useCallback(() => mutate(() => true), [mutate])
}
