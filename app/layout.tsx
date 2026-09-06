// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The outermost wrapper around every screen in the admin
// panel. It loads the stylesheet, sets the browser tab title, and switches on
// the two things every screen needs — who is signed in, and the little pop-up
// messages that confirm an action worked.
//
// THERE IS NO THEME PROVIDER HERE, AND THAT IS THE DESIGN. The customer website
// has one because it offers a light and a dark look and has to remember which
// somebody chose. This panel is dark only, so there is nothing to remember, no
// script to run before the first paint, and no flash of white to prevent. See
// the long note at the top of app/globals.css.
//
// THE PANEL IS NOT INDEXED. It is an internal tool holding customer records, so
// every search engine is told to stay out of it. That is a robots instruction
// rather than a security measure — the real protection is that nothing loads
// without signing in, and eventually that sign-in has to be a real one.

import React from 'react';
import type { Metadata, Viewport } from 'next';
import { Hammersmith_One } from 'next/font/google';
import './globals.css';

// The heading face, downloaded at build time and served from our own domain, so
// no request ever goes to Google when a staff member opens the panel. The same
// face the customer website uses, for the same reason everything else here is
// shared: the two should look like one company.
const headingFont = Hammersmith_One({
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
  variable: '--font-heading',
});

import { AdminSessionProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui';

export const metadata: Metadata = {
  title: {
    default: 'SXM Rentals — Administration Portal',
    template: '%s · SXM Rentals Admin',
  },
  description: 'Internal administration portal for SXM Rentals staff.',
  icons: { icon: '/favicon.png' },
  // Keep it out of every search engine. See the note above.
  robots: { index: false, follow: false, nocache: true },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // Dark only. Told to the browser here as well as in the stylesheet so its own
  // chrome is dark from the very first paint.
  colorScheme: 'dark',
  themeColor: '#0d0f11',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={headingFont.variable}>
      <body>
        <AdminSessionProvider>
          <ToastProvider>{children}</ToastProvider>
        </AdminSessionProvider>
      </body>
    </html>
  );
}
