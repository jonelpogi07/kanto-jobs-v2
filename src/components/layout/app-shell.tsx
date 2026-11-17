import { NavLink, Outlet } from 'react-router'
import { Briefcase, Compass, MessageCircle, PlusCircle, UserRound } from 'lucide-react'
import { useChatThreads } from '@/hooks/use-api'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { to: '/explore', label: 'Explore', icon: Compass },
  { to: '/post-job', label: 'Post Gig', icon: PlusCircle },
  { to: '/my-gigs', label: 'My Gigs', icon: Briefcase },
  { to: '/messages', label: 'Inbox', icon: MessageCircle },
  { to: '/profile', label: 'Profile', icon: UserRound },
]

export function AppShell() {
  return (
    <div className="min-h-dvh bg-background sm:py-6">
      <div className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background sm:min-h-[calc(100dvh-3rem)] sm:overflow-hidden sm:rounded-[2rem] sm:border sm:border-border sm:shadow-xl">
        <main className="flex flex-1 flex-col pb-20">
          <Outlet />
        </main>
        <BottomNav />
      </div>
    </div>
  )
}

function BottomNav() {
  const { data: threads } = useChatThreads()
  const unread = threads?.reduce((total, thread) => total + thread.unreadCount, 0) ?? 0

  return (
    <nav
      aria-label="Primary"
      className="pb-safe fixed inset-x-0 bottom-0 z-40 mx-auto w-full max-w-md border-t border-border bg-card/95 backdrop-blur sm:absolute"
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-muted-foreground transition-colors outline-none focus-visible:bg-secondary',
                  isActive && 'text-primary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'relative flex h-7 w-12 items-center justify-center rounded-full transition-colors',
                      isActive && 'bg-primary-soft',
                    )}
                  >
                    <Icon className="size-5" aria-hidden="true" strokeWidth={isActive ? 2.4 : 2} />
                    {to === '/messages' && unread > 0 ? (
                      <span className="absolute -top-1.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground ring-2 ring-card">
                        {unread > 9 ? '9+' : unread}
                      </span>
                    ) : null}
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-lg font-extrabold text-foreground">{title}</h1>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action}
    </header>
  )
}
