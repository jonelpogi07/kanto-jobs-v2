import { useState } from 'react'
import { Check, ChevronDown, MapPin, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Slider } from '@/components/ui/slider'
import { useLocation } from '@/lib/location'
import { CATEGORIES, CATEGORY_LABELS, formatPeso } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { JobCategory } from '@/types'

export function LocationPicker() {
  const { location, options, setLocation } = useLocation()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex min-w-0 items-center gap-2 rounded-lg text-left outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
          <MapPin className="size-4.5" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] font-medium text-muted-foreground">Gigs near</span>
          <span className="flex items-center gap-1 text-sm font-bold text-foreground">
            <span className="truncate">{`${location.barangay}, ${location.city.split(',')[0]}`}</span>
            <ChevronDown className="size-4 shrink-0" aria-hidden="true" />
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
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4" role="group" aria-label="Categories">
      {items.map(({ key, label }) => {
        const active = value === key
        return (
          <button
            key={label}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(key)}
            className={cn(
              'h-9 shrink-0 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              active
                ? 'border-foreground bg-foreground text-background'
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
}

const DISTANCE_MAX = 25
const PAY_MAX = 2000

export function FilterButton({ filters, onChange }: { filters: FeedFilters; onChange: (f: FeedFilters) => void }) {
  const [open, setOpen] = useState(false)
  const [distance, setDistance] = useState(filters.maxDistanceKm ?? DISTANCE_MAX)
  const [minPay, setMinPay] = useState(filters.minPay ?? 0)
  const activeCount = Number(filters.maxDistanceKm != null) + Number(filters.minPay != null)

  function openSheet() {
    setDistance(filters.maxDistanceKm ?? DISTANCE_MAX)
    setMinPay(filters.minPay ?? 0)
    setOpen(true)
  }

  function apply() {
    onChange({
      maxDistanceKm: distance >= DISTANCE_MAX ? undefined : distance,
      minPay: minPay > 0 ? minPay : undefined,
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
            <SheetDescription>Narrow down gigs by distance and pay.</SheetDescription>
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
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="h-11"
                onClick={() => {
                  setDistance(DISTANCE_MAX)
                  setMinPay(0)
                }}
              >
                Reset
              </Button>
              <Button className="h-11 font-bold" onClick={apply}>
                Show gigs
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
