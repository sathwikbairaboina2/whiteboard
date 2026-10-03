import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Whiteboard',
        short_name: 'Whiteboard',
        description: 'An offline-first whiteboard. Shapes sync peer to peer and no server holds your data.',
        theme_color: '#f6f5f1',
        background_color: '#f6f5f1',
        display: 'standalone',
        start_url: '/',
        icons: [{ src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/bench/],
      },
    }),
  ],
  build: { rolldownOptions: { input: { main: 'index.html', bench: 'bench.html' } } },
  server: { port: 5410, strictPort: true },
  preview: { port: 5412, strictPort: true },
})
