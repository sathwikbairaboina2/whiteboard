import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 5410, strictPort: true },
  preview: { port: 5412, strictPort: true },
})
