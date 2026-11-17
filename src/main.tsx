import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { SWRConfig } from 'swr'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/context/ThemeContext'
import { AuthProvider } from '@/lib/auth'
import { LocationProvider } from '@/lib/location'
import { App } from './App'
import '@flaticon/flaticon-uicons/css/solid/rounded.css'
import './index.css'

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
