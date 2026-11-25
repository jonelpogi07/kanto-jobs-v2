import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SWRConfig } from 'swr'
import { registerSW } from 'virtual:pwa-register'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/lib/auth'
import { LocationProvider } from '@/lib/location'
import { App } from './App'
import { evaluateGigCoinRefunds, resetMockDb, simulate24hElapsed } from '@/mocks/handlers'
import '@flaticon/flaticon-uicons/css/solid/rounded.css'
import './index.css'

let refreshing = false

registerSW({
  immediate: true,
  onNeedRefresh() {
    if (refreshing) return
    refreshing = true
    // New SW detected; reload once it takes control
    window.location.reload()
  },
})

// Periodic update check when the app regains focus
if ('serviceWorker' in navigator) {
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.update()
      })
    }
  })
}

// Reload when a new service worker takes control of the page
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return
    refreshing = true
    window.location.reload()
  })
}

// Dev-only debug helpers for the mock layer (e.g. console: window.__kantoMock.simulate24hElapsed())
if (import.meta.env.DEV) {
  ;(window as unknown as { __kantoMock?: Record<string, unknown> }).__kantoMock = {
    evaluateGigCoinRefunds,
    simulate24hElapsed,
    resetMockDb,
  }
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <SWRConfig value={{ revalidateOnFocus: false }}>
        <AuthProvider>
          <LocationProvider>
            <App />
            <Toaster position="top-center" richColors />
          </LocationProvider>
        </AuthProvider>
      </SWRConfig>
    </ThemeProvider>
  </StrictMode>,
)
