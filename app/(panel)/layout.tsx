// SXM Rentals - Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Wraps every screen in the panel in the frame - the
// sidebar, the top bar, and the content area. It also means nothing under here
// draws at all until somebody is signed in; the check itself lives in
// AdminShell, which is where the redirect and the loading state belong.

import React from 'react';
import { AdminShell } from '@/components/layout/AdminShell';

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return <AdminShell>{children}</AdminShell>;
}
