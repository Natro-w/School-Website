import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';
import fs from 'fs';

import { backendServerPlugin } from './vite-plugin-backend';

import { miaodaDevPlugin } from "miaoda-sc-plugin";

// https://vite.dev/config/
export default defineConfig({
  plugins: [backendServerPlugin(), react(), svgr({
      svgrOptions: {
        icon: true, exportType: 'named', namedExport: 'ReactComponent', }, }), miaodaDevPlugin()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'ui-vendor': ['lucide-react', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    https:
      fs.existsSync('./cert.pem') && fs.existsSync('./key.pem')
        ? {
            key: fs.readFileSync('./key.pem'),
            cert: fs.readFileSync('./cert.pem'),
          }
        : undefined,
    allowedHosts: ['iq.promag.space', 'localhost', '127.0.0.1', '0.0.0.0'],
    proxy: {
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5173,
    host: '0.0.0.0',
    https:
      fs.existsSync('./cert.pem') && fs.existsSync('./key.pem')
        ? {
            key: fs.readFileSync('./key.pem'),
            cert: fs.readFileSync('./cert.pem'),
          }
        : undefined,
    allowedHosts: ['iq.promag.space', 'localhost', '127.0.0.1', '0.0.0.0'],
    proxy: {
      '/api': {
        target: 'http://localhost:8083',
        changeOrigin: true,
      },
    },
  },
});
