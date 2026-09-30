import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// three.js only enters through the lazily imported hero scene, so it lands in
// its own chunk and the page paints before the 3D scene loads.
export default defineConfig({
  plugins: [react()],
  build: { target: 'es2022', chunkSizeWarningLimit: 1000 },
});
