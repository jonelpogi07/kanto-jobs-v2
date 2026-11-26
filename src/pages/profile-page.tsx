import { useEffect, useRef, useState } from 'react'
import { Camera, LogOut, MapPin, Pencil, ShieldAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SkillTag, VerifiedBadge, BusinessBadge } from '@/components/badges'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import { PageHeader } from '@/components/layout/app-shell'
import { Stars } from '@/components/rating'
import { RequireAuth } from '@/components/require-auth'
import { UserAvatar } from '@/components/user-avatar'
import { useUserReviews } from '@/hooks/use-api'
import { useSWRConfig } from 'swr'
import { useAuth, ME_KEY } from '@/lib/auth'
import { tokenStorage } from '@/services/token'
import { timeAgo, WEEKDAYS, CATEGORY_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { UserDTO } from '@/types'

export function ProfilePage() {
  return (
    <>
      <PageHeader title="Profile" />
      <RequireAuth title="Log in to view your profile">
        <ProfileContent />
      </RequireAuth>
    </>
  )
}

function ProfileContent() {
  const { user, signOut } = useAuth()
  const { mutate } = useSWRConfig()
  const [editing, setEditing] = useState(false)
  const [confirmLogout, setConfirmLogout] = useState(false)
  const [workingDays, setWorkingDays] = useState<string[]>(() => readWorkingDays(user?.id))
  const fileRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const saved = localStorage.getItem(`profileAvatar:${user?.id}`)
    if (saved && user && user.avatarUrl !== saved) {
      void mutate([ME_KEY, tokenStorage.get()], (u: any) => (u ? { ...u, avatarUrl: saved } : u), { revalidate: false })
    }
  }, [user?.id])
  useEffect(() => {
    if (!user?.id) return
    setWorkingDays(readWorkingDays(user.id))
  }, [user?.id])
  useEffect(() => {
    if (!user?.id) return
    const onStorage = (e: StorageEvent) => {
      if (e.key === `profileWorkingDays:${user.id}`) setWorkingDays(readWorkingDays(user.id))
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [user?.id])
  if (!user) return null

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      localStorage.setItem(`profileAvatar:${user!.id}`, dataUrl)
      void mutate([ME_KEY, tokenStorage.get()], (u: any) => (u ? { ...u, avatarUrl: dataUrl } : u), { revalidate: false })
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <section className="flex flex-col items-center gap-3 rounded-3xl border border-border bg-card p-6 text-center">
        <div className="relative">
          <UserAvatar user={user} className="size-24 text-3xl" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow"
            aria-label="Change profile picture"
          >
            <Camera className="size-3.5" aria-hidden="true" />
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
        </div>
        <div className="flex flex-col items-center gap-1">
          <h2 className="text-xl font-extrabold">{user.fullName}</h2>
          <p className="flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="size-3.5 text-primary" aria-hidden="true" />
            {`${user.barangay}, ${user.city}`}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          {user.phoneVerified ? (
            <VerifiedBadge />
          ) : (
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              <ShieldAlert className="size-3.5" aria-hidden="true" />
              Phone not verified
            </span>
          )}
          {user.isBusinessMerchant === true && user.merchantPartnershipActive === true ? (
            <BusinessBadge name={user.merchantBusinessName} />
          ) : null}
        </div>
        {user.bio ? <p className="text-pretty text-sm leading-relaxed text-foreground/80">{user.bio}</p> : null}
        <Button variant="outline" className="mt-1 h-10 w-full" onClick={() => setEditing(true)}>
          <Pencil aria-hidden="true" />
          Edit Profile
        </Button>
      </section>

      <Stats user={user} />

      <WorkingDays days={workingDays} />

      <section aria-labelledby="skills-heading" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
        <h2 id="skills-heading" className="text-sm font-bold">
          Skills
        </h2>
        {user.skills.length ? (
          <div className="flex flex-wrap gap-2">
            {user.skills.map((s) => (
              <SkillTag key={s}>{CATEGORY_LABELS[s as keyof typeof CATEGORY_LABELS] ?? s}</SkillTag>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Add skills so posters know what you can do.</p>
        )}
      </section>

      <Reviews user={user} />

      <Button
        variant="ghost"
        className="h-11 text-destructive hover:bg-destructive/10 hover:text-destructive"
        onClick={() => setConfirmLogout(true)}
      >
        <LogOut aria-hidden="true" />
        Log out
      </Button>

      {editing ? (
        <EditProfileDialog
          user={user}
          open={editing}
          onOpenChange={setEditing}
          onWorkingDaysChange={setWorkingDays}
        />
      ) : null}
      <ConfirmDialog
        open={confirmLogout}
        onOpenChange={setConfirmLogout}
        intent="destructive"
        title="Log out of KantoJobs?"
        description="You can sign back in anytime with your phone number."
        confirmLabel="Log out"
        cancelLabel="Stay signed in"
        onConfirm={() => {
          setConfirmLogout(false)
          signOut()
        }}
      />
    </div>
  )
}

function Stats({ user }: { user: UserDTO }) {
  const items = [
    { label: 'Rating', value: user.ratingCount ? user.ratingAverage.toFixed(1) : '—' },
    { label: 'Reviews', value: String(user.ratingCount) },
    { label: 'Gigs done', value: String(user.completedGigs) },
  ]
  return (
    <dl className="grid grid-cols-3 divide-x divide-border rounded-2xl border border-border bg-card py-3">
      {items.map((i) => (
        <div key={i.label} className="flex flex-col items-center gap-0.5">
          <dd className="text-xl font-extrabold">{i.value}</dd>
          <dt className="text-[11px] font-medium text-muted-foreground">{i.label}</dt>
        </div>
      ))}
    </dl>
  )
}

function Reviews({ user }: { user: UserDTO }) {
  const { data } = useUserReviews(user.id)
  const reviews = data?.content ?? []

  return (
    <section aria-labelledby="reviews-heading" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h2 id="reviews-heading" className="text-sm font-bold">
          Reviews
        </h2>
        {user.ratingCount ? (
          <span className="flex items-center gap-1.5 text-sm font-bold">
            <Stars value={user.ratingAverage} size="size-3.5" />
            {user.ratingAverage.toFixed(1)}
          </span>
        ) : null}
      </div>
      {reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reviews yet. Complete a gig to earn your first one.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {reviews.map((r) => (
            <li key={r.id} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <UserAvatar user={r.reviewer} className="size-8 text-xs" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold">{r.reviewer.fullName}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(r.createdAt)}</span>
                </div>
                <Stars value={r.rating} size="size-3" />
                {r.comment ? <p className="mt-1 text-sm text-foreground/80">{r.comment}</p> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function WorkingDays({ days }: { days: string[] }) {
  const safeDays = days ?? []
  const anytime = safeDays.length === WEEKDAYS.length
  const selected = anytime ? [] : WEEKDAYS.filter((d) => safeDays.includes(d))
  return (
    <section aria-labelledby="working-days-heading" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 id="working-days-heading" className="text-sm font-bold">
        Working Days
      </h2>
      {safeDays.length === 0 ? (
        <p className="text-sm text-muted-foreground">Not set</p>
      ) : (
        <div className="flex flex-wrap gap-1.5">
          {anytime ? (
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                'border-orange-200 bg-orange-50 text-orange-600 dark:bg-orange-500/15 dark:text-orange-300 dark:border-orange-400/30',
              )}
            >
              Anytime
            </span>
          ) : (
            selected.map((day) => (
              <span
                key={day}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
                  'border-orange-200 bg-orange-50 text-orange-600',
                )}
              >
                {day}
              </span>
            ))
          )}
        </div>
      )}
    </section>
  )
}

function readWorkingDays(id?: number): string[] {
  if (typeof window === 'undefined' || !id) return [...WEEKDAYS]
  try {
    const raw = localStorage.getItem(`profileWorkingDays:${id}`)
    if (raw) {
      const parsed = JSON.parse(raw) as string[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {
    // ignore corrupt storage
  }
  return [...WEEKDAYS]
}
