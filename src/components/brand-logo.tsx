import { cn } from '@/lib/utils'

const SIZES = {
  sm: { mark: 'size-8 rounded-lg text-sm', text: 'text-sm' },
  md: { mark: 'size-10 rounded-xl text-lg', text: 'text-xl' },
} as const

export function BrandLogo({ size = 'md', className }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size]
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center bg-primary font-black text-primary-foreground',
          s.mark,
        )}
        aria-hidden="true"
      >
        K
      </span>
      <span className={cn('font-extrabold tracking-tight', s.text)}>
        Kanto<span className="text-primary">-Jobs</span>
      </span>
    </span>
  )
}