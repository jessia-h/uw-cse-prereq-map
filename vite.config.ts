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

  return {
    base: env.BASE_PATH || './',
    plugins: [react()],
    test: {
      include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
    },
  }
})
