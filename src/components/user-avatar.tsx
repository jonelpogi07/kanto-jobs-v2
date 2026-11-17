import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initials } from '@/lib/format'
import { cn } from '@/lib/utils'

const PALETTE = [
  'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
]

export function UserAvatar({
  user,
  className,
}: {
  user: { id: number; fullName: string; avatarUrl: string | null }
  className?: string
}) {
  return (
    <Avatar className={cn('size-9', className)}>
      {user.avatarUrl ? <AvatarImage src={user.avatarUrl} alt="" /> : null}
      <AvatarFallback className={cn('font-semibold', PALETTE[user.id % PALETTE.length])}>
        {initials(user.fullName)}
      </AvatarFallback>
    </Avatar>
  )
}
