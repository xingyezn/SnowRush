import fs from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Dev-only endpoint so the admin scene editor can persist its tuning to
 * `public/config/scene.json` (which the game loads at startup).
 *   POST /__scene-config  { ...scene overrides... }
 */
function sceneConfigWriter(): Plugin {
  return {
    name: 'snowrush-scene-config',
    configureServer(server) {
      server.middlewares.use('/__scene-config', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('method not allowed');
          return;
        }
        let body = '';
        req.on('data', (chunk) => {
          body += chunk;
        });
        req.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            const file = path.resolve(process.cwd(), 'public/config/scene.json');
            fs.mkdirSync(path.dirname(file), { recursive: true });
            fs.writeFileSync(file, `${JSON.stringify(parsed, null, 2)}\n`);
            res.statusCode = 200;
            res.end('saved');
          } catch {
            res.statusCode = 400;
            res.end('bad json');
          }
        });
      });
    },
  };
}

export default defineConfig({
  // Relative base keeps the build portable (local preview + GitHub Pages subpaths).
  base: './',
  plugins: [sceneConfigWriter()],
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
