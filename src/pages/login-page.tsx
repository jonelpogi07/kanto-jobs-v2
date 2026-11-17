import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandLogo } from '@/components/brand-logo'
import { useAuth } from '@/lib/auth'
import { cn } from '@/lib/utils'
import { DEMO_CREDENTIALS } from '@/mocks/data'
import { api, USE_MOCKS } from '@/services/api'

type Mode = 'login' | 'register'

export function LoginPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const { signIn } = useAuth()
  const redirect = params.get('redirect') || '/explore'

  const [mode, setMode] = useState<Mode>('login')
  const [fullName, setFullName] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState<'form' | 'google' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function finish(promise: Promise<Awaited<ReturnType<typeof api.auth.login>>>) {
    setError(null)
    try {
      const res = await promise
      await signIn(res)
      toast.success(`Welcome, ${res.user.fullName.split(' ')[0]}!`)
      navigate(redirect, { replace: true })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong.')
    } finally {
      setSubmitting(null)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting('form')
    void finish(
      mode === 'login'
        ? api.auth.login({ identifier, password })
        : api.auth.register({ fullName, identifier, password }),
    )
  }

  function onGoogle() {
    setSubmitting('google')
    // Real flow: obtain an ID token from Google Identity Services, then POST it to /auth/google.
    void finish(api.auth.loginWithGoogle('mock-google-id-token'))
  }

  return (
    <div className="flex flex-1 flex-col px-5 pt-4 pb-8">
      <Link
        to="/explore"
        className="inline-flex w-fit items-center gap-1 rounded-md text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Browse as guest
      </Link>

      <div className="mt-8 flex flex-col gap-2">
        <BrandLogo />
        <h1 className="mt-4 text-balance text-3xl leading-tight font-extrabold">
          {mode === 'login' ? 'Raket sa kanto, kita agad.' : 'Gumawa ng account.'}
        </h1>
        <p className="text-sm text-muted-foreground">
          {mode === 'login'
            ? 'Find side-hustles and helpers right in your barangay.'
            : 'Mag-post ng gig o mag-apply sa loob ng isang minuto.'}
        </p>
      </div>

      <div role="tablist" aria-label="Account" className="mt-6 grid grid-cols-2 rounded-xl bg-secondary p-1">
        {(['login', 'register'] as const).map((m) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={mode === m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={cn(
              'h-9 rounded-lg text-sm font-semibold text-muted-foreground transition-colors',
              mode === m && 'bg-card text-foreground shadow-sm',
            )}
          >
            {m === 'login' ? 'Log in' : 'Sign up'}
          </button>
        ))}
      </div>

      <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
        {mode === 'register' ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="fullName">Full name</Label>
            <Input
              id="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              minLength={2}
              className="h-11 bg-card"
              placeholder="Juan Dela Cruz"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="identifier">Mobile number or email</Label>
          <Input
            id="identifier"
            autoComplete="username"
            inputMode="email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
            className="h-11 bg-card"
            placeholder="09XX XXX XXXX or you@email.com"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-11 bg-card pr-11"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
        </div>

        {error ? (
          <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive">
            {error}
          </p>
        ) : null}

        <Button type="submit" className="h-12 text-base font-bold" disabled={submitting !== null}>
          {submitting === 'form' ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {mode === 'login' ? 'Log in' : 'Create account'}
        </Button>
      </form>

      <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <Button
        type="button"
        variant="outline"
        className="h-12 bg-card text-base font-semibold"
        onClick={onGoogle}
        disabled={submitting !== null}
      >
        {submitting === 'google' ? (
          <Loader2 className="animate-spin" aria-hidden="true" />
        ) : (
          <img src="https://cdn.jsdelivr.net/gh/glincker/thesvg@main/public/icons/google/default.svg" alt="" className="size-5" />
        )}
        Continue with Google
      </Button>

      {USE_MOCKS && mode === 'login' ? (
        <button
          type="button"
          onClick={() => {
            setIdentifier(DEMO_CREDENTIALS.identifier)
            setPassword(DEMO_CREDENTIALS.password)
          }}
          className="mt-6 rounded-xl border border-dashed border-primary/40 bg-primary-soft px-4 py-3 text-left text-sm"
        >
          <span className="font-semibold text-orange-800">Demo account</span>
          <span className="block text-xs text-orange-800/80">
            {`Tap to fill ${DEMO_CREDENTIALS.identifier} / ${DEMO_CREDENTIALS.password}`}
          </span>
        </button>
      ) : null}
    </div>
  )
}
