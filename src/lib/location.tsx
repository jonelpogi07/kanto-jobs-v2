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

function toRad(d: number) {
  return (d * Math.PI) / 180
}

/**
 * Resolve raw GPS coordinates to an approximate area by matching against the
 * app's known barangays/municipalities (seed data). Never exposes exact GPS
 * coordinates in the UI — only the matched barangay/city is surfaced.
 */
export function resolveApproximateLocation(
  latitude: number,
  longitude: number,
  options: LocationOption[] = LOCATIONS,
): LocationOption | null {
  if (options.length === 0) return null
  let best: LocationOption | null = null
  let bestDist = Infinity
  for (const opt of options) {
    const dLat = toRad(opt.latitude - latitude)
    const dLng = toRad(opt.longitude - longitude)
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(latitude)) * Math.cos(toRad(opt.latitude)) * Math.sin(dLng / 2) ** 2
    const dist = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    if (dist < bestDist) {
      bestDist = dist
      best = opt
    }
  }
  return best
}
