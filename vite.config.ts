import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { netlifyFunctionsDevPlugin } from './scripts/viteNetlifyFunctionsPlugin'

const supabaseProxy = (mode: string) => {
  const target = loadEnv(mode, process.cwd(), 'VITE_').VITE_SUPABASE_URL?.trim()
  if (!target) return undefined
  return {
    // Mirrors the Netlify /sb/* rewrite written by scripts/prerender-meta.mjs
    '/sb': {
      target,
      changeOrigin: true,
      ws: true,
      rewrite: (p: string) => p.replace(/^\/sb/, ''),
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: { proxy: supabaseProxy(mode) },
  preview: { proxy: supabaseProxy(mode) },
  plugins: [
    react(),
    netlifyFunctionsDevPlugin(mode),
    VitePWA({
      registerType: 'autoUpdate',
      minify: true,
      includeAssets: ['favicon.ico', 'robots.txt', 'sitemap.xml', 'llms.txt'],
      manifest: {
        name: 'Cherekh Center - Thanchi, Bandarban',
        short_name: 'Cherekh Center',
        description: 'Experience peace in the hills of Thanchi, Bandarban',
        theme_color: '#1E4D2B',
        background_color: '#F5F1E9',
        display: 'standalone',
        icons: [
          {
            src: '/images/android-chrome-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/images/android-chrome-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,webp}'],
        globIgnores: ['**/cherekhImages/**', '**/CherekhLogoFinal.svg'],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5 MB
        // Don't serve the SPA shell for API routes or static crawler/LLM files
        navigateFallbackDenylist: [/\.txt$/, /\.xml$/, /^\/api\//, /^\/sb\//],
        runtimeCaching: [
          {
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
          {
            urlPattern: ({ url }) => url.pathname.startsWith('/sb/'),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  build: {
    target: 'es2020',
    cssMinify: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return
          if (id.includes('framer-motion')) return 'motion'
          if (
            id.includes('react-router') ||
            id.includes('react-dom') ||
            id.includes('/react/') ||
            id.includes('react-slick') ||
            id.includes('slick-carousel')
          ) {
            return 'vendor-react'
          }
        },
      },
    },
  },
}))
