import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

// Demo mode — `npm run demo`.
//
// Swaps the Supabase client for an in-memory fake so the whole app can be
// clicked through with sample women and sample months, with no database and
// no internet. Nothing here is used by `npm run build`, so the deployed app
// can never accidentally ship the fake.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: /^(.*)\/lib\/supabase$/,
        replacement: path.resolve(__dirname, 'src/lib/supabase.demo.js'),
      },
    ],
  },
})
