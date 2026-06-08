import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'
import { fileURLToPath } from 'url'

export default defineConfig({
  plugins: [vue(), tailwindcss(), cssInjectedByJs()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src/webview', import.meta.url)),
    },
  },
  build: {
    lib: {
      entry: 'src/webview/main.ts',
      formats: ['iife'],
      name: 'HolziApp',
      fileName: () => 'main.js',
    },
    outDir: 'out/webview',
    emptyOutDir: true,
    cssCodeSplit: false,
  },
})
