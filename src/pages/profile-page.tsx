import { useRef, useState } from 'react'
import {
  BadgeCheck,
  Building2,
  Calendar,
  Camera,
  Clock,
  Coins,
  Infinity as InfinityIcon,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  RefreshCw,
  Send,
  ShieldAlert,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSWRConfig } from 'swr'
import { Button } from '@/components/ui/button'
import { SkillTag, VerifiedBadge } from '@/components/badges'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EditProfileDialog } from '@/components/edit-profile-dialog'
import { PageHeader } from '@/components/layout/app-shell'
import { Stars } from '@/components/rating'
import { RequireAuth } from '@/components/require-auth'
import { UserAvatar } from '@/components/user-avatar'
import { useUserReviews } from '@/hooks/use-api'
import { ME_KEY, useAuth } from '@/lib/auth'
import { timeAgo, WEEKDAYS, CATEGORY_LABELS, formatMemberSince, RATE_TYPE_VIEW_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import { tokenStorage } from '@/services/token'
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
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  if (!user) return null

  async function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const base = import.meta.env.VITE_API_BASE_URL ?? 'https://kanto-jobs-backend.onrender.com/api/v1'
      const fd = new FormData()
      fd.append('file', file)
      const token = tokenStorage.get()
      const res = await fetch(`${base}/uploads/profile`, { method: 'POST', body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const text = await res.text()
      let json: any = {}
      try { json = text ? JSON.parse(text) : {} } catch {}
      if (!res.ok) throw new Error(json?.message || 'Upload failed')
      await api.users.updateMe({ profileImage: String(json.url ?? json.profileImage ?? '') })
      await mutate([ME_KEY, tokenStorage.get()])
      toast.success('Profile photo updated')
    } catch (err) {
      toast.error('Could not update photo', {
        description: err instanceof Error ? err.message : 'Please try again.',
      })
    } finally {
      setUploading(false)
    }
    e.target.value = ''
  }

  const address = user.address ?? [user.barangay, user.city].filter(Boolean).join(', ')
  const memberSince = formatMemberSince(user.createdAt)
  const gigCoins = user.gigCoins ?? 0

  return (
    <div className="flex flex-col gap-4 px-4 pt-4 pb-6">
      <section className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-6">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <UserAvatar user={user} className="size-[70px] text-2xl" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 rounded-full bg-primary p-1.5 text-primary-foreground shadow disabled:opacity-60"
              aria-label="Change profile picture"
            >
              <Camera className="size-3.5" aria-hidden="true" />
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
          </div>

          <div className="flex min-w-0 flex-1 flex-col items-start gap-1 text-left">
            <h2 className="text-xl font-extrabold">{user.fullName}</h2>
            {address ? (
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{address}</span>
              </p>
            ) : null}
            <div className="mt-0.5">
              {user.phoneVerified ? (
                <VerifiedBadge />
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                  Phone not verified
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            {memberSince ? (
              <span className="inline-flex items-center gap-1">
                <Calendar className="size-3.5" aria-hidden="true" />
                Member since {memberSince}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-semibold text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Coins className="size-3.5" aria-hidden="true" />
              {gigCoins} GigCoin{gigCoins !== 1 ? 's' : ''}
            </span>
          </div>

          {user.bio ? (
            <p className="text-pretty text-sm leading-relaxed text-foreground/80">{user.bio}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">No bio added yet.</p>
          )}
        </div>

        <Button variant="outline" className="h-10 w-full" onClick={() => setEditing(true)}>
          <Pencil aria-hidden="true" />
          Edit Profile
        </Button>
      </section>

      <Stats user={user} />

      <MerchantCard user={user} />

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

      <WorkPreferences user={user} />

      <ContactCard user={user} />

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
        <EditProfileDialog user={user} open={editing} onOpenChange={setEditing} />
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
    { label: 'Reviews', value: String(user.ratingCount ?? 0) },
    { label: 'Gigs done', value: String(user.completedGigs ?? 0) },
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

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  const empty = !value || value === 'Not set'
  return (
    <li className="flex items-center gap-3 py-2 first:pt-0 last:pb-0">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <p className={cn('truncate text-sm', empty ? 'italic text-muted-foreground' : 'font-medium text-foreground')}>
          {value}
        </p>
      </div>
    </li>
  )
}

function ContactCard({ user }: { user: UserDTO }) {
  const rows: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Mail className="size-4" aria-hidden="true" />, label: 'Email', value: user.email ?? 'Not set' },
    { icon: <Phone className="size-4" aria-hidden="true" />, label: 'Phone', value: user.phone ?? 'Not set' },
    {
      icon: <Send className="size-4" aria-hidden="true" />,
      label: 'Viber',
      value: user.viberNumber ?? 'Not set',
    },
    {
      icon: <MessageCircle className="size-4" aria-hidden="true" />,
      label: 'Messenger',
      value: user.messengerUsername ?? 'Not set',
    },
  ]

  return (
    <section aria-labelledby="contact-heading" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 id="contact-heading" className="text-sm font-bold">
        Contact &amp; Social Details
      </h2>
      <ul className="flex flex-col divide-y divide-border">
        {rows.map((r) => (
          <ContactRow key={r.label} icon={r.icon} label={r.label} value={r.value} />
        ))}
      </ul>
    </section>
  )
}

function WorkPreferences({ user }: { user: UserDTO }) {
  const safeDays = user.availableDays ?? []
  const anytime = safeDays.length === WEEKDAYS.length
  const selected = anytime ? [] : WEEKDAYS.filter((d) => safeDays.includes(d))

  const rateLabel = user.rateType ? RATE_TYPE_VIEW_LABELS[user.rateType] : 'Not specified'

  let negotiableLabel = 'Not specified'
  let negotiableClass = 'border-border bg-secondary text-muted-foreground'
  if (user.isNegotiable === true) {
    negotiableLabel = 'Negotiable'
    negotiableClass = 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800/30 dark:bg-amber-900/10 dark:text-amber-300'
  } else if (user.isNegotiable === false) {
    negotiableLabel = 'Fixed rate'
    negotiableClass = 'border-border bg-secondary text-foreground'
  }

  return (
    <section aria-labelledby="work-heading" className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
      <h2 id="work-heading" className="text-sm font-bold">
        Work Preferences &amp; Rates
      </h2>

      <div className="flex flex-col gap-1.5">
        <p className="text-[11px] font-medium text-muted-foreground">Working Days</p>
        {safeDays.length === 0 ? (
          <p className="text-sm italic text-muted-foreground">Not set</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {anytime ? (
              <span className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 dark:border-orange-400/30 dark:bg-orange-500/15 dark:text-orange-300">
                Anytime
              </span>
            ) : (
              selected.map((day) => (
                <span
                  key={day}
                  className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600"
                >
                  {day}
                </span>
              ))
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
          <Clock className="size-3.5" aria-hidden="true" />
          {rateLabel}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold',
            negotiableClass,
          )}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
          {negotiableLabel}
        </span>
      </div>
    </section>
  )
}

function MerchantCard({ user }: { user: UserDTO }) {
  const isMerchant =
    Boolean(user.isBusinessMerchant) || user.merchantId != null || Boolean(user.merchantPartnershipActive)
  if (!isMerchant) return null

  const name = user.merchantBusinessName ?? user.merchantName ?? 'Business merchant'

  return (
    <section aria-labelledby="merchant-heading" className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-800/30 dark:bg-amber-900/10">
      <h2 id="merchant-heading" className="flex items-center gap-1.5 text-sm font-bold text-amber-800 dark:text-amber-300">
        <Building2 className="size-4" aria-hidden="true" />
        {name}
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold',
            user.merchantPartnershipActive
              ? 'bg-success-soft text-emerald-700 dark:text-emerald-300'
              : 'bg-secondary text-muted-foreground',
          )}
        >
          <BadgeCheck className="size-3.5" aria-hidden="true" />
          {user.merchantPartnershipActive ? 'Partnership active' : 'Partnership inactive'}
        </span>
        {user.unlimitedGigsterScreening ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-semibold text-orange-700 dark:text-orange-300">
            <InfinityIcon className="size-3.5" aria-hidden="true" />
            Unlimited Gigster Screening
          </span>
        ) : null}
      </div>
    </section>
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