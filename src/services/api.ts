import axios, { AxiosError } from 'axios'
import { mockApi } from '@/mocks/handlers'
import type {
  ApiErrorDTO,
  ApplicationDTO,
  AuthResponse,
  ChatMessageDTO,
  ChatThreadDTO,
  JobPostDTO,
  Page,
  ReviewDTO,
  UserDTO,
} from '@/types'
import type { KantoApi } from './contract'
import { ApiError, tokenStorage } from './token'

/**
 * Set VITE_USE_MOCKS=false and VITE_API_BASE_URL=https://your-api/api/v1
 * to talk to the Spring Boot backend instead of the localStorage mocks.
 */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS !== 'false'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080/api/v1',
  timeout: 15_000,
  headers: { 'Content-Type': 'application/json' },
})

http.interceptors.request.use((config) => {
  const token = tokenStorage.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorDTO>) => {
    const status = error.response?.status ?? 0
    if (status === 401) tokenStorage.clear()
    const message =
      error.response?.data?.message || (status === 0 ? 'Cannot reach the server. Check your connection.' : error.message)
    return Promise.reject(new ApiError(status, message))
  },
)

const data = <T>(p: Promise<{ data: T }>) => p.then((r) => r.data)

const springBootApi: KantoApi = {
  auth: {
    login: (req) => data(http.post<AuthResponse>('/auth/login', req)),
    register: (req) => data(http.post<AuthResponse>('/auth/register', req)),
    loginWithGoogle: (idToken) => data(http.post<AuthResponse>('/auth/google', { idToken })),
  },
  users: {
    me: () => data(http.get<UserDTO>('/users/me')),
    updateGigCoins: (delta: number) => data(http.put<UserDTO>('/users/me/gig-coins', { delta })),
    updateMe: (req) => data(http.put<UserDTO>('/users/me', req)),
    getById: (id) => data(http.get<UserDTO>(`/users/${id}`)),
    reviews: (id, page = 0, size = 20) =>
      data(http.get<Page<ReviewDTO>>(`/users/${id}/reviews`, { params: { page, size } })),
  },
  jobs: {
    search: (params) => data(http.get<Page<JobPostDTO>>('/jobs', { params })),
    getById: (id, coords) => data(http.get<JobPostDTO>(`/jobs/${id}`, { params: coords })),
    create: (req) => data(http.post<JobPostDTO>('/jobs', req)),
    update: (id, req) => data(http.put<JobPostDTO>(`/jobs/${id}`, req)),
    mine: (page = 0, size = 20) => data(http.get<Page<JobPostDTO>>('/jobs/mine', { params: { page, size } })),
    complete: (id) => data(http.post<JobPostDTO>(`/jobs/${id}/complete`)),
    cancel: (id) => data(http.post<JobPostDTO>(`/jobs/${id}/cancel`)),
    applications: (jobId) => data(http.get<ApplicationDTO[]>(`/jobs/${jobId}/applications`)),
    apply: (jobId, req) => data(http.post<ApplicationDTO>(`/jobs/${jobId}/applications`, req)),
    review: (jobId, req) => data(http.post<ReviewDTO>(`/jobs/${jobId}/reviews`, req)),
  },
  applications: {
    mine: (page = 0, size = 20) =>
      data(http.get<Page<ApplicationDTO>>('/applications/mine', { params: { page, size } })),
    accept: (id) => data(http.post<ApplicationDTO>(`/applications/${id}/accept`)),
    decline: (id) => data(http.post<ApplicationDTO>(`/applications/${id}/decline`)),
    cancel: (id) => data(http.post<ApplicationDTO>(`/applications/${id}/cancel`)),
  },
  chat: {
    threads: () => data(http.get<ChatThreadDTO[]>('/chat/threads')),
    messages: (threadId, afterId) =>
      data(http.get<ChatMessageDTO[]>(`/chat/threads/${threadId}/messages`, { params: { afterId } })),
    send: (threadId, req) => data(http.post<ChatMessageDTO>(`/chat/threads/${threadId}/messages`, req)),
  },
}

export const api: KantoApi = USE_MOCKS ? mockApi : springBootApi
