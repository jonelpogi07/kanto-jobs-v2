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

/** Rate type preference for gigsters — displayed without any currency/peso amounts. */
export type RateType = 'hourly' | 'per_gig' | 'both'

export type PaymentMethod = 'CASH' | 'GCASH' | 'MAYA'

export type JobTiming = 'URGENT' | 'SCHEDULED' | 'FLEXIBLE'

export type JobStatus = 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'

export type ApplicationStatus = 'INVITED' | 'PENDING' | 'SCREENING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'

export type ReportStatus = 'PENDING' | 'APPEALED' | 'REFUNDED' | 'RESOLVED' | 'REJECTED'

export type AppealStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type ChatMessageType = 'text' | 'system' | 'report' | 'appeal'

/** A cancellation / no-show report filed against the other party of a gig. */
export interface ReportDTO {
  id: number
  reporterId: number
  targetUserId: number
  jobId: number
  applicationId: number | null
  reason: string
  note?: string
  status: ReportStatus
  /** When the report was filed. */
  reportedAt: string | null
  /** reportedAt + 24 hours for client-reported gigster cancellations / no-shows. */
  appealDeadline: string | null
  appealReason?: string
  appealedAt: string | null
  refunded: boolean
  refundedAt: string | null
}

/** Evidence attached to an appeal (stored as data URLs in the mock layer). */
export interface AppealEvidence {
  id: string
  name: string
  type: string
  size: number
  dataUrl: string
}

export interface AppealDTO {
  id: number
  reportId: number
  appellantId: number
  reason: string
  evidence: AppealEvidence[]
  status: AppealStatus
  createdAt: string
  reviewedAt: string | null
}

/** Lightweight user projection embedded in jobs, applications and reviews. */
export interface UserSummaryDTO {
  id: number
  fullName: string
  firstName: string
  lastName: string
  avatarUrl: string | null
  barangay: string
  city: string
  phoneVerified: boolean
  ratingAverage: number
  ratingCount: number
  completedGigs?: number
  isNegotiable?: boolean
  availableDays?: string[]
  rateType?: RateType
  isBusinessMerchant?: boolean
  merchantBusinessName?: string
  unlimitedGigsterScreening?: boolean
  merchantPartnershipActive?: boolean
}

export interface UserDTO extends UserSummaryDTO {
  email: string | null
  /** @deprecated Backend returns `phone`. Kept for the contact-bar summary type. */
  phoneNumber: string | null
  phone?: string | null
  address?: string
  /** Raw backend avatar field. `avatarUrl` is derived from this in the mapper. */
  profileImage?: string | null
  bio: string
  skills: string[]
  viberNumber?: string | null
  messengerUsername?: string | null
  merchantId?: number | null
  merchantName?: string | null
  completedGigs: number
  gigCoins: number
  createdAt: string
  isNegotiable?: boolean
  availableDays?: string[]
  rateType?: RateType
  isBusinessMerchant?: boolean
  merchantBusinessName?: string
  unlimitedGigsterScreening?: boolean
  merchantPartnershipActive?: boolean
}

/** Only returned by the API once an application has been SCREENING or ACCEPTED. */
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
  /** Computed server-side from the caller's lat/lng query params. */
  distanceKm: number | null
  timing: JobTiming
  scheduledAt: string | null
  estimatedDuration: string | null
  status: JobStatus
  poster: UserSummaryDTO
  applicantCount: number
  acceptedApplicationId: number | null
  images: string[]
  createdAt: string
  updatedAt: string
  isNegotiable?: boolean
  partnerMerchantId?: string
  partnerMerchantName?: string
  isMerchantGig?: boolean
  isCustomerOrderDelivery?: boolean
  merchantId?: number
  merchantName?: string
  merchantBoosted?: boolean
  /** Set when a cancellation/no-show report has been filed on this gig. */
  reportId?: number
  /** When the report was filed (client-reported gigster cancellations / no-shows). */
  reportedAt?: string | null
  /** reportedAt + 24 hours; the appeal window for the reported party. */
  appealDeadline?: string | null
  /** Whether 1 GigCoin was already refunded for this cancellation. */
  gigCoinRefunded?: boolean
  refundedAt?: string | null
  /** Whether the current viewer (poster) already submitted a no-show report for this gig. */
  reportedByMe?: boolean
}

export interface ApplicantDTO extends UserSummaryDTO {
  skills: string[]
  completedGigs?: number
}

export interface ApplicationDTO {
  id: number
  jobId: number
  /** Embedded on "Applied by me" responses so the list can render without extra calls. */
  job: JobPostDTO | null
  applicant: ApplicantDTO
  applicantCompletedGigs?: number
  pitch: string
  status: ApplicationStatus
  /** Applicant contact, visible to the poster when SCREENING or ACCEPTED. */
  applicantContact: ContactInfoDTO | null
  /** Poster contact, visible to the applicant when SCREENING or ACCEPTED. */
  posterContact: ContactInfoDTO | null
  createdAt: string
  /** True when the current viewer (applicant) already submitted a no-show report for this application. */
  reportedByMe?: boolean
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
  posterId: number
  otherUser: UserSummaryDTO
  lastMessage: string | null
  lastMessageAt: string | null
  unreadCount: number
  updatedAt: string
  /** True when the thread carries a cancellation/no-show report or appeal notice. */
  hasReportNotice?: boolean
}

export interface ChatMessageDTO {
  id: number
  threadId: number
  senderId: number
  body: string
  createdAt: string
  /** ISO timestamp when the recipient read the message, or null if unread. */
  readAt: string | null
  /** `text` for ordinary chat messages; `system`/`report`/`appeal` for notification cards. */
  type?: ChatMessageType
  /** Structured payload for system/report/appeal messages (JSON string). */
  data?: string
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
  /** Email address (backend expects email). */
  email: string
  password: string
  /** @deprecated Use email instead. Kept for backward compatibility with mock layer. */
  identifier?: string
}

export interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  barangay?: string
  city?: string
  phoneNumber?: string
  /** @deprecated Use email instead. Kept for backward compatibility with mock layer. */
  identifier?: string
  /** @deprecated Use firstName + lastName instead. Kept for backward compatibility with mock layer. */
  fullName?: string
}

export interface AuthResponse {
  accessToken: string
  tokenType: 'Bearer'
  expiresIn: number
  user: UserDTO
}

/**
 * Body for `PUT /users/me`. Mirrors the backend `UpdateUserRequest` exactly.
 * Every field is optional; the backend only overwrites non-null values.
 * NOTE: `email`, `contact`, `viberNumber` and `messengerUsername` are NOT
 * part of the contract and therefore cannot be changed here.
 */
export interface UpdateUserRequest {
  firstName?: string
  lastName?: string
  phone?: string
  address?: string
  profileImage?: string | null
  bio?: string
  skills?: string[]
  availableDays?: string[]
  rateType?: RateType
  isNegotiable?: boolean
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
  timing: JobTiming
  scheduledAt: string | null
  estimatedDuration: string | null
  images: string[]
  isNegotiable?: boolean
  partnerMerchantId?: string
  partnerMerchantName?: string
  isMerchantGig?: boolean
  isCustomerOrderDelivery?: boolean
  merchantId?: number
  merchantName?: string
  merchantBoosted?: boolean
}

export interface UpdateJobPostRequest {
  title: string
  description: string
  category: JobCategory
  compensationType: CompensationType
  amount: number
  paymentMethods: PaymentMethod[]
  barangay: string
  city: string
  landmark: string
  timing: JobTiming
  scheduledAt: string | null
  estimatedDuration: string | null
  images: string[]
  isNegotiable?: boolean
  partnerMerchantId?: string
  partnerMerchantName?: string
  isMerchantGig?: boolean
  isCustomerOrderDelivery?: boolean
  merchantId?: number
  merchantName?: string
  merchantBoosted?: boolean
}

export interface CreateApplicationRequest {
  pitch: string
}

export interface CreateReviewRequest {
  rating: number
  comment: string
}

export interface CreateReportRequest {
  jobId: number
  applicationId?: number
  reason: string
  note?: string
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
  timing?: JobTiming[]
  compensationTypes?: CompensationType[]
  isNegotiable?: boolean
  isMerchantGig?: boolean
  page?: number
  size?: number
  sort?: string
}

/** A selectable barangay/city with approximate coordinates. */
export interface LocationOption {
  barangay: string
  municipality: string
  city: string
}

export interface NearbyGigsterDTO {
  id: number
  fullName: string
  avatarUrl: string | null
  barangay: string
  city: string
  ratingAverage: number
  ratingCount: number
  completedGigs: number
  phoneVerified: boolean
  skills: string[]
  isNegotiable: boolean
}

export interface SearchNearbyGigstersRequest {
  maxDistanceKm?: number
  category?: JobCategory
}

export interface SearchNearbyGigstersResponse {
  gigsters: NearbyGigsterDTO[]
  count: number
}
