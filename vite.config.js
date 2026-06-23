import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Shaders are imported as raw strings via the `?raw` suffix (built into Vite),
// so no extra GLSL plugin is needed.
export default defineConfig({
  // Served from https://<user>.github.io/3d-web-model/ on GitHub Pages, so all
  // asset URLs need this prefix. Use '/' for local user/org pages or a custom domain.
  base: '/3d-web-model/',
  plugins: [react()],
})
