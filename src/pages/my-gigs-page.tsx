import { useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { CheckCircle2, ChevronDown, Inbox, Loader2, Lock, MapPin, MessageCircle, Star, UserCheck, X } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ApplicationStatusBadge, JobStatusBadge, SkillTag, VerifiedBadge } from '@/components/badges'
import { ContactBar } from '@/components/contact-bar'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { PageHeader } from '@/components/layout/app-shell'
import { RatingInline } from '@/components/rating'
import { RequireAuth } from '@/components/require-auth'
import { ReviewDialog } from '@/components/review-dialog'
import { UserAvatar } from '@/components/user-avatar'
import { useJobApplications, useMyApplications, useMyJobs, useRefreshAll } from '@/hooks/use-api'
import { APPLICATION_STATUS_LABELS, formatPay, formatSchedule, timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { api } from '@/services/api'
import type { ApplicationDTO, ApplicationStatus, JobPostDTO } from '@/types'

export function MyGigsPage() {
  const { user } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') === 'applied' ? 'applied' : 'posted'
  return (
    <>
      <PageHeader
        title="My Gigs"
        action={
          <button
            type="button"
            className="bg-amber-50 border border-amber-300 text-amber-800 px-3 py-1.5 rounded-full font-semibold text-sm flex items-center gap-1.5"
          >
            🪙 {user?.gigCoins ?? 2} GigCoins +
          </button>
        }
      />
      <RequireAuth title="Log in to see your gigs">
        <Tabs
          value={tab}
          onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })}
          className="gap-0"
        >
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
  const [filter, setFilter] = useState<'ALL' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'>('ALL')
  if (isLoading) return <Loading />
  const jobs = data?.content ?? []
  if (jobs.length === 0) {
    return <Empty title="No gigs posted yet" body="Need help with an errand or repair?" cta="Post a gig" to="/post-job" />
  }
  const filteredJobs = filter === 'ALL' ? jobs : jobs.filter((j) => j.status === filter)
  const groups = [
    { label: 'Open', items: filteredJobs.filter((j) => j.status === 'OPEN') },
    { label: 'In Progress', items: filteredJobs.filter((j) => j.status === 'IN_PROGRESS') },
    { label: 'Completed', items: filteredJobs.filter((j) => j.status === 'COMPLETED') },
    { label: 'Cancelled', items: filteredJobs.filter((j) => j.status === 'CANCELLED') },
  ].filter((g) => g.items.length)

  return (
    <div className="flex flex-col gap-5 px-4 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Filter by status</h2>
        <Select
          value={filter}
          onValueChange={(v) => setFilter((v as 'ALL' | 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED') ?? 'ALL')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="OPEN">Open</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
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

function applicantRank(app: ApplicationDTO) {
  switch (app.status) {
    case 'INVITED':
      return 0
    case 'ACCEPTED':
      return 1
    case 'SCREENING':
      return 2
    case 'PENDING':
      return 3
    default:
      return 4
  }
}

function PostedJobCard({ job }: { job: JobPostDTO }) {
  const [expanded, setExpanded] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const { data: applications, isLoading } = useJobApplications(job.id, expanded)
  const accepted = applications?.find((a) => a.status === 'ACCEPTED')
  const visibleApps = (applications ?? [])
    .filter((a) => a.status !== 'REJECTED')
    .sort((a, b) => applicantRank(a) - applicantRank(b) || b.createdAt.localeCompare(a.createdAt))
  const panelId = `applicants-${job.id}`
  const refreshAll = useRefreshAll()
  const canCancel = job.status === 'OPEN' || job.status === 'IN_PROGRESS'

  async function cancel() {
    setCancelling(true)
    try {
      await api.jobs.cancel(job.id)
      toast.success('Gig cancelled', { description: 'Applicants have been notified. You can post a new gig anytime.' })
      setConfirmCancel(false)
      await refreshAll()
    } catch (e) {
      toast.error('Could not cancel gig', { description: e instanceof Error ? e.message : 'Please try again.' })
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
        <div className="flex items-center gap-2">
          <Link to={`/jobs/${job.id}`} className="font-bold leading-snug hover:text-primary">
            {job.title}
          </Link>
          {job.status === 'OPEN' && (
            <Link
              to={`/jobs/${job.id}/edit`}
              className="text-xs font-medium text-muted-foreground hover:text-primary underline underline-offset-4"
              aria-label={`Edit ${job.title}`}
            >
              Edit
            </Link>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-bold text-success dark:text-emerald-400">{formatPay(job.amount, job.compensationType)}</span>
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
              {visibleApps.map((app) => (
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
              className="mt-2 h-10 font-semibold"
              onClick={() => setConfirmCancel(true)}
              disabled={cancelling}
            >
              <X className="size-4" />
              Cancel gig
            </Button>
          )}
        </div>
      ) : null}

      {accepted ? (
        <ReviewDialog job={job} worker={accepted.applicant} open={reviewOpen} onOpenChange={setReviewOpen} />
      ) : null}
      <ConfirmDialog
        open={confirmCancel}
        onOpenChange={setConfirmCancel}
        intent="destructive"
        title="Cancel this gig?"
        description="This will stop new pitches and notify applicants. This action cannot be undone."
        confirmLabel="Yes, cancel gig"
        cancelLabel="Keep gig"
        loading={cancelling}
        onConfirm={cancel}
      />
    </article>
  )
}

function ApplicantRow({ app, job }: { app: ApplicationDTO; job: JobPostDTO }) {
  const refreshAll = useRefreshAll()
  const { user, spendGigCoin } = useAuth()
  const [screening, setScreening] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [declining, setDeclining] = useState(false)
  const [confirmDecline, setConfirmDecline] = useState(false)
  const [confirmScreen, setConfirmScreen] = useState(false)
  const isInvited = app.status === 'INVITED'
  const isScreening = app.status === 'SCREENING'
  const isAccepted = app.status === 'ACCEPTED'
  const contactUnlocked = isScreening || isAccepted
  const dimmed = !contactUnlocked && job.status !== 'OPEN'

  async function confirmScreenFn() {
    if ((user?.gigCoins ?? 0) < 1) return
    const ok = await spendGigCoin(1)
    if (!ok) return
    setConfirmScreen(false)
    await screen()
  }

  async function screen() {
    setScreening(true)
    try {
      await api.applications.screen(app.id)
      toast.success(`Screening ${app.applicant.fullName.split(' ')[0]}`, {
        description: 'Direct messaging and contact details are now unlocked.',
      })
      await refreshAll()
    } catch (e) {
      toast.error('Could not screen applicant', { description: e instanceof Error ? e.message : 'Please try again.' })
    } finally {
      setScreening(false)
    }
  }

  async function accept() {
    setAccepting(true)
    try {
      await api.applications.accept(app.id)
      toast.success(`${app.applicant.fullName.split(' ')[0]} is hired!`, {
        description: 'Contact details are now unlocked so you can coordinate.',
      })
      await refreshAll()
    } catch (e) {
      toast.error('Could not accept applicant', { description: e instanceof Error ? e.message : 'Please try again.' })
    } finally {
      setAccepting(false)
    }
  }

  async function decline() {
    setDeclining(true)
    try {
      await api.applications.decline(app.id)
      toast.success('Applicant declined', { description: 'They have been notified of your decision.' })
      setConfirmDecline(false)
      await refreshAll()
    } catch (e) {
      toast.error('Could not decline applicant', { description: e instanceof Error ? e.message : 'Please try again.' })
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
<div className="flex flex-col gap-0.5">
              <div className="inline-flex items-center gap-2">
                <RatingInline average={app.applicant.ratingAverage} count={app.applicant.ratingCount} />
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {app.applicantCompletedGigs ?? app.applicant.completedGigs ?? app.applicant.ratingCount} gigs completed
                </span>
              </div>
              <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                <MapPin className="size-3 shrink-0" aria-hidden="true" />
                {app.applicant.barangay}
              </span>
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
      {contactUnlocked && app.applicantContact ? (
        <ContactBar contact={app.applicantContact} name={app.applicant.fullName} />
      ) : null}
      {contactUnlocked ? (
        <Link to={`/messages/${app.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-10 w-full font-bold')}>
          <MessageCircle aria-hidden="true" />
          Message
        </Link>
      ) : isInvited && job.status === 'OPEN' ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">
             🔒 Invite is still not accepted by the Gigster, please wait.
          </p>
           <div className="grid grid-cols-[1fr_1.35fr] gap-2">
             <Button
               variant="destructive"
               className="h-10 px-3 text-xs font-bold whitespace-nowrap sm:text-sm"
               onClick={() => setConfirmDecline(true)}
               disabled={declining}
             >
               <X className="size-4 shrink-0" />
               Cancel Invite
             </Button>
             <Button
               className="h-10 px-3 text-xs font-bold whitespace-nowrap sm:text-sm bg-muted text-muted-foreground"
               disabled
             >
               <Lock className="size-4 shrink-0" />
               Screen (1 Coin)
             </Button>
           </div>
        </div>
      ) : app.status === 'PENDING' && job.status === 'OPEN' ? (
        <>
          <p className="text-xs text-muted-foreground">
            🔒 Spend 1 GigCoin to screen this applicant and unlock chat &amp; contact details
          </p>
          <div className="grid grid-cols-[1fr_1.35fr] gap-2">
            <Button
              variant="destructive"
              className="h-10 px-3 text-xs font-bold whitespace-nowrap sm:text-sm"
              onClick={() => setConfirmDecline(true)}
              disabled={declining || screening}
            >
              <X className="size-4 shrink-0" />
              Reject
            </Button>
            <Button
              className="h-10 px-3 text-xs font-bold whitespace-nowrap sm:text-sm"
              onClick={() => setConfirmScreen(true)}
              disabled={screening || declining}
            >
              {screening ? (
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
              ) : (
                <UserCheck className="size-4 shrink-0" aria-hidden="true" />
              )}
              Screen (1 Coin)
            </Button>
          </div>
        </>
      ) : null}

      {isScreening ? (
        <div className="grid grid-cols-[1fr_1.35fr] gap-2">
          <Button
            variant="destructive"
            className="h-10 px-3 text-xs font-bold whitespace-nowrap sm:text-sm"
            onClick={() => setConfirmDecline(true)}
            disabled={declining || accepting}
          >
            <X className="size-4 shrink-0" />
            Reject
          </Button>
          <Button
            className="h-10 bg-success px-3 text-xs font-bold whitespace-nowrap hover:bg-success/90 sm:text-sm"
            onClick={accept}
            disabled={accepting || declining}
          >
            {accepting ? (
              <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
            ) : (
              <UserCheck className="size-4 shrink-0" aria-hidden="true" />
            )}
            Accept Applicant
          </Button>
        </div>
      ) : null}

      <ConfirmDialog
        open={confirmDecline}
        onOpenChange={setConfirmDecline}
        intent="destructive"
        title={isInvited ? `Cancel invitation to ${app.applicant.fullName.split(' ')[0]}?` : `Reject ${app.applicant.fullName.split(' ')[0]}'s pitch?`}
        description={isInvited
          ? 'They will be notified that the invitation has been cancelled.'
          : 'They will be notified and removed from your active applicants for this gig.'}
        confirmLabel={isInvited ? 'Cancel invitation' : 'Reject applicant'}
        cancelLabel={isInvited ? 'Keep invitation' : 'Keep for now'}
        loading={declining}
        onConfirm={decline}
      />

      {confirmScreen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-card p-5">
            {(user?.gigCoins ?? 0) >= 1 ? (
              <>
                <p className="text-sm font-semibold">
                  Screen {app.applicant.fullName} using 1 GigCoin? This unlocks direct messaging and contact details so you
                  can interview them before accepting.
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {user?.gigCoins ?? 0} GigCoins -&gt; {(user?.gigCoins ?? 0) - 1} GigCoins
                </p>
                <div className="mt-4 flex gap-2">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmScreen(false)}>Cancel</Button>
                  <Button className="flex-1" onClick={confirmScreenFn} disabled={screening}>Confirm &amp; Spend 1 GigCoin</Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm font-semibold">Insufficient GigCoins</p>
                <Button className="mt-4 w-full" onClick={() => setConfirmScreen(false)}>Top Up GigCoins</Button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AppliedTab() {
  const { data, isLoading } = useMyApplications()
  const refreshAll = useRefreshAll()
  const navigate = useNavigate()
  const [cancelTarget, setCancelTarget] = useState<ApplicationDTO | null>(null)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [responding, setResponding] = useState<{ id: number; accept: boolean } | null>(null)
  const [filter, setFilter] = useState<'ALL' | ApplicationStatus>('ALL')
  const apps = data?.content ?? []
  const filteredApps =
    filter === 'ALL'
      ? apps
      : filter === 'PENDING'
        ? apps.filter((a) => a.status === 'PENDING' || a.status === 'INVITED')
        : apps.filter((a) => a.status === filter)
  const cancelTargetTitle = useMemo(() => cancelTarget?.job?.title ?? 'this gig', [cancelTarget])

  if (isLoading) return <Loading />
  if (apps.length === 0) {
    return <Empty title="No pitches sent yet" body="Find a gig nearby and send your first pitch." cta="Explore gigs" to="/explore" />
  }

  async function cancel() {
    if (!cancelTarget) return
    setCancellingId(cancelTarget.id)
    try {
      await api.applications.cancel(cancelTarget.id)
      toast.success('Application cancelled', {
        description: `Your pitch for "${cancelTargetTitle}" has been withdrawn.`,
        action: {
          label: 'Explore gigs',
          onClick: () => navigate('/explore'),
        },
      })
      setCancelTarget(null)
      await refreshAll()
    } catch (e) {
      toast.error('Could not cancel application', { description: e instanceof Error ? e.message : 'Please try again.' })
    } finally {
      setCancellingId(null)
    }
  }

  async function respond(app: ApplicationDTO, accept: boolean) {
    setResponding({ id: app.id, accept })
    try {
      await api.applications.respondToInvitation(app.id, accept)
      toast.success(accept ? 'Invitation accepted' : 'Invitation declined', {
        description: accept
          ? 'You are now in the applicant list. The client can screen or accept you next.'
          : 'You have been removed from this gig.',
      })
      await refreshAll()
    } catch (e) {
      toast.error(accept ? 'Could not accept invitation' : 'Could not decline invitation', {
        description: e instanceof Error ? e.message : 'Please try again.',
      })
    } finally {
      setResponding(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-muted-foreground uppercase tracking-wide">Filter by status</h2>
        <Select
          value={filter}
          onValueChange={(v) => setFilter((v as 'ALL' | ApplicationStatus) ?? 'ALL')}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All</SelectItem>
            <SelectItem value="INVITED">Invited</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="SCREENING">Screening</SelectItem>
            <SelectItem value="ACCEPTED">Accepted</SelectItem>
            <SelectItem value="REJECTED">Declined</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <ul className="flex flex-col gap-3">
        {filteredApps.length === 0 ? (
          <li className="rounded-2xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
            No {APPLICATION_STATUS_LABELS[filter as ApplicationStatus].toLowerCase()} applications.
          </li>
        ) : null}
        {filteredApps.map((app) => (
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
                    <span className="font-bold text-success dark:text-emerald-400">{formatPay(app.job.amount, app.job.compensationType)}</span>
                  </div>
                </>
              ) : null}
              <p className="rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground italic">{`"${app.pitch}"`}</p>
               {(app.status === 'SCREENING' || app.status === 'ACCEPTED') && app.posterContact && app.job ? (
                 app.job.status === 'COMPLETED' ? (
                   <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                     <Star className="size-4 fill-amber-400 text-amber-400" aria-hidden="true" />
                     Gig completed. Great work!
                   </p>
                 ) : (
                   <ContactBar contact={app.posterContact} name={app.job.poster.fullName} />
                 )
               ) : app.status === 'INVITED' ? (
                 <>
                   <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 dark:border-amber-800/40 dark:bg-amber-900/20 dark:text-amber-300">
                     The client invited you to apply for this gig.
                   </p>
                   <p className="text-xs text-muted-foreground">🔒 Messaging & contact details unlock once the client screens or accepts you.</p>
                 </>
               ) : app.status === 'PENDING' ? (
                 <p className="text-xs text-muted-foreground">🔒 Messaging & contact details unlock once the client screens or accepts your application.</p>
               ) : null}
               <div className="flex gap-2">
                 {app.status === 'INVITED' ? (
                   <div className="grid w-full grid-cols-2 gap-2">
                     <Button
                       variant="destructive"
                       className="h-10 font-bold"
                       onClick={() => respond(app, false)}
                       disabled={responding?.id === app.id}
                     >
                       {responding?.id === app.id && !responding.accept ? (
                         <Loader2 className="animate-spin" aria-hidden="true" />
                       ) : (
                         <X className="size-4" />
                       )}
                       Decline
                     </Button>
                     <Button
                       className="h-10 font-bold"
                       onClick={() => respond(app, true)}
                       disabled={responding?.id === app.id}
                     >
                       {responding?.id === app.id && responding.accept ? (
                         <Loader2 className="animate-spin" aria-hidden="true" />
                       ) : (
                         <UserCheck className="size-4" />
                       )}
                       Accept Invitation
                     </Button>
                   </div>
                 ) : null}
                 {app.status === 'SCREENING' || app.status === 'ACCEPTED' ? (
                   <Link to={`/messages/${app.id}`} className={cn(buttonVariants({ variant: 'outline' }), 'h-10 w-full font-bold')}>
                     <MessageCircle aria-hidden="true" />
                     {app.job ? `Message ${app.job.poster.fullName.split(' ')[0]}` : 'Message client'}
                   </Link>
                 ) : null}
                 {app.status === 'PENDING' || app.status === 'SCREENING' ? (
                   <Button
                     variant="destructive"
                     className="h-10 w-full font-bold"
                     onClick={() => setCancelTarget(app)}
                     disabled={cancellingId === app.id}
                   >
                     {cancellingId === app.id ? <Loader2 className="animate-spin" aria-hidden="true" /> : <X className="size-4" />}
                     Cancel
                   </Button>
                 ) : null}
               </div>
            </article>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={cancelTarget != null}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        intent="destructive"
        title="Cancel your application?"
        description={`Your pitch for "${cancelTargetTitle}" will be withdrawn. You can apply again later if the gig is still open.`}
        confirmLabel="Cancel application"
        cancelLabel="Keep application"
        loading={cancellingId != null}
        onConfirm={cancel}
      />
    </div>
  )
}
