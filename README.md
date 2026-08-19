# Cherekh Center Website

A premium, modern resort website for Cherekh Center located in Thanchi, Bandarban.

## 🎨 Design Features

- **Color Palette:**
  - Background: `#F5F1E9` (Natural Off-White)
  - Headings: `#1E4D2B` (Deep Forest Green)
  - CTA Buttons: `#B76F64` (Soft Terracotta)

- **Typography:**
  - Headings: Playfair Display (Serif)
  - Body: Inter (Sans-serif)

- **Design Style:**
  - Minimal, nature-inspired
  - International luxury resort standard
  - Clean & elegant layout
  - Smooth animations and transitions

## 🚀 Tech Stack

- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **React Router** for navigation
- **Framer Motion** for animations

## 📦 Installation

1. Install dependencies:
```bash
npm install
```

2. Start development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

4. Preview production build:
```bash
npm run preview
```

## 📁 Project Structure

```
cherekh/
├── src/
│   ├── components/       # Reusable components
│   │   ├── Layout.tsx
│   │   ├── Navbar.tsx
│   │   ├── MobileMenu.tsx
│   │   ├── Footer.tsx
│   │   ├── Hero.tsx
│   │   ├── Button.tsx
│   │   ├── RoomCard.tsx
│   │   ├── ReviewsSection.tsx
│   │   └── ContactForm.tsx
│   ├── pages/            # Page components
│   │   ├── Home.tsx
│   │   ├── Rooms.tsx
│   │   ├── RoomDetails.tsx
│   │   ├── Dining.tsx
│   │   ├── Experiences.tsx
│   │   ├── Gallery.tsx
│   │   └── Contact.tsx
│   ├── App.tsx           # Main app component with routing
│   ├── main.tsx          # Entry point
│   └── index.css         # Global styles
├── public/               # Static assets
├── index.html            # HTML template
└── package.json          # Dependencies
```

## 🌐 Pages

1. **Home** (`/`) - Hero section, featured rooms, amenities, experiences
2. **Rooms & Suites** (`/rooms`) - All available accommodations
3. **Room Details** (`/rooms/:id`) - Detailed room information with gallery
4. **Dining** (`/dining`) - Menu with three cuisine categories
5. **Experiences** (`/experiences`) - Activities and nearby attractions
6. **Gallery** (`/gallery`) - Photo gallery with lightbox
7. **Contact** (`/contact`) - Contact form, map, and information

## ✨ Features

- ✅ Fully responsive (mobile-first)
- ✅ Smooth scroll animations
- ✅ Lazy loading images
- ✅ SEO optimized (meta tags, JSON-LD schema)
- ✅ Accessible navigation
- ✅ Sticky navbar with scroll effect
- ✅ Mobile menu drawer
- ✅ Image lightbox gallery
- ✅ Contact form
- ✅ Google Maps integration

## 🎯 Customization

### Colors
Edit `tailwind.config.js` to modify the color palette:
```js
colors: {
  'resort-bg': '#F5F1E9',
  'resort-heading': '#1E4D2B',
  'resort-cta': '#B76F64',
}
```

### Images
Replace placeholder images with your own:
- Update image URLs in page components
- Add images to `public/` folder
- Update image paths accordingly

### Content
- Edit page components in `src/pages/`
- Update room data, menu items, and experiences
- Modify contact information in `Contact.tsx` and `Footer.tsx`

## 📝 Notes

- All images are currently using Unsplash placeholders
- Replace with actual resort images before deployment
- Google Maps uses the official Cherekh Center listing (`src/data/contactInfo.ts`)
- Configure form submission endpoint in `ContactForm.tsx`

## 🔧 Development

The project uses Vite for fast HMR (Hot Module Replacement). Changes will reflect immediately in the browser.

## 📄 License

All rights reserved - Cherekh Center

# cherekh-center
