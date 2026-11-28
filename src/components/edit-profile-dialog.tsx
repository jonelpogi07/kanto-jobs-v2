import { useEffect, useRef, useState } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Loader2, X, Calendar, Plus, Camera } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ME_KEY } from '@/lib/auth'
import { RATE_TYPE_VIEW_LABELS, WEEKDAYS, CATEGORIES, CATEGORY_LABELS } from '@/lib/format'
import { api } from '@/services/api'
import { tokenStorage } from '@/services/token'
import { cn } from '@/lib/utils'
import type { RateType, UserDTO } from '@/types'

const RATE_TYPE_OPTIONS: RateType[] = ['hourly', 'per_gig', 'both']

function sortDays(days: string[]): string[] {
  return [...days].sort(
    (a, b) =>
      WEEKDAYS.indexOf(a as (typeof WEEKDAYS)[number]) - WEEKDAYS.indexOf(b as (typeof WEEKDAYS)[number]),
  )
}

export function EditProfileDialog({
  user,
  open,
  onOpenChange,
}: {
  user: UserDTO
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { mutate } = useSWRConfig()
  const fileRef = useRef<HTMLInputElement>(null)

  const [firstName, setFirstName] = useState(user.firstName ?? '')
  const [lastName, setLastName] = useState(user.lastName ?? '')
  const [address, setAddress] = useState(user.address ?? '')
  const [phone, setPhone] = useState(user.phone ?? '')
  const [bio, setBio] = useState(user.bio ?? '')
  const [profileImage, setProfileImage] = useState<string | null>(user.profileImage ?? user.avatarUrl ?? null)
  const [skills, setSkills] = useState<string[]>(user.skills ?? [])
  const [availableDays, setAvailableDays] = useState<string[]>(() => sortDays(user.availableDays ?? []))
  const [rateType, setRateType] = useState<RateType>(user.rateType ?? 'both')
  const [isNegotiable, setIsNegotiable] = useState<boolean>(user.isNegotiable ?? false)
  const [saving, setSaving] = useState(false)

  const anytimeActive = availableDays.length >= WEEKDAYS.length

  function toggleAnytime() {
    setAvailableDays(anytimeActive ? [] : [...WEEKDAYS])
  }

  useEffect(() => {
    if (!open) return
    setFirstName(user.firstName ?? '')
    setLastName(user.lastName ?? '')
    setAddress(user.address ?? '')
    setPhone(user.phone ?? '')
    setBio(user.bio ?? '')
    setProfileImage(user.profileImage ?? user.avatarUrl ?? null)
    setSkills(user.skills ?? [])
    setAvailableDays(sortDays(user.availableDays ?? []))
    setRateType(user.rateType ?? 'both')
    setIsNegotiable(user.isNegotiable ?? false)
  }, [open, user])

  async function onPickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const base = import.meta.env.VITE_API_BASE_URL ?? 'https://kanto-jobs-backend.onrender.com/api/v1'
    const fd = new FormData()
    fd.append('file', file)
    const token = tokenStorage.get()
    const res = await fetch(`${base}/uploads/profile`, { method: 'POST', body: fd, headers: token ? { Authorization: `Bearer ${token}` } : {} })
    const text = await res.text()
    let json: any = {}
    try { json = text ? JSON.parse(text) : {} } catch {}
    if (!res.ok) throw new Error('Upload failed')
    setProfileImage(String(json.url ?? json.profileImage ?? ''))
    e.target.value = ''
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await api.users.updateMe({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        address: address.trim(),
        bio,
        profileImage: profileImage ?? '',
        skills,
        availableDays: sortDays(availableDays),
        rateType,
        isNegotiable,
      })
      // Re-fetch GET /users/me so the view reflects the persisted state immediately.
      await mutate([ME_KEY, tokenStorage.get()])
      toast.success('Profile updated', { description: 'Your changes are now visible to posters and applicants.' })
      onOpenChange(false)
    } catch (err) {
      toast.error('Could not save profile', {
        description: err instanceof Error ? err.message : 'Please check your details and try again.',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-[calc(100%-2rem)] overflow-y-auto sm:max-w-md">
        <form onSubmit={save} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>This is what posters see when you send a pitch.</DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-3">
            <div className="relative size-16 shrink-0 overflow-hidden rounded-full bg-secondary">
              {profileImage ? (
                <img src={profileImage} alt="" className="size-full object-cover" />
              ) : (
                <span className="flex size-full items-center justify-center text-lg font-semibold text-muted-foreground">
                  {`${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickImage} />
              <Button type="button" variant="outline" size="sm" onClick={() => fileRef.current?.click()}>
                <Camera aria-hidden="true" />
                Change photo
              </Button>
              {profileImage ? (
                <button
                  type="button"
                  onClick={() => setProfileImage(null)}
                  className="text-left text-xs text-destructive hover:underline"
                >
                  Remove photo
                </button>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-firstName">First name</Label>
              <Input
                id="ep-firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                minLength={1}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-lastName">Last name</Label>
              <Input
                id="ep-lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                minLength={1}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-email">Email</Label>
            <Input id="ep-email" value={user.email ?? ''} disabled readOnly />
            <p className="text-xs text-muted-foreground">Email is tied to your account and cannot be changed here.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-phone">Phone</Label>
            <Input
              id="ep-phone"
              type="tel"
              value={phone}
              disabled
              readOnly
              className="bg-muted text-muted-foreground"
              placeholder="09XX XXX XXXX"
            />
            <p className="text-xs text-muted-foreground">Phone number is tied to your account and cannot be changed here.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-address">Address</Label>
            <Input
              id="ep-address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Barangay, City"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-bio">Short bio</Label>
            <Textarea
              id="ep-bio"
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 200))}
              rows={3}
              placeholder="Ano ang mga kaya mong gawin?"
            />
            <p className="text-right text-xs text-muted-foreground">{`${bio.length}/200`}</p>
          </div>

          <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <legend className="px-1 text-xs font-medium text-muted-foreground">
              Social (set during verification)
            </legend>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-viber" className="text-xs text-muted-foreground">
                Viber
              </Label>
              <Input id="ep-viber" value={user.viberNumber ?? ''} disabled readOnly />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ep-messenger" className="text-xs text-muted-foreground">
                Messenger
              </Label>
              <Input id="ep-messenger" value={user.messengerUsername ?? ''} disabled readOnly />
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">{`Skills (${skills.length}/8)`}</legend>
            {skills.length > 0 ? (
              <ul className="flex flex-wrap gap-1.5">
                {skills.map((s) => (
                  <li key={s}>
                    <button
                      type="button"
                      onClick={() => setSkills(skills.filter((x) => x !== s))}
                      className="inline-flex items-center gap-1 rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background"
                      aria-label={`Remove ${CATEGORY_LABELS[s as keyof typeof CATEGORY_LABELS] ?? s}`}
                    >
                      {CATEGORY_LABELS[s as keyof typeof CATEGORY_LABELS] ?? s}
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter((c) => !skills.includes(c)).map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={skills.length >= 8}
                  onClick={() => setSkills([...skills, c])}
                  className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  <Plus className="size-3" aria-hidden="true" />
                  {CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">Preferred rate type</legend>
            <p className="text-xs text-muted-foreground">How you prefer to be paid — shown as a tag, no amounts.</p>
            <div className="flex flex-nowrap gap-1.5" role="group" aria-label="Preferred rate type">
              {RATE_TYPE_OPTIONS.map((value) => {
                const active = rateType === value
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => setRateType(value)}
                    className={cn(
                      'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card text-foreground hover:border-foreground/30',
                    )}
                  >
                    {RATE_TYPE_VIEW_LABELS[value]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <label className="flex items-center justify-between gap-2 rounded-lg border border-border p-3">
            <span className="flex flex-col">
              <span className="text-sm font-medium">Negotiable rate</span>
              <span className="text-xs text-muted-foreground">Let posters know your rate can be discussed.</span>
            </span>
            <input
              type="checkbox"
              checked={isNegotiable}
              onChange={(e) => setIsNegotiable(e.target.checked)}
              className="size-4 accent-primary"
            />
          </label>

          <fieldset className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <legend className="mb-0 flex items-center gap-1.5 text-sm font-medium">
                <Calendar className="size-3.5" aria-hidden="true" />
                Working days
              </legend>
              <button
                type="button"
                onClick={toggleAnytime}
                className={cn(
                  'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  anytimeActive
                    ? 'border-orange-200 bg-orange-50 text-orange-600'
                    : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
                )}
                aria-pressed={anytimeActive}
              >
                Anytime
              </button>
            </div>
            <p className="text-xs text-muted-foreground">Select the days you're available for gigs</p>
            <div className="flex flex-nowrap gap-1" role="group" aria-label="Working days">
              {WEEKDAYS.map((day) => {
                const active = availableDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() =>
                      setAvailableDays((prev) =>
                        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
                      )
                    }
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      active
                        ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                        : 'border-border bg-card text-foreground hover:border-foreground/30',
                    )}
                    aria-pressed={active}
                  >
                    {day}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <DialogFooter>
            <Button type="submit" className="h-11 w-full" disabled={saving}>
              {saving ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
              Save changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}