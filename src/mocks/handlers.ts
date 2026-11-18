import type { KantoApi } from '@/services/contract'
import { ApiError, tokenStorage } from '@/services/token'
import type {
  ApplicantDTO,
  ApplicationDTO,
  AuthResponse,
  ChatMessageDTO,
  ChatThreadDTO,
  JobPostDTO,
  Page,
  ReviewDTO,
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
}

const DB_KEY = 'kanto-jobs:mock-db:v2'

function seed(): MockDb {
  return {
    users: structuredClone(SEED_USERS),
    jobs: SEED_JOBS.map(({ location, ...job }) => {
      const loc = LOCATIONS[location]
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
  }
}

function load(): MockDb {
  const raw = localStorage.getItem(DB_KEY)
  if (raw) {
    try {
      return JSON.parse(raw) as MockDb
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
  save()
}

const delay = (ms = 250 + Math.random() * 250) => new Promise((r) => setTimeout(r, ms))
const nextId = (rows: { id: number }[]) => rows.reduce((max, r) => Math.max(max, r.id), 0) + 1
const now = () => new Date().toISOString()

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
  const { password: _password, contact: _contact, ...dto } = user
  return structuredClone(dto)
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
  }
}

function toApplicant(user: SeedUser): ApplicantDTO {
  return { ...toSummary(user), skills: [...user.skills] }
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

function toJobDTO(job: JobRecord, coords?: { lat: number; lng: number }): JobPostDTO {
  const { posterId, ...rest } = job
  const apps = db.applications.filter((a) => a.jobId === job.id && a.status !== 'CANCELLED')
    return {
      ...structuredClone(rest),
      images: rest.images ?? [],
      poster: toSummary(findUser(posterId)),
    applicantCount: apps.length,
    acceptedApplicationId: apps.find((a) => a.status === 'ACCEPTED')?.id ?? null,
    distanceKm: coords
      ? Math.round(haversineKm(coords.lat, coords.lng, job.latitude, job.longitude) * 10) / 10
      : null,
  }
}

function findJob(id: number): JobRecord {
  const job = db.jobs.find((j) => j.id === id)
  if (!job) throw new ApiError(404, 'Job not found.')
  return job
}

function toApplicationDTO(app: SeedApplication, viewerId: number, embedJob: boolean): ApplicationDTO {
  const job = findJob(app.jobId)
  const applicant = findUser(app.applicantId)
  const poster = findUser(job.posterId)
  const accepted = app.status === 'ACCEPTED'
  return {
    id: app.id,
    jobId: app.jobId,
    job: embedJob ? toJobDTO(job) : null,
    applicant: toApplicant(applicant),
    pitch: app.pitch,
    status: app.status,
    applicantContact: accepted && viewerId === job.posterId ? { ...applicant.contact } : null,
    posterContact: accepted && viewerId === app.applicantId ? { ...poster.contact } : null,
    createdAt: app.createdAt,
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

function messagesFor(applicationId: number): SeedMessage[] {
  return db.messages
    .filter((m) => m.applicationId === applicationId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

function toChatMessageDTO(message: SeedMessage): ChatMessageDTO {
  return {
    id: message.id,
    threadId: message.applicationId,
    senderId: message.senderId,
    body: message.body,
    createdAt: message.createdAt,
    readAt: message.readAt,
  }
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
    otherUser: toSummary(findUser(otherId)),
    lastMessage: last?.body ?? null,
    lastMessageAt: last?.createdAt ?? null,
    unreadCount: messages.filter((m) => m.senderId !== viewerId && m.readAt == null).length,
    updatedAt: activity,
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
        createdAt: now(),
        password,
        contact: { phoneNumber: isEmail ? '' : id, viberNumber: null, messengerUsername: null },
      }
      db.users.push(user)
      save()
      return authResponse(user)
    },
    async loginWithGoogle() {
      await delay()
      return authResponse(findUser(1))
    },
  },

  users: {
    async me() {
      await delay(120)
      return toUserDTO(findUser(currentUserId()))
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
      })
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
    async search({ q, category, lat, lng, maxDistanceKm, minPay, page, size }) {
      await delay()
      const coords = lat != null && lng != null ? { lat, lng } : undefined
      const needle = q?.trim().toLowerCase()
      const results = db.jobs
        .filter((j) => j.status === 'OPEN')
        .filter((j) => !category || j.category === category)
        .filter((j) => minPay == null || j.amount >= minPay)
        .filter(
          (j) =>
            !needle ||
            [j.title, j.description, j.barangay, j.city, j.landmark].some((f) => f.toLowerCase().includes(needle)),
        )
        .map((j) => toJobDTO(j, coords))
        .filter((j) => maxDistanceKm == null || j.distanceKm == null || j.distanceKm <= maxDistanceKm)
        .sort((a, b) => {
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
      const job: JobRecord = {
        ...req,
        images: req.images ?? [],
        id: nextId(db.jobs),
        posterId,
        status: 'OPEN',
        createdAt: now(),
        updatedAt: now(),
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
          .map((j) => toJobDTO(j)),
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
      job.status = 'CANCELLED'
      job.updatedAt = now()
      // Reject all pending applications
      for (const app of db.applications) {
        if (app.jobId === id && app.status === 'PENDING') app.status = 'REJECTED'
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
    async accept(id) {
      await delay()
      const userId = currentUserId()
      const app = db.applications.find((a) => a.id === id)
      if (!app) throw new ApiError(404, 'Application not found.')
      const job = findJob(app.jobId)
      if (job.posterId !== userId) throw new ApiError(403, 'Only the poster can accept applicants.')
      if (job.status !== 'OPEN') throw new ApiError(409, 'An applicant was already accepted.')
      for (const other of db.applications) {
        if (other.jobId === job.id && other.id !== id && other.status === 'PENDING') other.status = 'REJECTED'
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
      if (app.status !== 'PENDING') throw new ApiError(409, 'Only pending applications can be declined.')
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
      if (app.status !== 'PENDING') throw new ApiError(409, 'Only pending applications can be cancelled.')
      if (job.status !== 'OPEN') throw new ApiError(409, 'This gig is no longer accepting applicants.')
      app.status = 'CANCELLED'
      save()
      return toApplicationDTO(app, userId, false)
    },
  },

  chat: {
    async threads() {
      await delay(120)
      const userId = currentUserId()
      return db.applications
        .filter((a) => a.status !== 'CANCELLED')
        .filter((a) => a.applicantId === userId || findJob(a.jobId).posterId === userId)
        .map((a) => toChatThread(a, userId))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async messages(threadId, afterId) {
      await delay(120)
      const userId = currentUserId()
      const app = findApplication(threadId)
      assertChatParticipant(app, userId)
      for (const message of db.messages) {
        if (message.applicationId === threadId && message.senderId !== userId && message.readAt == null) {
          message.readAt = now()
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
      const app = findApplication(threadId)
      assertChatParticipant(app, userId)
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
