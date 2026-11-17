import type {
  ApplicationDTO,
  AuthResponse,
  ChatMessageDTO,
  ChatThreadDTO,
  CreateApplicationRequest,
  CreateJobPostRequest,
  CreateReviewRequest,
  JobPostDTO,
  JobSearchParams,
  LoginRequest,
  Page,
  RegisterRequest,
  ReviewDTO,
  SendMessageRequest,
  UpdateUserRequest,
  UserDTO,
} from '@/types'

/**
 * Every backend call the UI makes. Both the mock implementation and the
 * Axios (Spring Boot) implementation satisfy this interface, so swapping
 * them is a one-line change in `api.ts`.
 */
export interface KantoApi {
  auth: {
    /** POST /auth/login */
    login(req: LoginRequest): Promise<AuthResponse>
    /** POST /auth/register */
    register(req: RegisterRequest): Promise<AuthResponse>
    /** POST /auth/google  — body: { idToken } */
    loginWithGoogle(idToken: string): Promise<AuthResponse>
  }
  users: {
    /** GET /users/me */
    me(): Promise<UserDTO>
    /** PUT /users/me */
    updateMe(req: UpdateUserRequest): Promise<UserDTO>
    /** GET /users/{id} */
    getById(id: number): Promise<UserDTO>
    /** GET /users/{id}/reviews */
    reviews(id: number, page?: number, size?: number): Promise<Page<ReviewDTO>>
  }
  jobs: {
    /** GET /jobs?q=&category=&lat=&lng=&maxDistanceKm=&minPay=&page=&size=&sort= */
    search(params: JobSearchParams): Promise<Page<JobPostDTO>>
    /** GET /jobs/{id}?lat=&lng= */
    getById(id: number, coords?: { lat: number; lng: number }): Promise<JobPostDTO>
    /** POST /jobs */
    create(req: CreateJobPostRequest): Promise<JobPostDTO>
    /** GET /jobs/mine */
    mine(page?: number, size?: number): Promise<Page<JobPostDTO>>
    /** POST /jobs/{id}/complete */
    complete(id: number): Promise<JobPostDTO>
    /** GET /jobs/{id}/applications  (poster only) */
    applications(jobId: number): Promise<ApplicationDTO[]>
    /** POST /jobs/{id}/applications */
    apply(jobId: number, req: CreateApplicationRequest): Promise<ApplicationDTO>
    /** POST /jobs/{id}/reviews */
    review(jobId: number, req: CreateReviewRequest): Promise<ReviewDTO>
    /** POST /jobs/{id}/cancel */
    cancel(id: number): Promise<JobPostDTO>
  }
  applications: {
    /** GET /applications/mine */
    mine(page?: number, size?: number): Promise<Page<ApplicationDTO>>
    /** POST /applications/{id}/accept */
    accept(id: number): Promise<ApplicationDTO>
    /** POST /applications/{id}/decline */
    decline(id: number): Promise<ApplicationDTO>
    /** POST /applications/{id}/cancel (applicant cancels their own application) */
    cancel(id: number): Promise<ApplicationDTO>
  }
  chat: {
    /** GET /chat/threads — conversations the caller is part of. */
    threads(): Promise<ChatThreadDTO[]>
    /** GET /chat/threads/{id}/messages?afterId= — also marks the thread as read. */
    messages(threadId: number, afterId?: number): Promise<ChatMessageDTO[]>
    /** POST /chat/threads/{id}/messages */
    send(threadId: number, req: SendMessageRequest): Promise<ChatMessageDTO>
  }
}
