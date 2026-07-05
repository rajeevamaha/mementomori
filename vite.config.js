import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The web app talks to the local Claude proxy (server/index.mjs) under /api.
// Vite proxies those calls to the Express server so the API key never reaches
// the browser.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
        // Forward the original host so the API can build correct absolute URLs
        // (the Google OAuth redirect_uri must point back at :5174, not :8787).
        xfwd: true,
      },
    },
  },
})
