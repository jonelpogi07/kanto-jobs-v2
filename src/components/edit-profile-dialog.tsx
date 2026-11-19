import { useState } from 'react'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { Loader2, Plus, RefreshCw, X } from 'lucide-react'
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
import { SKILL_SUGGESTIONS } from '@/lib/format'
import { LOCATIONS } from '@/mocks/data'
import { api } from '@/services/api'
import { tokenStorage } from '@/services/token'
import { cn } from '@/lib/utils'
import type { UserDTO } from '@/types'

const selectClass =
  'h-10 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50'

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
  const [fullName, setFullName] = useState(user.fullName)
  const [locationKey, setLocationKey] = useState(`${user.barangay}|${user.city}`)
  const [bio, setBio] = useState(user.bio)
  const [skills, setSkills] = useState(user.skills)
  const [skillInput, setSkillInput] = useState('')
  const [isNegotiable, setIsNegotiable] = useState(user.isNegotiable ?? false)
  const [saving, setSaving] = useState(false)

  const locationOptions = LOCATIONS.some((l) => `${l.barangay}|${l.city}` === locationKey)
    ? LOCATIONS
    : [{ barangay: user.barangay, city: user.city, latitude: 0, longitude: 0 }, ...LOCATIONS]

  function addSkill(raw: string) {
    const skill = raw.trim()
    if (!skill || skills.length >= 8 || skills.some((s) => s.toLowerCase() === skill.toLowerCase())) return
    setSkills([...skills, skill])
    setSkillInput('')
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const [barangay, city] = locationKey.split('|')
      const updated = await api.users.updateMe({
        fullName,
        barangay,
        city,
        bio,
        skills,
        avatarUrl: user.avatarUrl,
        isNegotiable,
      })
      await mutate([ME_KEY, tokenStorage.get()], updated, { revalidate: false })
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
                      aria-label={`Remove ${s}`}
                    >
                      {s}
                      <X className="size-3" aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex gap-2">
              <Input
                aria-label="Add a skill"
                placeholder="Add a skill"
                value={skillInput}
                onChange={(e) => setSkillInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.nativeEvent.isComposing || e.keyCode === 229) return
                    e.preventDefault()
                    addSkill(skillInput)
                  }
                }}
              />
              <Button type="button" variant="outline" size="icon-lg" onClick={() => addSkill(skillInput)}>
                <Plus aria-hidden="true" />
                <span className="sr-only">Add skill</span>
              </Button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SKILL_SUGGESTIONS.filter((s) => !skills.includes(s))
                .slice(0, 8)
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addSkill(s)}
                    className="rounded-md border border-dashed border-border px-2 py-1 text-xs text-muted-foreground hover:border-primary hover:text-primary"
                  >
                    {`+ ${s}`}
                  </button>
                ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-sm font-medium">Gigster rate</legend>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-pressed={isNegotiable}
                onClick={() => setIsNegotiable(!isNegotiable)}
                className={cn(
                  'h-10 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 flex items-center gap-1.5',
                  isNegotiable
                    ? 'border-primary bg-primary-soft text-orange-800 dark:text-orange-300'
                    : 'border-border bg-card text-foreground hover:border-foreground/30',
                )}
              >
                <RefreshCw className="size-3.5" aria-hidden="true" />
                Rate is negotiable
              </button>
              <span className="text-[11px] text-muted-foreground">Open to counter-offers from clients</span>
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
