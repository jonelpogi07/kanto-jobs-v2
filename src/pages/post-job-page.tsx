import { useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Loader2, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/app-shell'
import { RequireAuth } from '@/components/require-auth'
import { useRefreshAll } from '@/hooks/use-api'
import { useLocation } from '@/lib/location'
import { CATEGORIES, CATEGORY_LABELS, PAYMENT_LABELS, PAYMENT_METHODS, TIMING_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import type { CompensationType, JobCategory, JobTiming, PaymentMethod } from '@/types'

export function PostJobPage() {
  return (
    <>
      <PageHeader title="Post a gig" subtitle="Takes about 60 seconds" />
      <RequireAuth title="Log in to post a gig">
        <PostJobForm />
      </RequireAuth>
    </>
  )
}

const chip =
  'h-10 rounded-xl border px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
const chipOn = 'border-primary bg-primary-soft text-orange-800'
const chipOff = 'border-border bg-card text-foreground hover:border-foreground/30'

function PostJobForm() {
  const navigate = useNavigate()
  const refreshAll = useRefreshAll()
  const { location, options } = useLocation()

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<JobCategory | null>(null)
  const [description, setDescription] = useState('')
  const [compensationType, setCompensationType] = useState<CompensationType>('FIXED')
  const [amount, setAmount] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(['CASH'])
  const [locationKey, setLocationKey] = useState(`${location.barangay}|${location.city}`)
  const [landmark, setLandmark] = useState('')
  const [timing, setTiming] = useState<JobTiming>('URGENT')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showErrors, setShowErrors] = useState(false)

  const amountNum = Number(amount)
  const errors = {
    title: title.trim().length < 5 ? 'Give your gig a short, clear title.' : null,
    category: !category ? 'Pick a category.' : null,
    amount: !amountNum || amountNum < 20 ? 'Enter an amount of at least ₱20.' : null,
    payment: paymentMethods.length === 0 ? 'Choose at least one payment method.' : null,
    schedule: timing === 'SCHEDULED' && !scheduledAt ? 'Pick a date and time.' : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)

  function togglePayment(m: PaymentMethod) {
    setPaymentMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasErrors) {
      setShowErrors(true)
      return
    }
    const loc = options.find((o) => `${o.barangay}|${o.city}` === locationKey) ?? location
    setSubmitting(true)
    try {
      const job = await api.jobs.create({
        title: title.trim(),
        category: category!,
        description: description.trim(),
        compensationType,
        amount: amountNum,
        paymentMethods,
        barangay: loc.barangay,
        city: loc.city,
        landmark: landmark.trim(),
        latitude: loc.latitude,
        longitude: loc.longitude,
        timing,
        scheduledAt: timing === 'SCHEDULED' ? new Date(scheduledAt).toISOString() : null,
        estimatedDuration: duration.trim() || null,
      })
      toast.success('Gig posted!', { description: 'Nearby part-timers can now send pitches.' })
      await refreshAll()
      navigate(`/jobs/${job.id}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not post gig.')
    } finally {
      setSubmitting(false)
    }
  }

  const err = (key: keyof typeof errors) =>
    showErrors && errors[key] ? (
      <p className="text-xs font-medium text-destructive" role="alert">
        {errors[key]}
      </p>
    ) : null

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6 px-4 pt-4 pb-6">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="title">What do you need done?</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          placeholder="e.g. Pabili ng gamot sa Mercury Drug"
          className="h-11 bg-card"
          aria-invalid={showErrors && Boolean(errors.title)}
        />
        {err('title')}
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Category</legend>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
              className={cn(chip, 'text-left', category === c ? chipOn : chipOff)}
            >
              {CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>
        {err('category')}
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Details</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 600))}
          placeholder="Ano ang kailangan, gaano kalaki, may kailangan bang dalhin?"
          rows={4}
          className="bg-card"
        />
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Compensation</legend>
        <div className="grid grid-cols-2 gap-2">
          {(['FIXED', 'HOURLY'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={compensationType === t}
              onClick={() => setCompensationType(t)}
              className={cn(chip, compensationType === t ? chipOn : chipOff)}
            >
              {t === 'FIXED' ? 'Fixed price' : 'Hourly rate'}
            </button>
          ))}
        </div>
        <Label htmlFor="amount" className="sr-only">
          Amount in pesos
        </Label>
        <div className="relative">
          <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-lg font-bold text-muted-foreground">
            ₱
          </span>
          <Input
            id="amount"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder={compensationType === 'HOURLY' ? '150' : '500'}
            className="h-12 bg-card pr-16 pl-8 text-lg font-bold"
            aria-invalid={showErrors && Boolean(errors.amount)}
          />
          <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-foreground">
            {compensationType === 'HOURLY' ? '/ hour' : 'total'}
          </span>
        </div>
        {err('amount')}
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Payment method</legend>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHODS.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={paymentMethods.includes(m)}
              onClick={() => togglePayment(m)}
              className={cn(chip, paymentMethods.includes(m) ? chipOn : chipOff)}
            >
              {PAYMENT_LABELS[m]}
            </button>
          ))}
        </div>
        {err('payment')}
      </fieldset>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="location">Barangay / City</Label>
          <select
            id="location"
            value={locationKey}
            onChange={(e) => setLocationKey(e.target.value)}
            className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            {options.map((o) => (
              <option key={`${o.barangay}|${o.city}`} value={`${o.barangay}|${o.city}`}>
                {`${o.barangay}, ${o.city}`}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="landmark">Landmark (optional)</Label>
          <Input
            id="landmark"
            value={landmark}
            onChange={(e) => setLandmark(e.target.value.slice(0, 120))}
            placeholder="e.g. Tapat ng sari-sari store, green gate"
            className="h-11 bg-card"
          />
        </div>
      </div>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">When?</legend>
        <div className="grid grid-cols-3 gap-2">
          {(['URGENT', 'SCHEDULED', 'FLEXIBLE'] as const).map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={timing === t}
              onClick={() => setTiming(t)}
              className={cn(chip, 'px-2 text-xs', timing === t ? chipOn : chipOff)}
            >
              {TIMING_LABELS[t]}
            </button>
          ))}
        </div>
        {timing === 'SCHEDULED' ? (
          <>
            <Label htmlFor="scheduledAt" className="sr-only">
              Date and time
            </Label>
            <Input
              id="scheduledAt"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
              className="h-11 bg-card"
              aria-invalid={showErrors && Boolean(errors.schedule)}
            />
            {err('schedule')}
          </>
        ) : null}
        <Label htmlFor="duration" className="mt-2">
          Estimated duration (optional)
        </Label>
        <Input
          id="duration"
          value={duration}
          onChange={(e) => setDuration(e.target.value.slice(0, 40))}
          placeholder="e.g. 2-3 hours"
          className="h-11 bg-card"
        />
      </fieldset>

      <Button type="submit" className="h-12 text-base font-bold" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Rocket aria-hidden="true" />}
        Post gig
      </Button>
    </form>
  )
}
