import { defineConfig } from 'vite';

// Served from https://jakehobbick.github.io/dynamo-town/
export default defineConfig({
  base: './',
  build: { target: 'es2020', outDir: 'dist', assetsInlineLimit: 0, chunkSizeWarningLimit: 900 },
  test: { environment: 'node' },
} as any);
