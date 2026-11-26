import { useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Loader2, Plus, RefreshCw, Rocket, Search, AlertCircle, CheckCircle2, Coins, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { PageHeader } from '@/components/layout/app-shell'
import { RequireAuth } from '@/components/require-auth'
import { useRefreshAll } from '@/hooks/use-api'
import { useLocation } from '@/lib/location'
import { useAuth } from '@/lib/auth'
import { CATEGORIES, CATEGORY_LABELS, COMPENSATION_TYPE_LABELS, PAYMENT_LABELS, PAYMENT_METHODS, TIMING_LABELS } from '@/lib/format'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import type { CompensationType, JobCategory, JobTiming, PaymentMethod } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'

export function PostJobPage() {
  const { user } = useAuth()
  return (
    <>
      <PageHeader
        title="Post a gig"
        subtitle="Takes about 60 seconds"
        action={
          <button
            type="button"
            className="bg-amber-50 border border-amber-300 text-amber-800 px-3 py-1.5 rounded-full font-semibold text-sm flex items-center gap-1.5"
            disabled
          >
            🪙 {user?.gigCoins ?? 0} GigCoins
          </button>
        }
      />
      <RequireAuth title="Log in to post a gig">
        <PostJobForm />
      </RequireAuth>
    </>
  )
}

const chip =
  'h-10 rounded-xl border px-3 text-sm font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50'
const chipOn = 'border-primary bg-primary-soft text-orange-800 dark:text-orange-300'
const chipOff = 'border-border bg-card text-foreground hover:border-foreground/30'

type ConfirmationStep = 'idle' | 'searching' | 'confirm' | 'publishing'

function PostJobForm() {
  const navigate = useNavigate()
  const refreshAll = useRefreshAll()
  const { location, options } = useLocation()
  const { user } = useAuth()

  const isBusinessMerchant = user?.isBusinessMerchant === true && user?.merchantPartnershipActive === true

  const [title, setTitle] = useState('')
  const [category, setCategory] = useState<JobCategory>('ERRANDS_DELIVERY')
  const [description, setDescription] = useState('')
  const [compensationType, setCompensationType] = useState<CompensationType>('FIXED')
  const [amount, setAmount] = useState('')
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>(['CASH'])
  const [locationKey, setLocationKey] = useState(`${location.barangay}|${location.city}`)
  const [landmark, setLandmark] = useState('')
  const [timing, setTiming] = useState<JobTiming>('URGENT')
  const [scheduledAt, setScheduledAt] = useState('')
  const [duration, setDuration] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isNegotiable, setIsNegotiable] = useState(false)
  const imagesScrollRef = useRef<HTMLDivElement>(null)
  const [showErrors, setShowErrors] = useState(false)

  const titleRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLFieldSetElement>(null)
  const amountRef = useRef<HTMLInputElement>(null)
  const paymentRef = useRef<HTMLFieldSetElement>(null)
  const scheduleRef = useRef<HTMLInputElement>(null)
  const locationRef = useRef<HTMLSelectElement>(null)

  const [confirmationStep, setConfirmationStep] = useState<ConfirmationStep>('idle')
  const [nearbyGigstersCount, setNearbyGigstersCount] = useState(0)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [pendingJobData, setPendingJobData] = useState<{
    title: string
    category: JobCategory
    description: string
    compensationType: CompensationType
    amount: number
    paymentMethods: PaymentMethod[]
    barangay: string
    city: string
    landmark: string
    timing: JobTiming
    scheduledAt: string | null
    estimatedDuration: string | null
    images: string[]
    isNegotiable: boolean
    isMerchantGig: boolean
    merchantId?: number
    merchantName?: string
    merchantBoosted: boolean
  } | null>(null)

  const amountNum = amount.trim() === '' ? NaN : Number(amount)
  const errors = {
    title: title.trim().length < 5 ? 'Give your gig a short, clear title.' : null,
    category: !category ? 'Pick a category.' : null,
    amount: Number.isNaN(amountNum) || amountNum < 20 ? 'Enter an amount of at least ₱20.' : null,
    payment: paymentMethods.length === 0 ? 'Choose at least one payment method.' : null,
    schedule: timing === 'SCHEDULED' && !scheduledAt ? 'Pick a date and time.' : null,
  }
  const hasErrors = Object.values(errors).some(Boolean)
  const userGigCoins = user?.gigCoins ?? 0
  const hasInsufficientCoins = userGigCoins < 1

  function togglePayment(m: PaymentMethod) {
    setPaymentMethods((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))
  }

  const MAX_IMAGES = 4

  function onPickImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`Maximum ${MAX_IMAGES} photos allowed.`)
      return
    }
    const pending = files.map((file) => {
      return new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          const img = new Image()
          img.onload = () => {
            const MAX = 800
            let width = img.width
            let height = img.height
            if (width > MAX || height > MAX) {
              if (width >= height) {
                height = Math.round((height * MAX) / width)
                width = MAX
              } else {
                width = Math.round((width * MAX) / height)
                height = MAX
              }
            }
            const canvas = document.createElement('canvas')
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            if (!ctx) return resolve(String(reader.result))
            ctx.drawImage(img, 0, 0, width, height)
            resolve(canvas.toDataURL('image/jpeg', 0.7))
          }
          img.onerror = reject
          img.src = String(reader.result)
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      })
    })
    Promise.all(pending).then((dataUrls) => {
      setImages((prev) => [...prev, ...dataUrls])
    })
    e.target.value = ''
  }

  function removeImage(index: number) {
    const container = imagesScrollRef.current
    const scrollLeft = container?.scrollLeft ?? 0
    setImages((prev) => prev.filter((_, i) => i !== index))
    requestAnimationFrame(() => {
      if (container) container.scrollLeft = scrollLeft
    })
  }

  const handleSearchNearbyGigsters = useCallback(async (jobData: typeof pendingJobData) => {
    if (!jobData) return
    setConfirmationStep('searching')
    setSearchError(null)
    try {
      const response = await api.jobs.searchNearbyGigsters({
        maxDistanceKm: 10,
        category: jobData.category,
      })
      setNearbyGigstersCount(response.count)
      setConfirmationStep('confirm')
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Failed to search for nearby gigsters.')
      setConfirmationStep('confirm')
    }
  }, [locationKey, options, location])

  const handleConfirmPost = useCallback(async () => {
    if (!pendingJobData) return
    setConfirmationStep('publishing')
    try {
      await api.users.updateGigCoins(-1)
      const job = await api.jobs.create(pendingJobData)
      toast.success('Gig posted', { description: 'Nearby part-timers have been notified.' })
      await refreshAll()
      navigate(`/jobs/${job.id}`)
    } catch (err) {
      toast.error('Could not post gig', {
        description: err instanceof Error ? err.message : 'Please review your details and try again.',
      })
      setConfirmationStep('confirm')
    }
  }, [pendingJobData, refreshAll, navigate])

  const handleCancelConfirmation = useCallback(() => {
    setConfirmationStep('idle')
    setPendingJobData(null)
    setNearbyGigstersCount(0)
    setSearchError(null)
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (hasErrors) {
      setShowErrors(true)
      const errorFields: Array<{ key: keyof typeof errors; ref: React.RefObject<HTMLElement | HTMLInputElement | HTMLSelectElement | HTMLFieldSetElement> }> = [
        { key: 'title', ref: titleRef as React.RefObject<HTMLElement | HTMLInputElement | HTMLSelectElement | HTMLFieldSetElement> },
        { key: 'category', ref: categoryRef as React.RefObject<HTMLElement | HTMLInputElement | HTMLSelectElement | HTMLFieldSetElement> },
        { key: 'amount', ref: amountRef as React.RefObject<HTMLElement | HTMLInputElement | HTMLSelectElement | HTMLFieldSetElement> },
        { key: 'payment', ref: paymentRef as React.RefObject<HTMLElement | HTMLInputElement | HTMLSelectElement | HTMLFieldSetElement> },
        { key: 'schedule', ref: scheduleRef as React.RefObject<HTMLElement | HTMLInputElement | HTMLSelectElement | HTMLFieldSetElement> },
      ]
      for (const field of errorFields) {
        if (errors[field.key] && field.ref?.current) {
          field.ref.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
          if (field.ref.current instanceof HTMLElement) {
            const input = field.ref.current.querySelector('input, select, button') as HTMLElement | null
            if (input) input.focus()
            else field.ref.current.focus()
          }
          break
        }
      }
      return
    }
    const isMerchantGig = isBusinessMerchant
      const loc = options.find((o) => `${o.barangay}|${o.city}` === locationKey) ?? location
      const jobData = {
      title: title.trim(),
      category: category!,
      description: description.trim(),
      compensationType,
      amount: amountNum,
      paymentMethods,
      barangay: loc.barangay,
      city: loc.city,
      landmark: landmark.trim(),
      timing,
      scheduledAt: timing === 'SCHEDULED' ? new Date(scheduledAt).toISOString() : null,
      estimatedDuration: duration.trim() || null,
      images,
      isNegotiable,
      isMerchantGig,
      merchantId: isMerchantGig ? user?.id : undefined,
      merchantName: isMerchantGig ? user?.merchantBusinessName ?? user?.fullName : undefined,
      merchantBoosted: isMerchantGig,
    }
    setPendingJobData(jobData)
    await handleSearchNearbyGigsters(jobData)
  }

  const err = (key: keyof typeof errors) =>
    showErrors && errors[key] ? (
      <p className="text-xs font-medium text-destructive" role="alert">
        {errors[key]}
      </p>
    ) : null

  const isFormDisabled = confirmationStep !== 'idle'

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="flex min-w-0 flex-col gap-6 px-4 pt-4 pb-6">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">What do you need done?</Label>
          <Input
            ref={titleRef}
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 80))}
            placeholder="e.g. Pabili ng kape sa Upaya Cafe"
            className="h-11 bg-card"
            aria-invalid={showErrors && Boolean(errors.title)}
            disabled={isFormDisabled}
          />
          {err('title')}
        </div>

        <fieldset ref={categoryRef} className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Category</legend>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={category === c}
                onClick={() => !isFormDisabled && setCategory(c)}
                className={cn(chip, 'text-left', category === c ? chipOn : chipOff)}
                disabled={isFormDisabled}
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
            disabled={isFormDisabled}
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
                onClick={() => !isFormDisabled && setCompensationType(t)}
                className={cn(chip, compensationType === t ? chipOn : chipOff)}
                disabled={isFormDisabled}
              >
                {COMPENSATION_TYPE_LABELS[t]}
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
              ref={amountRef}
              id="amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder={compensationType === 'HOURLY' ? '150' : '500'}
              className="h-12 bg-card pr-16 pl-8 text-lg font-bold"
              aria-invalid={showErrors && Boolean(errors.amount)}
              disabled={isFormDisabled}
            />
            <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-sm text-muted-foreground">
              {compensationType === 'HOURLY' ? '/ hour' : 'total'}
            </span>
          </div>
          {err('amount')}
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              aria-pressed={isNegotiable}
              onClick={() => !isFormDisabled && setIsNegotiable(!isNegotiable)}
              className={cn(
                'h-10 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 flex items-center gap-1.5',
                isNegotiable
                  ? 'border-primary bg-primary-soft text-orange-800 dark:text-orange-300'
                  : 'border-border bg-card text-foreground hover:border-foreground/30',
              )}
              disabled={isFormDisabled}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              Negotiable rate
            </button>
            <span className="text-[11px] text-muted-foreground">Open to counter-offers from Gigsters</span>
          </div>
        </fieldset>

        <fieldset ref={paymentRef} className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Payment method</legend>
          <div className="grid grid-cols-3 gap-2">
            {PAYMENT_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={paymentMethods.includes(m)}
                onClick={() => !isFormDisabled && togglePayment(m)}
                className={cn(chip, paymentMethods.includes(m) ? chipOn : chipOff)}
                disabled={isFormDisabled}
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
              ref={locationRef}
              id="location"
              value={locationKey}
              onChange={(e) => !isFormDisabled && setLocationKey(e.target.value)}
              className="h-11 w-full rounded-lg border border-input bg-card px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
              disabled={isFormDisabled}
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
              disabled={isFormDisabled}
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
                onClick={() => !isFormDisabled && setTiming(t)}
                className={cn(chip, 'px-2 text-xs', timing === t ? chipOn : chipOff)}
                disabled={isFormDisabled}
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
                ref={scheduleRef}
                id="scheduledAt"
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="h-11 bg-card"
                aria-invalid={showErrors && Boolean(errors.schedule)}
                disabled={isFormDisabled}
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
            disabled={isFormDisabled}
          />
        </fieldset>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">Gig photos</legend>
          <p className="text-xs text-muted-foreground">
            Up to {MAX_IMAGES} photos. These help nearby helpers see what the gig involves.
          </p>
          <div ref={imagesScrollRef} className="grid grid-cols-2 gap-3 w-full" role="region" aria-label="Gig photos">
            {images.map((src, i) => (
              <div key={i} className="relative group aspect-square w-full rounded-xl overflow-hidden border border-border bg-secondary">
                <img
                  src={src}
                  alt={`Gig photo ${i + 1}`}
                  className="object-cover w-full h-full"
                />
                {i === 0 && (
                  <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Cover
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => !isFormDisabled && removeImage(i)}
                  aria-label={`Remove photo ${i + 1}`}
                  className="absolute top-2 right-2 p-1.5 bg-black/60 rounded-full text-white hover:bg-black/80 transition-colors"
                  disabled={isFormDisabled}
                >
                  <span className="sr-only">Remove</span>
                  <span aria-hidden="true">×</span>
                </button>
              </div>
            ))}
            {images.length < MAX_IMAGES && (
              <div className="aspect-square w-full flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-secondary hover:border-primary/50 transition-colors cursor-pointer group">
                <input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={onPickImages}
                  disabled={isFormDisabled}
                />
                <button
                  type="button"
                  onClick={() => !isFormDisabled && document.getElementById('images')?.click()}
                  className="flex flex-col items-center justify-center w-full h-full"
                  disabled={isFormDisabled}
                >
                  <Plus className="size-6 mb-1.5 text-muted-foreground group-hover:text-primary transition-colors" aria-hidden="true" />
                  <span className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
                    Add photos
                  </span>
                </button>
              </div>
            )}
          </div>
        </fieldset>

        <Button type="submit" className="h-12 text-base font-bold" disabled={isFormDisabled}>
          <Rocket aria-hidden="true" />
          Post gig
        </Button>
      </form>

      <Dialog open={confirmationStep !== 'idle'} onOpenChange={(open) => !open && handleCancelConfirmation()}>
        <DialogContent showCloseButton={false} className="max-w-md">
          <DialogHeader>
            {confirmationStep === 'searching' && (
              <>
                <DialogTitle className="flex items-center gap-2">
                  <Search className="size-5 animate-spin text-primary" aria-hidden="true" />
                  Searching for gigsters
                </DialogTitle>
                <DialogDescription>
                  Looking for active nearby gigsters in your area...
                </DialogDescription>
              </>
            )}
            {confirmationStep === 'confirm' && (
              <>
                <DialogTitle className="flex items-center gap-2">
                  {searchError ? (
                    <AlertCircle className="size-5 text-destructive" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                  )}
                  {searchError ? 'Search completed with issues' : nearbyGigstersCount > 0
                    ? `Found ${nearbyGigstersCount} active nearby gigster${nearbyGigstersCount !== 1 ? 's' : ''}`
                    : 'No nearby gigsters found'}
                </DialogTitle>
                <DialogDescription className="space-y-2">
                  {searchError ? (
                    <>
                      <span className="text-destructive">{searchError}</span>
                      <br />
                      <span className="text-muted-foreground">You can still post your gig, but notifications may not reach nearby gigsters.</span>
                    </>
                  ) : nearbyGigstersCount > 0 ? (
                    <span className="block text-muted-foreground">We'll notify matching gigsters in your area once posted.</span>
                  ) : (
                    <span className="block text-muted-foreground">You can still publish your gig so gigsters can discover and apply.</span>
                  )}
                  <span className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border">
                    <Coins className="size-5 text-primary" aria-hidden="true" />
                    <span className="block">
                      <span className="block font-medium">Do you want to publish your gig post? <strong>(1 GigCoin)</strong></span>
                      <span className="block text-xs text-muted-foreground">
                        Your balance: <strong>{userGigCoins} GigCoin{userGigCoins !== 1 ? 's' : ''}</strong>
                        {hasInsufficientCoins && <span className="text-destructive ml-2">(Insufficient balance)</span>}
                      </span>
                    </span>
                  </span>
                </DialogDescription>
              </>
            )}
            {confirmationStep === 'publishing' && (
              <>
                <DialogTitle className="flex items-center gap-2">
                  <Loader2 className="size-5 animate-spin text-primary" aria-hidden="true" />
                  Publishing your gig
                </DialogTitle>
                <DialogDescription>
                  Creating your gig and notifying nearby gigsters...
                </DialogDescription>
              </>
            )}
          </DialogHeader>

          {confirmationStep === 'confirm' && (
            <DialogFooter className="flex flex-row items-center gap-3">
              <Button
                variant="outline"
                onClick={handleCancelConfirmation}
                className="flex-1 whitespace-nowrap"
              >
                <X className="size-3.5 mr-1.5" aria-hidden="true" />
                Cancel Post
              </Button>
              <Button
                onClick={handleConfirmPost}
                disabled={hasInsufficientCoins}
                className="flex-1 whitespace-nowrap"
              >
                {hasInsufficientCoins ? (
                  <>
                    <AlertCircle className="size-3.5 mr-1.5" aria-hidden="true" />
                    Insufficient GigCoins
                  </>
                ) : (
                  <>
                    Post
                  </>
                )}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
