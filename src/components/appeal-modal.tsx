import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { api } from '@/services/api'
import type { AppealEvidence } from '@/types'
import { cn } from '@/lib/utils'

const MAX_APPEAL_REASON_LENGTH = 500
const MAX_EVIDENCE_FILES = 5
const MAX_EVIDENCE_SIZE_MB = 10
const ACCEPTED_EVIDENCE_TYPES = 'image/*,.pdf'

function isImage(type: string) {
  return type.startsWith('image/')
}

export function AppealModal({
  open,
  onOpenChange,
  reportId,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  reportId: number
  onSuccess?: () => void
}) {
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState<AppealEvidence[]>([])
  const [submitting, setSubmitting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (open) {
      setReason('')
      setEvidence([])
    }
  }, [open])

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }

  useEffect(() => {
    if (open) autoResize()
  }, [open, reason])

  const reasonError = reason.trim() === '' ? 'An appeal reason is required.' : null

  function addFiles(files: FileList | null) {
    if (!files) return
    const added: AppealEvidence[] = []
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (evidence.length + added.length >= MAX_EVIDENCE_FILES) break
      if (file.size > MAX_EVIDENCE_SIZE_MB * 1024 * 1024) {
        toast.error(`"${file.name}" exceeds the ${MAX_EVIDENCE_SIZE_MB} MB limit.`)
        continue
      }
      const item: AppealEvidence = {
        id: crypto.randomUUID(),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: '',
      }
      added.push(item)
      const reader = new FileReader()
      reader.onload = () => {
        setEvidence((list) =>
          list.map((e) => (e.id === item.id ? { ...e, dataUrl: (reader.result as string) } : e)),
        )
      }
      reader.readAsDataURL(file)
    }
    setEvidence((list) => [...list, ...added])
    fileInputRef.current!.value = ''
  }

  function removeEvidence(id: string) {
    setEvidence((list) => list.filter((e) => e.id !== id))
  }

  async function submit() {
    if (reasonError || submitting) return
    setSubmitting(true)
    try {
      await api.appeals.submit(reportId, { reason, evidence })
      toast.success('Appeal submitted', { description: 'Your appeal is now under review.' })
      onOpenChange(false)
      onSuccess?.()
    } catch (e) {
      toast.error('Could not submit appeal', { description: e instanceof Error ? e.message : 'Please try again.' })
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card p-5">
        <h3 className="text-base font-bold">Appeal Report</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Share why the report should be reviewed. You may attach screenshots or PDFs as evidence.
        </p>

        <div className="mt-4 flex flex-col gap-2">
          <label className="text-sm font-semibold text-foreground block">
            Appeal reason <span className="text-destructive">*</span>
          </label>
          <textarea
            ref={textareaRef}
            className="w-full min-h-[120px] resize-none rounded-2xl border p-3 text-sm"
            rows={5}
            placeholder="Explain why the report should be overturned..."
            value={reason}
            maxLength={MAX_APPEAL_REASON_LENGTH}
            onChange={(e) => setReason(e.target.value)}
            onInput={autoResize}
          />
          <div className="mt-1 text-right text-xs">
            {reason.length}/{MAX_APPEAL_REASON_LENGTH}
          </div>
          {reasonError && <p className="mt-1 text-sm text-destructive">{reasonError}</p>}
        </div>

        <div className="mt-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-foreground block">Evidence (optional)</label>
            <span className="text-xs text-muted-foreground">
              {evidence.length}/{MAX_EVIDENCE_FILES} &mdash; image/*, .pdf &mdash; up to {MAX_EVIDENCE_SIZE_MB} MB each
            </span>
          </div>
          <button
            type="button"
            disabled={submitting || evidence.length >= MAX_EVIDENCE_FILES}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition',
              evidence.length >= MAX_EVIDENCE_FILES
                ? 'border-border bg-secondary text-muted-foreground cursor-not-allowed'
                : 'border-border bg-card text-foreground hover:border-primary',
            )}
          >
            <span className="flex items-center gap-1">
              <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"></path></svg>
              {evidence.length === 0 ? 'Add evidence' : 'Add more evidence'}
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_EVIDENCE_TYPES}
              multiple
              hidden
              onChange={(e) => addFiles(e.target.files)}
            />
          </button>
          {evidence.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {evidence.map((file) => (
                <div key={file.id} className="flex items-center gap-2 rounded-xl border p-2 pr-3">
                  <div className="shrink-0 rounded-lg border overflow-hidden" style={{ width: 32, height: 32 }}>
                    {isImage(file.type) && file.dataUrl ? (
                      <img src={file.dataUrl} alt={file.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary text-muted-foreground text-[10px]">
                        PDF
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium">{file.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {(file.size / 1024).toFixed(1)} KB &middot; {file.type || 'application/pdf'}
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeEvidence(file.id)}
                    className="rounded p-1 text-muted-foreground hover:text-destructive"
                  >
                    <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"></path></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button className="flex-1" onClick={submit} disabled={submitting || Boolean(reasonError)}>
            {submitting ? 'Submitting...' : 'Submit Appeal'}
          </Button>
        </div>
      </div>
    </div>
  )
}
