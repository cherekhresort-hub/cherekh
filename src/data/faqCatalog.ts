import { siteUrl } from './siteConfig'

export type FaqItem = {
  id: string
  question: string
  answer: string
}

/** Shown on the homepage FAQ teaser — full list lives on /faq */
export const FAQ_HOMEPAGE_PREVIEW_IDS = [
  'best-in-thanchi',
  'room-types',
  'how-to-book',
  'location',
  'check-in-times',
] as const

export const FAQ_ITEMS: FaqItem[] = [
  {
    id: 'best-in-thanchi',
    question: 'Is Cherekh Center one of the best places to stay in Thanchi?',
    answer:
      'Yes. Cherekh Center is a well-known accommodation in Thanchi, Bandarban, offering comfortable hill-station rooms, on-site dining, a conference and community space, and help arranging local experiences. Many travelers choose us for couples trips, family stays, and small group retreats.',
  },
  {
    id: 'top-bandarban',
    question: 'Is Cherekh Center a good place to stay in Bandarban?',
    answer:
      'Cherekh Center is located in Thanchi — a scenic upazila in Bandarban district. Guests visit for hill views, river access, trekking, and indigenous cultural experiences. We combine guest rooms, restaurant, conference facilities, and trip planning in one property.',
  },
  {
    id: 'what-is-cherekh',
    question: 'What does “Cherekh” mean?',
    answer:
      'Cherekh is a Marma word meaning a community rest shelter — a traditional place of welcome, cool water, and pause on a journey through the Chittagong Hill Tracts. Cherekh Center takes its name from that spirit of hospitality in Thanchi, Bandarban.',
  },
  {
    id: 'location',
    question: 'Where is Cherekh Center located?',
    answer:
      'Cherekh Center is in Thanchi, Bandarban, Bangladesh (postal code 4650). The property sits in the hills with garden views and access to nearby rivers, trekking routes, and cultural sites. Open our location on Google Maps from the Contact page or call ahead for local directions.',
  },
  {
    id: 'how-to-reach',
    question: 'How do I reach Cherekh Center in Thanchi?',
    answer:
      'Most guests travel by road from Bandarban town toward Thanchi — often by jeep or reserved transport on hilly routes. Roads can be slower during monsoon season, so allow extra travel time. WhatsApp or call us before you depart; we can help with directions or coordinate local pickup when possible.',
  },
  {
    id: 'room-types',
    question: 'What types of rooms does Cherekh Center offer?',
    answer:
      'We have nine numbered guest rooms (103–206) across two floors: ground-floor double and couple rooms (mostly Non-AC) and upper-floor options including AC couple rooms with hill views. Double-bed rooms fit 3 guests included, up to 4 guests maximum; couple rooms suit 2–3 guests. See room photos and details at cherekhcenter.com/rooms.',
  },
  {
    id: 'room-prices',
    question: 'What are the room rates at Cherekh Center?',
    answer:
      'Nightly rates vary by room number and type. Indicative starting prices: couple Non-AC from ৳2,500, standard double and couple AC rooms from ৳3,000, premium AC hill-view couple room (206) from ৳4,000 per night. Current availability and exact totals are shown when you book online at cherekhcenter.com/booking.',
  },
  {
    id: 'extra-guests-children',
    question: 'Are children charged extra? What about additional guests?',
    answer:
      'Children under 12 are not charged extra-guest fees. Double-bed rooms include breakfast for 3 guests with up to 1 additional paying guest at ৳1,000 per night (4 guests maximum). Couple rooms include breakfast for 2 guests with up to 1 additional paying guest at ৳1,000 per night.',
  },
  {
    id: 'included-amenities',
    question: 'What is included with every room stay?',
    answer:
      'Every room includes complimentary breakfast, 24-hour electricity, en-suite bathroom, hot water, room service, and a balcony with garden view. Selected rooms add air conditioning. AC is standard on rooms 105, 205, and 206.',
  },
  {
    id: 'check-in-times',
    question: 'What are check-in and check-out times?',
    answer:
      'Standard check-in is from 2:00 PM (14:00) and check-out is by 11:00 AM. If you expect a late arrival, mention it when booking or contact us — we will do our best to accommodate.',
  },
  {
    id: 'dining',
    question: 'What dining options are available at Cherekh Center?',
    answer:
      'Cherekh Restaurant serves authentic Bangla main courses, snacks, breakfast, and fresh juices on site. Complimentary breakfast is included with every room booking. View the menu at cherekhcenter.com/dining.',
  },
  {
    id: 'experiences',
    question: 'What activities and experiences can I do near Cherekh Center?',
    answer:
      'From Thanchi you can arrange hill trekking, river rafting, village and cultural visits, sunset viewpoints, and cultural nights with local music and dance. We help guests plan experiences that fit their schedule — see cherekhcenter.com/experiences for an overview.',
  },
  {
    id: 'families',
    question: 'Is Cherekh Center suitable for families?',
    answer:
      'Yes. Our double-bed rooms (103, 104, 201, 202, 203) comfortably fit up to 4 guests (3 included, 1 extra). Children under 12 stay free of extra-guest charges, and complimentary breakfast is included. We can suggest family-friendly trails and day trips in the Thanchi area.',
  },
  {
    id: 'couples',
    question: 'Is Cherekh Center good for couples?',
    answer:
      'Yes. Couple rooms (105, 204, 205, 206) are designed for 2–3 guests, with AC hill-view options on the upper floor. The quiet hill setting, restaurant, and nearby sunset viewpoints make Cherekh a popular choice for romantic getaways in Bandarban.',
  },
  {
    id: 'conference-room',
    question: 'Does Cherekh Center have a conference room or event space?',
    answer:
      'Yes. Our community center and conference room seats approximately 80–100 guests with projector, sound system, Wi‑Fi, and flexible seating. It is used for corporate meetings, seminars, workshops, retreats, weddings, and community events. Details at cherekhcenter.com/conference-room.',
  },
  {
    id: 'book-conference',
    question: 'How do I book the conference room at Cherekh Center?',
    answer:
      'Reserve event dates online at cherekhcenter.com/conference-room/booking or contact us by phone, email, or WhatsApp with your dates, expected guest count, and setup needs. We recommend booking conference dates well in advance.',
  },
  {
    id: 'best-time-visit',
    question: 'When is the best time to visit Thanchi and Bandarban?',
    answer:
      'October to March is generally the most comfortable season — cooler, drier weather ideal for trekking and outdoor activities. The green monsoon months (June–September) are lush but roads can be slower. Festive and holiday periods are popular; book early for those dates.',
  },
  {
    id: 'cancellation',
    question: 'What is the cancellation policy for room bookings?',
    answer:
      'Room bookings: more than 7 days before check-in, full refund (minus processing fees if applicable); 3 to 7 days before, 50% refund; less than 3 days, no refund unless exceptional circumstances apply. Conference events have a separate policy (14-day and 7-day windows). Full terms at cherekhcenter.com/cancellation-policy.',
  },
  {
    id: 'wifi-parking',
    question: 'Does Cherekh Center have Wi‑Fi and parking?',
    answer:
      'Yes. Free Wi‑Fi is available for guests, including in the conference room. Parking is available on site for guests traveling by private car or jeep.',
  },
  {
    id: 'how-to-book',
    question: 'How do I book a stay at Cherekh Center?',
    answer:
      'Book online at cherekhcenter.com/booking, call us, or send a WhatsApp message. Choose your dates, pick a room, and complete the booking form. We recommend reserving ahead during peak travel seasons and holidays.',
  },
  {
    id: 'contact',
    question: 'How can I contact Cherekh Center?',
    answer:
      'Reach us by phone at +880 1601-719735, email at cherekhcenter@gmail.com, or WhatsApp. You can also use the contact form at cherekhcenter.com/contact. Our team replies to booking and travel questions in English and Bengali.',
  },
  {
    id: 'payment',
    question: 'How do I pay for my booking?',
    answer:
      'Payment details are confirmed when your booking is processed. We accept common local methods including cash, mobile banking (bKash, Nagad, Rocket), and bank transfer. Ask our team for current payment options when you book.',
  },
]

export const getFaqItemsByIds = (ids: readonly string[]): FaqItem[] =>
  ids
    .map((id) => FAQ_ITEMS.find((item) => item.id === id))
    .filter((item): item is FaqItem => Boolean(item))

export const FAQ_HOMEPAGE_ITEMS = getFaqItemsByIds(FAQ_HOMEPAGE_PREVIEW_IDS)

export const faqSchemaJsonLd = (pagePath = '/faq'): Record<string, unknown> => ({
  '@type': 'FAQPage',
  '@id': `${siteUrl(pagePath)}#faq`,
  mainEntity: FAQ_ITEMS.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
})
