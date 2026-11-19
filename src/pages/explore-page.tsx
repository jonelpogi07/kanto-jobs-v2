import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Search, SearchX, X } from 'lucide-react'
import { CategoryPills, FilterButton, LocationPicker, type FeedFilters } from '@/components/explore/explore-controls'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { JobCard, JobCardSkeleton } from '@/components/job-card'
import { UserAvatar } from '@/components/user-avatar'
import { buttonVariants } from '@/components/ui/button'
import { useJobSearch, useMyJobs, useRefreshAll } from '@/hooks/use-api'
import { formatPay, formatSchedule } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { api } from '@/services/api'
import type { JobCategory } from '@/types'
import { UrgencyBadge } from '@/components/badges'

type Gigster = {
  id: number
  name: string
  avatarInitials: string
  barangay: string
  rating: number
  completedGigs: number
  verified: boolean
  bio: string
  skills: JobCategory[]
  hourlyOrStartingRate: string
  phone: string
}

const GIGSTERS: Gigster[] = [
  { id: 1, name: 'Ramon Villanueva', avatarInitials: 'RV', barangay: 'Brgy. San Jose', rating: 4.8, completedGigs: 42, verified: true, bio: 'Reliable errands & delivery runner. May sariling motor.', skills: ['ERRANDS_DELIVERY'], hourlyOrStartingRate: '₱150/hr', phone: '09171234567' },
  { id: 2, name: 'Mark Aquino', avatarInitials: 'MA', barangay: 'Brgy. Maligaya', rating: 4.6, completedGigs: 28, verified: true, bio: 'Home repair & handyman. May sariling tools.', skills: ['HOME_REPAIR'], hourlyOrStartingRate: '₱500/job', phone: '09181234567' },
  { id: 3, name: 'Paolo Reyes', avatarInitials: 'PR', barangay: 'Brgy. Bagong Silang', rating: 4.9, completedGigs: 61, verified: true, bio: 'Cleaning specialist. Detalyado at masipag.', skills: ['CLEANING'], hourlyOrStartingRate: '₱300/job', phone: '09191234567' },
  { id: 4, name: 'Angela Cruz', avatarInitials: 'AC', barangay: 'Brgy. Tandang Sora', rating: 4.7, completedGigs: 35, verified: false, bio: 'Event assistant & admin support.', skills: ['EVENTS', 'DIGITAL_ADMIN'], hourlyOrStartingRate: '₱200/hr', phone: '09201234567' },
  { id: 5, name: 'Jose Dela Cruz', avatarInitials: 'JD', barangay: 'Brgy. Commonwealth', rating: 4.5, completedGigs: 19, verified: true, bio: 'Errands, delivery, at minor repairs.', skills: ['ERRANDS_DELIVERY', 'HOME_REPAIR'], hourlyOrStartingRate: '₱180/hr', phone: '09211234567' },
  { id: 6, name: 'Maria Santos', avatarInitials: 'MS', barangay: 'Brgy. Fairview', rating: 4.8, completedGigs: 53, verified: true, bio: 'Cleaning at home organizing expert.', skills: ['CLEANING'], hourlyOrStartingRate: '₱350/job', phone: '09221234567' },
]

export function ExplorePage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'gigs' | 'gigsters'>('gigs')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [category, setCategory] = useState<JobCategory | undefined>()
  const [filters, setFilters] = useState<FeedFilters>({ maxDistanceKm: undefined, minPay: undefined })
  const [inviteTargetGigster, setInviteTargetGigster] = useState<Gigster | null>(null)
  const [invitingGigId, setInvitingGigId] = useState<number | null>(null)

  const { data: myJobsData } = useMyJobs()
  const openGigs = myJobsData?.content.filter((j) => j.status === 'OPEN') ?? []
  const refreshAll = useRefreshAll()

  const { data, isLoading, error } = useJobSearch({ q: deferredQuery, category, ...filters })
  const jobs = data?.content ?? []
  const urgentCount = jobs.filter((j) => j.timing === 'URGENT').length

  const needle = deferredQuery.trim().toLowerCase()
  const filteredGigsters = GIGSTERS.filter((g) => {
    if (category && !g.skills.includes(category)) return false
    if (!needle) return true
    return [g.name, g.bio, g.barangay].some((f) => f.toLowerCase().includes(needle))
  })

  async function handleInvite(gigId: number) {
    if (!inviteTargetGigster) return
    setInvitingGigId(gigId)
    try {
      await api.jobs.inviteGigsterToGig(gigId, {
        id: inviteTargetGigster.id,
        name: inviteTargetGigster.name,
        avatarInitials: inviteTargetGigster.avatarInitials,
        rating: inviteTargetGigster.rating,
        completedGigs: inviteTargetGigster.completedGigs,
        barangay: inviteTargetGigster.barangay,
        skills: inviteTargetGigster.skills,
        bio: inviteTargetGigster.bio,
        phone: inviteTargetGigster.phone,
      })
      toast.success(`Invitation sent to ${inviteTargetGigster.name}!`)
      setInviteTargetGigster(null)
      await refreshAll()
    } catch (e) {
      toast.error('Could not send invitation', { description: e instanceof Error ? e.message : 'Please try again.' })
    } finally {
      setInvitingGigId(null)
    }
  }

  return (
    <>
      <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-background/95 px-4 pb-3 pt-[calc(env(safe-area-inset-top)+1rem)] backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Link
              to="/explore"
              aria-label="Kanto Jobs home"
              className="shrink-0 rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <BrandLogo size="sm" />
            </Link>
            <span className="h-6 w-px shrink-0 bg-border" aria-hidden="true" />
            <LocationPicker />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <Link to="/profile" aria-label="Your profile" className="shrink-0 rounded-full">
                <UserAvatar user={user} />
              </Link>
            ) : (
              <Link
                to="/login"
                className="shrink-0 rounded-full bg-foreground px-4 py-2 text-xs font-bold text-background hover:bg-foreground/90"
              >
                Log in
              </Link>
            )}
            <ThemeToggle variant="icon" aria-label="Appearance" />
          </div>
        </div>
        <div className="flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search gigs</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search delivery, linis, tutor..."
              className="h-11 w-full rounded-xl border border-border bg-card pr-3 pl-10 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </label>
          <FilterButton filters={filters} onChange={setFilters} />
        </div>
        <CategoryPills value={category} onChange={setCategory} />
        <div className="flex rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setTab('gigs')}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${tab === 'gigs' ? 'bg-background shadow' : 'text-muted-foreground'}`}
          >
            Find Gigs
          </button>
          <button
            type="button"
            onClick={() => setTab('gigsters')}
            className={`flex-1 rounded-full px-3 py-1.5 text-xs font-bold transition ${tab === 'gigsters' ? 'bg-background shadow' : 'text-muted-foreground'}`}
          >
            Find Gigsters
          </button>
        </div>
      </header>

      {tab === 'gigs' ? (
        <section aria-labelledby="feed-heading" className="flex flex-col gap-3 px-4 pt-4">
          <div className="flex items-baseline justify-between">
            <h2 id="feed-heading" className="text-base font-extrabold">
              {isLoading ? 'Finding gigs...' : `${data?.totalElements ?? 0} gigs nearby`}
            </h2>
            {urgentCount > 0 ? (
              <span className="text-xs font-semibold text-primary">{`${urgentCount} urgent today`}</span>
            ) : null}
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
              {error.message}
            </p>
          ) : isLoading ? (
            <>
              <JobCardSkeleton />
              <JobCardSkeleton />
              <JobCardSkeleton />
            </>
          ) : jobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-semibold">No gigs match yet</p>
              <p className="text-sm text-muted-foreground">Try another category, widen the distance, or post your own.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3 pb-4">
              {jobs.map((job) => (
                <li key={job.id}>
                  <JobCard job={job} />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        <section aria-labelledby="gigsters-heading" className="flex flex-col gap-3 px-4 pt-4">
          <h2 id="gigsters-heading" className="text-base font-extrabold">
            {filteredGigsters.length} gigsters nearby
          </h2>
          <ul className="flex flex-col gap-3 pb-4">
            {filteredGigsters.map((g) => (
              <li key={g.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {g.avatarInitials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold">{g.name}</span>
                      {g.verified ? <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">Verified</span> : null}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      ★ {g.rating} · {g.completedGigs} gigs · {g.barangay}
                    </div>
                  </div>
                  <span className="rounded-full bg-foreground px-2.5 py-1 text-xs font-bold text-background">{g.hourlyOrStartingRate}</span>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{g.bio}</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {g.skills.map((s) => (
                    <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{s}</span>
                  ))}
                </div>
                <button
                  type="button"
                  className="mt-3 w-full rounded-xl bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                  onClick={() => setInviteTargetGigster(g)}
                >
                  Invite to Gig
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {inviteTargetGigster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="invite-modal-title" className="text-lg font-bold">
                Invite {inviteTargetGigster.name} to a Gig
              </h2>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setInviteTargetGigster(null)}
                aria-label="Close modal"
              >
                <X className="size-5" aria-hidden="true" />
              </button>
            </div>
            {openGigs.length === 0 ? (
              <div className="mt-4 flex flex-col items-center gap-3 text-center text-sm text-muted-foreground">
                <p>You don&apos;t have any open gigs to invite this gigster to.</p>
                <Link to="/post-job" onClick={() => setInviteTargetGigster(null)} className={cn(buttonVariants(), 'mt-2')}>
                  Post a Gig
                </Link>
              </div>
            ) : (
              <ul className="mt-4 max-h-60 overflow-y-auto flex flex-col gap-2">
                {openGigs.map((gig) => (
                  <li key={gig.id}>
                    <button
                      type="button"
                      className="w-full text-left rounded-xl border border-border bg-background p-3 hover:bg-secondary/50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={() => handleInvite(gig.id)}
                      disabled={invitingGigId === gig.id}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{gig.title}</p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="font-bold text-success dark:text-emerald-400">{formatPay(gig.amount, gig.compensationType)}</span>
                            <UrgencyBadge timing={gig.timing} />
                            <span>{gig.barangay}</span>
                            <span>{formatSchedule(gig)}</span>
                          </div>
                        </div>
                        {invitingGigId === gig.id && (
                          <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                            <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                            Inviting...
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}
