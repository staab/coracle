import * as path from 'path'
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  build: {
    sourcemap: true,
  },
  resolve: {
    alias: {
      src: path.resolve(__dirname, 'src'),
    }
  },
  plugins: [
    nodePolyfills({
      protocolImports: true,
    }),
    svelte({
      onwarn: (warning, handler) => {
        if (warning.code.startsWith("a11y-")) return
        handler(warning)
      },
    }),
  ],
})
