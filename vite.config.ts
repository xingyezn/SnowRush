import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base keeps the build portable (local preview + GitHub Pages subpaths).
  base: './',
  build: {
    // Rapier's wasm glue relies on top-level await, which requires a modern target.
    target: 'es2022',
    sourcemap: false,
  },
  optimizeDeps: {
    // Rapier ships wasm-bindgen glue that esbuild's dev pre-bundling corrupts
    // (the wasm instance and its JS bindings end up out of sync). Serve it as-is.
    exclude: ['@dimforge/rapier3d'],
  },
  server: {
    open: false,
  },
});
