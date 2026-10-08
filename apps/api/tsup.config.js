import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['server.js'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  platform: 'node',
  bundle: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  // Todo lo que NO queremos empaquetar (van como dependencias)
  external: [
    '@prisma/client',
    '@prisma/adapter-pg',
    'pg',
    'resend',
    'react',
    'react-email',
    'express',
    'bcryptjs',
    // ... opcionalmente todo el node_modules
  ],
  // tsup transpila JSX automáticamente con el runtime automático
  esbuildOptions(options) {
    options.jsx = 'automatic';
    options.resolveExtensions = ['.js', '.jsx', '.ts', '.tsx','.json'];
  },
});