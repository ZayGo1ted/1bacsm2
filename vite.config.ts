
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // This allows the @google/genai SDK to access process.env.API_KEY during the build/runtime
    'process.env': process.env
  }
});
