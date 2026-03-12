import { defineConfig } from 'vite'; // <--- THIS LINE IS MISSING
import react from '@vitejs/plugin-react-swc';

export default defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    // Use './' for HashRouter compatibility on GitHub Pages
    base: './', 
    server: {
      headers: {
        "Cross-Origin-Opener-Policy": "unsafe-none"
      }
    }
  };
});