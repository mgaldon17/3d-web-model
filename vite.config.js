import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Shaders are imported as raw strings via the `?raw` suffix (built into Vite),
// so no extra GLSL plugin is needed.
export default defineConfig({
  plugins: [react()],
})
