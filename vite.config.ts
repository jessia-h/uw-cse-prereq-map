/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // BASE_PATH is the one place the site's URL prefix is set. The default "./"
  // emits relative asset URLs, so the build works from any folder. Set it
  // (e.g. BASE_PATH=/cse-prereq-map/) in .env.local or the shell if a host
  // needs an absolute prefix.
  const env = loadEnv(mode, process.cwd(), '')

  // `vite build --mode wordpress`: one self-contained script (no imports, no
  // asset files) plus one CSS file, for scripts/build-wordpress.ts to wrap
  // into a block that can be pasted into a WordPress page.
  if (mode === 'wordpress') {
    return {
      plugins: [react()],
      publicDir: false,
      define: { 'process.env.NODE_ENV': JSON.stringify('production') },
      build: {
        outDir: 'dist-wordpress/build',
        emptyOutDir: true,
        minify: true,
        cssMinify: true,
        lib: {
          entry: 'src/wordpress.tsx',
          formats: ['iife'],
          name: 'CsePrereqMap',
          fileName: () => 'map.js',
          cssFileName: 'map',
        },
      },
    }
  }

  return {
    base: env.BASE_PATH || './',
    plugins: [react()],
    test: {
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx', 'scripts/**/*.test.ts'],
    },
  }
})
