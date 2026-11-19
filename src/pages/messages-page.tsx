import { Link } from 'react-router'
import { Inbox, Loader2, MessageCircle } from 'lucide-react'
import { PageHeader } from '@/components/layout/app-shell'
import { RequireAuth } from '@/components/require-auth'
import { UserAvatar } from '@/components/user-avatar'
import { useChatThreads } from '@/hooks/use-api'
import { timeAgo } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { ChatThreadDTO } from '@/types'

export function MessagesPage() {
  return (
    <>
      <PageHeader title="Inbox" subtitle="Chat with clients and jobseekers" />
      <RequireAuth title="Log in to see your messages">
        <ThreadList />
      </RequireAuth>
    </>
  )
}

function ThreadList() {
  const { data: threads, isLoading } = useChatThreads()
  const visible = (threads ?? []).filter(
    (t) => t.applicationStatus === 'SCREENING' || t.applicationStatus === 'ACCEPTED',
  )

  if (isLoading && !threads) {
    return (
      <div className="flex justify-center py-12" role="status">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading conversations</span>
      </div>
    )
  }

  if (!visible.length) {
    return (
      <div className="mx-4 mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-12 text-center">
        <MessageCircle className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-semibold">No conversations yet</p>
        <p className="text-sm text-muted-foreground">
          Message a client after sending a pitch, or reply to jobseekers who apply to your gigs.
        </p>
        <Link to="/explore" className="mt-2 text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Explore gigs
        </Link>
      </div>
    )
  }

  return (
    <ul className="flex flex-col pb-6">
      {visible.map((thread) => (
        <li key={thread.id}>
          <ThreadRow thread={thread} />
        </li>
      ))}
    </ul>
  )
}

function ThreadRow({ thread }: { thread: ChatThreadDTO }) {
  const unread = thread.unreadCount > 0
  const preview = thread.lastMessage ?? 'Say hi and coordinate the details.'

  return (
    <Link
      to={`/messages/${thread.id}`}
      className="flex items-start gap-3 border-b border-border px-4 py-3.5 outline-none transition-colors hover:bg-secondary/60 focus-visible:bg-secondary"
    >
      <UserAvatar user={thread.otherUser} className="mt-0.5 size-11" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <p className={cn('truncate text-sm', unread ? 'font-extrabold' : 'font-bold')}>{thread.otherUser.fullName}</p>
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {thread.lastMessageAt ? timeAgo(thread.lastMessageAt) : ''}
          </span>
        </div>
        <p className="truncate text-xs text-muted-foreground">{thread.jobTitle}</p>
        <div className="mt-1 flex items-center justify-between gap-2">
          <p className={cn('truncate text-sm', unread ? 'font-semibold text-foreground' : 'text-muted-foreground')}>
            {preview}
          </p>
          {unread ? (
            <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
              {thread.unreadCount > 9 ? '9+' : thread.unreadCount}
            </span>
          ) : (
            <Inbox className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
          )}
        </div>
      </div>
    </Link>
  )
}