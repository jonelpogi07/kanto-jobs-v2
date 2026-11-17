import { cn } from '@/lib/utils'

const SIZES = {
  sm: { mark: 'size-8 rounded-lg text-base', text: 'text-sm' },
  md: { mark: 'size-10 rounded-xl text-xl', text: 'text-xl' },
} as const

export function BrandLogo({ size = 'md', className }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size]
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <span
        className={cn(
          'flex shrink-0 items-center justify-center bg-primary text-primary-foreground',
          s.mark,
        )}
        aria-hidden="true"
      >
        <i className="fi fi-sr-heart-partner-handshake flex items-center justify-center leading-none" />
      </span>
      <span className={cn('font-extrabold tracking-tight', s.text)}>
        Kanto<span className="text-primary">-Jobs</span>
      </span>
    </span>
  )
}