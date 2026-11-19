import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, MessageCircle, Send } from 'lucide-react'
import { ApplicationStatusBadge } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RequireAuth } from '@/components/require-auth'
import { UserAvatar } from '@/components/user-avatar'
import { CHAT_THREADS_KEY, useChatMessages, useChatThreads } from '@/hooks/use-api'
import { useAuth } from '@/lib/auth'
import { formatClock, formatDayLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import type { ChatMessageDTO } from '@/types'

export function ChatPage() {
  return (
    <RequireAuth title="Log in to chat">
      <ChatConversation />
    </RequireAuth>
  )
}

function ChatConversation() {
  const { threadId: raw } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const parsedId = Number(raw)
  const { data: threads, isLoading: threadsLoading } = useChatThreads()
  const thread = threads?.find((t) => t.id === parsedId) ?? null
  const { data: messages, mutate, isLoading: messagesLoading } = useChatMessages(thread?.id ?? null)
  const { mutate: globalMutate } = useSWRConfig()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const markedRead = useRef<number | null>(null)
  const count = messages?.length ?? 0

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count, thread?.id])

  useEffect(() => {
    if (thread?.id != null && messages !== undefined && markedRead.current !== thread.id) {
      markedRead.current = thread.id
      void globalMutate(CHAT_THREADS_KEY)
    }
  }, [thread?.id, messages, globalMutate])

  if (threadsLoading && !threads) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading conversation</span>
      </div>
    )
  }

  if (!thread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        <p className="text-lg font-bold">Conversation not found</p>
        <p className="text-sm text-muted-foreground">It may have been removed or is no longer available.</p>
        <Link to="/messages" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
          Back to inbox
        </Link>
      </div>
    )
  }

  const firstName = thread.otherUser.fullName.split(' ')[0]

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!thread || !draft.trim() || sending) return
    setSending(true)
    try {
      const message = await api.chat.send(thread.id, { body: draft })
      await mutate((list) => [...(list ?? []), message], { revalidate: true })
      setDraft('')
      void globalMutate(CHAT_THREADS_KEY)
    } catch (err) {
      toast.error('Could not send message', {
        description: err instanceof Error ? err.message : 'Check your connection and try again.',
      })
    } finally {
      setSending(false)
    }
  }

  const isLocked = thread.applicationStatus !== 'SCREENING' && thread.applicationStatus !== 'ACCEPTED'

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur">
        <Button variant="ghost" size="icon-lg" onClick={() => navigate('/messages')}>
          <ArrowLeft aria-hidden="true" />
          <span className="sr-only">Back to inbox</span>
        </Button>
        <UserAvatar user={thread.otherUser} className="size-9" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{thread.otherUser.fullName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {thread.otherUser.phoneVerified ? 'Phone verified' : 'KantoJobs member'}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300">
          <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
          Live
        </span>
      </header>

      <div className="flex items-center gap-2 border-b border-border bg-secondary/40 px-4 py-2">
        <ApplicationStatusBadge status={thread.applicationStatus} />
        <Link to={`/jobs/${thread.jobId}`} className="truncate text-xs font-medium text-muted-foreground hover:text-primary">
          {thread.jobTitle}
        </Link>
      </div>
      {isLocked ? (
        <div className="border-b border-border bg-amber-50 px-4 py-2 text-xs font-medium text-amber-800">
          {user && user.id === thread.posterId
            ? 'Screen this applicant in My Gigs (1 GigCoin) to unlock messaging and contact details.'
            : 'Waiting for the client to screen or accept your application to unlock direct messaging and contact details.'}
        </div>
      ) : null}

      <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {messagesLoading && !messages ? (
          <div className="flex justify-center py-12" role="status">
            <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
            <span className="sr-only">Loading messages</span>
          </div>
        ) : !messages?.length ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
              <MessageCircle className="size-6" aria-hidden="true" />
            </span>
            <p className="font-semibold">Start the conversation</p>
            <p className="text-sm text-muted-foreground">
              {`Coordinate the details of "${thread.jobTitle}" with ${firstName}.`}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {messages.map((message, index) => {
              const day = formatDayLabel(message.createdAt)
              const showDay = index === 0 || formatDayLabel(messages[index - 1].createdAt) !== day
              return (
                <li key={message.id}>
                  {showDay ? <DayDivider label={day} /> : null}
                  <Bubble message={message} mine={message.senderId === user?.id} />
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <form
        onSubmit={submit}
        className="shrink-0 border-t border-border bg-card px-3 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="flex items-center gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`Message ${firstName}...`}
            aria-label="Message"
            maxLength={2000}
            autoComplete="off"
            disabled={isLocked}
            className="h-11 flex-1 rounded-full border-transparent bg-secondary px-4 text-base focus-visible:border-ring disabled:opacity-50"
          />
          <Button
            type="submit"
            size="icon-lg"
            className="size-11 shrink-0 rounded-full"
            disabled={isLocked || !draft.trim() || sending}
            aria-label="Send message"
          >
            {sending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Send aria-hidden="true" />}
          </Button>
        </div>
      </form>
    </div>
  )
}

function DayDivider({ label }: { label: string }) {
  return (
    <div className="mb-3 flex items-center justify-center">
      <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{label}</span>
    </div>
  )
}

function Bubble({ message, mine }: { message: ChatMessageDTO; mine: boolean }) {
  return (
    <div className={cn('flex flex-col', mine ? 'items-end' : 'items-start')}>
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed break-words whitespace-pre-wrap',
          mine ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md bg-secondary text-foreground',
        )}
      >
        {message.body}
      </div>
      <span className="mt-1 px-1 text-[10px] text-muted-foreground">
        {formatClock(message.createdAt)}
        {mine ? (message.readAt ? ' · Read' : ' · Sent') : ''}
      </span>
    </div>
  )
}