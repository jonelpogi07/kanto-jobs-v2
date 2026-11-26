import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router'
import { toast } from 'sonner'
import { Search, SearchX, X, MapPin, ChevronDown } from 'lucide-react'
import { CategoryPills, FilterButton, LocationPicker, type FeedFilters } from '@/components/explore/explore-controls'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { JobCard, JobCardSkeleton } from '@/components/job-card'
import { UserAvatar } from '@/components/user-avatar'
import { buttonVariants } from '@/components/ui/button'
import { useJobSearch, useMyJobs, useNearbyGigsters, useRefreshAll } from '@/hooks/use-api'
import { formatPay, formatSchedule, CATEGORY_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuth } from '@/lib/auth'
import { api } from '@/services/api'
import type { JobCategory, ApplicationDTO, NearbyGigsterDTO } from '@/types'
import { UrgencyBadge, VerifiedBadge } from '@/components/badges'
import { RatingInline } from '@/components/rating'

function initialsOf(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

export function ExplorePage() {
  const { user } = useAuth()
  const [tab, setTab] = useState<'gigs' | 'gigsters'>('gigs')
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [category, setCategory] = useState<JobCategory | undefined>()
  const [filters, setFilters] = useState<FeedFilters>({ maxDistanceKm: undefined, minPay: undefined, availableDays: [], rateType: [] })
  const [gigsterSort, setGigsterSort] = useState<'recommended' | 'rating' | 'completed'>('recommended')
  const [sortOpen, setSortOpen] = useState(false)
  const sortRef = useRef<HTMLDivElement>(null)
  const [inviteTargetGigster, setInviteTargetGigster] = useState<NearbyGigsterDTO | null>(null)
  const [invitingGigId, setInvitingGigId] = useState<number | null>(null)
  const [appsByGig, setAppsByGig] = useState<Record<number, ApplicationDTO[]>>({})

  const { data: myJobsData } = useMyJobs()
  const openGigs = useMemo(() => myJobsData?.content.filter((j) => j.status === 'OPEN') ?? [], [myJobsData])
  const refreshAll = useRefreshAll()

  useEffect(() => {
    if (!sortOpen) return
    function onDown(e: MouseEvent) {
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) setSortOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [sortOpen])

  const { data, isLoading, error } = useJobSearch({ q: deferredQuery, category, ...filters })

  const { data: nearbyData } = useNearbyGigsters(
    tab === 'gigsters' ? { category } : null,
  )
  const gigsters = nearbyData?.gigsters ?? []

  useEffect(() => {
    if (!inviteTargetGigster) {
      setAppsByGig({})
      return
    }
    let cancelled = false
    Promise.all(openGigs.map(async (g) => [g.id, await api.jobs.applications(g.id)] as const)).then((results) => {
      if (cancelled) return
      const map: Record<number, ApplicationDTO[]> = {}
      for (const [id, apps] of results) map[id] = apps
      setAppsByGig(map)
    })
    return () => {
      cancelled = true
    }
  }, [inviteTargetGigster, openGigs])
  const jobs = data?.content ?? []
  const urgentCount = jobs.filter((j) => j.timing === 'URGENT').length

  const GLOBAL_MEAN_RATING = gigsters.length
    ? gigsters.reduce((s, g) => s + g.ratingAverage, 0) / gigsters.length
    : 0
  const MIN_RATINGS = 10
  const bayesianRating = (g: NearbyGigsterDTO) => {
    const v = Math.max(g.completedGigs, 1)
    return (v / (v + MIN_RATINGS)) * g.ratingAverage + (MIN_RATINGS / (v + MIN_RATINGS)) * GLOBAL_MEAN_RATING
  }

  const needle = deferredQuery.trim().toLowerCase()
  const filteredGigsters = gigsters
    .filter((g) => {
      if (category && !g.skills.includes(category)) return false
      if (!needle) return true
      return [g.fullName, g.barangay, g.city].some((f) => f.toLowerCase().includes(needle))
    })
    .sort((a, b) => {
      if (gigsterSort === 'rating') {
        const weightedScore = (g: NearbyGigsterDTO) => ((g.ratingCount * g.ratingAverage) + (10 * 4.5)) / (g.ratingCount + 10)
        const diff = weightedScore(b) - weightedScore(a)
        if (diff !== 0) return diff
        return b.ratingCount - a.ratingCount
      }
      if (gigsterSort === 'completed') {
        if (b.completedGigs !== a.completedGigs) return b.completedGigs - a.completedGigs
        return b.ratingAverage - a.ratingAverage
      }
      const scoreA = bayesianRating(a) * 20 + Math.sqrt(a.completedGigs)
      const scoreB = bayesianRating(b) * 20 + Math.sqrt(b.completedGigs)
      return scoreB - scoreA
    })

  async function handleInvite(gigId: number) {
    if (!inviteTargetGigster) return
    setInvitingGigId(gigId)
    try {
      await api.jobs.inviteGigsterToGig(gigId, {
        id: inviteTargetGigster.id,
        name: inviteTargetGigster.fullName,
        avatarInitials: initialsOf(inviteTargetGigster.fullName),
        rating: inviteTargetGigster.ratingAverage,
        completedGigs: inviteTargetGigster.completedGigs,
        barangay: inviteTargetGigster.barangay,
        skills: inviteTargetGigster.skills as JobCategory[],
        phone: undefined,
      })
      toast.success(`Invitation sent to ${inviteTargetGigster.fullName}!`)
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
          <FilterButton filters={filters} onChange={setFilters} mode={tab} />
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
          <div className="flex items-center justify-between">
            <h2 id="gigsters-heading" className="text-base font-extrabold">
              {filteredGigsters.length} gigsters nearby
            </h2>
            <div ref={sortRef} className="relative">
              <button
                type="button"
                onClick={() => setSortOpen((o) => !o)}
                className="flex h-8 items-center gap-1.5 rounded-xl border border-border bg-card px-2.5 text-xs font-medium outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50"
                aria-label="Sort gigsters"
                aria-haspopup="listbox"
                aria-expanded={sortOpen}
              >
                {gigsterSort === 'recommended' ? 'Recommended' : gigsterSort === 'rating' ? 'Highest Rating' : 'Most Gigs Completed'}
                <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
              </button>
              {sortOpen ? (
                <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-xl border border-border bg-card shadow-lg">
                  {([
                    { value: 'recommended', label: 'Recommended' },
                    { value: 'rating', label: 'Highest Rating' },
                    { value: 'completed', label: 'Most Gigs Completed' },
                  ] as const).map((opt) => {
                    const active = gigsterSort === opt.value
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setGigsterSort(opt.value)
                          setSortOpen(false)
                        }}
                        className={cn(
                          'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs font-medium hover:bg-secondary',
                          active && 'bg-orange-50 text-orange-600',
                        )}
                      >
                        <span>{opt.label}</span>
                        {active ? <span aria-hidden="true">✓</span> : null}
                      </button>
                    )
                  })}
                </div>
              ) : null}
            </div>
          </div>
          {filteredGigsters.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
              <SearchX className="size-8 text-muted-foreground" aria-hidden="true" />
              <p className="font-semibold">No gigsters found nearby</p>
              <p className="text-sm text-muted-foreground">Try widening your area or check back later.</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3 pb-4">
              {filteredGigsters.map((g) => (
                <li key={g.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary shrink-0">
                      {initialsOf(g.fullName)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate font-bold text-base">{g.fullName}</span>
                        {g.phoneVerified && <VerifiedBadge compact />}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <RatingInline average={g.ratingAverage} count={g.ratingCount} />
                        <span>{g.completedGigs} gigs completed</span>
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 shrink-0" aria-hidden="true" />
                          {g.barangay}, {g.city}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {g.skills.map((s) => (
                      <span key={s} className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold">{CATEGORY_LABELS[s as JobCategory] ?? s}</span>
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
          )}
        </section>
      )}

      {inviteTargetGigster && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-labelledby="invite-modal-title">
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-center justify-between">
              <h2 id="invite-modal-title" className="text-lg font-bold">
                Invite {inviteTargetGigster.fullName} to a Gig
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
                {openGigs.map((gig) => {
                  const apps = appsByGig[gig.id] ?? []
                  const norm = (s?: string | null) => s?.trim().toLowerCase()
                  const match = apps.find((app) => {
                    const st = app.status.toLowerCase()
                    if (!['invited', 'pending', 'screening', 'accepted'].includes(st)) return false
                    return (
                      app.applicant.id === inviteTargetGigster!.id ||
                      norm(app.applicant.fullName) === norm(inviteTargetGigster!.fullName)
                    )
                  })
                  const already = !!match
                  const badge = match
                    ? match.status.toLowerCase() === 'invited'
                      ? 'Already Invited'
                      : 'Already Applied'
                    : null
                  return (
                    <li key={gig.id}>
                      <button
                        type="button"
                        className={cn(
                          'w-full text-left rounded-xl border border-border bg-background p-3 hover:bg-secondary/50 transition disabled:opacity-50 disabled:cursor-not-allowed',
                          already && 'pointer-events-none opacity-60',
                        )}
                        onClick={() => handleInvite(gig.id)}
                        disabled={invitingGigId === gig.id || already}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="font-semibold truncate">{gig.title}</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                              <span className="font-bold text-success dark:text-emerald-400">{formatPay(gig.amount, gig.compensationType)}</span>
                              <UrgencyBadge timing={gig.timing} />
                              <span>{gig.barangay}, {gig.city.split(',')[0]}</span>
                              <span>{formatSchedule(gig)}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            {badge ? (
                              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-bold text-muted-foreground">{badge}</span>
                            ) : null}
                            {invitingGigId === gig.id && (
                              <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                                <span className="size-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" aria-hidden="true" />
                                Inviting...
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  )
}
