import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'dashboard-logo.png', 'dashboard.ico', 'robots.txt'],
      manifest: {
        name: 'Korum - Gestión Docente',
        short_name: 'Korum',
        description: 'Suite de Gestión Docente, Cátedras, Asistencia y Calificaciones',
        start_url: '/',
        display: 'standalone',
        background_color: '#0F172A',
        theme_color: '#10B981',
        icons: [
          {
            src: '/dashboard-logo.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/dashboard-logo.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/dashboard-logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}']
      }
    })
  ],
  server: {
    port: 5173,
    host: true
  },
  build: {
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-charts': ['recharts'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-excel': ['xlsx'],
          'vendor-forms': ['react-hook-form', 'zod'],
          'vendor-dates': ['date-fns'],
          'vendor-table': ['@tanstack/react-table'],
          'vendor-radix': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tooltip']
        }
      }
    }
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['node_modules/**', '.agent/**', 'dist/**']
  }
});
