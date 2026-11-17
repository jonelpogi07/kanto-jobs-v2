import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { LOCATIONS } from '@/mocks/data'
import type { LocationOption } from '@/types'

const LOCATION_KEY = 'kanto-jobs:location'

interface LocationContextValue {
  location: LocationOption
  options: LocationOption[]
  setLocation: (location: LocationOption) => void
  coords: { lat: number; lng: number }
}

const LocationContext = createContext<LocationContextValue | null>(null)

function readStored(): LocationOption {
  try {
    const raw = localStorage.getItem(LOCATION_KEY)
    if (raw) return JSON.parse(raw) as LocationOption
  } catch {
    // fall through to default
  }
  return LOCATIONS[0]
}

export function LocationProvider({ children }: { children: ReactNode }) {
  const [location, setLocationState] = useState(readStored)

  const setLocation = useCallback((next: LocationOption) => {
    localStorage.setItem(LOCATION_KEY, JSON.stringify(next))
    setLocationState(next)
  }, [])

  const value = useMemo(
    () => ({
      location,
      options: LOCATIONS,
      setLocation,
      coords: { lat: location.latitude, lng: location.longitude },
    }),
    [location, setLocation],
  )

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>
}

export function useLocation() {
  const ctx = useContext(LocationContext)
  if (!ctx) throw new Error('useLocation must be used within LocationProvider')
  return ctx
}
