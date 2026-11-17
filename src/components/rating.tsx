import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RatingInline({ average, count, className }: { average: number; count: number; className?: string }) {
  if (count === 0) return <span className={cn('text-xs text-muted-foreground', className)}>New</span>
  return (
    <span className={cn('inline-flex items-center gap-0.5 text-xs font-semibold text-foreground', className)}>
      <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
      {average.toFixed(1)}
      <span className="font-normal text-muted-foreground">({count})</span>
      <span className="sr-only">
        {`Rated ${average.toFixed(1)} out of 5 from ${count} reviews`}
      </span>
    </span>
  )
}

export function Stars({ value, size = 'size-4' }: { value: number; size?: string }) {
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(size, n <= Math.round(value) ? 'fill-amber-400 text-amber-400' : 'fill-muted text-muted')}
          aria-hidden="true"
        />
      ))}
    </span>
  )
}

const RATING_WORDS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

export function StarInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div role="radiogroup" aria-label="Rating" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}`}
            onClick={() => onChange(n)}
            className="rounded-md p-1 transition-transform outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:scale-90"
          >
            <Star
              className={cn('size-9', n <= value ? 'fill-amber-400 text-amber-400' : 'fill-muted text-border')}
              aria-hidden="true"
            />
          </button>
        ))}
      </div>
      <p className="h-5 text-sm font-medium text-muted-foreground" aria-live="polite">
        {RATING_WORDS[value]}
      </p>
    </div>
  )
}
