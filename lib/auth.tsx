'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Keeps track of which member of staff is signed in to the
// admin panel, and lets the rest of the panel ask.
//
// IMPORTANT: THIS IS A PRETEND SIGN-IN. No password is checked, nothing is sent
// anywhere, and any email address works. It exists so the panel can move between
// the sign-in screen and the panel itself while the look of it is being built.
// Real sign-in is a backend job and comes later — and for an internal tool that
// can see every customer record on the platform, it needs to be a proper one:
// server-side sessions, and almost certainly a second factor.
//
// ONE FLAT ACCESS LEVEL. There is no permission check anywhere in this file
// because there are no permissions: the admin doc says every admin account can
// see and do everything at MVP. What there IS, on every action, is a written
// record of who did it — see lib/audit.ts. Accountability rather than
// restriction is a deliberate choice for a small team, and the audit log is what
// makes it a choice rather than an oversight.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import storage from '@/lib/storage';
import { signedInStaff } from '@/lib/mock/staff';
import type { AdminStaff } from '@/types';

type SessionValue = {
  staff: AdminStaff | null;
  isSignedIn: boolean;
  // True until we have read back whether somebody was signed in last time. The
  // panel layout uses it to avoid throwing a signed-in person to the sign-in
  // screen for a split second on every page load.
  loading: boolean;
  signIn: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

const SIGNED_IN_KEY = 'sxm.admin.demo-signed-in';

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<AdminStaff | null>(null);
  const [loading, setLoading] = useState(true);

  // Remember across a refresh, so reloading a page during development does not
  // throw you back to the sign-in screen every single time.
  useEffect(() => {
    storage.getItem(SIGNED_IN_KEY).then((flag) => {
      if (flag === 'yes') setStaff(signedInStaff);
      setLoading(false);
    });
  }, []);

  const signIn = useCallback(async (_email: string) => {
    // The email is ignored on purpose. Whoever signs in is treated as the one
    // mock staff member, because there is nothing yet to look a real one up in.
    setStaff(signedInStaff);
    await storage.setItem(SIGNED_IN_KEY, 'yes');
  }, []);

  const signOut = useCallback(async () => {
    setStaff(null);
    await storage.removeItem(SIGNED_IN_KEY);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ staff, isSignedIn: staff !== null, loading, signIn, signOut }),
    [staff, loading, signIn, signOut],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// How any screen finds out who is signed in:
//   const { staff, signOut } = useAdminSession();
export function useAdminSession(): SessionValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error('useAdminSession must be used inside AdminSessionProvider (check app/layout.tsx)');
  }
  return ctx;
}
