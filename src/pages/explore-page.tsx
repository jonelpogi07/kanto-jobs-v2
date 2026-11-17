import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router'
import { Search, SearchX } from 'lucide-react'
import { CategoryPills, FilterButton, LocationPicker, type FeedFilters } from '@/components/explore/explore-controls'
import { BrandLogo } from '@/components/brand-logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { JobCard, JobCardSkeleton } from '@/components/job-card'
import { UserAvatar } from '@/components/user-avatar'
import { useJobSearch } from '@/hooks/use-api'
import { useAuth } from '@/lib/auth'
import type { JobCategory } from '@/types'

export function ExplorePage() {
  const { user } = useAuth()
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [category, setCategory] = useState<JobCategory | undefined>()
  const [filters, setFilters] = useState<FeedFilters>({ maxDistanceKm: undefined, minPay: undefined })

  const { data, isLoading, error } = useJobSearch({ q: deferredQuery, category, ...filters })
  const jobs = data?.content ?? []
  const urgentCount = jobs.filter((j) => j.timing === 'URGENT').length

  return (
    <>
      <header className="sticky top-0 z-30 flex flex-col gap-3 border-b border-border bg-background/95 px-4 pt-4 pb-3 backdrop-blur">
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
      </header>

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
    </>
  )
}
