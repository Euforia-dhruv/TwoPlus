import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  // Without an explicit cssTarget the minifier collapses each backdrop-filter
  // pair down to the -webkit- prefix alone, which Firefox does not support.
  build: { cssTarget: "safari13" },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
})