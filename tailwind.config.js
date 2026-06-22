/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'resort-bg': '#F5F1E9',
        'resort-heading': '#1E4D2B',
        'resort-cta': '#B76F64',
        forest: {
          50:  '#F1F6F2',
          100: '#DCE9DE',
          200: '#B7D2BD',
          300: '#88B292',
          400: '#5A916A',
          500: '#3A754C',
          600: '#2A5C3A',
          700: '#1E4D2B',
          800: '#173B22',
          900: '#0F2716',
        },
        teal: {
          50:  '#EEF6F6',
          100: '#D4E9E9',
          200: '#A6D0D0',
          300: '#74B4B4',
          400: '#4F9999',
          500: '#367E7E',
          600: '#2A6464',
          700: '#21504F',
          800: '#1A3F3F',
          900: '#112A2A',
        },
        sand: {
          50:  '#FBF8F1',
          100: '#F5EFE0',
          200: '#EADFC2',
          300: '#DCC99A',
          400: '#C8AE72',
          500: '#B59455',
          600: '#917541',
          700: '#705A33',
          800: '#544328',
          900: '#382C1A',
        },
        stone: {
          50:  '#FAFAF8',
          100: '#F1F1ED',
          200: '#E2E1DA',
          300: '#C9C7BC',
          400: '#A8A697',
          500: '#857F70',
          600: '#666058',
          700: '#4F4A44',
          800: '#3A3633',
          900: '#27241F',
        },
        cream: '#FBF8F1',
      },
      fontFamily: {
        'serif': ['Playfair Display', 'Georgia', 'serif'],
        'sans': ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'soft':  '0 1px 2px rgba(15, 39, 22, 0.04), 0 4px 16px rgba(15, 39, 22, 0.06)',
        'card':  '0 2px 4px rgba(15, 39, 22, 0.04), 0 12px 32px rgba(15, 39, 22, 0.06)',
        'pop':   '0 8px 24px rgba(15, 39, 22, 0.08), 0 24px 48px rgba(15, 39, 22, 0.12)',
        'inset-ring': 'inset 0 0 0 1px rgba(15, 39, 22, 0.06)',
      },
      borderRadius: {
        '2xl': '1.25rem',
        '3xl': '1.75rem',
      },
      backgroundImage: {
        'admin-gradient': 'linear-gradient(180deg, #FBF8F1 0%, #F5EFE0 100%)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [],
}

