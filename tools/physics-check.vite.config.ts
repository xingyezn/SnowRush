import { defineConfig } from 'vite';

/**
 * Bundles tools/physics-check.ts for Node so Rapier's wasm is inlined and the
 * check runs without a browser.
 */
export default defineConfig({
  build: {
    ssr: 'tools/physics-check.ts',
    outDir: 'tools/out',
    emptyOutDir: true,
    target: 'esnext',
    minify: false,
    assetsInlineLimit: 100000000,
  },
  ssr: {
    noExternal: true,
  },
});
