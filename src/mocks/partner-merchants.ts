import type { CompensationType, JobCategory, PaymentMethod } from '@/types'

export interface PartnerMerchantTemplate {
  id: string
  name: string
  tagline: string
  badge: string
  category: JobCategory
  defaultTitle: string
  defaultDetails: string
  defaultCompensationType: CompensationType
  defaultPay: number
  defaultNegotiable: boolean
  defaultPaymentMethods: PaymentMethod[]
  pickupLocation?: { barangay: string; city: string }
}

export const PARTNER_MERCHANTS: PartnerMerchantTemplate[] = [
  {
    id: 'mercury-drug',
    name: 'Mercury Drug',
    tagline: 'Partner pharmacy',
    badge: 'Partner',
    category: 'ERRANDS_DELIVERY',
    defaultTitle: 'Pabili ng gamot sa Mercury Drug',
    defaultDetails:
      'Pumunta sa Mercury Drug sa chosen pickup location at bumili ng gamot. Ihatid sa address na binigay. Huwag magbayad nang higit sa total amount.',
    defaultCompensationType: 'FIXED',
    defaultPay: 200,
    defaultNegotiable: false,
    defaultPaymentMethods: ['CASH', 'GCASH'],
    pickupLocation: { barangay: 'Bagong Silang', city: 'Caloocan' },
  },
  {
    id: 'jollibee-delivery',
    name: 'Jollibee',
    tagline: 'Partner restaurant',
    badge: 'Partner',
    category: 'ERRANDS_DELIVERY',
    defaultTitle: 'Kuha ng food delivery sa Jollibee',
    defaultDetails:
      'Pumunta sa Jollibee branch at kunin ang order. Ihatid sa customer address. Ang delivery fee ang babayarin.',
    defaultCompensationType: 'FIXED',
    defaultPay: 150,
    defaultNegotiable: false,
    defaultPaymentMethods: ['CASH', 'GCASH'],
    pickupLocation: { barangay: 'Monumento', city: 'Caloocan' },
  },
  {
    id: 'sm-supermarket',
    name: 'SM Supermarket',
    tagline: 'Partner supermarket',
    badge: 'Partner',
    category: 'ERRANDS_DELIVERY',
    defaultTitle: 'Pabili ng groceries sa SM',
    defaultDetails:
      'Pumunta sa SM Supermarket at bumili ng mga grocery items. Ihatid sa address. Ang total amount ang babayarin.',
    defaultCompensationType: 'FIXED',
    defaultPay: 250,
    defaultNegotiable: false,
    defaultPaymentMethods: ['CASH', 'GCASH', 'MAYA'],
    pickupLocation: { barangay: 'Grace Park', city: 'Caloocan' },
  },
  {
    id: 'lazada-pickup',
    name: 'Lazada',
    tagline: 'Partner e-commerce',
    badge: 'Partner',
    category: 'ERRANDS_DELIVERY',
    defaultTitle: 'Kuha ng Lazada package',
    defaultDetails:
      'Pumunta sa pickup point at kunin ang package. Ihatid sa customer address. May additional fee kung kailangan.',
    defaultCompensationType: 'FIXED',
    defaultPay: 120,
    defaultNegotiable: false,
    defaultPaymentMethods: ['CASH', 'GCASH'],
    pickupLocation: { barangay: 'Bagumbong', city: 'Caloocan' },
  },
  {
    id: 'coca-cola-distributor',
    name: 'Coca-Cola',
    tagline: 'Partner distributor',
    badge: 'Partner',
    category: 'ERRANDS_DELIVERY',
    defaultTitle: 'Deliver Coca-Cola products',
    defaultDetails:
      'Kunin ang mga products sa distributor at ihatin sa stores. Mahal kung kailangan ng tulong sa pag-load.',
    defaultCompensationType: 'HOURLY',
    defaultPay: 120,
    defaultNegotiable: false,
    defaultPaymentMethods: ['CASH', 'GCASH'],
    pickupLocation: { barangay: 'Bagong Silang', city: 'Caloocan' },
  },
]