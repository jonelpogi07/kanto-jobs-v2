import type { JobCategory, RateType } from '@/types'

export interface MockGigster {
  id: number
  name: string
  avatarInitials: string
  barangay: string
  city: string
  rating: number
  ratingCount: number
  completedGigs: number
  verified: boolean
  bio: string
  skills: JobCategory[]
  hourlyOrStartingRate: string
  phone: string
  isNegotiable: boolean
  availableDays: string[]
  rateType: RateType
}

export const MOCK_GIGSTERS: MockGigster[] = [
  {
    id: 1,
    name: 'Aliza Nicole Santos',
    avatarInitials: 'AS',
    barangay: 'Brgy. Poblacion',
    city: 'Capas, Tarlac',
    rating: 4.9,
    ratingCount: 41,
    completedGigs: 48,
    verified: true,
    bio: 'Freelance graphic designer and weekend tutor for Grade 3-6 Math.',
    skills: ['DIGITAL_ADMIN'],
    hourlyOrStartingRate: '₱350/hr',
    phone: '09281112233',
    isNegotiable: false,
    availableDays: ['Sat', 'Sun'],
    rateType: 'hourly',
  },
  {
    id: 2,
    name: 'Makee Tubon',
    avatarInitials: 'MT',
    barangay: 'Brgy. Dapdap',
    city: 'Bamban, Tarlac',
    rating: 4.7,
    ratingCount: 58,
    completedGigs: 72,
    verified: true,
    bio: 'Licensed electrician, 12 years experience. Plumbing and carpentry din.',
    skills: ['HOME_REPAIR'],
    hourlyOrStartingRate: '₱500/job',
    phone: '09175556677',
    isNegotiable: true,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    rateType: 'both',
  },
  {
    id: 3,
    name: 'Jingky Maniego',
    avatarInitials: 'JM',
    barangay: 'Brgy. Cut-Cut I',
    city: 'Capas, Tarlac',
    rating: 4.6,
    ratingCount: 19,
    completedGigs: 22,
    verified: true,
    bio: 'Nanay ng tatlo, masipag maglinis at magluto. Available weekdays.',
    skills: ['CLEANING'],
    hourlyOrStartingRate: '₱300/job',
    phone: '09398887766',
    isNegotiable: false,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    rateType: 'per_gig',
  },
  {
    id: 4,
    name: 'Ron Sabalvaro',
    avatarInitials: 'RS',
    barangay: 'Brgy. Bel-Air',
    city: 'Makati City',
    rating: 4.5,
    ratingCount: 12,
    completedGigs: 14,
    verified: false,
    bio: 'Rider ng Lalamove dati. Mabilis at maingat sa delivery.',
    skills: ['ERRANDS_DELIVERY'],
    hourlyOrStartingRate: '₱150/hr',
    phone: '09451230987',
    isNegotiable: true,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    rateType: 'per_gig',
  },
  {
    id: 5,
    name: 'Jonel Maniego',
    avatarInitials: 'JM',
    barangay: 'Brgy. Dolores',
    city: 'Capas, Tarlac',
    rating: 4.8,
    ratingCount: 23,
    completedGigs: 31,
    verified: true,
    bio: 'Taga-Dolores since birth. May sariling motor at tools. Sideline ko ang delivery at simplen repairs tuwing weekends.',
    skills: ['ERRANDS_DELIVERY', 'HOME_REPAIR'],
    hourlyOrStartingRate: '₱180/hr',
    phone: '09171234567',
    isNegotiable: false,
    availableDays: ['Sat', 'Sun'],
    rateType: 'both',
  },
  {
    id: 6,
    name: 'Nikko Nunag',
    avatarInitials: 'NN',
    barangay: 'Brgy. Santo Domingo',
    city: 'Capas, Tarlac',
    rating: 4.9,
    ratingCount: 27,
    completedGigs: 35,
    verified: true,
    bio: 'Events host and photographer. Pwede rin sa setup at decorations.',
    skills: ['EVENTS', 'DIGITAL_ADMIN'],
    hourlyOrStartingRate: '₱200/hr',
    phone: '09184443322',
    isNegotiable: false,
    availableDays: ['Fri', 'Sat', 'Sun'],
    rateType: 'hourly',
  },
  {
    id: 7,
    name: 'Meleck Kimberly',
    avatarInitials: 'MK',
    barangay: 'Brgy. Anupul',
    city: 'Bamban, Tarlac',
    rating: 4.4,
    ratingCount: 8,
    completedGigs: 9,
    verified: true,
    bio: 'College student (BS Accountancy). Mabilis sa Excel at data entry. May motor din.',
    skills: ['DIGITAL_ADMIN', 'ERRANDS_DELIVERY'],
    hourlyOrStartingRate: '₱120/hr',
    phone: '09207771122',
    isNegotiable: true,
    availableDays: ['Mon', 'Wed', 'Fri', 'Sat'],
    rateType: 'hourly',
  },
  {
    id: 8,
    name: 'Edrich Mercado',
    avatarInitials: 'EM',
    barangay: 'Brgy. San Antonio',
    city: 'Makati City',
    rating: 5.0,
    ratingCount: 6,
    completedGigs: 7,
    verified: true,
    bio: 'May-ari ng maliit na sari-sari store. Madalas maghanap ng helper.',
    skills: ['CLEANING'],
    hourlyOrStartingRate: '₱350/job',
    phone: '09363334455',
    isNegotiable: false,
    availableDays: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    rateType: 'per_gig',
  },
  {
    id: 9,
    name: 'Yza Rigor',
    avatarInitials: 'YR',
    barangay: 'Brgy. Lourdes North West',
    city: 'Capas, Tarlac',
    rating: 5.0,
    ratingCount: 5,
    completedGigs: 3,
    verified: true,
    bio: 'Detail-oriented college honor student. Fast and reliable for tutoring & encoding.',
    skills: ['DIGITAL_ADMIN'],
    hourlyOrStartingRate: '₱250/hr',
    phone: '09170000001',
    isNegotiable: false,
    availableDays: ['Tue', 'Thu', 'Sat'],
    rateType: 'hourly',
  },
]

export function getMockGigsterCoordinates(gigster: MockGigster) {
  const { LOCATIONS } = require('./data')
  const loc = LOCATIONS.find(
    (l: { barangay: string; city: string; latitude: number; longitude: number }) =>
      l.barangay === gigster.barangay && l.city === gigster.city
  )
  return loc ?? LOCATIONS[0]
}