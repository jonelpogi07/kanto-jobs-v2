import { BadgeCheck, Building2, CalendarClock, Clock, RefreshCw, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'
import { APPLICATION_STATUS_LABELS, JOB_STATUS_LABELS, PAYMENT_LABELS } from '@/lib/format'
import type { ApplicationStatus, JobStatus, JobTiming, PaymentMethod } from '@/types'

const pill = 'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold leading-4'

export function UrgencyBadge({ timing, className }: { timing: JobTiming; className?: string }) {
  if (timing === 'URGENT') {
    return (
      <span className={cn(pill, 'bg-primary text-primary-foreground', className)}>
        <Zap className="size-3" aria-hidden="true" />
        Urgent / Today
      </span>
    )
  }
  if (timing === 'SCHEDULED') {
    return (
      <span className={cn(pill, 'bg-secondary text-foreground', className)}>
        <CalendarClock className="size-3" aria-hidden="true" />
        Scheduled
      </span>
    )
  }
  return (
    <span className={cn(pill, 'bg-secondary text-muted-foreground', className)}>
      <Clock className="size-3" aria-hidden="true" />
      Flexible
    </span>
  )
}

const PAYMENT_STYLES: Record<PaymentMethod, string> = {
  CASH: 'border-success/30 bg-success-soft text-emerald-700 dark:text-emerald-300',
  GCASH: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/30 dark:bg-blue-900/20 dark:text-blue-400',
  MAYA: 'border-emerald-200 bg-white text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-900/20 dark:text-emerald-400',
}

export function PaymentPill({ method }: { method: PaymentMethod }) {
  return <span className={cn(pill, 'border', PAYMENT_STYLES[method])}>{PAYMENT_LABELS[method]}</span>
}

export function VerifiedBadge({ compact = false }: { compact?: boolean }) {
  if (compact) {
    return (
      <BadgeCheck className="size-4 shrink-0 fill-success text-white" aria-label="Phone verified" role="img" />
    )
  }
  return (
    <span className={cn(pill, 'bg-success-soft text-emerald-700 dark:text-emerald-300')}>
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      Phone Verified
    </span>
  )
}

const JOB_STATUS_STYLES: Record<JobStatus, string> = {
  OPEN: 'bg-primary-soft text-orange-700 dark:text-orange-300',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  COMPLETED: 'bg-success-soft text-emerald-700 dark:text-emerald-300',
  CANCELLED: 'bg-secondary text-muted-foreground',
}

export function JobStatusBadge({ status }: { status: JobStatus }) {
  return <span className={cn(pill, JOB_STATUS_STYLES[status])}>{JOB_STATUS_LABELS[status]}</span>
}

const APP_STATUS_STYLES: Record<ApplicationStatus, string> = {
  INVITED: 'bg-primary-soft text-orange-700 dark:text-orange-300',
  PENDING: 'bg-secondary text-foreground',
  SCREENING: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
  ACCEPTED: 'bg-success text-white',
  REJECTED: 'bg-secondary text-muted-foreground',
  CANCELLED: 'bg-secondary text-muted-foreground',
}

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  return <span className={cn(pill, APP_STATUS_STYLES[status])}>{APPLICATION_STATUS_LABELS[status]}</span>
}

export function SkillTag({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-foreground">
      {children}
    </span>
  )
}

export function NegotiableBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        pill,
        'border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300',
        className,
      )}
      aria-label="Negotiable rate"
    >
      <RefreshCw className="size-3" aria-hidden="true" />
      Negotiable
    </span>
  )
}

export function BusinessBadge({ name }: { name?: string }) {
  return (
    <span
      className={cn(
        pill,
        'shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300',
      )}
      aria-label="Business merchant"
    >
      <Building2 className="size-3 shrink-0" aria-hidden="true" />
      <span className="max-w-[160px] truncate">{name ?? 'Business'}</span>
    </span>
  )
}

export function PartnerBadge({ name }: { name?: string }) {
  return (
    <span
      className={cn(
        pill,
        'shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300',
      )}
      aria-label="Partner merchant"
    >
      <Building2 className="size-3 shrink-0" aria-hidden="true" />
      <span className="max-w-[160px] truncate">{name ?? 'Partner'}</span>
    </span>
  )
}
