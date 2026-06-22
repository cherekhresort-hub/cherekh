import type { ResortContact } from '../utils/contactFromSettings'
import { formatTime12h } from '../utils/contactFromSettings'
import { siteConfig } from './siteConfig'

export type LegalTable = {
  headers: string[]
  rows: string[][]
}

export type LegalSubsection = {
  title?: string
  paragraphs?: string[]
  bullets?: string[]
  table?: LegalTable
}

export type LegalSection = {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
  subsections?: LegalSubsection[]
  table?: LegalTable
}

export type LegalDocument = {
  slug: 'privacy-policy' | 'terms' | 'cancellation-policy'
  title: string
  subtitle: string
  coverImage: string
  coverAlt: string
  lastUpdated: string
  relatedSlugs: Array<'privacy-policy' | 'terms' | 'cancellation-policy'>
  sections: LegalSection[]
}

const LAST_UPDATED = 'June 18, 2026'

export const LEGAL_PAGE_COVERS = {
  'privacy-policy': {
    src: '/cherekhImages/legal/privacyPolicy.webp',
    alt: 'Privacy Policy cover at Cherekh Center, Thanchi',
  },
  terms: {
    src: '/cherekhImages/legal/termsCondition.webp',
    alt: 'Terms and Conditions cover at Cherekh Center, Thanchi',
  },
  'cancellation-policy': {
    src: '/cherekhImages/legal/cancellationPolicy.webp',
    alt: 'Cancellation Policy cover at Cherekh Center, Thanchi',
  },
} as const

export const getPrivacyPolicyDocument = (): LegalDocument => ({
  slug: 'privacy-policy',
  title: 'Privacy Policy',
  coverImage: LEGAL_PAGE_COVERS['privacy-policy'].src,
  coverAlt: LEGAL_PAGE_COVERS['privacy-policy'].alt,
  subtitle:
    'How Cherekh Center collects, uses, stores, and protects your personal information when you visit our website or book with us.',
  lastUpdated: LAST_UPDATED,
  relatedSlugs: ['terms', 'cancellation-policy'],
  sections: [
    {
      id: 'introduction',
      title: '1. Introduction',
      paragraphs: [
        `Cherekh Center ("Cherekh Center," "we," "our," or "us") operates ${siteConfig.origin} and provides accommodation, dining, conference, and experience services in Thanchi, Bandarban, Bangladesh.`,
        'This Privacy Policy explains what personal data we collect, why we collect it, how we use and share it, how long we keep it, and the choices and rights available to you.',
        'By using our website, submitting a booking or inquiry, or staying with us, you acknowledge that you have read this Privacy Policy. If you do not agree, please do not use our services.',
      ],
    },
    {
      id: 'scope',
      title: '2. Scope and controller',
      paragraphs: [
        'This policy applies to personal data collected through our public website, online booking flows, contact forms, email and phone communications, on-property check-in, and related guest services.',
        'Cherekh Center is the data controller for the processing activities described in this policy, unless we state otherwise.',
        'This policy covers:',
      ],
      bullets: [
        'Website visitors and account-free booking users',
        'Guests staying at Cherekh Center',
        'Conference and event organizers and attendees',
        'People who contact us for support, quotes, or partnerships',
      ],
    },
    {
      id: 'data-we-collect',
      title: '3. Information we collect',
      subsections: [
        {
          title: 'Information you provide directly',
          bullets: [
            'Identity and contact details: full name, email address, phone number, and emergency contact where provided',
            'Booking details: check-in and check-out dates, room or conference selections, guest counts, arrival preferences, and special requests',
            'Payment and billing information where applicable, including transaction references and payment method (processed according to our payment partners’ rules)',
            'Government ID or passport details when required for registration or compliance',
            'Communications you send us, including emails, WhatsApp messages, and contact form submissions',
          ],
        },
        {
          title: 'Information collected automatically',
          bullets: [
            'Device and browser type, operating system, and general technical logs',
            'IP address, approximate location derived from IP, pages viewed, referral source, and session activity on our website',
            'Cookies and similar technologies as described in Section 10',
          ],
        },
        {
          title: 'Information from third parties',
          bullets: [
            'Payment processors confirming payment status',
            'Communication tools we use to respond to your booking or inquiry (phone, WhatsApp, email)',
            'Mapping or analytics services that help us understand site usage',
            'Travel agents, corporate bookers, or group organizers acting on your behalf where you authorize them',
          ],
        },
      ],
    },
    {
      id: 'how-we-use',
      title: '4. How we use your information',
      paragraphs: ['We use personal data only where we have a lawful basis, including contract performance, legitimate interests, legal obligation, or your consent.'],
      bullets: [
        'Process, confirm, modify, and manage room, dining, conference, and experience bookings',
        'Contact you by phone, WhatsApp, or email to confirm reservations, share arrival details, and send payment reminders',
        'Provide guest support before, during, and after your stay',
        'Operate front desk, housekeeping, restaurant, and event coordination',
        'Improve website performance, security, and user experience',
        'Detect fraud, abuse, and unauthorized access',
        'Comply with tax, accounting, safety, and regulatory requirements',
        'Send marketing communications where you have opted in (you may opt out at any time)',
      ],
    },
    {
      id: 'legal-bases',
      title: '5. Legal bases for processing',
      bullets: [
        'Contract: to fulfill reservations and provide services you request',
        'Legitimate interests: to operate and improve our business, secure our systems, and prevent misuse, balanced against your rights',
        'Legal obligation: to meet applicable laws in Bangladesh and respond to lawful requests',
        'Consent: for optional marketing, certain cookies, or other uses where consent is required',
      ],
    },
    {
      id: 'sharing',
      title: '6. How we share information',
      paragraphs: [
        'We do not sell your personal information. We share data only as needed to run our business and provide services.',
      ],
      bullets: [
        'Service providers: hosting, database, email delivery (including EmailJS), analytics, and IT support vendors bound by confidentiality obligations',
        'Payment partners: to process transactions and refunds',
        'Professional advisers: accountants, lawyers, or insurers where reasonably necessary',
        'Authorities: when required by law, court order, or to protect rights, safety, and property',
        'Business transfers: in connection with a merger, acquisition, or asset sale, subject to appropriate safeguards',
      ],
    },
    {
      id: 'international',
      title: '7. International transfers',
      paragraphs: [
        'Some of our technology providers may process data outside Bangladesh. Where this occurs, we take reasonable steps to ensure appropriate safeguards, such as contractual protections and vendor security reviews.',
      ],
    },
    {
      id: 'retention',
      title: '8. Data retention',
      paragraphs: [
        'We retain personal data only as long as necessary for the purposes described in this policy, unless a longer period is required by law.',
      ],
      bullets: [
        'Active booking and guest-stay records: for the duration of the relationship and a reasonable period afterward for support and disputes',
        'Financial and tax records: as required under applicable accounting and tax rules',
        'Marketing preferences: until you withdraw consent or object',
        'Security logs: for a limited period appropriate to security monitoring',
      ],
    },
    {
      id: 'security',
      title: '9. Security measures',
      paragraphs: [
        'We implement administrative, technical, and organizational safeguards designed to protect personal data, including access controls, encrypted connections (HTTPS), and restricted staff access on a need-to-know basis.',
        'No method of transmission or storage is completely secure. While we work to protect your information, we cannot guarantee absolute security.',
      ],
    },
    {
      id: 'cookies',
      title: '10. Cookies and similar technologies',
      paragraphs: [
        'Our website may use essential cookies required for core functionality, as well as analytics or preference cookies where enabled.',
        'You can control cookies through your browser settings. Disabling certain cookies may affect site functionality.',
      ],
      bullets: [
        'Essential cookies: required for navigation, security, and booking flows',
        'Analytics cookies: help us understand traffic and improve content',
        'Preference cookies: remember choices such as language or display settings where available',
      ],
    },
    {
      id: 'your-rights',
      title: '11. Your rights and choices',
      paragraphs: [
        'Depending on applicable law, you may have the right to:',
        'To exercise these rights, contact us using the details in Section 14. We may need to verify your identity before responding.',
      ],
      bullets: [
        'Request access to personal data we hold about you',
        'Request correction of inaccurate or incomplete data',
        'Request deletion where processing is no longer necessary or lawful',
        'Object to or restrict certain processing activities',
        'Withdraw consent where processing is based on consent',
        'Opt out of marketing emails or messages',
        'Lodge a complaint with a relevant supervisory authority where applicable',
      ],
    },
    {
      id: 'children',
      title: '12. Children’s privacy',
      paragraphs: [
        'Our website and booking services are not directed at children under 13. We do not knowingly collect personal data from children without appropriate parental or guardian consent.',
        'If you believe a child has provided us personal data without consent, please contact us and we will take appropriate steps to delete it.',
      ],
    },
    {
      id: 'changes',
      title: '13. Changes to this policy',
      paragraphs: [
        'We may update this Privacy Policy from time to time. The "Last updated" date at the top of this page will reflect the latest version.',
        'Material changes will be posted on this page. Continued use of our services after updates constitutes acceptance of the revised policy where permitted by law.',
      ],
    },
    {
      id: 'contact',
      title: '14. Contact us',
      paragraphs: [
        'For privacy questions, data requests, or complaints, contact Cherekh Center using the details below. We aim to respond within a reasonable timeframe.',
      ],
    },
  ],
})

export const getTermsConditionsDocument = (contact: ResortContact): LegalDocument => ({
  slug: 'terms',
  title: 'Terms & Conditions',
  coverImage: LEGAL_PAGE_COVERS.terms.src,
  coverAlt: LEGAL_PAGE_COVERS.terms.alt,
  subtitle:
    'The terms governing your use of our website, bookings, on-property conduct, and guest services at Cherekh Center.',
  lastUpdated: LAST_UPDATED,
  relatedSlugs: ['privacy-policy', 'cancellation-policy'],
  sections: [
    {
      id: 'acceptance',
      title: '1. Agreement to terms',
      paragraphs: [
        `These Terms & Conditions ("Terms") govern access to ${siteConfig.origin}, online and offline bookings, and services provided by Cherekh Center in Thanchi, Bandarban, Bangladesh.`,
        'By making a reservation, checking in, or using our website, you agree to these Terms, our Privacy Policy, and our Cancellation Policy, which are incorporated by reference.',
        'If you book on behalf of others, you confirm that you are authorized to accept these Terms for all guests in your party.',
      ],
    },
    {
      id: 'services',
      title: '2. Services covered',
      bullets: [
        'Guest room accommodation (AC and non-AC options)',
        'Restaurant and dining services',
        'Conference room and community center events',
        'Local experiences, trekking support, and trip coordination where offered',
        'Website information, inquiries, and direct online booking',
      ],
    },
    {
      id: 'bookings',
      title: '3. Reservations and confirmation',
      bullets: [
        'All bookings are subject to availability and confirmation by Cherekh Center',
        'A booking is confirmed only after we contact you by phone, WhatsApp, or email and any required deposit or payment terms are met',
        'Submitting the online booking form records your request; it does not guarantee a room until we confirm with you directly',
        'You must provide accurate contact, guest, and travel information',
        'Guests making bookings must be at least 18 years old, or book through a parent or legal guardian',
        'We may refuse or cancel bookings for fraud prevention, policy violations, or operational reasons, with refund treatment per our Cancellation Policy where applicable',
      ],
    },
    {
      id: 'pricing',
      title: '4. Rates, taxes, and payment',
      bullets: [
        'Published rates are shown in Bangladeshi Taka (BDT) unless stated otherwise',
        'Rates may vary by season, room type, occupancy, and promotions',
        'Complimentary breakfast is included with eligible room stays as described at booking',
        'Additional charges may apply for extra guests, late checkout, damages, laundry, tours, catering, or conference equipment',
        'Payment terms (deposit, balance due, accepted methods) are communicated at booking and must be followed',
        'You are responsible for any bank, mobile wallet, or card processing fees charged by third-party payment providers unless we state otherwise',
      ],
    },
    {
      id: 'check-in-out',
      title: '5. Check-in, check-out, and identification',
      bullets: [
        `Standard check-in: ${formatTime12h(contact.checkInTime)}`,
        `Standard check-out: ${formatTime12h(contact.checkOutTime)}`,
        'Valid government-issued photo ID is required at check-in for all adult guests',
        'Early check-in and late check-out are subject to availability and may incur additional fees',
        'Failure to check out on time may result in extra night charges',
        'We may require a security deposit or pre-authorization for incidentals where applicable',
      ],
    },
    {
      id: 'guest-conduct',
      title: '6. Guest conduct and house rules',
      paragraphs: [
        'To protect all guests, staff, and the local community, you agree to:',
        'We may terminate a stay without refund if conduct violates these Terms or creates a safety risk, subject to applicable law.',
      ],
      bullets: [
        'Treat staff, other guests, and neighbors with respect',
        'Follow property rules regarding noise, smoking areas, alcohol, and common spaces',
        'Use rooms and facilities only for lawful purposes',
        'Respect local customs and hill-community guidelines in Thanchi and Bandarban',
        'Not engage in illegal activity, harassment, or behavior that endangers others',
        'Supervise children and minors in your care at all times',
      ],
    },
    {
      id: 'property-damage',
      title: '7. Property damage and loss',
      bullets: [
        'Guests are responsible for damage to rooms, furniture, equipment, or common areas caused by themselves or their party',
        'Lost-and-found items are held for a reasonable period; unclaimed items may be disposed of according to our internal policy',
        'Cherekh Center is not responsible for loss of cash, jewelry, electronics, or valuables left unattended unless required otherwise by law',
      ],
    },
    {
      id: 'dining-conference',
      title: '8. Dining, conference, and events',
      subsections: [
        {
          title: 'Restaurant and dining',
          bullets: [
            'Menu items, prices, and availability may change without notice',
            'Allergies and dietary requirements should be communicated in advance; we will make reasonable efforts but cannot guarantee allergen-free environments in all cases',
          ],
        },
        {
          title: 'Conference and private events',
          bullets: [
            'Event bookings require confirmed dates, headcount, setup needs, and catering selections',
            'Organizers are responsible for attendee conduct and compliance with capacity and safety limits',
            'AV equipment, furniture layout, and catering changes may affect pricing',
            'Cancellation and refund rules for events are set out in our Cancellation Policy',
          ],
        },
      ],
    },
    {
      id: 'experiences',
      title: '9. Experiences and outdoor activities',
      paragraphs: [
        'Trekking, river activities, cultural visits, and other experiences may involve inherent risks including uneven terrain, weather changes, and remote locations.',
        'Participation is voluntary and at your own risk. Follow guide instructions and disclose relevant health conditions in advance.',
        'Third-party guides or transport providers may apply additional terms.',
      ],
    },
    {
      id: 'website',
      title: '10. Website use',
      bullets: [
        'Website content is provided for general information and may be updated without notice',
        'You may not scrape, reverse engineer, or misuse the site in ways that impair security or availability',
        'Photography and media on the site are protected by intellectual property laws',
        'Unauthorized use of Cherekh Center branding or content is prohibited',
      ],
    },
    {
      id: 'liability',
      title: '11. Limitation of liability',
      paragraphs: [
        'To the fullest extent permitted by applicable law, Cherekh Center is not liable for indirect, incidental, special, or consequential damages arising from your stay or use of our services.',
        'Our total liability for any claim relating to a booking is limited to the amount paid for that booking, except where liability cannot be limited by law.',
        'Nothing in these Terms excludes liability for death or personal injury caused by negligence where exclusion is not permitted, or for fraud or willful misconduct.',
      ],
    },
    {
      id: 'force-majeure',
      title: '12. Force majeure',
      paragraphs: [
        'We are not liable for failure or delay caused by events beyond reasonable control, including natural disasters, floods, landslides, power outages, civil unrest, pandemics, government orders, road closures, or failures of essential utilities and suppliers.',
        'In such cases we will work in good faith to offer rescheduling, credits, or refunds consistent with our Cancellation Policy and operational capacity.',
      ],
    },
    {
      id: 'disputes',
      title: '13. Governing law and disputes',
      paragraphs: [
        'These Terms are governed by the laws of Bangladesh, without regard to conflict-of-law principles.',
        'Parties agree to attempt good-faith resolution through direct contact before pursuing formal proceedings.',
        'Courts in Bangladesh shall have jurisdiction over disputes, unless mandatory consumer protection rules provide otherwise.',
      ],
    },
    {
      id: 'changes-terms',
      title: '14. Changes to these Terms',
      paragraphs: [
        'We may revise these Terms from time to time. Updated versions will be posted on this page with a revised "Last updated" date.',
        'Bookings made before a change are generally governed by the Terms in effect at the time of booking, unless a change is required by law or communicated as applying to existing reservations.',
      ],
    },
    {
      id: 'contact-terms',
      title: '15. Contact',
      paragraphs: ['Questions about these Terms can be directed to Cherekh Center:'],
    },
  ],
})

export const getCancellationPolicyDocument = (): LegalDocument => ({
  slug: 'cancellation-policy',
  title: 'Cancellation Policy',
  coverImage: LEGAL_PAGE_COVERS['cancellation-policy'].src,
  coverAlt: LEGAL_PAGE_COVERS['cancellation-policy'].alt,
  subtitle:
    'Clear refund windows for room stays and conference events, plus modification, no-show, and exceptional circumstance rules.',
  lastUpdated: LAST_UPDATED,
  relatedSlugs: ['terms', 'privacy-policy'],
  sections: [
    {
      id: 'overview',
      title: '1. Overview',
      paragraphs: [
        'We understand travel plans can change. This Cancellation Policy explains how cancellations, modifications, and refunds work for room bookings and conference events at Cherekh Center.',
        'Refund eligibility depends on how far in advance you cancel, the type of booking, and whether exceptional circumstances apply.',
      ],
    },
    {
      id: 'room-cancellations',
      title: '2. Room booking cancellations',
      paragraphs: ['The following standard windows apply to confirmed guest room reservations unless your confirmation states a special non-refundable rate.'],
      table: {
        headers: ['Cancellation timing', 'Refund'],
        rows: [
          ['More than 7 days before check-in', 'Full refund minus any non-refundable processing or payment gateway fees'],
          ['3 to 7 days before check-in', '50% refund of total booking value'],
          ['Less than 3 days before check-in', 'No refund, except under exceptional circumstances (Section 6)'],
          ['No-show without prior cancellation', 'No refund'],
        ],
      },
    },
    {
      id: 'conference-cancellations',
      title: '3. Conference and event cancellations',
      paragraphs: [
        'Conference room, seminar, workshop, wedding, and community event bookings follow separate windows because dates, catering, and setup resources are reserved in advance.',
      ],
      table: {
        headers: ['Cancellation timing', 'Refund'],
        rows: [
          ['More than 14 days before event date', 'Full refund minus any non-refundable processing fees'],
          ['7 to 14 days before event date', '50% refund of confirmed event charges'],
          ['Less than 7 days before event date', 'No refund, except under exceptional circumstances (Section 6)'],
          ['Reduction in attendee count after final confirmation', 'Subject to minimum spend and catering commitments agreed in writing'],
        ],
      },
    },
    {
      id: 'how-to-cancel',
      title: '4. How to cancel or modify a booking',
      bullets: [
        'Contact us as soon as possible with your booking ID, guest name, and requested change',
        'Phone and WhatsApp are our primary channels; email is also accepted. We will confirm cancellation or changes by phone, WhatsApp, or email when processed',
        'Cancellation time is measured from when we acknowledge your request, based on Bangladesh time (UTC+6)',
        'Modifications (dates, room type, guest count) are subject to availability and may change the total price',
      ],
    },
    {
      id: 'refund-processing',
      title: '5. Refund processing',
      bullets: [
        'Approved refunds are returned to the original payment method where possible',
        'Processing typically takes 5 to 10 business days after approval, depending on banks and payment providers',
        'If original payment cannot be reversed, we may offer an alternative refund method by mutual agreement',
        'Non-refundable promotions or deposits are identified at booking and are excluded from refunds',
      ],
    },
    {
      id: 'exceptional',
      title: '6. Exceptional circumstances',
      paragraphs: [
        'We may offer full or partial refunds outside standard windows when documented exceptional circumstances apply, at our reasonable discretion.',
      ],
      bullets: [
        'Serious illness or medical emergency affecting the primary guest (documentation may be required)',
        'Death in immediate family',
        'Natural disasters, landslides, or severe weather making travel unsafe or impossible',
        'Government travel bans or mandatory restrictions affecting your journey to Thanchi',
        'Property closure or inability to provide the booked service due to events beyond our control',
      ],
    },
    {
      id: 'no-show',
      title: '7. No-show and early departure',
      bullets: [
        'If you do not arrive on the check-in date and have not cancelled per this policy, the reservation is treated as a no-show with no refund',
        'Leaving before your scheduled check-out date does not automatically entitle you to a refund for unused nights unless agreed in writing',
        'Late arrival on the same day does not cancel your reservation; contact us if you expect to arrive after reception hours',
      ],
    },
    {
      id: 'group-long-stay',
      title: '8. Group, peak season, and long-stay bookings',
      paragraphs: [
        'Group bookings, holiday peak periods, and extended stays may require custom deposit and cancellation terms stated in your written quote or contract.',
        'Where custom terms apply, they override the standard windows in Sections 2 and 3 for that specific booking.',
      ],
    },
    {
      id: 'property-initiated',
      title: '9. Cancellations initiated by Cherekh Center',
      paragraphs: [
        'If we must cancel your booking due to overbooking error, essential maintenance, safety concerns, or force majeure, we will offer a full refund or alternative dates of comparable value, subject to availability.',
      ],
    },
    {
      id: 'chargebacks',
      title: '10. Chargebacks and disputes',
      paragraphs: [
        'Please contact us before initiating a payment dispute or chargeback so we can review your case promptly.',
        'Chargebacks filed without prior notice may delay resolution and may be contested where the booking was provided as agreed.',
      ],
    },
    {
      id: 'contact-cancellation',
      title: '11. Contact',
      paragraphs: ['For cancellation requests or refund status, reach Cherekh Center using the contact details below. Include your booking reference for faster handling.'],
    },
  ],
})

export const LEGAL_DOCUMENT_META: Record<
  LegalDocument['slug'],
  { path: string; label: string }
> = {
  'privacy-policy': { path: '/privacy-policy', label: 'Privacy Policy' },
  terms: { path: '/terms', label: 'Terms & Conditions' },
  'cancellation-policy': { path: '/cancellation-policy', label: 'Cancellation Policy' },
}
