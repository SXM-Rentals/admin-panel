// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The frame around the sign-in and forgotten-password
// screens. Deliberately almost nothing: no sidebar, no top bar, no search.
//
// WHY THEY GET THEIR OWN FRAME: somebody who is not signed in has no bookings to
// look at, no queue to work through, and nothing to search. A sidebar full of
// links to screens they cannot open would be both confusing and slightly rude.
// The panel's frame lives in app/(panel)/layout.tsx and starts after sign-in.

import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
