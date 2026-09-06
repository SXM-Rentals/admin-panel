// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Renders a component in a test the way the panel renders
// it — inside the providers it expects to find above it.
//
// WHY IT EXISTS. Several components ask who is signed in, or raise a little
// confirmation message. Rendered bare in a test those throw "useAdminSession
// must be used inside AdminSessionProvider" — which is the provider doing
// exactly its job, and a useless failure to read when what you were testing was
// a total.
//
// So tests use renderWithProviders() instead of render(). Wrapping more than a
// component strictly needs is deliberate: a test should fail because the
// component is wrong, not because the test forgot a provider.
//
// THE CUSTOMER WEBSITE'S VERSION OF THIS FILE ALSO WRAPS A THEME PROVIDER AND A
// LANGUAGE PROVIDER. This panel has neither — it is dark only and English only —
// so there are two fewer layers here. See app/globals.css.

import React from 'react';
import { render, type RenderOptions } from '@testing-library/react';
import { AdminSessionProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui';

function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      <ToastProvider>{children}</ToastProvider>
    </AdminSessionProvider>
  );
}

export function renderWithProviders(
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: Providers, ...options });
}

// Re-exported so a test file needs one import rather than two.
export * from '@testing-library/react';
export { renderWithProviders as render };
