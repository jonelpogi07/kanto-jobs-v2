import { MessageCircle, MessageSquareText, Phone, Smartphone } from 'lucide-react'
import { toE164 } from '@/lib/format'
import type { ContactInfoDTO } from '@/types'

export function ContactBar({ contact, name }: { contact: ContactInfoDTO; name: string }) {
  const e164 = contact.phoneNumber ? toE164(contact.phoneNumber) : null
  const actions = [
    e164 && { label: 'Call', href: `tel:${e164}`, icon: Phone, className: 'bg-success text-white' },
    e164 && { label: 'SMS', href: `sms:${e164}`, icon: MessageSquareText, className: 'bg-foreground text-background' },
    contact.viberNumber && {
      label: 'Viber',
      href: `viber://chat?number=${encodeURIComponent(toE164(contact.viberNumber))}`,
      icon: Smartphone,
      className: 'bg-[#7360F2] text-white',
    },
    contact.messengerUsername && {
      label: 'Messenger',
      href: `https://m.me/${contact.messengerUsername}`,
      icon: MessageCircle,
      className: 'bg-[#0866FF] text-white',
    },
  ].filter(Boolean) as { label: string; href: string; icon: typeof Phone; className: string }[]

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-success/30 bg-success-soft p-3">
      <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
        {`Coordinate with ${name.split(' ')[0]}`}
        {contact.phoneNumber ? <span className="font-normal">{` · ${contact.phoneNumber}`}</span> : null}
      </p>
      <div className="grid grid-cols-4 gap-2">
        {actions.map(({ label, href, icon: Icon, className }) => (
          <a
            key={label}
            href={href}
            target={href.startsWith('http') ? '_blank' : undefined}
            rel={href.startsWith('http') ? 'noreferrer' : undefined}
            className={`flex flex-col items-center justify-center gap-1 rounded-lg py-2 text-[11px] font-semibold outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:opacity-80 ${className}`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}
