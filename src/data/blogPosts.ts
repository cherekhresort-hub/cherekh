export interface BlogPost {
  id: string
  title: string
  excerpt: string
  content: string
  author: string
  date: string
  category: 'updates' | 'guides' | 'events'
  image: string
  featured?: boolean
}

export const blogPosts: BlogPost[] = [
  {
    id: '1',
    title: 'Welcome to Cherekh Center: Your Gateway to Thanchi',
    excerpt:
      'Discover the natural beauty of Thanchi, Bandarban at Cherekh Center. Experience peace in the hills with our premium accommodations.',
    content:
      'Cherekh Center welcomes travelers to Thanchi, Bandarban — a peaceful hill destination with comfortable rooms, local cuisine, and easy access to trekking, rivers, and cultural experiences. Book direct for transparent pricing and a warm local stay.',
    author: 'Cherekh Center',
    date: '2025-01-15',
    category: 'updates',
    image: '/cherekhImages/homepageHero/hero01.jpg',
    featured: true,
  },
  {
    id: '2',
    title: 'Best Time to Visit Bandarban: A Seasonal Guide',
    excerpt:
      'Learn about the best seasons to visit Bandarban and what to expect during each time of year.',
    content:
      'Bandarban is pleasant year-round, but winter and early spring offer clear skies for hill views and trekking. Monsoon brings lush greenery and fewer crowds. Plan your Thanchi stay around the activities you want — trekking, river visits, or quiet relaxation.',
    author: 'Cherekh Center',
    date: '2025-01-10',
    category: 'guides',
    image: '/cherekhImages/homepageHero/hero02.jpg',
  },
  {
    id: '3',
    title: 'Top 5 Trekking Trails Near Thanchi',
    excerpt: 'Explore the most beautiful trekking routes accessible from Cherekh Center.',
    content:
      'From gentle garden walks to full-day hill treks, Thanchi offers routes for every fitness level. Ask our team for current trail conditions, local guides, and the best sunrise or sunset viewpoints near Cherekh Center.',
    author: 'Cherekh Center',
    date: '2025-01-05',
    category: 'guides',
    image: '/cherekhImages/homepageHero/hero03.jpg',
  },
  {
    id: '4',
    title: "Local Tribal Culture: A Visitor's Guide",
    excerpt: 'Learn about the rich cultural heritage of the tribal communities in Bandarban.',
    content:
      'Bandarban is home to diverse indigenous communities with distinct traditions, crafts, and festivals. Visit respectfully, support local artisans, and learn about customs that make this region unique.',
    author: 'Cherekh Center',
    date: '2024-12-28',
    category: 'guides',
    image: '/cherekhImages/homepageHero/hero05.jpg',
  },
  {
    id: '5',
    title: 'New Year Celebration at Cherekh Center',
    excerpt:
      'Join us for a special New Year celebration with traditional food and cultural performances.',
    content:
      'Ring in the New Year at Cherekh Center with local dishes, music, and hill views. Contact us early to reserve rooms and conference space for group celebrations in Thanchi.',
    author: 'Cherekh Center',
    date: '2024-12-20',
    category: 'events',
    image: '/cherekhImages/homepageHero/hero06.jpg',
  },
]

export const getBlogPostById = (id: string): BlogPost | undefined =>
  blogPosts.find((post) => post.id === id)
