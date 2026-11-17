import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Plus, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import { useRefreshAll } from '@/hooks/use-api'
import { formatPay } from '@/lib/format'
import { api } from '@/services/api'
import type { JobPostDTO } from '@/types'

const TEMPLATES = [
  'I have my own tools.',
  'Available right now.',
  'May sariling motor ako.',
  'Malapit lang ako, 5 mins away.',
  'Experienced na ako dito.',
]

const MAX = 280

export function PitchSheet({
  job,
  open,
  onOpenChange,
}: {
  job: JobPostDTO
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [pitch, setPitch] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const refreshAll = useRefreshAll()

  function addTemplate(t: string) {
    setPitch((p) => (p.includes(t) ? p : `${p.trim()} ${t}`.trim()).slice(0, MAX))
  }

  async function submit() {
    setSubmitting(true)
    try {
      await api.jobs.apply(job.id, { pitch })
      toast.success('Pitch sent', { description: `${job.poster.fullName} will be notified about your application.` })
      onOpenChange(false)
      setPitch('')
      await refreshAll()
    } catch (e) {
      toast.error('Could not send pitch', {
        description: e instanceof Error ? e.message : 'Please try again in a moment.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
        <SheetHeader className="pb-0">
          <SheetTitle className="text-lg font-extrabold">Send your pitch</SheetTitle>
          <SheetDescription className="text-pretty">
            {`${job.title} · ${formatPay(job.amount, job.compensationType)}`}
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-3 px-4">
          <div>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Quick add</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => {
                const used = pitch.includes(t)
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => addTemplate(t)}
                    disabled={used}
                    className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary-soft px-3 py-1.5 text-xs font-semibold text-orange-700 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-95 disabled:opacity-40"
                  >
                    <Plus className="size-3" aria-hidden="true" />
                    {t}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="pitch">Your message</Label>
            <Textarea
              id="pitch"
              value={pitch}
              onChange={(e) => setPitch(e.target.value.slice(0, MAX))}
              placeholder="Hi po! Bakit ikaw ang dapat piliin? Keep it short."
              rows={4}
              className="text-base"
            />
            <p className="text-right text-xs text-muted-foreground">{`${pitch.length}/${MAX}`}</p>
          </div>

          <Button className="h-12 text-base font-bold" disabled={pitch.trim().length < 5 || submitting} onClick={submit}>
            {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
            Send pitch
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}
