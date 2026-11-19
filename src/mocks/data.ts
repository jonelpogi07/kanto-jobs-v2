import type {
  ContactInfoDTO,
  CompensationType,
  JobCategory,
  JobStatus,
  JobTiming,
  LocationOption,
  PaymentMethod,
  UserDTO,
} from '@/types'

export const LOCATIONS: LocationOption[] = [
  { barangay: 'Brgy. Dolores', city: 'Capas, Tarlac', latitude: 15.3292, longitude: 120.5905 },
  { barangay: 'Brgy. Cut-Cut I', city: 'Capas, Tarlac', latitude: 15.3361, longitude: 120.5862 },
  { barangay: 'Brgy. Santo Domingo', city: 'Capas, Tarlac', latitude: 15.3221, longitude: 120.5984 },
  { barangay: 'Brgy. Dapdap', city: 'Bamban, Tarlac', latitude: 15.2905, longitude: 120.5641 },
  { barangay: 'Brgy. Anupul', city: 'Bamban, Tarlac', latitude: 15.2802, longitude: 120.5498 },
  { barangay: 'Brgy. Poblacion', city: 'Makati City', latitude: 14.5657, longitude: 121.0311 },
  { barangay: 'Brgy. Bel-Air', city: 'Makati City', latitude: 14.5622, longitude: 121.0257 },
  { barangay: 'Brgy. San Antonio', city: 'Makati City', latitude: 14.5694, longitude: 121.0145 },
]

export const DEMO_CREDENTIALS = {
  identifier: 'juan@kantojobs.ph',
  password: 'password123',
}

const hoursAgo = (h: number) => new Date(Date.now() - h * 3_600_000).toISOString()
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString()

export interface SeedUser extends UserDTO {
  password: string
  contact: ContactInfoDTO
}

export const SEED_USERS: SeedUser[] = [
  {
    id: 1,
    fullName: 'Juan Dela Cruz',
    avatarUrl: null,
    barangay: 'Brgy. Dolores',
    city: 'Capas, Tarlac',
    phoneVerified: true,
    ratingAverage: 4.8,
    ratingCount: 23,
    email: 'juan@kantojobs.ph',
    phoneNumber: '09171234567',
    bio: 'Taga-Dolores since birth. May sariling motor at tools. Sideline ko ang delivery at simpleng repairs tuwing weekends.',
    skills: ['Motorcycle Rider', 'Home Repair', 'Errands'],
    completedGigs: 31,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 220),
    password: DEMO_CREDENTIALS.password,
    contact: { phoneNumber: '09171234567', viberNumber: '09171234567', messengerUsername: 'juan.delacruz' },
  },
  {
    id: 2,
    fullName: 'Maria Santos',
    avatarUrl: null,
    barangay: 'Brgy. Poblacion',
    city: 'Makati City',
    phoneVerified: true,
    ratingAverage: 4.9,
    ratingCount: 41,
    email: 'maria.santos@gmail.com',
    phoneNumber: '09281112233',
    bio: 'Freelance graphic designer and weekend tutor for Grade 3-6 Math.',
    skills: ['Graphic Design', 'Tutoring', 'Social Media'],
    completedGigs: 48,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 400),
    password: 'password123',
    contact: { phoneNumber: '09281112233', viberNumber: '09281112233', messengerUsername: 'maria.designs' },
  },
  {
    id: 3,
    fullName: 'Ramon Villanueva',
    avatarUrl: null,
    barangay: 'Brgy. Dapdap',
    city: 'Bamban, Tarlac',
    phoneVerified: true,
    ratingAverage: 4.7,
    ratingCount: 58,
    email: null,
    phoneNumber: '09175556677',
    bio: 'Licensed electrician, 12 years experience. Plumbing and carpentry din.',
    skills: ['Home Repair', 'Electrical', 'Plumbing'],
    completedGigs: 72,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 510),
    isNegotiable: true,
    password: 'password123',
    contact: { phoneNumber: '09175556677', viberNumber: '09175556677', messengerUsername: null },
  },
  {
    id: 4,
    fullName: 'Liza Manalo',
    avatarUrl: null,
    barangay: 'Brgy. Cut-Cut I',
    city: 'Capas, Tarlac',
    phoneVerified: true,
    ratingAverage: 4.6,
    ratingCount: 19,
    email: 'liza.manalo@yahoo.com',
    phoneNumber: '09398887766',
    bio: 'Nanay ng tatlo, masipag maglinis at magluto. Available weekdays.',
    skills: ['Cleaning', 'Laundry', 'Cooking'],
    completedGigs: 22,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 150),
    password: 'password123',
    contact: { phoneNumber: '09398887766', viberNumber: null, messengerUsername: 'liza.manalo' },
  },
  {
    id: 5,
    fullName: 'Paolo Reyes',
    avatarUrl: null,
    barangay: 'Brgy. Bel-Air',
    city: 'Makati City',
    phoneVerified: false,
    ratingAverage: 4.5,
    ratingCount: 12,
    email: 'paolo.reyes@gmail.com',
    phoneNumber: '09451230987',
    bio: 'Rider ng Lalamove dati. Mabilis at maingat sa delivery.',
    skills: ['Motorcycle Rider', 'Delivery'],
    completedGigs: 14,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 60),
    isNegotiable: true,
    password: 'password123',
    contact: { phoneNumber: '09451230987', viberNumber: '09451230987', messengerUsername: 'paoloreyes.rider' },
  },
  {
    id: 6,
    fullName: 'Angela Cruz',
    avatarUrl: null,
    barangay: 'Brgy. Santo Domingo',
    city: 'Capas, Tarlac',
    phoneVerified: true,
    ratingAverage: 4.9,
    ratingCount: 27,
    email: 'angela.cruz@gmail.com',
    phoneNumber: '09184443322',
    bio: 'Events host and photographer. Pwede rin sa setup at decorations.',
    skills: ['Events', 'Photography', 'Hosting'],
    completedGigs: 35,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 300),
    password: 'password123',
    contact: { phoneNumber: '09184443322', viberNumber: '09184443322', messengerUsername: 'angelacruz.events' },
  },
  {
    id: 7,
    fullName: 'Mark Aquino',
    avatarUrl: null,
    barangay: 'Brgy. Anupul',
    city: 'Bamban, Tarlac',
    phoneVerified: true,
    ratingAverage: 4.4,
    ratingCount: 8,
    email: 'mark.aquino@up.edu.ph',
    phoneNumber: '09207771122',
    bio: 'College student (BS Accountancy). Mabilis sa Excel at data entry. May motor din.',
    skills: ['Data Entry', 'Tutoring', 'Motorcycle Rider'],
    completedGigs: 9,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 45),
    isNegotiable: true,
    password: 'password123',
    contact: { phoneNumber: '09207771122', viberNumber: null, messengerUsername: 'mark.aquino' },
  },
  {
    id: 8,
    fullName: 'Tess Bautista',
    avatarUrl: null,
    barangay: 'Brgy. San Antonio',
    city: 'Makati City',
    phoneVerified: true,
    ratingAverage: 5,
    ratingCount: 6,
    email: null,
    phoneNumber: '09363334455',
    bio: 'May-ari ng maliit na sari-sari store. Madalas maghanap ng helper.',
    skills: ['Cleaning', 'Babysitting'],
    completedGigs: 7,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 90),
    password: 'password123',
    contact: { phoneNumber: '09363334455', viberNumber: '09363334455', messengerUsername: null },
  },
  {
    id: 9,
    fullName: 'Camille Soriano',
    avatarUrl: null,
    barangay: 'Brgy. Lourdes North West',
    city: 'Angeles City',
    phoneVerified: true,
    ratingAverage: 5.0,
    ratingCount: 5,
    email: null,
    phoneNumber: '09170000001',
    bio: 'Detail-oriented college honor student. Fast and reliable for tutoring & encoding.',
    skills: ['Tutoring', 'Digital & Admin'],
    completedGigs: 3,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 30),
    password: 'password123',
    contact: { phoneNumber: '09170000001', viberNumber: null, messengerUsername: null },
  },
  {
    id: 10,
    fullName: 'Ernesto Bautista',
    avatarUrl: null,
    barangay: 'Brgy. Cutcut',
    city: 'Capas, Tarlac',
    phoneVerified: true,
    ratingAverage: 3.9,
    ratingCount: 40,
    email: null,
    phoneNumber: '09170000002',
    bio: 'Veteran all-around helper in Pampanga & Tarlac. 95+ completed errands & repairs.',
    skills: ['Errands & Delivery', 'Home Repair'],
    completedGigs: 95,
    gigCoins: 2,
    createdAt: hoursAgo(24 * 200),
    isNegotiable: true,
    password: 'password123',
    contact: { phoneNumber: '09170000002', viberNumber: null, messengerUsername: null },
  },
]

export interface SeedJob {
  id: number
  title: string
  description: string
  category: JobCategory
  compensationType: CompensationType
  amount: number
  paymentMethods: PaymentMethod[]
  location: number
  landmark: string
  timing: JobTiming
  scheduledAt: string | null
  estimatedDuration: string | null
  status: JobStatus
  posterId: number
  images: string[]
  createdAt: string
  isNegotiable?: boolean
}

export const SEED_JOBS: SeedJob[] = [
  {
    id: 101,
    title: 'Pick up maintenance meds from Mercury Drug',
    description:
      'Kailangan ko po ng tutulong kunin ang maintenance meds ni Lola sa Mercury Drug Capas. Babayaran ko ang gamot via GCash sa pharmacy, kayo na lang po ang magdadala dito sa bahay. Dala lang ang reseta na ibibigay ko.',
    category: 'ERRANDS_DELIVERY',
    compensationType: 'FIXED',
    amount: 250,
    paymentMethods: ['CASH', 'GCASH'],
    location: 1,
    landmark: 'Green gate beside Cut-Cut Chapel',
    timing: 'URGENT',
    scheduledAt: null,
    estimatedDuration: '1 hour',
    images: [
      "https://picsum.photos/seed/gig102/600/400",
    ],
    status: 'OPEN',
    posterId: 4,
    createdAt: hoursAgo(0.5),
  },
  {
    id: 102,
    title: 'Fix leaking kitchen faucet',
    description:
      'Tumutulo na po yung gripo sa kusina at medyo maluwag na rin ang lababo. May bagong faucet na akong nabili, ikakabit na lang. Please bring your own tools.',
    category: 'HOME_REPAIR',
    compensationType: 'FIXED',
    amount: 600,
    paymentMethods: ['CASH'],
    location: 2,
    landmark: 'Across Santo Domingo Elementary School, blue house',
    timing: 'URGENT',
    scheduledAt: null,
    estimatedDuration: '2 hours',
    isNegotiable: true,
    images: [
      "https://picsum.photos/seed/gig103/600/400",
    ],
    status: 'OPEN',
    posterId: 6,
    createdAt: hoursAgo(2),
  },
  {
    id: 103,
    title: 'Deep clean 2-bedroom condo before move-in',
    description:
      'Need help deep cleaning a 2BR unit before we move in this weekend. Kitchen, 2 bathrooms, floors, and windows. Cleaning supplies provided. Elevator access, building requires a valid ID at the lobby.',
    category: 'CLEANING',
    compensationType: 'HOURLY',
    amount: 150,
    paymentMethods: ['GCASH', 'MAYA'],
    location: 5,
    landmark: 'Near Rockwell, beside 7-Eleven on P. Burgos',
    timing: 'SCHEDULED',
    scheduledAt: hoursFromNow(44),
    estimatedDuration: '5-6 hours',
    images: [
      "https://picsum.photos/seed/gig104/600/400",
    ],
    status: 'OPEN',
    posterId: 2,
    createdAt: hoursAgo(5),
  },
  {
    id: 104,
    title: 'Usher & games host for kiddie birthday party',
    description:
      '7th birthday ng anak ko. Need 1 energetic na mag-hohost ng parlor games (Bring Me, Trip to Jerusalem) at mag-aasikaso ng bisita. Prizes provided. Libre na rin ang pagkain!',
    category: 'EVENTS',
    compensationType: 'FIXED',
    amount: 800,
    paymentMethods: ['CASH', 'GCASH'],
    location: 4,
    landmark: 'Anupul Covered Court',
    timing: 'SCHEDULED',
    scheduledAt: hoursFromNow(72),
    estimatedDuration: '4 hours',
    images: [
      "https://picsum.photos/seed/gig105/600/400",
    ],
    status: 'OPEN',
    posterId: 7,
    createdAt: hoursAgo(9),
  },
  {
    id: 105,
    title: 'Encode 300 hardware store receipts into Excel',
    description:
      'Need someone to encode our paper receipts from October into a Google Sheet template. Can be done from home. I will send clear photos of all receipts via Messenger.',
    category: 'DIGITAL_ADMIN',
    compensationType: 'HOURLY',
    amount: 120,
    paymentMethods: ['GCASH', 'MAYA'],
    location: 3,
    landmark: 'Villanueva Hardware, Dapdap Highway',
    timing: 'FLEXIBLE',
    scheduledAt: null,
    estimatedDuration: '6-8 hours total',
    isNegotiable: true,
    images: [
      "https://picsum.photos/seed/gig106/600/400",
    ],
    status: 'IN_PROGRESS',
    posterId: 3,
    createdAt: hoursAgo(28),
  },
  {
    id: 106,
    title: 'Design a tarpaulin for my sari-sari store',
    description:
      'Need a 3x5 ft tarp design: "Tess Store - Load, Ice, Softdrinks, Gasul". Bright colors please. Send 2 options, I will pick one. Print-ready PDF.',
    category: 'DIGITAL_ADMIN',
    compensationType: 'FIXED',
    amount: 500,
    paymentMethods: ['GCASH', 'MAYA'],
    location: 7,
    landmark: 'Corner Kalayaan Ave, beside the bakery',
    timing: 'FLEXIBLE',
    scheduledAt: null,
    estimatedDuration: '1-2 days',
    images: [
      "https://picsum.photos/seed/gig107/600/400",
    ],
    status: 'OPEN',
    posterId: 8,
    createdAt: hoursAgo(20),
  },
  {
    id: 107,
    title: 'Grocery run to SM Clark (list provided)',
    description:
      'Around 15 items, list will be sent via Viber. I will GCash the grocery money upfront. Need someone with a motor and a big bag or box.',
    category: 'ERRANDS_DELIVERY',
    compensationType: 'FIXED',
    amount: 350,
    paymentMethods: ['CASH', 'GCASH'],
    location: 3,
    landmark: 'Dapdap Resettlement, Phase 2 Block 4',
    timing: 'URGENT',
    scheduledAt: null,
    estimatedDuration: '2-3 hours',
    isNegotiable: true,
    images: [
      "https://picsum.photos/seed/gig108/600/400",
    ],
    status: 'OPEN',
    posterId: 3,
    createdAt: hoursAgo(1.2),
  },
  {
    id: 108,
    title: 'Repaint front gate & window grills',
    description:
      'Steel gate (approx 3m wide) and 4 window grills need scraping and repainting. Paint and brushes provided. Black enamel. Can be split into 2 days.',
    category: 'HOME_REPAIR',
    compensationType: 'FIXED',
    amount: 1500,
    paymentMethods: ['CASH'],
    location: 6,
    landmark: 'Jupiter St., near Bel-Air Village gate 2',
    timing: 'SCHEDULED',
    scheduledAt: hoursFromNow(96),
    estimatedDuration: '1-2 days',
    images: [
      "https://picsum.photos/seed/gig109/600/400",
    ],
    status: 'OPEN',
    posterId: 5,
    createdAt: hoursAgo(14),
  },
  {
    id: 109,
    title: 'Laundry & ironing (2 baskets)',
    description:
      'Two baskets of clothes, mostly school uniforms. May washing machine dito. Need ironing too. Pwede kunin at ibalik kinabukasan.',
    category: 'CLEANING',
    compensationType: 'FIXED',
    amount: 400,
    paymentMethods: ['CASH', 'GCASH'],
    location: 2,
    landmark: 'Behind Santo Domingo Barangay Hall',
    timing: 'FLEXIBLE',
    scheduledAt: null,
    estimatedDuration: 'Half day',
    images: [
      "https://picsum.photos/seed/gig110/600/400",
    ],
    status: 'OPEN',
    posterId: 6,
    createdAt: hoursAgo(30),
  },
  {
    id: 110,
    title: 'Rider to deliver kakanin orders around Capas',
    description:
      'Small kakanin business ko po, around 12 deliveries within Capas town proper. Dapat may sariling motor at helmet. Gas allowance included sa rate.',
    category: 'ERRANDS_DELIVERY',
    compensationType: 'HOURLY',
    amount: 150,
    paymentMethods: ['CASH', 'GCASH'],
    location: 0,
    landmark: 'Dolores Public Market, stall 14',
    timing: 'URGENT',
    scheduledAt: null,
    estimatedDuration: '3 hours',
    isNegotiable: true,
    images: [
      "https://picsum.photos/seed/gig111/600/400",
    ],
    status: 'OPEN',
    posterId: 1,
    createdAt: hoursAgo(1),
  },
  {
    id: 111,
    title: 'Fix ceiling fan & replace 2 outlets',
    description:
      'Umuugong yung ceiling fan sa sala at may dalawang outlet na sunog na. Kailangan po licensed or experienced electrician.',
    category: 'HOME_REPAIR',
    compensationType: 'FIXED',
    amount: 700,
    paymentMethods: ['CASH'],
    location: 0,
    landmark: 'Purok 3, yellow house beside the sari-sari store',
    timing: 'SCHEDULED',
    scheduledAt: hoursFromNow(6),
    estimatedDuration: '2-3 hours',
    images: [
      "https://picsum.photos/seed/gig112/600/400",
    ],
    status: 'IN_PROGRESS',
    posterId: 1,
    createdAt: hoursAgo(26),
  },
  {
    id: 112,
    title: 'Help set up chairs for barangay fiesta',
    description: 'Setup of 200 monobloc chairs and tents for the Dolores fiesta.',
    category: 'EVENTS',
    compensationType: 'FIXED',
    amount: 500,
    paymentMethods: ['CASH'],
    location: 0,
    landmark: 'Dolores Covered Court',
    timing: 'SCHEDULED',
    scheduledAt: hoursAgo(24 * 6),
    estimatedDuration: '4 hours',
    images: [
      "https://picsum.photos/seed/gig113/600/400",
    ],
    status: 'COMPLETED',
    posterId: 1,
    createdAt: hoursAgo(24 * 9),
  },
]

export interface SeedApplication {
  id: number
  jobId: number
  applicantId: number
  pitch: string
  status: 'INVITED' | 'PENDING' | 'SCREENING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED'
  createdAt: string
}

export const SEED_APPLICATIONS: SeedApplication[] = [
  {
    id: 1000,
    jobId: 101,
    applicantId: 1,
    pitch: 'Invited by client to apply for this gig.',
    status: 'INVITED',
    createdAt: hoursAgo(1),
  },
  {
    id: 1001,
    jobId: 110,
    applicantId: 5,
    pitch: 'Available right now. May sariling motor at helmet, ex-Lalamove rider. Kabisado ko ang Capas.',
    status: 'PENDING',
    createdAt: hoursAgo(0.6),
  },
  {
    id: 1002,
    jobId: 110,
    applicantId: 7,
    pitch: 'Taga-Bamban lang po ako, 10 mins away. May motor at insulated bag pa para sa kakanin.',
    status: 'PENDING',
    createdAt: hoursAgo(0.3),
  },
  {
    id: 1003,
    jobId: 111,
    applicantId: 3,
    pitch: 'Licensed electrician po ako, 12 years. I have my own tools and spare outlets kung kailangan.',
    status: 'ACCEPTED',
    createdAt: hoursAgo(24),
  },
  {
    id: 1004,
    jobId: 112,
    applicantId: 6,
    pitch: 'Sanay ako sa event setup, may kasama pa akong isa para mabilis.',
    status: 'ACCEPTED',
    createdAt: hoursAgo(24 * 8),
  },
  {
    id: 1005,
    jobId: 102,
    applicantId: 1,
    pitch: 'I have my own tools. Nakapag-install na ako ng faucet dati, kaya ko within 1 hour.',
    status: 'PENDING',
    createdAt: hoursAgo(1.5),
  },
  {
    id: 1006,
    jobId: 105,
    applicantId: 1,
    pitch: 'Mabilis po ako sa Excel at may laptop. Can start tonight.',
    status: 'ACCEPTED',
    createdAt: hoursAgo(26),
  },
  {
    id: 1007,
    jobId: 102,
    applicantId: 3,
    pitch: 'Plumber po ako, kaya ko rin ayusin ang lababo. Available after lunch.',
    status: 'PENDING',
    createdAt: hoursAgo(1.8),
  },
  {
    id: 1008,
    jobId: 103,
    applicantId: 8,
    pitch: 'Experienced in deep cleaning, I can bring a helper for free.',
    status: 'PENDING',
    createdAt: hoursAgo(3),
  },
  {
    id: 1009,
    jobId: 104,
    applicantId: 6,
    pitch: 'Events host po ako! May sariling sound system pa.',
    status: 'PENDING',
    createdAt: hoursAgo(6),
  },
]

export interface SeedMessage {
  id: number
  /** Chat thread id, which is the application id (one conversation per application). */
  applicationId: number
  senderId: number
  body: string
  createdAt: string
  /** Null while the recipient has not opened the thread yet. */
  readAt: string | null
}

export const SEED_MESSAGES: SeedMessage[] = [
  {
    id: 7001,
    applicationId: 1003,
    senderId: 3,
    body: 'Magandang umaga po! Kailan po kayo available para sa ceiling fan?',
    createdAt: hoursAgo(20),
    readAt: hoursAgo(19.9),
  },
  {
    id: 7002,
    applicationId: 1003,
    senderId: 1,
    body: 'Good morning Ramon! Pwede po ako mamayang 2 PM. Dalawa lang po ang outlet?',
    createdAt: hoursAgo(19),
    readAt: hoursAgo(18.9),
  },
  {
    id: 7003,
    applicationId: 1003,
    senderId: 3,
    body: 'Opo, dalawa po. Salamat! Kita-kita na lang po tayo mamaya.',
    createdAt: hoursAgo(18.5),
    readAt: null,
  },
  {
    id: 7004,
    applicationId: 1006,
    senderId: 3,
    body: 'Salamat sa pitch, Juan. Kaya mo bang tapusin ngayong gabi?',
    createdAt: hoursAgo(25),
    readAt: hoursAgo(24.9),
  },
  {
    id: 7005,
    applicationId: 1006,
    senderId: 1,
    body: 'Opo, mga 8 PM onwards po ako available.',
    createdAt: hoursAgo(24.5),
    readAt: hoursAgo(24.4),
  },
  {
    id: 7006,
    applicationId: 1006,
    senderId: 3,
    body: 'Sige, kita-kita tayo mamaya. Ako na bahala sa Excel file.',
    createdAt: hoursAgo(24),
    readAt: hoursAgo(23.9),
  },
  {
    id: 7007,
    applicationId: 1005,
    senderId: 6,
    body: 'Hi Juan, available ka po ba bukas ng umaga?',
    createdAt: hoursAgo(1.4),
    readAt: null,
  },
  {
    id: 7008,
    applicationId: 1005,
    senderId: 1,
    body: "Opo Ma'am, wala akong pasok bukas. Anong oras po?",
    createdAt: hoursAgo(1.2),
    readAt: hoursAgo(1.1),
  },
  {
    id: 7009,
    applicationId: 1001,
    senderId: 5,
    body: 'Available po ako ngayon. May sariling motor at helmet po ako.',
    createdAt: hoursAgo(0.55),
    readAt: null,
  },
  {
    id: 7010,
    applicationId: 1002,
    senderId: 7,
    body: 'Taga-Bamban lang po ako, 10 mins away. May insulated bag din po ako.',
    createdAt: hoursAgo(0.25),
    readAt: null,
  },
]

export interface SeedReview {
  id: number
  jobId: number
  reviewerId: number
  revieweeId: number
  rating: number
  comment: string
  createdAt: string
}

export const SEED_REVIEWS: SeedReview[] = [
  {
    id: 5001,
    jobId: 112,
    reviewerId: 1,
    revieweeId: 6,
    rating: 5,
    comment: 'Super bilis at maayos ang setup. Salamat Angela!',
    createdAt: hoursAgo(24 * 5),
  },
  {
    id: 5002,
    jobId: 90,
    reviewerId: 4,
    revieweeId: 1,
    rating: 5,
    comment: 'Mabait at on time si Juan. Naayos agad ang pinto namin.',
    createdAt: hoursAgo(24 * 12),
  },
  {
    id: 5003,
    jobId: 91,
    reviewerId: 6,
    revieweeId: 1,
    rating: 4,
    comment: 'Delivered the cake safely. Medyo late lang ng 10 mins dahil sa traffic.',
    createdAt: hoursAgo(24 * 20),
  },
  {
    id: 5004,
    jobId: 92,
    reviewerId: 3,
    revieweeId: 1,
    rating: 5,
    comment: 'Reliable rider. Will hire again for hardware deliveries.',
    createdAt: hoursAgo(24 * 34),
  },
]





