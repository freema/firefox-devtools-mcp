import { readFileSync } from 'fs';
import { defineConfig, type Options } from 'tsup';

const { name, version } = JSON.parse(readFileSync('./package.json', 'utf8'));

export const nodeConfig = {
  entry: { index: 'src/index.public.ts' },
  outDir: 'dist',
  format: ['esm'],
  target: 'node20',
  bundle: true,
  minify: false,
  sourcemap: false,
  clean: true,
  dts: false,
  platform: 'node',
  splitting: false,
  external: ['selenium-webdriver'],
  noExternal: ['@modelcontextprotocol/sdk', 'zod', 'dotenv'],
  define: {
    __SERVER_NAME__: JSON.stringify(name),
    __SERVER_VERSION__: JSON.stringify(version),
  },
} satisfies Options;

export const browserConfig = {
  entry: { 'snapshot.injected': 'src/firefox/snapshot/injected/snapshot.injected.ts' },
  outDir: 'dist',
  format: ['iife'],
  target: 'es2020',
  bundle: true,
  minify: true,
  sourcemap: false,
  clean: false,
  dts: false,
  platform: 'browser',
  globalName: '__SnapshotInjected',
  onSuccess: 'echo "Build completed successfully!"',
} satisfies Options;

export default defineConfig([nodeConfig, browserConfig]);
