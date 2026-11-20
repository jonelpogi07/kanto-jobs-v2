import type {
  ApplicationStatus,
  CompensationType,
  JobCategory,
  JobPostDTO,
  JobStatus,
  JobTiming,
  PaymentMethod,
  RateType,
} from '@/types'

export const CATEGORY_LABELS: Record<JobCategory, string> = {
  ERRANDS_DELIVERY: 'Errands & Delivery',
  HOME_REPAIR: 'Home Repair',
  CLEANING: 'Cleaning',
  EVENTS: 'Events',
  DIGITAL_ADMIN: 'Digital/Admin',
}

export const CATEGORIES = Object.keys(CATEGORY_LABELS) as JobCategory[]

/** Job-side compensation labels (UI copy for `CompensationType`). */
export const COMPENSATION_TYPE_LABELS: Record<CompensationType, string> = {
  FIXED: 'Per Gig',
  HOURLY: 'Per Hour',
}

/** Ordered list of weekday keys used across the app for availability. */
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Rate type preference labels — shown as a payment-style tag with no peso amounts. */
export const RATE_TYPE_LABELS: Record<RateType, string> = {
  hourly: 'Per Hour',
  per_gig: 'Per Gig',
  both: 'Per Hour / Per Gig',
}

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  CASH: 'Cash',
  GCASH: 'GCash',
  MAYA: 'Maya',
}

export const PAYMENT_METHODS = Object.keys(PAYMENT_LABELS) as PaymentMethod[]

export const TIMING_LABELS: Record<JobTiming, string> = {
  URGENT: 'Today / Urgent',
  SCHEDULED: 'Specific date',
  FLEXIBLE: 'Flexible',
}

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In Progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
}

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  INVITED: 'Invited',
  PENDING: 'Pending',
  SCREENING: 'Screening',
  ACCEPTED: 'Accepted',
  REJECTED: 'Declined',
  CANCELLED: 'Cancelled',
}

export const SKILL_SUGGESTIONS = [
  'Motorcycle Rider',
  'Home Repair',
  'Tutoring',
  'Graphic Design',
  'Cleaning',
  'Laundry',
  'Cooking',
  'Electrical',
  'Plumbing',
  'Events',
  'Photography',
  'Data Entry',
  'Babysitting',
  'Errands',
]

const peso = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

export const formatPeso = (amount: number) => peso.format(amount)

export function formatPay(amount: number, type: CompensationType) {
  return type === 'HOURLY' ? `${formatPeso(amount)}/hr` : formatPeso(amount)
}

export function formatDistance(km: number | null) {
  if (km == null) return null
  if (km < 1) return `${Math.max(100, Math.round(km * 10) * 100)} m`
  return `${km.toFixed(1)} km`
}

export function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime())
  const mins = Math.round(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  return `${days}d ago`
}

const scheduleFormat = new Intl.DateTimeFormat('en-PH', {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
})

export function formatSchedule(job: Pick<JobPostDTO, 'timing' | 'scheduledAt'>) {
  if (job.timing === 'URGENT') return 'Today, as soon as possible'
  if (job.timing === 'FLEXIBLE' || !job.scheduledAt) return 'Flexible schedule'
  return scheduleFormat.format(new Date(job.scheduledAt))
}

export function initials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

const clockFormat = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit' })

export const formatClock = (iso: string) => clockFormat.format(new Date(iso))

const dayFormat = new Intl.DateTimeFormat('en-PH', { weekday: 'short', month: 'short', day: 'numeric' })

export function formatDayLabel(iso: string) {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return dayFormat.format(date)
}

/** Normalizes PH mobile numbers to +63 E.164 for tel:/sms:/viber: links. */
export function toE164(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('63')) return `+${digits}`
  if (digits.startsWith('0')) return `+63${digits.slice(1)}`
  return `+63${digits}`
}
