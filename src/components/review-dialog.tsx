import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { StarInput } from '@/components/rating'
import { UserAvatar } from '@/components/user-avatar'
import { useRefreshAll } from '@/hooks/use-api'
import { api } from '@/services/api'
import type { JobPostDTO, UserSummaryDTO } from '@/types'

export function ReviewDialog({
  job,
  worker,
  open,
  onOpenChange,
}: {
  job: JobPostDTO
  worker: UserSummaryDTO
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const refreshAll = useRefreshAll()

  async function submit() {
    setSubmitting(true)
    try {
      await api.jobs.complete(job.id)
      await api.jobs.review(job.id, { rating, comment })
      toast.success('Gig completed', {
        description: `Thanks for reviewing ${worker.fullName.split(' ')[0]}.`,
      })
      onOpenChange(false)
      await refreshAll()
    } catch (e) {
      toast.error('Could not complete gig', {
        description: e instanceof Error ? e.message : 'Please try again in a moment.',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100%-2rem)] sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Mark completed & rate</DialogTitle>
          <DialogDescription className="text-pretty">{job.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-2 py-2">
          <UserAvatar user={worker} className="size-14 text-lg" />
          <p className="font-semibold">{`How was ${worker.fullName}?`}</p>
          <StarInput value={rating} onChange={setRating} />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="review-comment">Review (optional)</Label>
          <Textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="On time, maayos ang trabaho, would hire again..."
            maxLength={300}
            rows={3}
          />
        </div>

        <DialogFooter>
          <Button
            className="h-11 w-full bg-success hover:bg-success/90"
            disabled={rating === 0 || submitting}
            onClick={submit}
          >
            {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
            Complete gig & submit review
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
