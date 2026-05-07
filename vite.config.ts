import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    exclude: ['@pdfme/generator', '@pdfme/ui', '@pdfme/schemas'],
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
})
