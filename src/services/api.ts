import axios, { AxiosError } from 'axios'
import type {
  ApiErrorDTO,
  ApplicationDTO,
  AppealDTO,
  AuthResponse,
  ChatMessageDTO,
  ChatThreadDTO,
  CreateReportRequest,
  JobPostDTO,
  LoginRequest,
  Page,
  RegisterRequest,
  ReportDTO,
  ReviewDTO,
  SearchNearbyGigstersRequest,
  UserDTO,
} from '@/types'
import type { KantoApi } from './contract'
import { ApiError, tokenStorage } from './token'

export const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
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

function toPage<T>(list: T[], page = 0, size = 20): Page<T> {
  const totalElements = list.length
  const totalPages = Math.max(1, Math.ceil(totalElements / size))
  const start = page * size
  const end = Math.min(start + size, totalElements)
  const content = list.slice(start, end)
  return {
    content,
    totalElements,
    totalPages,
    number: page,
    size,
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: content.length,
    empty: content.length === 0,
  }
}

function mapUserDTO(backendUser: UserDTO): UserDTO {
  return {
    ...backendUser,
    fullName: `${backendUser.firstName} ${backendUser.lastName}`.trim(),
  }
}

function mapAuthResponse(response: AuthResponse): AuthResponse {
  return {
    ...response,
    user: mapUserDTO(response.user),
  }
}

function mapLoginRequest(req: LoginRequest): { email: string; password: string } {
  return { email: req.email ?? req.identifier!, password: req.password }
}

function mapRegisterRequest(req: RegisterRequest): {
  email: string
  password: string
  firstName: string
  lastName: string
  barangay: string
  city: string
} {
  return {
    email: req.email ?? req.identifier!,
    password: req.password,
    firstName: req.firstName ?? req.fullName?.split(' ')[0] ?? '',
    lastName: req.lastName ?? req.fullName?.split(' ').slice(1).join(' ') ?? '',
    barangay: req.barangay ?? 'Culubasa',
    city: req.city ?? 'Bamban, Tarlac',
  }
}

const springBootApi: KantoApi = {
  auth: {
    login: (req) => data(http.post<AuthResponse>('/auth/login', mapLoginRequest(req))).then(mapAuthResponse),
    register: (req) => data(http.post<AuthResponse>('/auth/register', mapRegisterRequest(req))).then(mapAuthResponse),
  },
  users: {
    me: () => data(http.get<UserDTO>('/users/me')).then(mapUserDTO),
    updateGigCoins: async (delta: number) => {
      const current = await data(http.get<UserDTO>('/users/me'))
      return data(http.put<UserDTO>('/users/me/gig-coins', { gigCoins: (current.gigCoins ?? 0) + delta })).then(mapUserDTO)
    },
    updateMe: (req) => data(http.put<UserDTO>('/users/me', req)).then(mapUserDTO),
    getById: (id) => data(http.get<UserDTO>(`/users/${id}`)).then(mapUserDTO),
    reviews: (id, page = 0, size = 20) =>
      data(http.get<Page<ReviewDTO>>(`/users/${id}/reviews`, { params: { page, size } })),
  },
  jobs: {
    search: (params) => data(http.get<Page<JobPostDTO>>('/jobs', { params })),
    getById: (id, coords) => data(http.get<JobPostDTO>(`/jobs/${id}`, { params: coords })),
    create: (req) => data(http.post<JobPostDTO>('/jobs', req)),
    update: (id, req) => data(http.put<JobPostDTO>(`/jobs/${id}`, req)),
    mine: (page = 0, size = 20) =>
      data(http.get<JobPostDTO[]>('/jobs/mine', { params: { page, size } })).then((list) => toPage(list, page, size)),
    complete: (id) => data(http.post<JobPostDTO>(`/jobs/${id}/complete`)),
    cancel: (id) => data(http.post<JobPostDTO>(`/jobs/${id}/cancel`)),
    reportNoShow: (id) => data(http.post<JobPostDTO>(`/jobs/${id}/report-no-show`)),
    applications: (jobId) => data(http.get<ApplicationDTO[]>(`/applications/job/${jobId}`)),
    apply: (jobId, req) => data(http.post<ApplicationDTO>(`/jobs/${jobId}/apply`, req)),
    inviteGigsterToGig: (gigId, gigster) => data(http.post<ApplicationDTO>(`/jobs/${gigId}/invite-gigster`, gigster)),
    review: (jobId, req) => data(http.post<ReviewDTO>(`/jobs/${jobId}/reviews`, req)),
    searchNearbyGigsters: (req: SearchNearbyGigstersRequest) =>
      data(http.post<{ gigsters: import('@/types').NearbyGigsterDTO[]; count: number }>('/jobs/search-nearby-gigsters', req)),
  },
  appeals: {
    submit: (reportId, req) => data(http.post<AppealDTO>(`/reports/${reportId}/appeal`, req)),
  },
  applications: {
    mine: (page = 0, size = 20) =>
      data(http.get<ApplicationDTO[]>('/applications/mine', { params: { page, size } })).then((list) => toPage(list, page, size)),
    screen: (id) => data(http.post<ApplicationDTO>(`/applications/${id}/screen`)),
    accept: (id) => data(http.post<ApplicationDTO>(`/applications/${id}/accept`)),
    decline: (id) => data(http.post<ApplicationDTO>(`/applications/${id}/decline`)),
    cancel: (id) => data(http.post<ApplicationDTO>(`/applications/${id}/cancel`)),
    reportNoShow: (id) => data(http.post<ApplicationDTO>(`/applications/${id}/report-no-show`)),
    respondToInvitation: (id, accept) => data(http.post<ApplicationDTO>(`/applications/${id}/respond-invitation`, { response: accept ? 'accept' : 'decline' })),
  },
  chat: {
    threads: () => data(http.get<ChatThreadDTO[]>('/chat/threads')),
    messages: (threadId, afterId) =>
      data(http.get<ChatMessageDTO[]>(`/chat/threads/${threadId}/messages`, { params: { afterId } })),
    send: (threadId, req) => data(http.post<ChatMessageDTO>(`/chat/threads/${threadId}/messages`, req)),
    markAsRead: (threadId, lastReadId) => data(http.post<void>(`/chat/threads/${threadId}/read`, { lastReadId })),
  },
  reports: {
    list: (page = 0, size = 20) => data(http.get<Page<ReportDTO>>('/reports', { params: { page, size } })),
    get: (id) => data(http.get<ReportDTO>(`/reports/${id}`)),
    create: (req: CreateReportRequest) => data(http.post<ReportDTO>('/reports', req)),
  },
}

export const api: KantoApi = springBootApi