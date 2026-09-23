import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'airgap-cdn-sanitizer',
      transform(code) {
        if (code && code.includes('cdn.jsdelivr.net')) {
          return {
            code: code.replace(/https?:\/\/cdn\.jsdelivr\.net[^\s"']*/g, '/local/transcoders'),
            map: null,
          };
        }
      },
    },
  ],
  base: './',
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy) => {
          proxy.on('error', (err, req, res) => {
            if (res && !res.headersSent && res.writeHead) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ error: 'BACKEND_OFFLINE_LOCAL_FALLBACK_ACTIVE' }));
            }
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false,
    emptyOutDir: true,
    target: 'es2020',
  },
});
