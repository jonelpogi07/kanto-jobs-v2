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
export function useChatThreads(options?: { refreshInterval?: number }) {
  const { isAuthenticated } = useAuth()
  const { mutate } = useSWRConfig()
  const baseInterval = options?.refreshInterval ?? 5_000

  useEffect(() => {
    if (!isAuthenticated) return
    const handler = () => void mutate(CHAT_THREADS_KEY)
    window.addEventListener(CHAT_UPDATE_EVENT, handler)
    const onFocus = () => void mutate(CHAT_THREADS_KEY)
    const onVisibility = () => { if (!document.hidden) void mutate(CHAT_THREADS_KEY) }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, handler)
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthenticated, mutate])

  return useSWR(isAuthenticated ? CHAT_THREADS_KEY : null, () => api.chat.threads(), {
    refreshInterval: () => (document.hidden ? 30_000 : baseInterval),
    revalidateOnFocus: true,
  })
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
    const onVisibility = () => { if (!document.hidden) void mutate(key) }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener(CHAT_UPDATE_EVENT, handler)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [threadId, mutate])

  return useSWR(key, () => api.chat.messages(threadId!), {
    refreshInterval: () => (document.hidden ? 30_000 : 3_000),
    revalidateOnFocus: true,
  })
}

/** Revalidates every cached query after a write. Small app, so a broad refresh keeps things simple. */
export function useRefreshAll() {
  const { mutate } = useSWRConfig()
  return useCallback(() => mutate(() => true), [mutate])
}
