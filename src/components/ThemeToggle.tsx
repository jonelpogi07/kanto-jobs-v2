import { Moon, Monitor, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { cn } from '@/lib/utils'

type Mode = 'light' | 'dark' | 'system'

const MODES: Mode[] = ['light', 'dark', 'system']

const MODE_ICONS: { [key in Mode]: React.ComponentType<any> } = {
  light: Sun,
  dark: Moon,
  system: Monitor,
}

const MODE_LABELS: { [key in Mode]: string } = {
  light: 'Light mode',
  dark: 'Dark mode',
  system: 'Follow system',
}

export function ThemeToggle({ variant = 'segmented', className }: { variant?: 'segmented' | 'icon'; className?: string }) {
  const { theme, resolvedTheme, toggleTheme } = useTheme()

  if (variant === 'icon') {
    const TargetIcon = resolvedTheme === 'light' ? MODE_ICONS.dark : MODE_ICONS.light
    const targetLabel = resolvedTheme === 'light' ? MODE_LABELS.dark : MODE_LABELS.light
    return (
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        aria-label={`${targetLabel}. Switch theme`}
        onClick={toggleTheme}
        className={cn('data-[theme=dark]:bg-muted data-[theme=light]:bg-background', className)}
        data-theme={resolvedTheme}
      >
        <TargetIcon className="size-4" aria-hidden="true" />
        <span className="sr-only">{targetLabel}</span>
      </Button>
    )
  }

  return (
    <div className={cn('inline-flex size-11 shrink-0 rounded-full border border-input bg-input/30 p-0.5', className)}>
      {MODES.map((t) => {
        const Icon = MODE_ICONS[t]
        const isActive = theme === t
        return (
          <Button
            key={t}
            type="button"
            variant="outline"
            size="icon-xs"
            aria-pressed={isActive}
            aria-label={MODE_LABELS[t]}
            onClick={toggleTheme}
            className={cn(
              'size-5 rounded-md p-0 text-muted-foreground transition-colors hover:bg-muted',
              isActive && 'bg-primary text-primary-foreground shadow-sm',
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            <span className="sr-only">{MODE_LABELS[t]}</span>
          </Button>
        )
      })}
    </div>
  )
}
