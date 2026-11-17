import { useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { CheckCircle2, ChevronDown, Inbox, Loader2, MapPin, MessageCircle, Star, UserCheck, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApplicationStatusBadge, JobStatusBadge, SkillTag, VerifiedBadge } from '@/components/badges'
import { ContactBar } from '@/components/contact-bar'
import { PageHeader } from '@/components/layout/app-shell'
import { RatingInline } from '@/components/rating'
import { RequireAuth } from '@/components/require-auth'
import { ReviewDialog } from '@/components/review-dialog'
import { UserAvatar } from '@/components/user-avatar'
import { useJobApplications, useMyApplications, useMyJobs, useRefreshAll } from '@/hooks/use-api'
import { formatPay, formatSchedule, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import type { ApplicationDTO, JobPostDTO } from '@/types'

export function MyGigsPage() {
  return (
    <>
      <PageHeader title="My Gigs" />
      <RequireAuth title="Log in to see your gigs">
        <Tabs defaultValue="posted" className="gap-0">
          <div className="px-4 pt-3">
            <TabsList className="grid h-11 w-full grid-cols-2">
              <TabsTrigger value="posted" className="text-sm font-semibold">
                Posted by Me
              </TabsTrigger>
              <TabsTrigger value="applied" className="text-sm font-semibold">
                Applied by Me
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="posted">
            <PostedTab />
          </TabsContent>
          <TabsContent value="applied">
            <AppliedTab />
          </TabsContent>
        </Tabs>
      </RequireAuth>
    </>
  )
}

function Loading() {
  return (
    <div className="flex justify-center py-12" role="status">
      <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  )
}

function Empty({ title, body, cta, to }: { title: string; body: string; cta: string; to: string }) {
  return (
    <div className="mx-4 mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
      <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
      <p className="font-semibold">{title}</p>
      <p className="text-sm text-muted-foreground">{body}</p>
      <Link to={to} className={cn(buttonVariants(), 'mt-2')}>
        {cta}
      </Link>
    </div>
  )
}

function PostedTab() {
  const { data, isLoading } = useMyJobs()
  if (isLoading) return <Loading />
  const jobs = data?.content ?? []
  if (jobs.length === 0) {
    return <Empty title="No gigs posted yet" body="Need help with an errand or repair?" cta="Post a gig" to="/post-job" />
  }
  const groups = [
    { label: 'Open', items: jobs.filter((j) => j.status === 'OPEN') },
    { label: 'In Progress', items: jobs.filter((j) => j.status === 'IN_PROGRESS') },
    { label: 'Completed', items: jobs.filter((j) => j.status === 'COMPLETED' || j.status === 'CANCELLED') },
  ].filter((g) => g.items.length)

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">
      {groups.map((g) => (
        <section key={g.label} aria-label={g.label} className="flex flex-col gap-3">
          <h2 className="text-xs font-bold tracking-wide text-muted-foreground uppercase">{`${g.label} (${g.items.length})`}</h2>
          {g.items.map((job) => (
            <PostedJobCard key={job.id} job={job} />
          ))}
        </section>
      ))}
    </div>
  )
}

function PostedJobCard({ job }: { job: JobPostDTO }) {
  const [expanded, setExpanded] = useState(job.status === 'IN_PROGRESS')
  const [reviewOpen, setReviewOpen] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { data: applications, isLoading } = useJobApplications(job.id, expanded)
  const accepted = applications?.find((a) => a.status === 'ACCEPTED')
  const panelId = `applicants-${job.id}`
  const refreshAll = useRefreshAll()
  const canCancel = job.status === 'OPEN' || job.status === 'IN_PROGRESS'

  async function cancel() {
    if (!window.confirm('Cancel this gig? This cannot be undone.')) return
    setCancelling(true)
    try {
      await api.jobs.cancel(job.id)
      toast.success('Gig cancelled', { description: 'All applicants have been notified.' })
      await refreshAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not cancel gig.')
    } finally {
      setCancelling(false)
    }
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-center justify-between gap-2">
          <JobStatusBadge status={job.status} />
          <span className="text-xs text-muted-foreground">{timeAgo(job.createdAt)}</span>
        </div>
        <Link to={`/jobs/${job.id}`} className="font-bold leading-snug hover:text-primary">
          {job.title}
        </Link>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-bold text-success">{formatPay(job.amount, job.compensationType)}</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="size-3" aria-hidden="true" />
            {job.barangay}
          </span>
          <span>{formatSchedule(job)}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        aria-controls={panelId}
        className="flex w-full items-center justify-between border-t border-border bg-secondary/50 px-4 py-3 text-sm font-semibold hover:bg-secondary"
      >
        <span>
          {job.status === 'OPEN' ? `${job.applicantCount} applicant${job.applicantCount === 1 ? '' : 's'}` : 'Applicants'}
          {job.status === 'OPEN' && job.applicantCount > 0 ? (
            <span className="ml-2 rounded-full bg-primary px-1.5 py-0.5 text-[10px] text-primary-foreground">Review</span>
          ) : null}
        </span>
        <ChevronDown className={cn('size-4 transition-transform', expanded && 'rotate-180')} aria-hidden="true" />
      </button>

      {expanded ? (
        <div id={panelId} className="flex flex-col gap-3 border-t border-border p-4">
          {isLoading ? (
            <Loading />
          ) : !applications?.length ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No pitches yet. Urgent gigs usually get pitches within the hour.
            </p>
          ) : (
            <>
              {(accepted ? [accepted, ...applications.filter((a) => a !== accepted)] : applications).map((app) => (
                <ApplicantRow key={app.id} app={app} job={job} />
              ))}
              {job.status === 'IN_PROGRESS' && accepted ? (
                <Button className="h-11 bg-success font-bold hover:bg-success/90" onClick={() => setReviewOpen(true)}>
                  <CheckCircle2 aria-hidden="true" />
                  Mark Completed & Rate
                </Button>
              ) : null}
            </>
          )}
          {canCancel && (
            <Button
              variant="destructive"
              className="h-10 mt-2"
              onClick={cancel}
              disabled={cancelling}
            >
              {cancelling ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X className="size-4" />}
              Cancel Gig
            </Button>
          )}
        </div>
      ) : null}

      {accepted ? (
        <ReviewDialog job={job} worker={accepted.applicant} open={reviewOpen} onOpenChange={setReviewOpen} />
      ) : null}
    </article>
  )
}

function ApplicantRow({ app, job }: { app: ApplicationDTO; job: JobPostDTO }) {
  const refreshAll = useRefreshAll()
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const isAccepted = app.status === 'ACCEPTED'
  const dimmed = !isAccepted && job.status !== 'OPEN'

  async function accept() {
    setAccepting(true)
    try {
      await api.applications.accept(app.id)
      toast.success(`${app.applicant.fullName.split(' ')[0]} is hired!`, {
        description: 'Contact details are now unlocked.',
      })
      await refreshAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not accept applicant.')
    } finally {
      setAccepting(false)
    }
  }

  async function decline() {
    if (!window.confirm('Decline this applicant?')) return
    setDeclining(true)
    try {
      await api.applications.decline(app.id)
      toast.success('Applicant declined', { description: 'They have been notified.' })
      await refreshAll()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not decline applicant.')
    } finally {
      setDeclining(false)
    }
  }

  return (
    <div
      className={cn(
        'flex flex-col gap-3 rounded-xl border p-3',
        isAccepted ? 'border-success/40 bg-success-soft/40' : 'border-border',
        dimmed && 'opacity-60',
      )}
    >
      <div className="flex items-start gap-3">
        <UserAvatar user={app.applicant} className="size-10" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="truncate text-sm font-bold">{app.applicant.fullName}</p>
            {app.applicant.phoneVerified ? <VerifiedBadge compact /> : null}
          </div>
          <div className="flex items-center gap-2">
            <RatingInline average={app.applicant.ratingAverage} count={app.applicant.ratingCount} />
            <span className="truncate text-xs text-muted-foreground">{app.applicant.barangay}</span>
          </div>
        </div>
        {app.status !== 'PENDING' ? <ApplicationStatusBadge status={app.status} /> : null}
      </div>
      <p className="text-sm leading-relaxed text-foreground/90">{`"${app.pitch}"`}</p>
      {app.applicant.skills.length ? (
        <div className="flex flex-wrap gap-1.5">
          {app.applicant.skills.map((s) => (
            <SkillTag key={s}>{s}</SkillTag>
          ))}
        </div>
      ) : null}
      {isAccepted && app.applicantContact ? (
        <ContactBar contact={app.applicantContact} name={app.applicant.fullName} />
      ) : null}
      <div className="flex gap-2">
        <Link to={`/messages/${app.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-10 flex-1 font-bold')}>
          <MessageCircle aria-hidden="true" />
          Message
        </Link>
        {app.status === 'PENDING' && job.status === 'OPEN' ? (
          <>
            <Button
              variant="destructive"
              className="h-10 flex-1 font-bold"
              onClick={decline}
              disabled={declining}
            >
              {declining ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X className="size-4" />}
              Decline
            </Button>
            <Button className="h-10 flex-1 font-bold" onClick={accept} disabled={accepting}>
              {accepting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <UserCheck aria-hidden="true" />}
              Accept
            </Button>
          </>
        ) : null}
      </div>
    </div>
  )
}

function AppliedTab() {
  const { data, isLoading } = useMyApplications()
  if (isLoading) return <Loading />
  const apps = data?.content ?? []
  if (apps.length === 0) {
    return <Empty title="No pitches sent yet" body="Find a gig nearby and send your first pitch." cta="Explore gigs" to="/explore" />
  }

  return (
    <ul className="flex flex-col gap-3 px-4 pt-4 pb-6">
      {apps.map((app) => (
        <li key={app.id}>
          <article className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-2">
              <ApplicationStatusBadge status={app.status} />
              <span className="text-xs text-muted-foreground">{`Sent ${timeAgo(app.createdAt)}`}</span>
            </div>
            {app.job ? (
              <>
                <Link to={`/jobs/${app.job.id}`} className="font-bold leading-snug hover:text-primary">
                  {app.job.title}
                </Link>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <UserAvatar user={app.job.poster} className="size-5 text-[9px]" />
                  <span className="truncate">{app.job.poster.fullName}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-bold text-success">{formatPay(app.job.amount, app.job.compensationType)}</span>
                </div>
              </>
            ) : null}
            <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground italic">{`"${app.pitch}"`}</p>
            {app.status === 'ACCEPTED' && app.posterContact && app.job ? (
              app.job.status === 'COMPLETED' ? (
                <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                  <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                  Gig completed. Great work!
                </p>
              ) : (
                <ContactBar contact={app.posterContact} name={app.job.poster.fullName} />
              )
            ) : null}
            <Link to={`/messages/${app.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-10 w-full font-bold')}>
              <MessageCircle aria-hidden="true" />
              {app.job ? `Message ${app.job.poster.fullName.split(' ')[0]}` : 'Message client'}
            </Link>
          </article>
        </li>
      ))}
    </ul>
  )
}
