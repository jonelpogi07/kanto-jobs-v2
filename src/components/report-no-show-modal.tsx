import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

const MAX_NOTE_LENGTH = 300

export function ReportNoShowModal({
  open,
  onOpenChange,
  reasons,
  onSubmit,
  loading,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reasons: string[]
  onSubmit: (reason: string, note: string) => Promise<void> | void
  loading?: boolean
}) {
  const [reason, setReason] = useState(reasons[0])
  const [note, setNote] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setReason(reasons[0])
      setNote('')
    }
  }, [open, reasons])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => {
    if (open) autoResize()
  }, [open, note])

  if (!open) return null

  async function submit() {
    try {
      await onSubmit(reason, note)
      onOpenChange(false)
      setNote('')
    } catch (e) {
      toast.error('Could not submit report', { description: e instanceof Error ? e.message : 'Please try again.' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-card p-5">
        <h3 className="text-base font-bold">Report Cancelled / No-Show</h3>
        <p className="mt-1 text-sm text-muted-foreground">Select a reason and optionally add a note.</p>
        <div className="mt-4 flex flex-col gap-2" role="radiogroup">
          {reasons.map((r) => {
            const selected = reason === r
            return (
              <button
                key={r}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setReason(r)}
                className={`flex w-full items-center justify-between rounded-xl border px-4 py-3 text-sm font-semibold transition ${
                  selected
                    ? 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300'
                    : 'border-border bg-card text-foreground hover:border-orange-300'
                }`}
              >
                <span>{r}</span>
                {selected ? (
                  <span className="rounded-full bg-orange-500 px-2 py-0.5 text-[10px] font-bold text-white">Selected</span>
                ) : null}
              </button>
            )
          })}
        </div>
        <textarea
          ref={textareaRef}
          className="mt-3 w-full min-h-[110px] resize-none rounded-2xl border border-border p-3 text-sm"
          rows={4}
          placeholder="Optional note"
          value={note}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(e) => {
            const v = e.target.value.slice(0, MAX_NOTE_LENGTH)
            setNote(v)
            autoResize()
          }}
        />
        <div className={`mt-1 text-right text-xs ${note.length >= MAX_NOTE_LENGTH ? 'text-red-500' : note.length >= MAX_NOTE_LENGTH * 0.9 ? 'text-amber-500' : 'text-muted-foreground'}`}>
          {note.length}/{MAX_NOTE_LENGTH}
        </div>
        <div className="mt-4 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button className="flex-1 bg-red-500 hover:bg-red-600" onClick={submit} disabled={loading}>
            {loading ? 'Submitting...' : 'Submit'}
          </Button>
        </div>
      </div>
    </div>
  )
}
