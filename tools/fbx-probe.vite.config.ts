import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    ssr: 'tools/fbx-probe.ts',
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
