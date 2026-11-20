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
    id: 'upaya-cafe',
    name: 'Upaya Cafe',
    tagline: 'Local cafe in Bamban',
    badge: 'Partner',
    category: 'ERRANDS_DELIVERY',
    defaultTitle: 'Pabili ng kape sa Upaya Cafe',
    defaultDetails:
      'Pumunta sa Upaya Cafe sa Bamban, Tarlac at bumili ng kape at pagkain. Ihatid sa address na binigay. Huwag magbayad nang higit sa total amount.',
    defaultCompensationType: 'FIXED',
    defaultPay: 180,
    defaultNegotiable: false,
    defaultPaymentMethods: ['CASH', 'GCASH'],
    pickupLocation: { barangay: 'San Nicolas', city: 'Bamban' },
  },
  {
    id: 'salangi-kape',
    name: 'Salangi ka\'t magkape',
    tagline: 'Local cafe in Bamban',
    badge: 'Partner',
    category: 'ERRANDS_DELIVERY',
    defaultTitle: 'Kuha ng order sa Salangi ka\'t magkape',
    defaultDetails:
      'Pumunta sa Salangi ka\'t magkape sa Bamban, Tarlac at kunin ang order. Ihatid sa customer address. Ang delivery fee ang babayarin.',
    defaultCompensationType: 'FIXED',
    defaultPay: 150,
    defaultNegotiable: false,
    defaultPaymentMethods: ['CASH', 'GCASH'],
    pickupLocation: { barangay: 'Anupul', city: 'Bamban' },
  },
  {
    id: 'modern-cafe',
    name: 'The Modern Cafe',
    tagline: 'Local cafe in Bamban',
    badge: 'Partner',
    category: 'ERRANDS_DELIVERY',
    defaultTitle: 'Pabili sa The Modern Cafe',
    defaultDetails:
      'Pumunta sa The Modern Cafe sa Bamban, Tarlac at bumili ng kape at pastries. Ihatid sa address. Ang total amount ang babayarin.',
    defaultCompensationType: 'FIXED',
    defaultPay: 200,
    defaultNegotiable: false,
    defaultPaymentMethods: ['CASH', 'GCASH', 'MAYA'],
    pickupLocation: { barangay: 'Laoang', city: 'Bamban' },
  },
]