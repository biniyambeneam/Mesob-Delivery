import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: [
        'apple-touch-icon.png',
        'favicon.svg',
        'mesob-icon-32.png',
        'mesob-icon-192.png',
        'mesob-icon-512.png',
        'mesob-icon-maskable-512.png',
        'mesob-symbol.svg',
      ],
      manifest: {
        name: 'Mesob Delivery',
        short_name: 'Mesob',
        theme_color: '#047857',
        background_color: '#ecfdf5',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/mesob-icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/mesob-icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/mesob-icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      devOptions: {
        enabled: true,
      },
    }),
  ],
});
