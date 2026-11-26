import type { KantoApi } from '@/services/contract'
import { ApiError, tokenStorage } from '@/services/token'
import type {
  ApplicantDTO,
  ApplicationDTO,
  AppealEvidence,
  AppealStatus,
  AuthResponse,
  ChatMessageDTO,
  ChatMessageType,
  ChatThreadDTO,
  JobPostDTO,
  NearbyGigsterDTO,
  Page,
  ReportStatus,
  ReviewDTO,
  SearchNearbyGigstersRequest,
  UserDTO,
  UserSummaryDTO,
} from '@/types'
import {
  LOCATIONS,
  SEED_APPLICATIONS,
  SEED_JOBS,
  SEED_MESSAGES,
  SEED_REVIEWS,
  SEED_USERS,
  type SeedApplication,
  type SeedMessage,
  type SeedReview,
  type SeedUser,
} from './data'
import { MOCK_GIGSTERS, type MockGigster } from './gigsters'

/** Stored job shape: the DTO minus server-computed fields. */
type JobRecord = Omit<JobPostDTO, 'poster' | 'applicantCount' | 'acceptedApplicationId' | 'distanceKm'> & {
  posterId: number
}

interface MockDb {
  users: SeedUser[]
  jobs: JobRecord[]
  applications: SeedApplication[]
  reviews: SeedReview[]
  messages: SeedMessage[]
  reports: {
    id: number
    reporterId: number
    targetUserId: number
    jobId: number
    applicationId: number | null
    reason: string
    note?: string
    status: ReportStatus
    reportedAt: string | null
    appealDeadline: string | null
    appealReason?: string
    appealedAt: string | null
    refunded: boolean
    refundedAt: string | null
  }[]
  appeals: {
    id: number
    reportId: number
    appellantId: number
    reason: string
    evidence: AppealEvidence[]
    status: AppealStatus
    createdAt: string
    reviewedAt: string | null
  }[]
}

const DB_KEY = 'kanto-jobs:mock-db:v3'

function seed(): MockDb {
  return {
    users: structuredClone(SEED_USERS),
    jobs: SEED_JOBS.map(({ location, ...job }) => {
      const loc = LOCATIONS[location] ?? LOCATIONS[0]
      return {
        ...job,
        barangay: loc.barangay,
        city: loc.city,
        latitude: loc.latitude,
        longitude: loc.longitude,
        updatedAt: job.createdAt,
      }
    }),
    applications: structuredClone(SEED_APPLICATIONS),
    reviews: structuredClone(SEED_REVIEWS),
    messages: structuredClone(SEED_MESSAGES),
    reports: [],
    appeals: [],
  }
}

function load(): MockDb {
  const raw = localStorage.getItem(DB_KEY)
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as MockDb
       parsed.users = parsed.users.map((u: any) => ({ ...u, gigCoins: u.gigCoins ?? 2 }))
       // Auto-migrate newly seeded gigsters into existing sessions
       for (const seeded of SEED_USERS) {
         if (!parsed.users.some((u: any) => u.id === seeded.id)) {
           parsed.users.push(structuredClone(seeded))
         }
       }
       const acceptedIds = new Set(
        parsed.applications.filter((a) => a.status === 'ACCEPTED' || a.status === 'SCREENING').map((a) => a.id),
       )
       parsed.messages = (parsed.messages ?? []).filter((m) => {
        const type = (m as any).__type as ChatMessageType | undefined
        return acceptedIds.has(m.applicationId) || type === 'report' || type === 'appeal' || type === 'system'
       })
       parsed.reports = (parsed.reports ?? []).map((r: any) => ({
         ...r,
         status: r.status ?? 'PENDING',
         reportedAt: r.reportedAt ?? null,
         appealDeadline: r.appealDeadline ?? null,
         appealReason: r.appealReason ?? undefined,
         appealedAt: r.appealedAt ?? null,
         refunded: r.refunded ?? false,
         refundedAt: r.refundedAt ?? null,
       }))
       parsed.appeals = parsed.appeals ?? []
       return parsed
    } catch {
      localStorage.removeItem(DB_KEY)
    }
  }
  const fresh = seed()
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(fresh))
  } catch {
    // ignore
  }
  return fresh
}

let db = load()

function save() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db))
  } catch {
    // storage full; ignore
  }
}

export function resetMockDb() {
  db = seed()
  // Run any auto-refunds for reports left pending in a previous session.
  evaluateGigCoinRefunds()
  save()
}

const delay = (ms = 250 + Math.random() * 250) => new Promise((r) => setTimeout(r, ms))
const nextId = (rows: { id: number }[]) => rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
const now = () => new Date().toISOString()
const MS_24H = 24 * 60 * 60 * 1000

function appealDeadlineFor(reportedAt: string) {
  return new Date(new Date(reportedAt).getTime() + MS_24H).toISOString()
}

/** Posts a system/report/appeal notification message into a chat thread. */
function postSystemMessage(
  applicationId: number | null,
  body: string,
  type: ChatMessageType,
  data: Record<string, unknown>,
) {
  if (!applicationId) return
  const message: SeedMessage = {
    id: nextId(db.messages),
    applicationId,
    senderId: 0,
    body,
    createdAt: now(),
    readAt: null,
  }
  db.messages.push(message)
  const dto: ChatMessageDTO = {
    ...toChatMessageDTO(message),
    type,
    data: JSON.stringify(data),
  }
  // Persist the extended shape on the raw message so it survives reloads.
  ;(message as any).__type = type
  ;(message as any).__data = dto.data
  save()

  // Dispatch custom event for immediate UI sync across components/tabs
  if (type === 'report' || type === 'appeal' || type === 'system') {
    try {
      window.dispatchEvent(new CustomEvent('kanto:chat-update', { detail: { applicationId, type } }))
    } catch {
      // Ignore dispatch errors (e.g., during SSR)
    }
  }
}

function toChatMessageDTO(message: SeedMessage): ChatMessageDTO {
  return {
    id: message.id,
    threadId: message.applicationId,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt,
    readAt: message.readAt,
    type: (message as any).__type as ChatMessageType | undefined,
    data: (message as any).__data as string | undefined,
  }
}

/**
 * Auto-refund helper: for pending client-reported gigster cancellations / no-shows
 * whose 24-hour appeal window has elapsed with no appeal filed, refund 1 GigCoin
 * to the client (reporter) and mark the report as refunded.
 */
export function evaluateGigCoinRefunds(): { refunded: number; evaluated: number } {
  let refunded = 0
  let evaluated = 0
  const nowTs = Date.now()
  for (const report of db.reports) {
    if (report.status !== 'PENDING' || !report.reportedAt || !report.appealDeadline) continue
    evaluated++
    if (new Date(report.appealDeadline).getTime() >= nowTs) continue
    if (db.appeals.some((a) => a.reportId === report.id)) continue
    const job = db.jobs.find((j) => j.id === report.jobId)
    if (!job || job.posterId !== report.reporterId) continue
    const user = db.users.find((u) => u.id === report.reporterId)
    if (user) {
      user.gigCoins = Math.max(0, (user.gigCoins ?? 2)) + 1
      refunded++
    }
    report.status = 'REFUNDED'
    report.refundedAt = now()
    postSystemMessage(
      report.applicationId,
      '1 GigCoin has been refunded to your balance. No appeal was filed within the 24-hour window.',
      'system',
      { reportId: report.id, jobId: report.jobId, refunded: true },
    )
  }
  if (refunded || evaluated) save()
  return { refunded, evaluated }
}

/** Test helper: backdate pending report(s) so their 24-hour window appears elapsed, then evaluate refunds. */
export function simulate24hElapsed(reportId?: number): { refunded: number; evaluated: number } {
  const backdated = new Date(Date.now() - MS_24H - 60_000).toISOString()
  for (const report of db.reports) {
    if (report.status !== 'PENDING') continue
    if (reportId != null && report.id !== reportId) continue
    report.reportedAt = backdated
    report.appealDeadline = new Date(new Date(backdated).getTime() - MS_24H).toISOString()
  }
  if (reportId != null && !db.reports.some((r) => r.id === reportId)) {
    throw new ApiError(404, 'Report not found.')
  }
  return evaluateGigCoinRefunds()
}

// ---------- Auth helpers ----------

const tokenFor = (userId: number) => `mock-jwt.${userId}.${Date.now()}`

function currentUserId(): number {
  const token = tokenStorage.get()
  const id = token?.startsWith('mock-jwt.') ? Number(token.split('.')[1]) : NaN
  if (!Number.isFinite(id) || !db.users.some((u) => u.id === id)) {
    throw new ApiError(401, 'Please log in to continue.')
  }
  return id
}

function findUser(id: number): SeedUser {
  const user = db.users.find((u) => u.id === id)
  if (!user) throw new ApiError(404, 'User not found.')
  return user
}

function toUserDTO(user: SeedUser): UserDTO {
  const { password: _password, contact: _contact, rateType, ...dto } = user
  return structuredClone({ ...dto, rateType })
}

function toSummary(user: SeedUser): UserSummaryDTO {
  return {
    id: user.id,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    barangay: user.barangay,
    city: user.city,
    phoneVerified: user.phoneVerified,
    ratingAverage: user.ratingAverage,
    ratingCount: user.ratingCount,
    completedGigs: user.completedGigs,
    isNegotiable: user.isNegotiable,
  }
}

function toApplicant(user: SeedUser): ApplicantDTO {
  return { ...toSummary(user), skills: [...user.skills], completedGigs: user.completedGigs }
}

function authResponse(user: SeedUser): AuthResponse {
  return { accessToken: tokenFor(user.id), tokenType: 'Bearer', expiresIn: 86_400, user: toUserDTO(user) }
}

// ---------- Mapping helpers ----------

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function toJobDTO(job: JobRecord, coords?: { lat: number; lng: number }, viewerId?: number): JobPostDTO {
  const { posterId, ...rest } = job
  const apps = db.applications.filter((a) => a.jobId === job.id && a.status !== 'CANCELLED')
  const poster = findUser(posterId)
  // Derive merchant fields from the poster when not explicitly set on the gig,
  // so gigs authored by an active business merchant always carry a merchant badge.
  const isMerchantGig = rest.isMerchantGig ?? (poster.isBusinessMerchant && poster.merchantPartnershipActive === true)
  const merchantId = rest.merchantId ?? (isMerchantGig ? posterId : undefined)
  const merchantName = rest.merchantName ?? (isMerchantGig ? (poster.merchantBusinessName ?? poster.fullName) : undefined)
  const merchantBoosted = rest.merchantBoosted ?? (isMerchantGig && poster.isBusinessMerchant ? true : false)
  const reportedByMe = viewerId != null && db.reports.some((r) => r.jobId === job.id && r.reporterId === viewerId)
  return {
    ...structuredClone(rest),
    images: rest.images ?? [],
    poster: toSummary(poster),
    isMerchantGig,
    merchantId,
    merchantName,
    merchantBoosted,
    applicantCount: apps.length,
    acceptedApplicationId: apps.find((a) => a.status === 'ACCEPTED')?.id ?? null,
    distanceKm: coords
      ? Math.round(haversineKm(coords.lat, coords.lng, job.latitude, job.longitude) * 10) / 10
      : null,
    reportedByMe,
  }
}

function findJob(id: number): JobRecord {
  const job = db.jobs.find((j) => j.id === id)
  if (!job) throw new ApiError(404, 'Job not found.')
  return job
}

function findJobOrNull(id: number): JobRecord | undefined {
  return db.jobs.find((j) => j.id === id)
}

function toApplicationDTO(app: SeedApplication, viewerId: number, embedJob: boolean): ApplicationDTO {
  const job = findJob(app.jobId)
  const applicant = findUser(app.applicantId)
  const poster = findUser(job.posterId)
  const contactUnlocked = app.status === 'SCREENING' || app.status === 'ACCEPTED'
  const reportedByMe = db.reports.some((r) => r.applicationId === app.id && r.reporterId === viewerId)
  return {
    id: app.id,
    jobId: app.jobId,
    job: embedJob ? toJobDTO(job) : null,
    applicant: toApplicant(applicant),
    applicantCompletedGigs: applicant.completedGigs ?? 0,
    pitch: app.pitch,
    status: app.status,
    applicantContact: app.status === 'ACCEPTED' && viewerId === job.posterId ? { ...applicant.contact } : null,
    posterContact: contactUnlocked && viewerId === app.applicantId ? { ...poster.contact } : null,
    createdAt: app.createdAt,
    reportedByMe,
  }
}

function toReviewDTO(review: SeedReview): ReviewDTO {
  return {
    id: review.id,
    jobId: review.jobId,
    reviewer: toSummary(findUser(review.reviewerId)),
    revieweeId: review.revieweeId,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt,
  }
}

function findApplication(id: number): SeedApplication {
  const app = db.applications.find((a) => a.id === id)
  if (!app) throw new ApiError(404, 'Conversation not found.')
  return app
}

function assertChatParticipant(app: SeedApplication, userId: number) {
  const job = findJob(app.jobId)
  if (app.applicantId !== userId && job.posterId !== userId) {
    throw new ApiError(403, 'You are not part of this conversation.')
  }
}

function messagesFor(threadId: number): SeedMessage[] {
  if (threadId < 0) {
    const reportId = Math.abs(threadId)
    return db.messages
      .filter((m) => {
        const type = (m as any).__type
        if (type !== 'report' && type !== 'appeal' && type !== 'system') return false
        try {
          const data = JSON.parse((m as any).__data ?? '{}')
          return Number(data.reportId) === reportId
        } catch {
          return false
        }
      })
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  }
  return db.messages
    .filter((m) => {
      const type = (m as any).__type
      if (type === 'report' || type === 'appeal') return false
      return m.applicationId === threadId
    })
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function toChatThread(app: SeedApplication, viewerId: number): ChatThreadDTO {
  const job = findJob(app.jobId)
  const otherId = app.applicantId === viewerId ? job.posterId : app.applicantId
  const messages = messagesFor(app.id)
  const last = messages[messages.length - 1] ?? null
  const activity = last?.createdAt ?? app.createdAt
  return {
    id: app.id,
    jobId: job.id,
    jobTitle: job.title,
    jobStatus: job.status,
    applicationId: app.id,
    applicationStatus: app.status,
    posterId: job.posterId,
    otherUser: toSummary(findUser(otherId)),
    lastMessage: last?.body ?? null,
    lastMessageAt: last?.createdAt ?? null,
    unreadCount: messages.filter((m) => m.senderId !== viewerId && m.readAt == null).length,
    updatedAt: activity,
    hasReportNotice: messages.some((m) => {
      const type = (m as any).__type as ChatMessageType | undefined
      return type === 'report' || type === 'appeal' || type === 'system'
    }),
  }
}

function paginate<T>(items: T[], page = 0, size = 20): Page<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / size))
  const content = items.slice(page * size, page * size + size)
  return {
    content,
    totalElements: items.length,
    totalPages,
    number: page,
    size,
    first: page === 0,
    last: page >= totalPages - 1,
    numberOfElements: content.length,
    empty: content.length === 0,
  }
}

const byNewest = <T extends { createdAt: string }>(a: T, b: T) => b.createdAt.localeCompare(a.createdAt)

function dummyPitch(job: JobRecord, user: SeedUser): string {
  const first = user.fullName.split(' ')[0]
  const byCategory: Record<string, string[]> = {
    ERRANDS_DELIVERY: [
      `Hi! Available po ako for this. May sarili akong motor at mabilis po ako mag-deliver sa ${job.barangay}.`,
      `Pwede po ako tumulong. Malapit lang ako at maaasahan, ${first} here — kaya ko pong tapusin agad.`,
      `Good day! Sanay po ako sa errands at deliveries nearby. Ready po ako umalis anytime.`,
    ],
    HOME_REPAIR: [
      `Kaya ko po itong ayusin. May dala akong sariling tools at may experience na po ako sa ganitong trabaho.`,
      `Hello! ${first} po, marunong po ako sa home repairs. Pwede ko pong tingnan at ayusin agad.`,
      `Available po ako. Maingat po ako magtrabaho at sisiguraduhin kong maayos ang resulta.`,
    ],
    CLEANING: [
      `Hi! Masipag at malinis po ako magtrabaho. Available po ako sa schedule niyo.`,
      `Pwede po akong tumulong maglinis. Detalyado po ako at may experience na sa ganitong gawain.`,
      `Hello! ${first} po — ready po akong mag-deep clean at dalhin ang kailangan ko.`,
    ],
    EVENTS: [
      `Hi! Masayahin at energetic po ako, perfect for events. Pwede po akong tumulong sa setup at coordination.`,
      `Available po ako! May experience po ako sa events at siguradong maganda ang kakalabasan.`,
      `Hello! ${first} po — kaya ko pong mag-assist para maging maayos at masaya ang event.`,
    ],
    DIGITAL_ADMIN: [
      `Hi! Mabilis at accurate po ako sa computer tasks. Pwede ko pong simulan agad.`,
      `Available po ako for this. Marunong po ako sa online/admin work at maaasahan sa deadlines.`,
      `Hello! ${first} po — detail-oriented at kaya ko pong tapusin nang maayos.`,
    ],
  }
  const pool = byCategory[job.category] ?? [
    `Hi! Interested po ako sa gig na ito. Available po ako at gagawin ko nang maayos.`,
  ]
  return pool[Math.floor(Math.random() * pool.length)]
}

function seedDummyApplicants(job: JobRecord) {
  const candidates = db.users.filter((u) => u.id !== job.posterId)
  if (candidates.length === 0) return
  const count = Math.min(candidates.length, 2 + Math.floor(Math.random() * 3))
  const picked = [...candidates].sort(() => Math.random() - 0.5).slice(0, count)
  let id = nextId(db.applications)
  const base = Date.now()
  picked.forEach((user, i) => {
    db.applications.push({
      id: id++,
      jobId: job.id,
      applicantId: user.id,
      pitch: dummyPitch(job, user),
      status: 'PENDING',
      createdAt: new Date(base - (picked.length - i) * 60_000).toISOString(),
    })
  })
}

// ---------- Mock API ----------

export const mockApi: KantoApi = {
  auth: {
    async login({ identifier, password }) {
      await delay()
      const id = identifier.trim().toLowerCase()
      const user = db.users.find((u) => u.email?.toLowerCase() === id || u.phoneNumber === id)
      if (!user || user.password !== password) {
        throw new ApiError(401, 'Incorrect mobile number/email or password.')
      }
      return authResponse(user)
    },
    async register({ fullName, identifier, password }) {
      await delay()
      const id = identifier.trim()
      const isEmail = id.includes('@')
      if (db.users.some((u) => u.email?.toLowerCase() === id.toLowerCase() || u.phoneNumber === id)) {
        throw new ApiError(409, 'An account with that mobile number or email already exists.')
      }
      const home = LOCATIONS[0]
      const user: SeedUser = {
        id: nextId(db.users),
        fullName: fullName.trim(),
        avatarUrl: null,
        barangay: home.barangay,
        city: home.city,
        phoneVerified: false,
        ratingAverage: 0,
        ratingCount: 0,
        email: isEmail ? id : null,
        phoneNumber: isEmail ? null : id,
        bio: '',
        skills: [],
        completedGigs: 0,
        gigCoins: 2,
        createdAt: now(),
        password,
        rateType: 'both',
        contact: { phoneNumber: isEmail ? '' : id, viberNumber: null, messengerUsername: null },
      }
      db.users.push(user)
      save()
      return authResponse(user)
    },
  },

  users: {
    async me() {
      await delay(120)
      return toUserDTO(findUser(currentUserId()))
    },
    async updateGigCoins(delta: number) {
      await delay(120)
      const user = findUser(currentUserId())
      user.gigCoins = Math.max(0, (user.gigCoins ?? 2) + delta)
      save()
      return toUserDTO(user)
    },
    async updateMe(req) {
      await delay()
      const user = findUser(currentUserId())
      Object.assign(user, {
        fullName: req.fullName.trim(),
        barangay: req.barangay,
        city: req.city,
        bio: req.bio.trim(),
        skills: req.skills,
        avatarUrl: req.avatarUrl,
        isNegotiable: req.isNegotiable,
      })
      if (req.rateType) user.rateType = req.rateType
      save()
      return toUserDTO(user)
    },
    async getById(id) {
      await delay(150)
      return toUserDTO(findUser(id))
    },
    async reviews(id, page, size) {
      await delay(150)
      return paginate(
        db.reviews.filter((r) => r.revieweeId === id).sort(byNewest).map(toReviewDTO),
        page,
        size,
      )
    },
  },

  jobs: {
    async search({ q, category, lat, lng, maxDistanceKm, minPay, timing, compensationTypes, isNegotiable, isMerchantGig, page, size }) {
      await delay()
      const coords = lat != null && lng != null ? { lat, lng } : undefined
      const needle = q?.trim().toLowerCase()
      const timings = Array.isArray(timing) ? timing : timing ? [timing] : []
      const compTypes = Array.isArray(compensationTypes) ? compensationTypes : compensationTypes ? [compensationTypes] : []
      const results = db.jobs
        .filter((j) => j.status === 'OPEN')
        .filter((j) => !category || j.category === category)
        .filter((j) => minPay == null || j.amount >= minPay)
        .filter((j) => timings.length === 0 || timings.includes(j.timing))
        .filter((j) => compTypes.length === 0 || compTypes.includes(j.compensationType))
        .filter((j) => !isNegotiable || j.isNegotiable === true)
.filter((j) => !isMerchantGig || j.partnerMerchantId || j.partnerMerchantName || j.merchantId || j.merchantName)
        .filter(
          (j) =>
            !needle ||
            [j.title, j.description, j.barangay, j.city, j.landmark].some((f) => f.toLowerCase().includes(needle)),
        )
        .map((j) => toJobDTO(j, coords))
        .filter((j) => maxDistanceKm == null || j.distanceKm == null || j.distanceKm <= maxDistanceKm)
        .sort((a, b) => {
           // Prioritize partner merchant gigs to the top of the feed
           const boostedScore = (j: JobPostDTO) => (j.partnerMerchantId || j.partnerMerchantName || j.merchantId || j.merchantName ? 1 : 0)
          const boostDiff = boostedScore(b) - boostedScore(a)
          if (boostDiff !== 0) return boostDiff
          const urgency = Number(b.timing === 'URGENT') - Number(a.timing === 'URGENT')
          return urgency || (a.distanceKm ?? 0) - (b.distanceKm ?? 0) || byNewest(a, b)
        })
      return paginate(results, page, size)
    },
    async getById(id, coords) {
      await delay(150)
      return toJobDTO(findJob(id), coords)
    },
    async create(req) {
      await delay()
      const posterId = currentUserId()
      const poster = findUser(posterId)
      const isMerchantGig = req.isMerchantGig ?? false
      const isCustomerOrderDelivery = req.isCustomerOrderDelivery ?? false
      const merchantId = req.merchantId ?? (isMerchantGig ? posterId : undefined)
      const merchantName = req.merchantName ?? (isMerchantGig ? poster.merchantBusinessName ?? undefined : undefined)
      const merchantBoosted = req.merchantBoosted ?? (isMerchantGig && poster.isBusinessMerchant ? true : false)
      const job: JobRecord = {
        ...req,
        images: req.images ?? [],
        id: nextId(db.jobs),
        posterId,
        status: 'OPEN',
        createdAt: now(),
        updatedAt: now(),
        isMerchantGig,
        isCustomerOrderDelivery,
        merchantId,
        merchantName,
        merchantBoosted,
      }
      db.jobs.push(job)
      seedDummyApplicants(job)
      save()
      return toJobDTO(job)
    },
    async update(id, req) {
      await delay()
      const userId = currentUserId()
      const job = findJob(id)
      if (job.posterId !== userId) throw new ApiError(403, 'Only the poster can update this gig.')
      if (job.status !== 'OPEN') throw new ApiError(409, 'Only open gigs can be updated.')
      Object.assign(job, {
        title: req.title.trim(),
        description: req.description.trim(),
        category: req.category,
        compensationType: req.compensationType,
        amount: req.amount,
        paymentMethods: req.paymentMethods,
        barangay: req.barangay,
        city: req.city,
        landmark: req.landmark.trim(),
        latitude: req.latitude,
        longitude: req.longitude,
        timing: req.timing,
        scheduledAt: req.timing === 'SCHEDULED' ? req.scheduledAt : null,
        estimatedDuration: req.estimatedDuration?.trim() || null,
        images: req.images ?? [],
        isNegotiable: req.isNegotiable,
        updatedAt: now(),
      })
      save()
      return toJobDTO(job)
    },
    async mine(page, size) {
      await delay(150)
      const userId = currentUserId()
      return paginate(
        db.jobs
          .filter((j) => j.posterId === userId)
          .sort(byNewest)
          .map((j) => toJobDTO(j, undefined, userId)),
        page,
        size,
      )
    },
    async complete(id) {
      await delay()
      const userId = currentUserId()
      const job = findJob(id)
      if (job.posterId !== userId) throw new ApiError(403, 'Only the poster can complete this job.')
      if (job.status !== 'IN_PROGRESS') throw new ApiError(409, 'Only in-progress jobs can be completed.')
      job.status = 'COMPLETED'
      job.updatedAt = now()
      const accepted = db.applications.find((a) => a.jobId === id && a.status === 'ACCEPTED')
      if (accepted) findUser(accepted.applicantId).completedGigs += 1
      save()
      return toJobDTO(job)
    },
    async cancel(id) {
      await delay()
      const userId = currentUserId()
      const job = findJob(id)
      if (job.posterId !== userId) throw new ApiError(403, 'Only the poster can cancel this job.')
      if (job.status === 'COMPLETED' || job.status === 'CANCELLED') {
        throw new ApiError(409, 'This job is already finished.')
      }
      // GigCoin refund: gigs with zero applicants refund 1 GigCoin immediately.
      // Gigs with applicants are not refunded here; refunds for reported gigster
      // cancellations follow the 24-hour appeal window instead.
      const hasApplicants = db.applications.some((a) => a.jobId === id && a.status !== 'CANCELLED')
      job.status = 'CANCELLED'
      job.updatedAt = now()
      // Cancel accepted applications and reject pending/screening/invited ones
      for (const app of db.applications) {
        if (app.jobId !== id) continue
        if (app.status === 'ACCEPTED') app.status = 'CANCELLED'
        else if (app.status === 'PENDING' || app.status === 'SCREENING' || app.status === 'INVITED') app.status = 'REJECTED'
      }
      if (!hasApplicants) {
        const poster = db.users.find((u) => u.id === userId)
        if (poster) poster.gigCoins = Math.max(0, (poster.gigCoins ?? 2)) + 1
        job.gigCoinRefunded = true
        job.refundedAt = now()
      }
      save()
      return toJobDTO(job)
    },
      async reportNoShow(id, { reason, note }) {
        await delay()
        const userId = currentUserId()
        const job = findJob(id)
        if (job.posterId !== userId) throw new ApiError(403, 'Only the poster can report.')
        const accepted = db.applications.find((a) => a.jobId === id && a.status === 'ACCEPTED')
        const reportedAt = now()
        job.status = 'CANCELLED'
        job.updatedAt = now()
        job.reportId = db.reports.length + 1
        job.reportedAt = reportedAt
        job.appealDeadline = appealDeadlineFor(reportedAt)
        for (const app of db.applications) {
          if (app.jobId !== id) continue
          if (app.status === 'ACCEPTED') app.status = 'CANCELLED'
          else if (app.status === 'PENDING' || app.status === 'SCREENING' || app.status === 'INVITED') app.status = 'REJECTED'
        }
        if (accepted) {
          const report = {
            id: nextId(db.reports),
            reporterId: userId,
            targetUserId: accepted.applicantId,
            jobId: id,
            applicationId: accepted.id,
            reason,
            note,
            status: 'PENDING' as ReportStatus,
            reportedAt,
            appealDeadline: job.appealDeadline,
            appealedAt: null,
            refunded: false,
            refundedAt: null,
          }
          db.reports.push(report)
          job.reportId = report.id
          postSystemMessage(
            accepted.id,
            `Report filed: ${reason}. The reported gigster has 24 hours to appeal.`,
            'report',
            {
              reportId: report.id,
              jobId: id,
              jobTitle: job.title,
              reporterId: userId,
              targetUserId: accepted.applicantId,
              reporterRole: 'Client',
              status: 'PENDING',
              appealDeadline: job.appealDeadline,
              reason,
              note,
            },
          )
        }
        save()
        return toJobDTO(job)
      },
      async applications(jobId) {
        await delay(150)
        const userId = currentUserId()
        if (findJob(jobId).posterId !== userId) throw new ApiError(403, 'Only the poster can view applicants.')
        return db.applications
          .filter((a) => a.jobId === jobId)
          .sort(byNewest)
          .map((a) => toApplicationDTO(a, userId, false))
      },
    async apply(jobId, { pitch }) {
      await delay()
      const userId = currentUserId()
      const job = findJob(jobId)
      if (job.posterId === userId) throw new ApiError(400, "You can't apply to your own gig.")
      if (job.status !== 'OPEN') throw new ApiError(409, 'This gig is no longer accepting applicants.')
      if (db.applications.some((a) => a.jobId === jobId && a.applicantId === userId)) {
        throw new ApiError(409, 'You already sent a pitch for this gig.')
      }
      const app: SeedApplication = {
        id: nextId(db.applications),
        jobId,
        applicantId: userId,
        pitch: pitch.trim(),
        status: 'PENDING',
        createdAt: now(),
      }
       db.applications.push(app)
       save()
       return toApplicationDTO(app, userId, true)
     },
     async inviteGigsterToGig(gigId, gigster) {
       await delay()
       const userId = currentUserId()
       const job = findJob(gigId)
       if (job.posterId !== userId) throw new ApiError(403, 'Only the poster can invite gigsters.')
       if (job.status !== 'OPEN') throw new ApiError(409, 'Only open gigs can receive invitations.')

       // The Explore feed's gigster cards are not always backed by a stored user
       // (their local ids can collide with unrelated accounts), so resolve by
       // name and create a full applicant record when needed. This guarantees
       // the invited gigster renders with the correct name, avatar, rating,
       // barangay and skills in the poster's applicants list.
       const name = gigster.name.trim()
       let applicant = db.users.find((u) => u.fullName.toLowerCase() === name.toLowerCase())
       if (!applicant) {
         applicant = {
           id: nextId(db.users),
           fullName: name,
           avatarUrl: null,
           barangay: gigster.barangay?.trim() || job.barangay,
           city: job.city,
           phoneVerified: true,
           ratingAverage: gigster.rating ?? 0,
           ratingCount: gigster.completedGigs ?? 0,
           email: null,
           phoneNumber: gigster.phone?.trim() || null,
           bio: gigster.bio?.trim() || '',
           skills: [...(gigster.skills ?? [])],
completedGigs: gigster.completedGigs ?? 0,
            gigCoins: 2,
            createdAt: now(),
            password: 'password123',
            rateType: 'both',
            contact: {
              phoneNumber: gigster.phone?.trim() || '',
              viberNumber: null,
              messengerUsername: null,
            },
          }
         db.users.push(applicant)
       }

        const existing = db.applications.find((a) => {
          if (a.jobId !== gigId) return false
          if (a.applicantId === applicant.id) return true
          const u = db.users.find((x) => x.id === a.applicantId)
          return !!u && u.fullName.trim().toLowerCase() === name.toLowerCase()
        })
        if (existing) {
          if (existing.status === 'REJECTED' || existing.status === 'CANCELLED') {
            existing.status = 'INVITED'
            existing.pitch = 'Invited by client to apply for this gig.'
            existing.createdAt = now()
            save()
          }
          return toApplicationDTO(existing, userId, false)
        }
       const app: SeedApplication = {
         id: nextId(db.applications),
         jobId: gigId,
         applicantId: applicant.id,
         pitch: 'Invited by client to apply for this gig.',
         status: 'INVITED',
         createdAt: now(),
       }
       db.applications.push(app)
       save()
       return toApplicationDTO(app, userId, false)
     },
    async review(jobId, { rating, comment }) {
      await delay()
      const userId = currentUserId()
      const job = findJob(jobId)
      const accepted = db.applications.find((a) => a.jobId === jobId && a.status === 'ACCEPTED')
      if (!accepted) throw new ApiError(409, 'No accepted applicant to review.')
      const revieweeId = userId === job.posterId ? accepted.applicantId : job.posterId
      if (db.reviews.some((r) => r.jobId === jobId && r.reviewerId === userId)) {
        throw new ApiError(409, 'You already reviewed this gig.')
      }
      const review: SeedReview = {
        id: nextId(db.reviews),
        jobId,
        reviewerId: userId,
        revieweeId,
        rating,
        comment: comment.trim(),
        createdAt: now(),
      }
      db.reviews.push(review)
      const reviewee = findUser(revieweeId)
      reviewee.ratingAverage =
        Math.round(((reviewee.ratingAverage * reviewee.ratingCount + rating) / (reviewee.ratingCount + 1)) * 10) / 10
      reviewee.ratingCount += 1
      save()
      return toReviewDTO(review)
    },
    async searchNearbyGigsters(req: SearchNearbyGigstersRequest) {
      await delay()
      const { latitude, longitude, maxDistanceKm = 10, category } = req
      const haversineKm = (lat1: number, lng1: number, lat2: number, lng2: number) => {
        const toRad = (d: number) => (d * Math.PI) / 180
        const dLat = toRad(lat2 - lat1)
        const dLng = toRad(lng2 - lng1)
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
        return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
      }
      const getGigsterCoords = (g: MockGigster) => {
        const loc = LOCATIONS.find((l) => l.barangay === g.barangay && l.city === g.city)
        return loc ?? LOCATIONS[0]
      }
      const nearby = MOCK_GIGSTERS
        .filter((g) => {
          const loc = getGigsterCoords(g)
          const dist = haversineKm(latitude, longitude, loc.latitude, loc.longitude)
          return dist <= maxDistanceKm
        })
        .filter((g) => !category || g.skills.includes(category))
        .map((g): NearbyGigsterDTO => ({
          id: g.id,
          fullName: g.name,
          avatarUrl: null,
          barangay: g.barangay,
          city: g.city,
          ratingAverage: g.rating,
          ratingCount: g.ratingCount,
          completedGigs: g.completedGigs,
          phoneVerified: g.verified,
          skills: g.skills,
          isNegotiable: g.isNegotiable,
        }))
      return { gigsters: nearby, count: nearby.length }
    },
  },

  applications: {
    async mine(page, size) {
      await delay(150)
      const userId = currentUserId()
      return paginate(
        db.applications
          .filter((a) => a.applicantId === userId)
          .sort(byNewest)
          .map((a) => toApplicationDTO(a, userId, true)),
        page,
        size,
      )
    },
    async screen(id) {
      await delay()
      const userId = currentUserId()
      const app = db.applications.find((a) => a.id === id)
      if (!app) throw new ApiError(404, 'Application not found.')
      const job = findJob(app.jobId)
      if (job.posterId !== userId) throw new ApiError(403, 'Only the poster can screen applicants.')
      if (job.status !== 'OPEN') throw new ApiError(409, 'This gig is no longer accepting applicants.')
       if (app.status !== 'PENDING') throw new ApiError(409, 'Only pending applications can be screened.')
       app.status = 'SCREENING'
       save()
       return toApplicationDTO(app, userId, false)
    },
    async accept(id) {
      await delay()
      const userId = currentUserId()
      const app = db.applications.find((a) => a.id === id)
      if (!app) throw new ApiError(404, 'Application not found.')
      const job = findJob(app.jobId)
      if (job.posterId !== userId) throw new ApiError(403, 'Only the poster can accept applicants.')
      if (job.status !== 'OPEN') throw new ApiError(409, 'An applicant was already accepted.')
      if (app.status !== 'PENDING' && app.status !== 'SCREENING') {
        throw new ApiError(409, 'Only pending or screening applications can be accepted.')
      }
      for (const other of db.applications) {
        if (other.jobId === job.id && other.id !== id && (other.status === 'PENDING' || other.status === 'SCREENING')) {
          other.status = 'REJECTED'
        }
      }
      app.status = 'ACCEPTED'
      job.status = 'IN_PROGRESS'
      job.updatedAt = now()
      save()
      return toApplicationDTO(app, userId, false)
    },
    async decline(id) {
      await delay()
      const userId = currentUserId()
      const app = db.applications.find((a) => a.id === id)
      if (!app) throw new ApiError(404, 'Application not found.')
      const job = findJob(app.jobId)
      if (job.posterId !== userId) throw new ApiError(403, 'Only the poster can decline applicants.')
      if (app.status !== 'PENDING' && app.status !== 'SCREENING' && app.status !== 'INVITED') {
        throw new ApiError(409, 'Only pending, screening, or invited applications can be declined.')
      }
      app.status = 'REJECTED'
      save()
      return toApplicationDTO(app, userId, false)
    },
    async cancel(id) {
      await delay()
      const userId = currentUserId()
      const app = db.applications.find((a) => a.id === id)
      if (!app) throw new ApiError(404, 'Application not found.')
      const job = findJob(app.jobId)
      if (app.applicantId !== userId) throw new ApiError(403, 'Only the applicant can cancel their application.')
      if (app.status !== 'PENDING' && app.status !== 'SCREENING') {
        throw new ApiError(409, 'Only pending or screening applications can be cancelled.')
      }
      if (job.status !== 'OPEN') throw new ApiError(409, 'This gig is no longer accepting applicants.')
        app.status = 'CANCELLED'
        save()
        return toApplicationDTO(app, userId, false)
      },
       async reportNoShow(id, { reason, note }) {
        await delay()
        const userId = currentUserId()
        const app = db.applications.find((a) => a.id === id)
        if (!app) throw new ApiError(404, 'Application not found.')
        const job = findJob(app.jobId)
        if (app.applicantId !== userId) throw new ApiError(403, 'Only the applicant can report.')
        const reportedAt = now()
        app.status = 'CANCELLED'
        job.status = 'CANCELLED'
        job.updatedAt = now()
        job.reportId = db.reports.length + 1
        job.reportedAt = reportedAt
        job.appealDeadline = appealDeadlineFor(reportedAt)
        const report = {
          id: nextId(db.reports),
          reporterId: userId,
          targetUserId: job.posterId,
          jobId: job.id,
          applicationId: app.id,
          reason,
          note,
          status: 'PENDING' as ReportStatus,
          reportedAt,
          appealDeadline: job.appealDeadline,
          appealedAt: null,
          refunded: false,
          refundedAt: null,
        }
        db.reports.push(report)
        postSystemMessage(
          app.id,
          `Report filed: ${reason}. The reported client has 24 hours to appeal.`,
          'report',
          {
            reportId: report.id,
            jobId: job.id,
            jobTitle: job.title,
            reporterId: userId,
            targetUserId: job.posterId,
            reporterRole: 'Gigster',
            status: 'PENDING',
            appealDeadline: job.appealDeadline,
            reason,
            note,
          },
        )
        save()
        return toApplicationDTO(app, userId, true)
      },
      async respondToInvitation(id, accept) {
        await delay()
        const app = db.applications.find((a) => a.id === id)
        if (!app) throw new ApiError(404, 'Application not found.')
        app.status = accept ? 'PENDING' : 'REJECTED'
        save()
        return toApplicationDTO(app, currentUserId(), false)
      },
    },
    appeals: {
      async submit(reportId, { reason, evidence }) {
        await delay()
        const userId = currentUserId()
        const report = db.reports.find((r) => r.id === reportId)
        if (!report) throw new ApiError(404, 'Report not found.')
        if (db.appeals.some((a) => a.reportId === reportId && a.appellantId === userId)) {
          throw new ApiError(409, 'An appeal has already been filed for this report.')
        }
        if (report.status !== 'PENDING') {
          throw new ApiError(409, 'This report cannot be appealed.')
        }
        const job = db.jobs.find((j) => j.id === report.jobId)
        if (!job) throw new ApiError(404, 'Job not found.')
        const appeal = {
          id: nextId(db.appeals),
          reportId,
          appellantId: userId,
          reason: reason.trim(),
          evidence: evidence.map((e) => ({ ...e, id: crypto.randomUUID() })),
          status: 'PENDING' as AppealStatus,
          createdAt: now(),
          reviewedAt: null,
        }
        db.appeals.push(appeal)
        report.status = 'APPEALED'
        report.appealReason = reason.trim()
        report.appealedAt = now()
        // Update the matching report message payload so the UI reflects the new status.
        for (const m of db.messages) {
          if ((m as any).__type !== 'report') continue
          try {
            const d = JSON.parse((m as any).__data)
            if (Number(d.reportId) === reportId) {
              d.status = 'APPEALED'
              ;(m as any).__data = JSON.stringify(d)
            }
          } catch {
            // Ignore malformed payloads.
          }
        }
        const isPoster = job.posterId === userId
        postSystemMessage(
          report.applicationId,
          `Appeal submitted by ${isPoster ? 'the client' : 'the gigster'} — Under Review.`,
          'appeal',
          {
            appealId: appeal.id,
            reportId,
            jobId: job.id,
            jobTitle: job.title,
            appellantId: userId,
            status: 'PENDING',
            reason: appeal.reason,
            evidenceCount: appeal.evidence.length,
          },
        )
        save()
        return appeal
      },
    },
    chat: {
    async threads() {
      await delay(120)
      const userId = currentUserId()
      // Skip applications whose gig record is missing (dangling references keep the
      // whole inbox from loading). Only valid, loadable conversations are returned;
      // the inbox layer further filters to active/report threads.
      return db.applications
        .filter((a) => {
          const job = findJobOrNull(a.jobId)
          if (!job) return false
          return a.applicantId === userId || job.posterId === userId
        })
        .flatMap((a) => {
          const job = findJob(a.jobId)
          const out: ChatThreadDTO[] = []
          const reports = db.reports.filter((r) => r.applicationId === a.id)
          for (const report of reports) {
            const msgs = messagesFor(-report.id)
            const last = msgs[msgs.length - 1] ?? null
            const unread = msgs.filter((m) => m.senderId !== userId && m.readAt == null).length
            const reporterRole = report.reporterId === job.posterId ? 'Client' : 'Gigster'
            out.push({
              id: -report.id,
              jobId: job.id,
              jobTitle: job.title,
              jobStatus: job.status,
              applicationId: a.id,
              applicationStatus: a.status,
              posterId: job.posterId,
              otherUser: toSummary(findUser(job.posterId)),
              lastMessage: last?.body ?? (reporterRole === 'Client' ? 'Client No-Show report filed' : 'Gigster No-Show report filed'),
              lastMessageAt: last?.createdAt ?? (report.reportedAt ?? a.createdAt),
              unreadCount: unread,
              updatedAt: last?.createdAt ?? report.reportedAt ?? a.createdAt,
              hasReportNotice: true,
            })
          }
          const hasDirect = db.messages.some((m) => {
            const type = (m as any).__type
            return m.applicationId === a.id && type !== 'report' && type !== 'appeal'
          })
          const active = a.status === 'SCREENING' || a.status === 'ACCEPTED'
          if (hasDirect || active) out.push(toChatThread(a, userId))
          return out
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async messages(threadId, afterId) {
      await delay(120)
      const userId = currentUserId()
      if (threadId < 0) {
        const report = db.reports.find((r) => r.id === Math.abs(threadId))
        if (!report) throw new ApiError(404, 'Report not found.')
        const app = findApplication(report.applicationId as number)
        assertChatParticipant(app, userId)
        const reportId = Math.abs(threadId)
        for (const message of db.messages) {
          try {
            const data = JSON.parse((message as any).__data ?? '{}')
            if (Number(data.reportId) === reportId && message.senderId !== userId && message.readAt == null) {
              message.readAt = now()
            }
          } catch {
            // ignore
          }
        }
        save()
        return messagesFor(threadId)
          .filter((m) => afterId == null || m.id > afterId)
          .map(toChatMessageDTO)
      }
      const app = findApplication(threadId)
      assertChatParticipant(app, userId)
      for (const message of db.messages) {
        if (message.applicationId === threadId && message.senderId !== userId && message.readAt == null) {
          const type = (message as any).__type
          if (type !== 'report' && type !== 'appeal') message.readAt = now()
        }
      }
      save()
      return messagesFor(threadId)
        .filter((m) => afterId == null || m.id > afterId)
        .map(toChatMessageDTO)
    },
    async send(threadId, { body }) {
      await delay()
      const userId = currentUserId()
      if (threadId < 0) {
        throw new ApiError(403, 'System notification threads do not accept direct messages.')
      }
      const app = findApplication(threadId)
      assertChatParticipant(app, userId)
      if (app.status !== 'SCREENING' && app.status !== 'ACCEPTED') {
        throw new ApiError(403, 'Screen or accept this applicant before messaging.')
      }
      const text = body.trim()
      if (!text) throw new ApiError(400, 'Message cannot be empty.')
      if (text.length > 2000) throw new ApiError(400, 'Message is too long.')
      const message: SeedMessage = {
        id: nextId(db.messages),
        applicationId: threadId,
        senderId: userId,
        body: text,
        createdAt: now(),
        readAt: null,
      }
      db.messages.push(message)
      save()
      return toChatMessageDTO(message)
    },
  },
}
