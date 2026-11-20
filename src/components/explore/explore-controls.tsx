import { useState } from 'react'
import { Check, ChevronDown, MapPin, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { useLocation } from '@/lib/location'
import { CATEGORIES, CATEGORY_LABELS, formatPeso, RATE_TYPE_LABELS, WEEKDAYS } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { JobCategory, JobTiming, CompensationType, RateType } from '@/types'

export function LocationPicker() {
  const { location, options, setLocation } = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MapPin className="size-4" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-medium text-muted-foreground">Gigs near</span>
          <span className="flex items-center gap-1 text-xs font-bold text-foreground">
            <span className="truncate">{`${location.barangay}, ${location.city.split(',')[0]}`}</span>
            <ChevronDown className="size-3.5 shrink-0" aria-hidden="true" />
          </span>
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-h-[80dvh] max-w-md rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Choose your barangay</SheetTitle>
            <SheetDescription>{"We'll show gigs closest to you first."}</SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col overflow-y-auto px-2 pb-6">
            {options.map((opt) => {
              const selected = opt.barangay === location.barangay && opt.city === location.city
              return (
                <li key={`${opt.barangay}-${opt.city}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setLocation(opt)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-secondary',
                      selected && 'bg-primary-soft',
                    )}
                  >
                    <span>
                      <span className="block text-sm font-semibold">{opt.barangay}</span>
                      <span className="block text-xs text-muted-foreground">{opt.city}</span>
                    </span>
                    {selected ? <Check className="size-4 text-primary" aria-label="Selected" /> : null}
                  </button>
                </li>
              )
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </>
  )
}

export function CategoryPills({
  value,
  onChange,
}: {
  value: JobCategory | undefined
  onChange: (v: JobCategory | undefined) => void
}) {
  const items: { key: JobCategory | undefined; label: string }[] = [
    { key: undefined, label: 'All' },
    ...CATEGORIES.map((c) => ({ key: c, label: CATEGORY_LABELS[c] })),
  ]
  return (
    <div className="no-scrollbar -mx-4 flex items-center gap-2 overflow-x-auto px-4" role="group" aria-label="Categories">
      {items.map(({ key, label }) => {
        const active = value === key
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={cn(
              'h-8 shrink-0 rounded-full border px-3.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus:outline-none',
              active
                ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white'
                : 'border-border bg-card text-foreground hover:border-foreground/30',
            )}
          >
            {label}
          </button>
        )
      })}
    </div>
  )
}

export interface FeedFilters {
  maxDistanceKm: number | undefined
  minPay: number | undefined
  availableDays: string[]
  rateType: RateType[]
  timing?: JobTiming[]
  compensationTypes?: CompensationType[]
  isNegotiable?: boolean
}

const DISTANCE_MAX = 25
const PAY_MAX = 2000

export function FilterButton({ filters, onChange, mode = 'gigs' }: { filters: FeedFilters; onChange: (f: FeedFilters) => void; mode?: 'gigs' | 'gigsters' }) {
  const [open, setOpen] = useState(false)
  const [distance, setDistance] = useState(filters.maxDistanceKm ?? DISTANCE_MAX)
  const [minPay, setMinPay] = useState(filters.minPay ?? 0)
  const [selectedDays, setSelectedDays] = useState<string[]>(filters.availableDays ?? [])
  const [selectedSchedule, setSelectedSchedule] = useState<JobTiming[]>(filters.timing ?? [])
  const [selectedCompensationTypes, setSelectedCompensationTypes] = useState<CompensationType[]>(filters.compensationTypes ?? [])
  const [isNegotiable, setIsNegotiable] = useState(filters.isNegotiable ?? false)
  const [selectedRateTypes, setSelectedRateTypes] = useState<RateType[]>(filters.rateType ?? [])
  const anytimeActive = selectedSchedule.length === 0
  const compensationAnyActive = selectedCompensationTypes.length === 0 || selectedCompensationTypes.length === 2
  const rateTypeAnyActive = selectedRateTypes.length === 0 || selectedRateTypes.length >= 2
  const activeCount =
    Number(filters.maxDistanceKm != null) +
    Number(mode === 'gigs' && filters.minPay != null) +
    Number(mode === 'gigsters' && selectedDays.length > 0) +
    Number(mode === 'gigsters' && filters.rateType.length > 0) +
    Number(mode === 'gigs' && (filters.timing?.length ?? 0) > 0) +
    Number(mode === 'gigs' && !compensationAnyActive) +
    Number(mode === 'gigs' && filters.isNegotiable)

  function toggleDay(day: string) {
    setSelectedDays((prev) => {
      const next = prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
      if (next.length === 0 || next.length >= WEEKDAYS.length) return []
      return next
    })
  }

  function toggleCompensationType(type: CompensationType) {
    setSelectedCompensationTypes((prev) => {
      const next = prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
      if (next.length === 0 || next.length >= 2) return []
      return next
    })
  }

  function toggleRateType(value: RateType) {
    setSelectedRateTypes((prev) => {
      const next = prev.includes(value) ? prev.filter((t) => t !== value) : [...prev, value]
      if (next.length === 0 || next.length >= 2) return []
      return next
    })
  }

  function openSheet() {
    setDistance(filters.maxDistanceKm ?? DISTANCE_MAX)
    setMinPay(filters.minPay ?? 0)
    setSelectedDays(filters.availableDays ?? [])
    setSelectedSchedule(filters.timing ?? [])
    setSelectedCompensationTypes(filters.compensationTypes ?? [])
    setSelectedRateTypes(filters.rateType ?? [])
    setIsNegotiable(filters.isNegotiable ?? false)
    setOpen(true)
  }

  function apply() {
    onChange({
      maxDistanceKm: distance >= DISTANCE_MAX ? undefined : distance,
      minPay: mode === 'gigs' && minPay > 0 ? minPay : undefined,
      availableDays: selectedDays.length > 0 ? selectedDays : [],
      rateType: mode === 'gigsters' && !rateTypeAnyActive ? selectedRateTypes : [],
      timing: mode === 'gigs' ? selectedSchedule : filters.timing,
      compensationTypes: mode === 'gigs' && !compensationAnyActive ? selectedCompensationTypes : undefined,
      isNegotiable: mode === 'gigs' && isNegotiable ? true : undefined,
    })
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className={cn(
          'relative flex size-11 shrink-0 items-center justify-center rounded-xl border bg-card outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
          activeCount ? 'border-primary text-primary' : 'border-border text-foreground',
        )}
        aria-label={`Filters${activeCount ? ` (${activeCount} active)` : ''}`}
      >
        <SlidersHorizontal className="size-5" aria-hidden="true" />
        {activeCount ? (
          <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            {activeCount}
          </span>
        ) : null}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-md rounded-t-3xl pb-6">
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
            <SheetDescription>
              {mode === 'gigsters'
                ? 'Narrow down gigsters by distance and availability.'
                : 'Narrow down gigs by distance, pay, and schedule.'}
            </SheetDescription>
          </SheetHeader>
          <div className="flex flex-col gap-7 px-4">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span id="distance-label" className="text-sm font-semibold">
                  Max distance
                </span>
                <span className="text-sm font-bold text-primary">
                  {distance >= DISTANCE_MAX ? 'Any distance' : `Within ${distance} km`}
                </span>
              </div>
              <Slider
                aria-labelledby="distance-label"
                min={1}
                max={DISTANCE_MAX}
                step={1}
                value={distance}
                onValueChange={(v) => setDistance(Array.isArray(v) ? v[0] : v)}
              />
            </div>
            {mode === 'gigs' ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span id="pay-label" className="text-sm font-semibold">
                    Minimum pay
                  </span>
                  <span className="text-sm font-bold text-success">
                    {minPay > 0 ? `${formatPeso(minPay)}+` : 'Any amount'}
                  </span>
                </div>
                <Slider
                  aria-labelledby="pay-label"
                  min={0}
                  max={PAY_MAX}
                  step={50}
                  value={minPay}
                  onValueChange={(v) => setMinPay(Array.isArray(v) ? v[0] : v)}
                />
              </div>
            ) : null}
            {mode === 'gigs' ? (
              <>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span id="schedule-label" className="text-sm font-semibold">
                      Schedule
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedSchedule([])}
                      className={cn(
                        'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        anytimeActive
                          ? 'border-orange-200 bg-orange-50 text-orange-600'
                          : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
                      )}
                      aria-pressed={anytimeActive}
                    >
                      Any time
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2" role="group" aria-labelledby="schedule-label">
                    {([
                      { value: 'URGENT', label: 'Today / Urgent' },
                      { value: 'SCHEDULED', label: 'Scheduled' },
                      { value: 'FLEXIBLE', label: 'Flexible' },
                    ] as const).map(({ value, label }) => {
                      const active = selectedSchedule.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => {
                            setSelectedSchedule((prev) => {
                              const next = prev.includes(value)
                                ? prev.filter((s) => s !== value)
                                : [...prev, value]
                              if (next.length === 0 || next.length >= 3) return []
                              return next
                            })
                          }}
                          className={cn(
                            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                            active
                              ? 'bg-orange-50 border-orange-400 text-orange-700 dark:bg-orange-500/15 dark:border-orange-400 dark:text-orange-300 font-medium'
                              : 'bg-white border-gray-200 text-gray-800',
                          )}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <span id="compensation-label" className="text-sm font-semibold">
                      Compensation
                    </span>
                    <button
                      type="button"
                      onClick={() => setSelectedCompensationTypes([])}
                      className={cn(
                        'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        compensationAnyActive
                          ? 'border-orange-200 bg-orange-50 text-orange-600'
                          : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
                      )}
                      aria-pressed={compensationAnyActive}
                    >
                      Any
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="compensation-label">
                    {(['FIXED', 'HOURLY'] as const).map((value) => {
                      const label = value === 'FIXED' ? 'Fixed price' : 'Hourly rate'
                      const active = selectedCompensationTypes.includes(value)
                      return (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={active}
                          onClick={() => toggleCompensationType(value)}
                          className={cn(
                            'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                            active
                              ? 'bg-orange-50 border-orange-400 text-orange-700 dark:bg-orange-500/15 dark:border-orange-400 dark:text-orange-300 font-medium'
                              : 'bg-white border-gray-200 text-gray-800',
                          )}
                        >
                          {label}
                        </button>
                      )
                    })}
                  </div>
                  <div className="flex items-center justify-between gap-3 cursor-pointer select-none" role="switch" aria-checked={isNegotiable} onClick={() => setIsNegotiable((prev) => !prev)}>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-foreground">Negotiable rate</span>
                        <span className="text-xs text-slate-500 dark:text-slate-400">Show only gigs open to counter-offers</span>
                      </div>
                      <span
                        className={cn(
                          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 transition-colors',
                          isNegotiable
                            ? 'bg-orange-500 border-orange-500'
                            : 'bg-slate-200 border-slate-200 dark:bg-slate-700 dark:border-slate-700',
                        )}
                        aria-hidden="true"
                      >
                        <span
                          className={cn(
                            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
                            isNegotiable ? 'translate-x-5' : 'translate-x-0',
                          )}
                        />
                      </span>
                    </div>
                </div>
              </>
            ) : null}
            {mode === 'gigsters' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span id="days-label" className="text-sm font-semibold">
                  Available days
                </span>
              <button
                type="button"
                onClick={() => setSelectedDays([])}
                className={cn(
                  'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  selectedDays.length === 0
                    ? 'border-orange-200 bg-orange-50 text-orange-600'
                    : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
                )}
                aria-pressed={selectedDays.length === 0}
              >
                Anytime
              </button>
            </div>
            <div className="flex flex-nowrap gap-1" role="group" aria-labelledby="days-label">
              {WEEKDAYS.map((day) => {
                const active = selectedDays.includes(day)
                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={cn(
                      'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                      active
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-border bg-card text-foreground hover:border-foreground/30',
                    )}
                    aria-pressed={active}
                  >
                    {day}
                  </button>
                )
              })}
              </div>
            </div>
          ) : null}
            {mode === 'gigsters' ? (
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <span id="rate-type-label" className="text-sm font-semibold">
                  Rate type
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedRateTypes([])}
                  className={cn(
                    'shrink-0 rounded-full border px-2 py-1 text-[11px] font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                    rateTypeAnyActive
                      ? 'border-orange-200 bg-orange-50 text-orange-600'
                      : 'border-border bg-card text-muted-foreground hover:border-foreground/30',
                  )}
                  aria-pressed={rateTypeAnyActive}
                >
                  Any
                </button>
              </div>
              <div className="flex flex-nowrap gap-1" role="group" aria-labelledby="rate-type-label">
                {(['hourly', 'per_gig'] as const).map((value) => {
                  const active = selectedRateTypes.includes(value)
                  return (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggleRateType(value)}
                      className={cn(
                        'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                        active
                          ? 'bg-orange-50 border-orange-400 text-orange-700 dark:bg-orange-500/15 dark:border-orange-400 dark:text-orange-300 font-medium'
                          : 'bg-white border-gray-200 text-gray-800',
                      )}
                    >
                      {RATE_TYPE_LABELS[value]}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  setDistance(DISTANCE_MAX)
                  setMinPay(0)
                  setSelectedDays([])
                  setSelectedSchedule([])
                  setSelectedCompensationTypes([])
                  setSelectedRateTypes([])
                  setIsNegotiable(false)
                }}
              >
                Reset
              </Button>
              <Button className="h-11 font-bold" onClick={apply}>
                {mode === 'gigsters' ? 'Show gigsters' : 'Show gigs'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
