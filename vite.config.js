import { defineConfig } from 'vite' // <--- THIS WAS MISSING
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // Use root for Firebase Hosting
    base: '/', 
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "unsafe-none"
      }
    }
  }
})