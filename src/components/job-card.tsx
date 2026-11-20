import { Link } from 'react-router'
import { MapPin, Users } from 'lucide-react'
import { NegotiableBadge, PaymentPill, UrgencyBadge, VerifiedBadge } from '@/components/badges'
import { RatingInline } from '@/components/rating'
import { UserAvatar } from '@/components/user-avatar'
import { CATEGORY_LABELS, formatDistance, formatPeso, timeAgo } from '@/lib/format'
import type { JobPostDTO } from '@/types'

export function JobCard({ job }: { job: JobPostDTO }) {
  const distance = formatDistance(job.distanceKm)
  return (
    <Link
      to={`/jobs/${job.id}`}
      className="group block rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.35)] transition-colors outline-none hover:border-primary/40 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-secondary/50"
    >
      <article className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <UrgencyBadge timing={job.timing} />
          <span className="text-xs text-muted-foreground">{timeAgo(job.createdAt)}</span>
        </div>

        <div className="flex items-start justify-between gap-3">
          {job.images && job.images.length > 0 && (
            <div className="relative shrink-0">
              <img
                src={job.images[0]}
                alt=""
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl object-cover shrink-0"
              />
              {job.images.length > 1 && (
                <span className="absolute bottom-1 right-1 rounded-full bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                  +{job.images.length - 1}
                </span>
              )}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium text-muted-foreground">{CATEGORY_LABELS[job.category]}</p>
            <h3 className="mt-0.5 text-pretty text-base leading-snug font-bold text-foreground group-hover:text-primary">
              {job.title}
            </h3>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-lg leading-tight font-extrabold text-success dark:text-emerald-400">{formatPeso(job.amount)}</p>
            <p className="text-[11px] font-medium text-muted-foreground">
              {job.compensationType === 'HOURLY' ? 'per hour' : 'per gig'}
            </p>
            {job.isNegotiable && <NegotiableBadge className="mt-1.5" />}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3.5 text-primary dark:text-orange-400" aria-hidden="true" />
            {job.barangay}, {job.city.split(',')[0]}
            {distance ? <span className="font-semibold text-foreground">{` · ${distance}`}</span> : null}
          </span>
          <div className="flex gap-1">
            {job.paymentMethods.map((m) => (
              <PaymentPill key={m} method={m} />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
          <div className="flex min-w-0 items-center gap-2">
            <UserAvatar user={job.poster} className="size-7 text-xs" />
            <span className="truncate text-sm font-medium text-foreground">{job.poster.fullName}</span>
            {job.poster.phoneVerified ? <VerifiedBadge compact /> : null}
            <RatingInline average={job.poster.ratingAverage} count={job.poster.ratingCount} />
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
            <Users className="size-3.5" aria-hidden="true" />
            {job.applicantCount}
            <span className="sr-only">applicants</span>
          </span>
        </div>
      </article>
    </Link>
  )
}

export function JobCardSkeleton() {
  return (
    <div className="flex animate-pulse flex-col gap-3 rounded-2xl border border-border bg-card p-4" aria-hidden="true">
      <div className="h-5 w-24 rounded-full bg-secondary" />
      <div className="h-5 w-3/4 rounded bg-secondary" />
      <div className="h-4 w-1/2 rounded bg-secondary" />
      <div className="h-7 w-full rounded bg-secondary" />
    </div>
  )
}
