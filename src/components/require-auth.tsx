import { Link, Navigate, useLocation as useRouterLocation } from 'react-router'
import { Loader2, LockKeyhole } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'

export function loginHref(from: string) {
  return `/login?redirect=${encodeURIComponent(from)}`
}

export function RequireAuth({ children, title }: { children: React.ReactNode; title: string }) {
  const { isAuthenticated, isLoading } = useAuth()
  const { pathname } = useRouterLocation()

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
          <LockKeyhole className="size-6" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log in to post gigs, send pitches, and manage your applicants.
          </p>
        </div>
        <Link to={loginHref(pathname)} className={cn(buttonVariants({ size: 'lg' }), 'h-11 w-full max-w-xs')}>
          Log in or sign up
        </Link>
        <Link to="/explore" className="text-sm font-semibold text-muted-foreground underline-offset-4 hover:underline">
          Keep browsing gigs
        </Link>
      </div>
    )
  }

  return <>{children}</>
}

export function RedirectIfAuthed({ to, children }: { to: string; children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <Navigate to={to} replace /> : <>{children}</>
}
