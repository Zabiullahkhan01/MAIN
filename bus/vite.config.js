import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  server: {
    allowedHosts: ['e648-2401-4900-503e-8b59-294e-2eaa-3aee-83b8.ngrok-free.app'],
  },
  plugins: [react()],
})
