import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useSWRConfig } from 'swr'
import { toast } from 'sonner'
import { ArrowLeft, AlertCircle, Loader2, MessageCircle, Send } from 'lucide-react'
import { ApplicationStatusBadge } from '@/components/badges'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { RequireAuth } from '@/components/require-auth'
import { UserAvatar } from '@/components/user-avatar'
import { AppealModal } from '@/components/appeal-modal'
import { CHAT_THREADS_KEY, useChatMessages, useChatThreads, useRefreshAll, useMockRefundEvaluation } from '@/hooks/use-api'
import { useAuth } from '@/lib/auth'
import { formatClock, formatDayLabel } from '@/lib/format'
import { cn } from '@/lib/utils'
import { api } from '@/services/api'
import type { ChatMessageDTO, ChatThreadDTO } from '@/types'

const LOOKUP_TIMEOUT_MS = 10_000

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
  const { data: threads, isLoading: threadsLoading, mutate: mutateThreads } = useChatThreads()
  const thread = threads?.find((t) => t.id === parsedId) ?? null
  const { data: messages, mutate, isLoading: messagesLoading } = useChatMessages(thread?.id ?? null)
  const [checking, setChecking] = useState(false)
  const [threadExists, setThreadExists] = useState<boolean | null>(null)
  const [lookupError, setLookupError] = useState<string | null>(null)
  const [retryKey, setRetryKey] = useState(0)
  const { mutate: globalMutate } = useSWRConfig()
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const [appealOpen, setAppealOpen] = useState(false)
  const [appealReportId, setAppealReportId] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const count = messages?.length ?? 0
  const refreshAll = useRefreshAll()
  // Re-evaluate 24h refund eligibility on focus and cross-tab storage events.
  useMockRefundEvaluation()

  // Sync chat threads and messages across tabs on storage events.
  useEffect(() => {
    const onStorage = () => {
      void mutateThreads()
      if (thread?.id) void globalMutate(['/chat/threads/:id/messages', thread.id])
    }
    const onFocus = () => {
      void mutateThreads()
      if (thread?.id) void globalMutate(['/chat/threads/:id/messages', thread.id])
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', onFocus)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', onFocus)
    }
  }, [mutateThreads, globalMutate, thread?.id])

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [count, thread?.id])

  useEffect(() => {
    if (!Number.isFinite(parsedId)) {
      setThreadExists(false)
      setLookupError('Invalid conversation.')
      return
    }
    if (thread) return
    if (threadsLoading) return

    let cancelled = false
    let settled = false

    const timer = setTimeout(() => {
      if (!cancelled && !settled && checking) {
        settled = true
        setChecking(false)
        setLookupError('The conversation is taking too long to load. Please try again.')
      }
    }, LOOKUP_TIMEOUT_MS)

    ;(async () => {
      try {
        setChecking(true)
        setLookupError(null)
        void mutateThreads()
        await api.chat.messages(parsedId)
        if (!cancelled) {
          settled = true
          clearTimeout(timer)
          setThreadExists(true)
          setChecking(false)
        }
      } catch (err) {
        if (!cancelled) {
          settled = true
          clearTimeout(timer)
          setChecking(false)
          setThreadExists(false)
          setLookupError(err instanceof Error ? err.message : 'Could not load the conversation.')
        }
      }
    })()

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [thread, threadsLoading, mutateThreads, parsedId, retryKey])

  useEffect(() => {
    if (threadExists === true && !thread) void mutateThreads()
  }, [threadExists, thread, mutateThreads])

  const retry = () => {
    setLookupError(null)
    setThreadExists(null)
    setChecking(true)
    setRetryKey((k) => k + 1)
  }

  if (threadsLoading && !threads) {
    return (
      <div className="flex flex-1 items-center justify-center" role="status">
        <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
        <span className="sr-only">Loading conversation</span>
      </div>
    )
  }

  if (!thread) {
    if (checking || threadExists === null) {
      return (
        <div className="flex flex-1 items-center justify-center" role="status">
          <Loader2 className="size-6 animate-spin text-primary" aria-hidden="true" />
          <span className="sr-only">Loading conversation</span>
        </div>
      )
    }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-8 text-center">
        {lookupError ? (
          <>
            <p className="text-lg font-bold">Could not load conversation</p>
            <p className="text-sm text-muted-foreground">{lookupError}</p>
            <div className="flex gap-2">
              <Button onClick={retry}>Retry</Button>
              <Link to="/messages" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                Back to inbox
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="text-lg font-bold">Conversation not found</p>
            <p className="text-sm text-muted-foreground">It may have been removed or is no longer available.</p>
            <Link to="/messages" className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
              Back to inbox
            </Link>
          </>
        )}
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

  function handleReportAppeal(reportId: number) {
    setAppealReportId(reportId)
    setAppealOpen(true)
  }

  const isLocked = thread.applicationStatus !== 'SCREENING' && thread.applicationStatus !== 'ACCEPTED'
  const isSystemThread =
    thread.id < 0 ||
    Boolean(thread.hasReportNotice) ||
    Boolean(
      messages?.length &&
        messages.every((m) => m.type === 'report' || m.type === 'appeal' || m.type === 'system' || m.senderId === 0),
    )

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="sticky top-0 z-30 flex items-center gap-2 border-b border-border bg-background/95 px-2 pb-2 pt-[calc(env(safe-area-inset-top)+0.5rem)] backdrop-blur">
        <Button variant="ghost" size="icon-lg" onClick={() => navigate('/messages')}>
          <ArrowLeft aria-hidden="true" />
          <span className="sr-only">Back to inbox</span>
        </Button>
        {isSystemThread ? (
          <span className="flex size-9 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
            <AlertCircle className="size-5" aria-hidden="true" />
          </span>
        ) : (
          <UserAvatar user={thread.otherUser} className="size-9" />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{isSystemThread ? 'System Notification' : thread.otherUser.fullName}</p>
          <p className="truncate text-[11px] text-muted-foreground">
            {isSystemThread ? 'System / Official Notice' : thread.otherUser.phoneVerified ? 'Phone verified' : 'KantoJobs member'}
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
       {isLocked && !isSystemThread ? (
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
              const appealedReportIds = new Set(
                (messages ?? [])
                  .filter((m) => m.type === 'appeal')
                  .map((m) => Number(messageData(m).reportId)),
              )
              return (
                <li key={message.id}>
                  {showDay ? <DayDivider label={day} /> : null}
                  {message.type === 'report' ? (
                    <ReportNotice
                      key={message.id}
                      message={message}
                      thread={thread}
                      me={user?.id ?? -1}
                      onAppeal={handleReportAppeal}
                      appealed={appealedReportIds.has(Number(messageData(message).reportId))}
                     />
                   ) : message.type === 'appeal' ? (
                    Number(messageData(message).appellantId) === (user?.id ?? -1) ? (
                      <AppealNotice key={message.id} message={message} />
                    ) : (
                      <SystemNotice key={message.id} message={{ ...message, body: 'An appeal was filed within the 24-hour window. An admin will review both sides before finalizing any GigCoin refund.' }} />
                    )
                  ) : message.type === 'system' ? (
                    <SystemNotice key={message.id} message={message} />
                  ) : (
                    <Bubble message={message} mine={message.senderId === user?.id} />
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>

       {isSystemThread ? (
         <div className="shrink-0 border-t border-border bg-card px-4 py-3 text-center text-xs text-muted-foreground">
           System notifications are automated. Use the Appeal button above if you need to dispute a report.
         </div>
       ) : (
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
       )}

      <AppealModal
        open={appealOpen}
        onOpenChange={setAppealOpen}
        reportId={appealReportId!}
        onSuccess={() => {
          setAppealOpen(false)
          setAppealReportId(null)
          void refreshAll()
          void globalMutate(CHAT_THREADS_KEY)
        }}
      />
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

function messageData(message: ChatMessageDTO) {
  try {
    return message.data ? (JSON.parse(message.data) as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

function appealWindowStatus(deadline: string | null) {
  if (!deadline) return 'closed'
  return new Date(deadline).getTime() > Date.now() ? 'open' : 'closed'
}

function ReportNotice({
  message,
  thread,
  me,
  onAppeal,
  appealed = false,
}: {
  message: ChatMessageDTO
  thread: ChatThreadDTO
  me: number
  onAppeal: (reportId: number) => void
  appealed?: boolean
}) {
  const data = messageData(message)
  const reporterRole = (data.reporterRole ?? 'User') as string
  const status = (data.status ?? 'PENDING') as string
  const deadline = (data.appealDeadline ?? null) as string | null
  const windowStatus = appealWindowStatus(deadline)
  const isAppealed = status === 'APPEALED' || appealed
  const canAppeal = me === Number(data.targetUserId) && status === 'PENDING' && !appealed && windowStatus === 'open'

  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm shadow-sm dark:border-amber-900/30 dark:bg-amber-900/20">
       <div className="flex items-start gap-2">
         <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" aria-hidden="true" />
         <div className="min-w-0 flex-1">
           <span className="mb-1 inline-flex items-center rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">System Notification</span>
           <p className="font-semibold leading-snug">{message.body}</p>
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            <span className="font-bold">Reported by:</span> {reporterRole} &nbsp;·&nbsp;
            <span className="font-bold">Gig:</span> {thread.jobTitle}
          </p>
          {(data.note as string) && (
            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
              <span className="font-bold">Note:</span> {String(data.note)}
            </p>
          )}
          <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
            <span className="font-bold">Status:</span>{' '}
            {isAppealed ? 'Appealed — Under Review' : status === 'REFUNDED' ? 'Refunded' : status === 'RESOLVED' ? 'Resolved' : 'Pending'}
            &nbsp;·&nbsp;
            <span className="font-bold">Appeal window:</span>{' '}
            {windowStatus === 'open' ? `Open — closes ${deadline ? formatClock(deadline) : ''}` : 'Closed'}
          </p>
        </div>
      </div>
       {canAppeal ? (
         <Button onClick={() => onAppeal(Number(data.reportId))} className="mt-2 h-9 rounded-lg bg-amber-600 hover:bg-amber-700 text-amber-50 text-xs font-bold px-3">
           Appeal
         </Button>
       ) : isAppealed ? (
         <span className="mt-2 inline-flex items-center rounded-lg bg-amber-200 px-3 py-1.5 text-xs font-bold text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
           {me === Number(data.targetUserId)
             ? '✓ Appeal Submitted — Under Review'
             : `${reporterRole === 'Client' ? 'Gigster' : 'Client'} Appealed — Under Review${reporterRole === 'Client' ? ' (Refund on Hold)' : ''}`}
         </span>
       ) : null}
    </div>
  )
}

function AppealNotice({ message }: { message: ChatMessageDTO }) {
  const data = messageData(message)
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-3.5 py-3 text-sm shadow-sm dark:border-blue-900/30 dark:bg-blue-900/20">
      <p className="font-semibold leading-snug">{message.body}</p>
      {(data.reason as string) && (
        <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
          <span className="font-bold">Reason:</span> {String(data.reason)}
        </p>
      )}
      <p className="mt-1 text-xs text-blue-700 dark:text-blue-300">
        <span className="font-bold">Status:</span> Under Review
      </p>
    </div>
  )
}

function SystemNotice({ message }: { message: ChatMessageDTO }) {
  return (
    <div className="rounded-xl border border-secondary bg-secondary px-3.5 py-3 text-sm shadow-sm dark:border-secondary/50 dark:bg-secondary/20">
      <p className="text-sm text-muted-foreground">{message.body}</p>
    </div>
  )
}