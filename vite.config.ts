import { defineConfig, loadEnv, type Plugin } from 'vite'
import type { OutputChunk } from 'rollup'
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

const isStaffOnlyModule = (id: string | null) =>
  Boolean(id && (id.includes('/src/admin/') || id.includes('/src/pages/Login')))

/** Rollup can merge a lazy admin page into a shared chunk without a facade module. */
const isStaffOnlyChunk = (chunk: OutputChunk | undefined) => {
  if (!chunk) return false
  if (chunk.facadeModuleId) return isStaffOnlyModule(chunk.facadeModuleId)
  return (
    chunk.moduleIds.some(isStaffOnlyModule) &&
    !chunk.moduleIds.some((id) => id.includes('/src/pages/') && !isStaffOnlyModule(id))
  )
}

/**
 * Files reachable from the app entry without entering a lazily loaded admin/login page.
 * Only these are precached, so guests don't download admin code (xlsx, reports…) in the
 * background; staff still load it on demand.
 */
const guestBundleFiles = new Set<string>()

const collectGuestBundle = (): Plugin => ({
  name: 'collect-guest-bundle',
  apply: 'build',
  generateBundle(_options, bundle) {
    guestBundleFiles.clear()
    const chunks = new Map(
      Object.values(bundle)
        .filter((file): file is OutputChunk => file.type === 'chunk')
        .map((chunk) => [chunk.fileName, chunk])
    )
    const pending = [...chunks.values()].filter((chunk) => chunk.isEntry).map((chunk) => chunk.fileName)
    while (pending.length > 0) {
      const fileName = pending.pop()!
      const chunk = chunks.get(fileName)
      if (!chunk || guestBundleFiles.has(fileName)) continue
      guestBundleFiles.add(fileName)
      chunk.viteMetadata?.importedCss.forEach((css) => guestBundleFiles.add(css))
      pending.push(...chunk.imports)
      for (const dynamic of chunk.dynamicImports) {
        if (!isStaffOnlyChunk(chunks.get(dynamic))) pending.push(dynamic)
      }
    }
  },
})

// https://vitejs.dev/config/
export default defineConfig(({ mode, isSsrBuild }) => ({
  server: { proxy: supabaseProxy(mode) },
  preview: { proxy: supabaseProxy(mode) },
  plugins: [
    react(),
    netlifyFunctionsDevPlugin(mode),
    !isSsrBuild && collectGuestBundle(),
    !isSsrBuild &&
    VitePWA({
      registerType: 'autoUpdate',
      minify: true,
      includeAssets: ['favicon.ico', 'robots.txt', 'sitemap.xml', 'llms.txt'],
      includeManifestIcons: false,
      manifest: {
        name: 'Cherekh Center - Thanchi, Bandarban',
        short_name: 'Cherekh Center',
        description: 'Experience peace in the hills of Thanchi, Bandarban',
        theme_color: '#1E4D2B',
        background_color: '#FFFFFF',
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
        // Large images load on demand (and are HTTP-cached) instead of being precached for every visitor.
        globIgnores: [
          '**/cherekhImages/**',
          '**/video/**',
          '**/CherekhLogoFinal.*',
          '**/android-chrome-512x512.png',
          '**/about-banner-enhanced.png',
        ],
        manifestTransforms: [
          async (entries) => ({
            manifest: entries.filter(
              (entry) =>
                guestBundleFiles.size === 0 ||
                !entry.url.startsWith('assets/') ||
                guestBundleFiles.has(entry.url)
            ),
            warnings: [],
          }),
        ],
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
    target: isSsrBuild ? 'node20' : 'es2020',
    copyPublicDir: !isSsrBuild,
    cssMinify: true,
    rollupOptions: {
      output: isSsrBuild ? {} : {
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
