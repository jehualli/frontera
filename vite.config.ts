import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { port: 5173, open: true },
  build: {
    target: 'es2022',
    // Phaser is big; keep it in its own chunk so game code reloads cheaply.
    rollupOptions: {
      output: {
        manualChunks: (id: string) =>
          id.includes('node_modules/phaser') ? 'phaser' : undefined,
      },
    },
  },
});
