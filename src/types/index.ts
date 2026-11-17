/**
 * DTOs mirroring the Spring Boot REST API. Enum values use the
 * UPPER_SNAKE_CASE that Jackson serializes Java enums to by default.
 * Dates are ISO-8601 strings (LocalDateTime / Instant).
 */

export type JobCategory =
  | 'ERRANDS_DELIVERY'
  | 'HOME_REPAIR'
  | 'CLEANING'
  | 'EVENTS'
  | 'DIGITAL_ADMIN'

export type CompensationType = 'FIXED' | 'HOURLY'

export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA'

export type JobTiming = 'URGENT' | 'SCHEDULED' | 'FLEXIBLE'

export type JobStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type ApplicationStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'

/** Lightweight user projection embedded in jobs, applications and reviews. */
export interface UserSummaryDTO {
  id: number
  fullName: string
  avatarUrl: string | null
  barangay: string
  city: string
  phoneVerified: boolean
  ratingAverage: number
  ratingCount: number
}

export interface UserDTO extends UserSummaryDTO {
  email: string | null
  phoneNumber: string | null
  bio: string
  skills: string[]
  completedGigs: number
  createdAt: string
}

/** Only returned by the API once an application has been ACCEPTED. */
export interface ContactInfoDTO {
  phoneNumber: string
  viberNumber: string | null
  messengerUsername: string | null
}

export interface JobPostDTO {
  id: number
  title: string
  description: string
  category: JobCategory
  compensationType: CompensationType
  /** Pesos. Fixed total or hourly rate depending on compensationType. */
  amount: number
  paymentMethods: PaymentMethod[]
  barangay: string
  city: string
  landmark: string
  latitude: number
  longitude: number
  /** Computed server-side from the caller's lat/lng query params. */
  distanceKm: number | null
  timing: JobTiming
  scheduledAt: string | null
  estimatedDuration: string | null
  status: JobStatus
  poster: UserSummaryDTO
  applicantCount: number
  acceptedApplicationId: number | null
  createdAt: string
  updatedAt: string
}

export interface ApplicantDTO extends UserSummaryDTO {
  skills: string[]
}

export interface ApplicationDTO {
  id: number
  jobId: number
  /** Embedded on "Applied by me" responses so the list can render without extra calls. */
  job: JobPostDTO | null
  applicant: ApplicantDTO
  pitch: string
  status: ApplicationStatus
  /** Applicant contact, visible to the poster when ACCEPTED. */
  applicantContact: ContactInfoDTO | null
  /** Poster contact, visible to the applicant when ACCEPTED. */
  posterContact: ContactInfoDTO | null
  createdAt: string
}

/**
 * A 1:1 live chat between the client (job poster) and a jobseeker
 * (applicant). One thread per application, so `id === applicationId`.
 */
export interface ChatThreadDTO {
  id: number
  jobId: number
  jobTitle: string
  jobStatus: JobStatus
  applicationId: number
  applicationStatus: ApplicationStatus
  otherUser: UserSummaryDTO
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  updatedAt: string
}

export interface ChatMessageDTO {
  id: number
  threadId: number
  senderId: number
  body: string
  createdAt: string
  /** ISO timestamp when the recipient read the message, or null if unread. */
  readAt: string | null
}

export interface ReviewDTO {
  id: number
  jobId: number
  reviewer: UserSummaryDTO
  revieweeId: number
  rating: number
  comment: string
  createdAt: string
}

/** Shape of org.springframework.data.domain.Page<T> serialized by Jackson. */
export interface Page<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
  first: boolean
  last: boolean
  numberOfElements: number
  empty: boolean
}

/** Default Spring Boot error body. */
export interface ApiErrorDTO {
  timestamp: string
  status: number
  error: string
  message: string
  path: string
}

// ---------- Requests ----------

export interface LoginRequest {
  /** Mobile number (09XXXXXXXXX) or email. */
  identifier: string
  password: string
}

export interface RegisterRequest {
  fullName: string
  identifier: string
  password: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: UserDTO
}

export interface UpdateUserRequest {
  fullName: string
  barangay: string
  city: string
  bio: string
  skills: string[]
  avatarUrl: string | null
}

export interface CreateJobPostRequest {
  title: string
  description: string
  category: JobCategory
  compensationType: CompensationType
  amount: number
  paymentMethods: PaymentMethod[]
  barangay: string
  city: string
  landmark: string
  latitude: number
  longitude: number
  timing: JobTiming
  scheduledAt: string | null
  estimatedDuration: string | null
}

export interface CreateApplicationRequest {
  pitch: string
}

export interface CreateReviewRequest {
  rating: number
  comment: string
}

export interface SendMessageRequest {
  body: string
}

export interface JobSearchParams {
  q?: string
  category?: JobCategory
  lat?: number
  lng?: number
  maxDistanceKm?: number
  minPay?: number
  page?: number
  size?: number
  sort?: string
}

/** A selectable barangay/city with approximate coordinates. */
export interface LocationOption {
  barangay: string
  city: string
  latitude: number
  longitude: number
}
