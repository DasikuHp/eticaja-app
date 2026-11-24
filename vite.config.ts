import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  // Rutas relativas: la misma build funciona en la raíz o en GitHub Pages (/eticaja-app/).
  base: './',
  plugins: [react(), tailwindcss()],
  test: { testTimeout: 30000 },
  optimizeDeps: {
    exclude: ['@pdfme/generator', '@pdfme/schemas'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
