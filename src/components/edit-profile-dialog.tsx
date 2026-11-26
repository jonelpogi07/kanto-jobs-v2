import { useEffect, useState } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Loader2, X, Calendar, Plus } from 'lucide-react'
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
import { RATE_TYPE_LABELS, WEEKDAYS, CATEGORIES, CATEGORY_LABELS } from '@/lib/format'
import { LOCATIONS } from '@/lib/locations'
import { api } from '@/services/api'
import { tokenStorage } from '@/services/token'
import { cn } from '@/lib/utils'
import type { RateType, UserDTO, JobCategory } from '@/types'

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

const DEFAULT_BARANGAY = 'Anupul'
const DEFAULT_CITY = 'Bamban, Tarlac'

export function EditProfileDialog({
  user,
  open,
  onOpenChange,
  onWorkingDaysChange,
}: {
  user: UserDTO
  open: boolean
  onOpenChange: (open: boolean) => void
  onWorkingDaysChange?: (days: string[]) => void
}) {
  const { mutate } = useSWRConfig()

  function sortDays(days: string[]): string[] {
    return [...days].sort(
      (a, b) =>
        WEEKDAYS.indexOf(a as (typeof WEEKDAYS)[number]) -
        WEEKDAYS.indexOf(b as (typeof WEEKDAYS)[number]),
    )
  }

  function readWorkingDays(id: number): string[] {
    if (typeof window === 'undefined') return [...WEEKDAYS]
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

  function readRateType(id: number): RateType {
    if (typeof window === 'undefined') return 'both'
    try {
      const raw = localStorage.getItem(`profileRateType:${id}`)
      if (raw) {
        const parsed = raw as RateType
        if (parsed === 'hourly' || parsed === 'per_gig' || parsed === 'both') return parsed
      }
    } catch {
      // ignore corrupt storage
    }
    return 'both'
  }

  const [fullName, setFullName] = useState(user.fullName)
  const [locationKey, setLocationKey] = useState(`${user.barangay || DEFAULT_BARANGAY}|${user.city || DEFAULT_CITY}`)
  const [bio, setBio] = useState(user.bio ?? '')
  const [skills, setSkills] = useState<JobCategory[]>((user.skills as JobCategory[]) ?? [])
  const [availableDays, setAvailableDays] = useState<string[]>(() => sortDays(readWorkingDays(user.id)))
  const [rateType, setRateType] = useState<RateType>(() => (user.rateType ?? readRateType(user.id)))
  const [saving, setSaving] = useState(false)

  const anytimeActive = availableDays.length >= WEEKDAYS.length

  function toggleAnytime() {
    setAvailableDays(anytimeActive ? [] : [...WEEKDAYS])
  }

  useEffect(() => {
    if (!open) return
    setFullName(user.fullName)
    setLocationKey(`${user.barangay || DEFAULT_BARANGAY}|${user.city || DEFAULT_CITY}`)
    setBio(user.bio ?? '')
    setSkills((user.skills as JobCategory[]) ?? [])
    setAvailableDays(sortDays(readWorkingDays(user.id)))
    setRateType(user.rateType ?? readRateType(user.id))
  }, [open, user])

  const locationOptions = LOCATIONS.some((l) => `${l.barangay}|${l.city}` === locationKey)
    ? LOCATIONS
    : [{ barangay: user.barangay || DEFAULT_BARANGAY, city: user.city || DEFAULT_CITY, municipality: user.city || DEFAULT_CITY }, ...LOCATIONS]

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const [barangay, city] = locationKey.split('|')
      const sortedDays = sortDays(availableDays)
       const updated = await api.users.updateMe({
         fullName,
         barangay,
         city,
         address: `${barangay}, ${city}`,
         bio,
        skills,
        avatarUrl: user.avatarUrl,
        availableDays: sortedDays,
        rateType,
      })
      localStorage.setItem(`profileWorkingDays:${user.id}`, JSON.stringify(sortedDays))
      localStorage.setItem(`profileRateType:${user.id}`, rateType)
      await mutate([ME_KEY, tokenStorage.get()], updated, { revalidate: false })
      onWorkingDaysChange?.(sortedDays)
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

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-name">Full name</Label>
            <Input id="ep-name" value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ep-location">Barangay / City</Label>
            <select
              id="ep-location"
              className={selectClass}
              value={locationKey}
              onChange={(e) => setLocationKey(e.target.value)}
            >
              {locationOptions.map((l) => (
                <option key={`${l.barangay}|${l.city}`} value={`${l.barangay}|${l.city}`}>
                  {`${l.barangay}, ${l.city}`}
                </option>
              ))}
            </select>
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
                      aria-label={`Remove ${CATEGORY_LABELS[s] ?? s}`}
                    >
                      {CATEGORY_LABELS[s] ?? s}
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap gap-1.5">
              {CATEGORIES.filter((c) => !skills.includes(c))
                .map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSkills([...skills, c])}
                    className="inline-flex items-center gap-1 rounded-md border border-dashed border-border px-2 py-1 text-xs font-medium text-muted-foreground hover:border-primary hover:text-primary"
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
              {(['hourly', 'per_gig', 'both'] as const).map((value) => {
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
                    {RATE_TYPE_LABELS[value]}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
              <legend className="mb-0 text-sm font-medium flex items-center gap-1.5">
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
                        prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
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
