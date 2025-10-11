import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  outDir: 'dist',
  format: ['esm'],
  target: 'node18',
  bundle: true,
  minify: false,
  sourcemap: false,
  clean: true,
  dts: false,
  platform: 'node',
  splitting: false,
  external: [
    'selenium-webdriver'
  ],
  noExternal: [
    '@modelcontextprotocol/sdk',
    'zod',
    'dotenv'
  ],
  onSuccess: 'echo "✅ Build completed successfully!"'
});
