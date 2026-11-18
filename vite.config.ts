/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';

const version: string = JSON.parse(readFileSync('package.json', 'utf8')).version;
/** Identifiant unique de chaque construction : le jeu le compare à `version.json` pour savoir qu'une nouvelle version est en ligne. */
const build = process.env.BUILD_ID || Date.now().toString(36);

export default defineConfig({
  plugins: [
    tailwindcss(),
    {
      name: 'version-json',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ version, build }) });
      },
    },
  ],
  base: './',
  define: { __BUILD__: JSON.stringify(build) },
  build: { outDir: 'dist', target: 'es2020' },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
