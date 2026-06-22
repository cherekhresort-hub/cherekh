export interface InHouseExperience {
  id: string
  title: string
  description: string
  image: string
  duration: string
  /** Shown as the card badge (e.g. On site, Included, 24/7) */
  difficulty: string
  highlights: string[]
  href?: string
  ctaLabel?: string
}

export interface ThanchiVisitPlace {
  id: string
  name: string
  description: string
  image: string
  distanceFromThanchi: string
  travelTime?: string
}

export const inHouseExperiences: InHouseExperience[] = [
  {
    id: 'cultural-nights',
    title: 'Cultural Nights',
    description:
      'Evenings of local traditional culture at Cherekh, with tribal music, dance, and performances that celebrate the heritage of the Thanchi hill region.',
    image: '/cherekhImages/cuturalNights/cherekhCulturalNight.webp',
    duration: 'Evening',
    difficulty: 'On site',
    highlights: [
      'Traditional music and dance',
      'Local tribal performances',
      'Cultural storytelling',
      'Held at Cherekh Center',
    ],
  },
  {
    id: 'restaurant',
    title: 'Cherekh Restaurant',
    description:
      'Dine on site with authentic Bangla main courses, snacks, and freshly blended juices. No need to leave the property for a full meal.',
    image: '/cherekhImages/RestaurantPhotos/Restaurant_1.jpg',
    duration: 'All day',
    difficulty: 'On site',
    highlights: [
      'Bangla main courses and snacks',
      'Fresh juices and beverages',
      'Local and familiar flavours',
      'Steps from your room',
    ],
    href: '/dining',
    ctaLabel: 'View menu',
  },
  {
    id: 'complimentary-breakfast',
    title: 'Complimentary Breakfast',
    description:
      'Start each morning with breakfast included in every room stay. Served at Cherekh Restaurant with local and familiar options.',
    image: '/cherekhImages/RestaurantPhotos/Restaurant_2.jpg',
    duration: 'Morning',
    difficulty: 'Included',
    highlights: [
      'Included with every room booking',
      'Paratha, eggs, and local sides',
      'Tea and light morning options',
      'Served at the restaurant',
    ],
    href: '/dining',
    ctaLabel: 'See dining',
  },
  {
    id: 'spacious-rooms',
    title: 'Spacious Rooms & Hill Views',
    description:
      'Nine comfortable rooms across two floors, each with en-suite bath, hot water, and a garden-view balcony in the Thanchi hills.',
    image: '/cherekhImages/homepageHero/Cover_4.jpg',
    duration: 'Your stay',
    difficulty: 'On site',
    highlights: [
      '9 rooms across two floors',
      'Garden-view balcony',
      'En-suite bath and hot water',
      'AC and non-AC options',
    ],
    href: '/rooms',
    ctaLabel: 'Explore rooms',
  },
  {
    id: 'conference-events',
    title: 'Conference & Events',
    description:
      'A spacious hall for meetings, weddings, and celebrations. Capacity for 80–100 guests with AV equipment and catering on request.',
    image: '/cherekhImages/ConferenceRoomPhotos/CFR_1.jpg',
    duration: 'Full day',
    difficulty: 'By request',
    highlights: [
      '80–100 guest capacity',
      'Projector, sound, and AV setup',
      'Flexible seating layouts',
      'Catering available',
    ],
    href: '/conference-room',
    ctaLabel: 'View venue',
  },
  {
    id: 'reception-planning',
    title: 'Reception & Trip Planning',
    description:
      'Our front desk is available around the clock to help with check-in, local directions, guides, boats, and day plans around Thanchi.',
    image: '/cherekhImages/homepageHero/Reception.jpg',
    duration: 'Anytime',
    difficulty: '24/7',
    highlights: [
      '24/7 front desk service',
      'Guide and boat arrangements',
      'Local directions and tips',
      'Luggage and concierge help',
    ],
    href: '/rooms/reception',
    ctaLabel: 'About reception',
  },
]

export const thanchiVisitPlaces: ThanchiVisitPlace[] = [
  {
    id: 'hill-trekking',
    name: 'Hill Trekking',
    description:
      'Guided treks on scenic Bandarban trails, with forest paths, hill viewpoints, and routes arranged through Cherekh with local guides.',
    image: '/cherekhImages/whatToVisit/hillTrekking.webp',
    distanceFromThanchi: 'Varies',
    travelTime: 'Half day / full day',
  },
  {
    id: 'thanchi-bazaar',
    name: 'Thanchi Bazaar & Sangu River Ghat',
    description:
      'The main market and boat landing on the Sangu River, the starting point for river journeys and local life in Thanchi.',
    image: '/cherekhImages/whatToVisit/thanchiBazar.jpg',
    distanceFromThanchi: 'In town',
    travelTime: '~5–10 min walk',
  },
  {
    id: 'tindu',
    name: 'Tindu',
    description:
      'A riverside Marma settlement known as the “Niagara of Bangladesh” area, with rocky river channels and boat routes upstream from Thanchi.',
    image: '/cherekhImages/whatToVisit/tindu.jpg',
    distanceFromThanchi: '~29 km',
    travelTime: '~1 hr by boat',
  },
  {
    id: 'kumari-jharna',
    name: 'Kumari Jharna',
    description:
      'A seasonal waterfall near Tindu Bazaar, best during the rainy season after a short river crossing from the village.',
    image: '/cherekhImages/whatToVisit/kumariJharna.jpeg',
    distanceFromThanchi: '~32 km',
    travelTime: 'Boat to Tindu + ~15 min crossing',
  },
  {
    id: 'boro-pathar',
    name: 'Boro Pathar (Big Rock)',
    description:
      'A striking stretch of huge boulders along the river upstream from Tindu, where boats weave between massive stone formations.',
    image: '/cherekhImages/whatToVisit/boroPathor.jpg',
    distanceFromThanchi: '~30 km',
    travelTime: 'Boat to Tindu + ~20 min upstream',
  },
  {
    id: 'shoingong',
    name: 'Shoingong Waterfall',
    description:
      'A secluded forest waterfall tucked away in the rugged hills near Tindu, featuring crystal-clear pools and lush natural surroundings. Often visited alongside Langlok on extended trekking adventures through remote indigenous villages.',
    image: '/cherekhImages/whatToVisit/shoingong.jpg',
    distanceFromThanchi: '~35 km',
    travelTime: 'Boat to Tindu + full-day or multi-day guided trek',
  },
  {
    id: 'langlok',
    name: 'Langlok Waterfall',
    description:
      'A towering hidden waterfall deep in the remote hills of Thanchi, surrounded by untouched forest and dramatic cliffs. Known for its impressive height and pristine wilderness, it is one of the most rewarding destinations for experienced trekkers.',
    image: '/cherekhImages/whatToVisit/langlok.jpg',
    distanceFromThanchi: '~40 km',
    travelTime: 'Multi-day expedition with local guide',
  },
  {
    id: 'remakri',
    name: 'Remakri',
    description:
      'A remote Marma village on the Sangu River and the main staging point for treks to Nafakhum, Velakhum, and other upstream waterfalls.',
    image: '/cherekhImages/whatToVisit/remakri.jpg',
    distanceFromThanchi: '~50 km',
    travelTime: '~3–4 hrs by boat',
  },
  {
    id: 'nafakhum',
    name: 'Nafakhum Waterfall',
    description:
      'One of Bangladesh’s largest waterfalls by volume, a wide cascade on the Sangu River, reached by boat to Remakri and a forest trek.',
    image: '/cherekhImages/whatToVisit/nafakhum.jpeg',
    distanceFromThanchi: '~60 km',
    travelTime: 'Boat to Remakri + ~2.5 hr trek',
  },
  {
    id: 'amiakhum',
    name: 'Amiakhum Waterfall',
    description:
      'A remote 60–80 ft waterfall deep in the hills, an advanced wilderness trek for experienced hikers with a local guide.',
    image: '/cherekhImages/whatToVisit/amiakhum.jpg',
    distanceFromThanchi: '~75 km',
    travelTime: '4–5 day expedition',
  },
  {
    id: 'velakhum',
    name: 'Velakhum',
    description:
      'Often called one of Bangladesh’s most beautiful river canyons, with crystal-clear turquoise water flowing between steep rock walls. Popular for trekking, rafting (seasonal), and photography.',
    image: '/cherekhImages/whatToVisit/velakhum.webp',
    distanceFromThanchi: '~76 km',
    travelTime: 'Boat to Remakri + full-day trek',
  },
  {
    id: 'sat-bhai-khum',
    name: 'Sat Bhai Khum',
    description:
      'A dramatic narrow gorge where the river squeezes between towering rock faces. Usually combined with Amiakhum or Velakhum expeditions.',
    image: '/cherekhImages/whatToVisit/satvaikhum.jpg',
    distanceFromThanchi: '~77 km',
    travelTime: 'Multi-day trek',
  },
]

/** @deprecated Use inHouseExperiences */
export const experienceCatalog = inHouseExperiences
