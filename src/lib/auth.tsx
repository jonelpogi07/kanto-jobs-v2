import { createContext, useCallback, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react'
import useSWR, { useSWRConfig } from 'swr'
import { api } from '@/services/api'
import { AUTH_CHANGED_EVENT, tokenStorage } from '@/services/token'
import type { AuthResponse, UserDTO } from '@/types'

interface AuthContextValue {
  user: UserDTO | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: (response: AuthResponse) => Promise<void>
  signOut: () => void
  addGigCoins: (amount: number) => Promise<void>
  spendGigCoin: (amount?: number) => Promise<boolean>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function subscribe(callback: () => void) {
  window.addEventListener(AUTH_CHANGED_EVENT, callback)
  window.addEventListener('storage', callback)
  return () => {
    window.removeEventListener(AUTH_CHANGED_EVENT, callback)
    window.removeEventListener('storage', callback)
  }
}

export const ME_KEY = '/users/me'

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(subscribe, tokenStorage.get)
  const { mutate } = useSWRConfig()
  const { data: user, isLoading } = useSWR(token ? [ME_KEY, token] : null, () => api.users.me(), {
    shouldRetryOnError: false,
  })

  const signIn = useCallback(
    async (response: AuthResponse) => {
      tokenStorage.set(response.accessToken)
      await mutate([ME_KEY, response.accessToken], response.user, { revalidate: false })
    },
    [mutate],
  )

  const signOut = useCallback(() => {
    tokenStorage.clear()
    void mutate(() => true, undefined, { revalidate: false })
  }, [mutate])

  const addGigCoins = useCallback(
    async (amount: number) => {
      if (!token) return
      const updated = await api.users.updateGigCoins(amount)
      await mutate([ME_KEY, token], updated, { revalidate: false })
    },
    [token, mutate],
  )

  const spendGigCoin = useCallback(
    async (amount = 1) => {
      if (!token) return false
      if ((user?.gigCoins ?? 0) < amount) return false
      const updated = await api.users.updateGigCoins(-amount)
      await mutate([ME_KEY, token], updated, { revalidate: false })
      return true
    },
    [token, user, mutate],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user: token ? (user ?? null) : null,
      isLoading: Boolean(token) && isLoading,
      isAuthenticated: Boolean(token && user),
      signIn,
      signOut,
      addGigCoins,
      spendGigCoin,
    }),
    [token, user, isLoading, signIn, signOut, addGigCoins, spendGigCoin],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
