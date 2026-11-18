import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import {
  ArrowLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  Hourglass,
  Landmark,
  Loader2,
  MapPin,
  MessageCircle,
  Send,
  Users,
  X,
} from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { Button } from '@/components/ui/button'
import { ApplicationStatusBadge, JobStatusBadge, PaymentPill, UrgencyBadge, VerifiedBadge } from '@/components/badges'
import { ContactBar } from '@/components/contact-bar'
import { PitchSheet } from '@/components/pitch-sheet'
import { RatingInline } from '@/components/rating'
import { loginHref } from '@/components/require-auth'
import { UserAvatar } from '@/components/user-avatar'
import { useJob, useMyApplications } from '@/hooks/use-api'
import { useAuth } from '@/lib/auth'
import { CATEGORY_LABELS, formatDistance, formatPay, formatSchedule, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { JobStatus } from '@/types'

export function JobDetailsPage() {
  const { id } = useParams()
  const jobId = Number(id)
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: job, isLoading, error } = useJob(jobId)
  const { data: myApps } = useMyApplications()
  const [pitchOpen, setPitchOpen] = useState(false)
  const [lightbox, setLightbox] = useState<number | null>(null)

  useEffect(() => {
    if (lightbox === null) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setLightbox(null)
      if (e.key === 'ArrowLeft') setLightbox((i) => (i === null ? null : Math.max(0, i - 1)))
      if (e.key === 'ArrowRight') setLightbox((i) => (i === null || !job ? null : Math.min(job.images.length - 1, i + 1)))
    }
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [lightbox, job])

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading gig</span>
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-lg font-bold">Gig not found</p>
        <p className="text-sm text-muted-foreground">It may have been removed or filled already.</p>
        <Link to="/explore" className={buttonVariants({ variant: 'outline' })}>
          Back to Explore
        </Link>
      </div>
    )
  }

  const isOwner = user?.id === job.poster.id
  const myApplication = myApps?.content.find((a) => a.jobId === job.id)
  const distance = formatDistance(job.distanceKm)

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur">
        <Button variant="ghost" size="icon-lg" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/explore'))}>
          <ArrowLeft aria-hidden="true" />
          <span className="sr-only">Back</span>
        </Button>
        <span className="truncate text-sm font-semibold">{CATEGORY_LABELS[job.category]}</span>
      </header>

      <article className="flex flex-col gap-5 px-4 pt-4 pb-28">
        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <UrgencyBadge timing={job.timing} />
            {job.status !== 'OPEN' ? <JobStatusBadge status={job.status} /> : null}
            <span className="text-xs text-muted-foreground">{`Posted ${timeAgo(job.createdAt)}`}</span>
          </div>
          <h1 className="text-balance text-2xl leading-tight font-extrabold">{job.title}</h1>
          <div className="flex items-end justify-between gap-3 rounded-2xl bg-success-soft p-4">
            <div>
              <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                {job.compensationType === 'HOURLY' ? 'Hourly rate' : 'Fixed pay'}
              </p>
              <p className="text-3xl font-extrabold text-success dark:text-emerald-400">{formatPay(job.amount, job.compensationType)}</p>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-[11px] font-medium text-emerald-800 dark:text-emerald-300">Paid via</span>
              <div className="flex gap-1">
                {job.paymentMethods.map((m) => (
                  <PaymentPill key={m} method={m} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {job.images.length > 0 && (
          <section aria-labelledby="photos-heading" className="flex flex-col gap-3">
            <h2 id="photos-heading" className="text-sm font-bold">Gig photos</h2>
            <div className="grid grid-cols-2 gap-3 w-full" role="region" aria-label="Gig photos">
              {job.images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Gig photo ${i + 1}`}
                  onClick={() => setLightbox(i)}
                  className="cursor-pointer aspect-square w-full rounded-xl object-cover border border-border bg-secondary"
                />
              ))}
            </div>
          </section>
        )}

        <dl className="grid grid-cols-1 gap-3 rounded-2xl border border-border bg-card p-4">
          <InfoRow icon={CalendarDays} label="Schedule" value={formatSchedule(job)} />
          {job.estimatedDuration ? <InfoRow icon={Hourglass} label="Est. duration" value={job.estimatedDuration} /> : null}
          <InfoRow
            icon={MapPin}
            label="Location"
            value={`${job.barangay}, ${job.city}${distance ? ` · ${distance} away` : ''}`}
          />
          {job.landmark ? <InfoRow icon={Landmark} label="Landmark" value={job.landmark} /> : null}
          <InfoRow icon={Users} label="Applicants" value={`${job.applicantCount} sent a pitch`} />
        </dl>

        <section aria-labelledby="desc-heading" className="flex flex-col gap-2">
          <h2 id="desc-heading" className="text-sm font-bold">
            About the gig
          </h2>
          <p className="text-sm leading-relaxed whitespace-pre-line text-foreground/90">{job.description}</p>
        </section>

        <section aria-labelledby="poster-heading" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
          <h2 id="poster-heading" className="text-xs font-semibold text-muted-foreground">
            Posted by
          </h2>
          <div className="flex items-center gap-3">
            <UserAvatar user={job.poster} className="size-12 text-base" />
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{job.poster.fullName}</p>
              <p className="truncate text-xs text-muted-foreground">{`${job.poster.barangay}, ${job.poster.city}`}</p>
              <RatingInline average={job.poster.ratingAverage} count={job.poster.ratingCount} className="mt-0.5" />
            </div>
          </div>
          {job.poster.phoneVerified ? (
            <p className="flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
              <VerifiedBadge />
              Mobile number confirmed via OTP
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">This poster has not verified their phone yet.</p>
          )}
        </section>

        {myApplication ? (
          <section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4" aria-label="Your pitch">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold">Your pitch</h2>
              <ApplicationStatusBadge status={myApplication.status} />
            </div>
            <p className="text-sm text-muted-foreground italic">{`"${myApplication.pitch}"`}</p>
            {myApplication.status === 'ACCEPTED' && myApplication.posterContact ? (
              <ContactBar contact={myApplication.posterContact} name={job.poster.fullName} />
            ) : myApplication.status !== 'ACCEPTED' ? (
              <p className="text-xs text-muted-foreground">🔒 Messaging & contact details unlock once the client accepts your application.</p>
            ) : null}
            {myApplication.status === 'ACCEPTED' ? (
              <Link
                to={`/messages/${myApplication.id}`}
                className={cn(buttonVariants({ variant: 'outline' }), 'h-10 w-full font-bold')}
              >
                <MessageCircle aria-hidden="true" />
                {`Message ${job.poster.fullName.split(' ')[0]}`}
              </Link>
            ) : null}
          </section>
        ) : null}
      </article>

      <div className="pb-safe fixed inset-x-0 bottom-16 z-30 mx-auto w-full max-w-md border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:absolute">
        <StickyAction
          isOwner={isOwner}
          isGuest={!user}
          jobOpen={job.status === 'OPEN'}
          jobStatus={job.status}
          applied={Boolean(myApplication)}
          jobId={job.id}
          onApply={() => setPitchOpen(true)}
        />
      </div>

      <PitchSheet job={job} open={pitchOpen} onOpenChange={setPitchOpen} />

      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            aria-label="Close"
            onClick={() => setLightbox(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            <X className="size-6" />
          </button>
          <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white text-sm font-semibold">
            {lightbox + 1} / {job.images.length}
          </div>
          {job.images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : Math.max(0, i - 1))) }}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronLeft className="size-6" />
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => { e.stopPropagation(); setLightbox((i) => (i === null ? null : Math.min(job.images.length - 1, i + 1))) }}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
          <img
            src={job.images[lightbox]}
            alt={`Gig photo ${lightbox + 1}`}
            onClick={(e) => e.stopPropagation()}
            className="max-h-[85vh] max-w-[95vw] object-contain"
          />
        </div>
      )}
    </>
  )
}

function StickyAction({
  isOwner,
  isGuest,
  jobOpen,
  jobStatus,
  applied,
  jobId,
  onApply,
}: {
  isOwner: boolean
  isGuest: boolean
  jobOpen: boolean
  jobStatus: JobStatus
  applied: boolean
  jobId: number
  onApply: () => void
}) {
  const big = 'h-12 w-full text-base font-bold'
  if (isOwner && jobStatus === 'OPEN') {
    return (
      <Link to={`/jobs/${jobId}/edit`} className={cn(buttonVariants({ variant: 'outline' }), big)}>
        Edit gig
      </Link>
    )
  }
  if (applied) {
    return (
      <Button disabled variant="secondary" className={big}>
        <CheckCircle2 aria-hidden="true" />
        Pitch sent
      </Button>
    )
  }
  if (!jobOpen) {
    return (
      <Button disabled variant="secondary" className={big}>
        <Clock aria-hidden="true" />
        No longer accepting pitches
      </Button>
    )
  }
  if (isGuest) {
    return (
      <Link to={loginHref(`/jobs/${jobId}`)} className={cn(buttonVariants(), big)}>
        Log in to send a pitch
      </Link>
    )
  }
  return (
    <Button className={big} onClick={onApply}>
      <Send aria-hidden="true" />
      Apply / Send Pitch
    </Button>
  )
}

function InfoRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary-soft text-primary">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <dt className="text-[11px] font-medium text-muted-foreground">{label}</dt>
        <dd className="text-sm font-semibold text-pretty">{value}</dd>
      </div>
    </div>
  )
}
