import type {
  ApplicationDTO,
  AppealDTO,
  AppealEvidence,
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
  SearchNearbyGigstersRequest,
  SearchNearbyGigstersResponse,
  SendMessageRequest,
  UpdateJobPostRequest,
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
  }
  users: {
    /** GET /users/me */
    me(): Promise<UserDTO>
    updateGigCoins(delta: number): Promise<UserDTO>
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
    /** PUT /jobs/{id}  (poster only) */
    update(id: number, req: UpdateJobPostRequest): Promise<JobPostDTO>
    /** GET /jobs/mine */
    mine(page?: number, size?: number): Promise<Page<JobPostDTO>>
    /** POST /jobs/{id}/complete */
    complete(id: number): Promise<JobPostDTO>
    /** GET /jobs/{id}/applications  (poster only) */
    applications(jobId: number): Promise<ApplicationDTO[]>
    /** POST /jobs/{id}/applications */
    apply(jobId: number, req: CreateApplicationRequest): Promise<ApplicationDTO>
    /** POST /jobs/{id}/invite-gigster */
    inviteGigsterToGig(gigId: number, gigster: { id: number; name: string; avatarInitials?: string; rating?: number; completedGigs?: number; barangay?: string; skills?: string[]; bio?: string; phone?: string }): Promise<ApplicationDTO>
    /** POST /jobs/{id}/reviews */
    review(jobId: number, req: CreateReviewRequest): Promise<ReviewDTO>
    /** POST /jobs/{id}/cancel */
    cancel(id: number): Promise<JobPostDTO>
    /** POST /jobs/{id}/report-no-show */
    reportNoShow(id: number, req: { reason: string; note?: string }): Promise<JobPostDTO>
    /** POST /jobs/search-nearby-gigsters */
    searchNearbyGigsters(req: SearchNearbyGigstersRequest): Promise<SearchNearbyGigstersResponse>
  }
  /** POST /reports/{reportId}/appeal */
  appeals: {
    submit(reportId: number, req: { reason: string; evidence: AppealEvidence[] }): Promise<AppealDTO>
  }
  applications: {
    /** GET /applications/mine */
    mine(page?: number, size?: number): Promise<Page<ApplicationDTO>>
    /** POST /applications/{id}/screen — unlocks chat & contact details. */
    screen(id: number): Promise<ApplicationDTO>
    /** POST /applications/{id}/accept */
    accept(id: number): Promise<ApplicationDTO>
    /** POST /applications/{id}/decline */
    decline(id: number): Promise<ApplicationDTO>
    /** POST /applications/{id}/cancel (applicant cancels their own application) */
    cancel(id: number): Promise<ApplicationDTO>
    /** POST /applications/{id}/report-no-show */
    reportNoShow(id: number, req: { reason: string; note?: string }): Promise<ApplicationDTO>
    /** POST /applications/{id}/respond-invitation */
    respondToInvitation(id: number, accept: boolean): Promise<ApplicationDTO>
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
