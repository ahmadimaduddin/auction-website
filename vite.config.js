import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // If we are in 'production' (building for GitHub), use the path. 
    // If we are in 'development' (running npm run dev), use root.
    base: mode === 'production' ? '/auction-website/' : '/',
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "unsafe-none"
      }
    }
  }
})