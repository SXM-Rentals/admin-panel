// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Sets up the test runner. It tells Vitest how to
// understand the same things Next.js understands — the "@/" shorthand in import
// lines, JSX, and CSS Module files — so a test can load a real component from
// the app rather than a stripped-down copy of it.
//
// WHY THE TESTS PRETEND TO BE A BROWSER ("jsdom"): most of what is worth testing
// here only happens in a browser — a component rendering, a button being
// clicked, a total appearing on screen. jsdom is a stand-in for a browser that
// runs in the terminal, so those tests can run in a second without opening one.
//
// WHY CSS IS SWITCHED OFF (css: false): the tests check behaviour and wording,
// never colour or spacing, and CSS Modules hand back made-up class names under
// test anyway. Processing the stylesheets would slow every run down for nothing.
//
// TO RUN THEM: npm test (once) or npm run test:watch (re-runs as files change).

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  // vite-tsconfig-paths reads tsconfig.json, so "@/lib/format" resolves in a
  // test exactly as it does in the app. Without it every test would need a
  // fragile "../../../lib/format" instead.
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    css: false,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx}'],
    // .next holds Next.js's own build output; node_modules holds other people's
    // tests. Neither is ours to run.
    exclude: ['node_modules/**', '.next/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['components/**', 'lib/**', 'hooks/**'],
      // Mock data is a pile of constants — there is no behaviour in it to cover,
      // and counting it would make the percentage meaningless.
      exclude: ['lib/mock/**', '**/*.d.ts'],
    },
  },
});
