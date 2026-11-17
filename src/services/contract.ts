import type {
  ApplicationDTO,
  AuthResponse,
  CreateApplicationRequest,
  CreateJobPostRequest,
  CreateReviewRequest,
  JobPostDTO,
  JobSearchParams,
  LoginRequest,
  Page,
  RegisterRequest,
  ReviewDTO,
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
  }
  applications: {
    /** GET /applications/mine */
    mine(page?: number, size?: number): Promise<Page<ApplicationDTO>>
    /** POST /applications/{id}/accept */
    accept(id: number): Promise<ApplicationDTO>
  }
}
