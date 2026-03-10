import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    headers: {
      "Cross-Origin-Opener-Policy": "unsafe-none"
    }
  }
})