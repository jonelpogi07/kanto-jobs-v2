import useSWR, { useSWRConfig } from 'swr'
import { useCallback, useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { api } from '@/services/api'
import type { JobSearchParams, SearchNearbyGigstersRequest } from '@/types'

const CHAT_UPDATE_EVENT = 'kanto:chat-update'

export function useJobSearch(params: Omit<JobSearchParams, 'lat' | 'lng'>) {
  const { availableDays: _days, rateType: _rt, ...jobParams } = params as any
  const full: JobSearchParams = { ...jobParams, size: 50 }
  return useSWR(['/jobs', full], () => api.jobs.search(full), { keepPreviousData: true })
}

export function useJob(id: number) {
  return useSWR(Number.isFinite(id) ? ['/jobs/:id', id] : null, () => api.jobs.getById(id))
}

/** Nearby gigsters discoverable from the caller's current location (backend-backed). */
export function useNearbyGigsters(req: SearchNearbyGigstersRequest | null) {
  return useSWR(req ? ['/jobs/search-nearby-gigsters', req] : null, () => api.jobs.searchNearbyGigsters(req!))
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
  const { mutate } = useSWRConfig()

  useEffect(() => {
    if (!isAuthenticated) return
    const handler = () => void mutate(CHAT_THREADS_KEY)
    window.addEventListener(CHAT_UPDATE_EVENT, handler)
    return () => window.removeEventListener(CHAT_UPDATE_EVENT, handler)
  }, [isAuthenticated, mutate])

  return useSWR(isAuthenticated ? CHAT_THREADS_KEY : null, () => api.chat.threads(), { refreshInterval: 5_000 })
}

/** Conversation messages. Polls for live updates; the API marks the thread read. */
export function useChatMessages(threadId: number | null) {
  const { mutate } = useSWRConfig()
  const key = threadId ? ['/chat/threads/:id/messages', threadId] : null

  useEffect(() => {
    if (!threadId) return
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.applicationId === threadId) {
        void mutate(key)
      }
    }
    window.addEventListener(CHAT_UPDATE_EVENT, handler)
    return () => window.removeEventListener(CHAT_UPDATE_EVENT, handler)
  }, [threadId, mutate, key])

  return useSWR(key, () => api.chat.messages(threadId!), { refreshInterval: 3_000 })
}

/** Revalidates every cached query after a write. Small app, so a broad refresh keeps things simple. */
export function useRefreshAll() {
  const { mutate } = useSWRConfig()
  return useCallback(() => mutate(() => true), [mutate])
}
