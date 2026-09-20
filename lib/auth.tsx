'use client';

// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: Keeps track of which member of staff is signed in to the
// admin panel, and lets the rest of the panel ask.
//
// THE SERVER IS THE ONLY THING THAT KNOWS. The panel used to remember "somebody
// signed in" in the browser's own storage. That has been removed rather than
// updated, and the distinction matters: a note in the browser saying you are
// signed in is something anybody can write for themselves, and it can disagree
// with the truth. When it does, the panel shows a screen full of customer
// records that every request behind it is quietly refusing to load. So there is
// now exactly one answer to "who is signed in", and it comes from asking the
// server.
//
// ONE FLAT ACCESS LEVEL. There is no permission check anywhere in this file
// because there are no permissions: every admin account can see and do
// everything at MVP. What there IS, on every action, is a written record of who
// did it and why. Accountability rather than restriction is a deliberate choice
// for a small team, and the audit log is what makes it a choice rather than an
// oversight.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  fetchSignedInStaff,
  signInWithPassword,
  signOutFromServer,
  startMfaEnrolment,
  verifyMfaCode,
  type NextStep,
} from '@/lib/api/auth';
import { setSessionLostHandler } from '@/lib/api/http';
import type { AdminStaff } from '@/types';

// Where the session currently stands.
//
// "unreachable" earns its place. If the server cannot be reached at all, falling
// through to the sign-in screen would be a lie — it invites somebody to type a
// password into a panel that is going to refuse it whatever they type. Saying
// plainly that we cannot reach SXM Rentals, with a way to try again, is the
// honest answer and a different one.
//
// "locked" is a session that ended while somebody was still working. It keeps
// the staff member on record on purpose, so the panel behind it stays exactly
// where it was and whatever they had typed is still there when they come back.
export type SessionPhase = 'checking' | 'unreachable' | 'signed-out' | 'signed-in' | 'locked';

type SessionValue = {
  staff: AdminStaff | null;
  isSignedIn: boolean;
  // True until we have asked the server who is signed in. The panel layout uses
  // it to avoid throwing a signed-in person to the sign-in screen for a split
  // second on every page load.
  loading: boolean;
  phase: SessionPhase;

  // ---- SIGNING IN, IN TWO STEPS ----
  // The password alone does not sign anybody in; see lib/api/auth.ts. It answers
  // with what has to happen next.
  signIn: (email: string, password: string) => Promise<NextStep>;
  // First time only: sets up the authenticator app.
  enrol: () => Promise<{ secret: string; otpauthUrl: string }>;
  // The step that actually signs somebody in.
  verifyCode: (code: string) => Promise<void>;

  signOut: () => Promise<void>;
  // Ask the server again after it could not be reached.
  recheck: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function AdminSessionProvider({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<AdminStaff | null>(null);
  const [phase, setPhase] = useState<SessionPhase>('checking');

  const check = useCallback(async () => {
    setPhase('checking');
    try {
      const found = await fetchSignedInStaff();
      setStaff(found);
      setPhase(found ? 'signed-in' : 'signed-out');
    } catch {
      // Could not reach the server at all. Deliberately NOT treated as signed
      // out — see the note on SessionPhase above.
      setStaff(null);
      setPhase('unreachable');
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  // ---- WHEN A SESSION ENDS MID-JOB ----
  // Sessions end after half an hour of sitting still, so this is ordinary rather
  // than rare. Anywhere in the panel a request is refused for that reason,
  // lib/api/http.ts calls this.
  //
  // IT DELIBERATELY DOES NOT NAVIGATE ANYWHERE. Sending somebody to the sign-in
  // screen would throw away the screen they were on and, with it, the reason
  // they had half-written into a dialog — and the reason box asks for a sentence,
  // so that is a real loss rather than a theoretical one. Instead the panel stays
  // exactly where it is and a sign-in appears over the top of it.
  useEffect(() => {
    setSessionLostHandler(() => {
      setPhase((current) => (current === 'signed-in' ? 'locked' : current));
    });
    return () => setSessionLostHandler(null);
  }, []);

  const signIn = useCallback(async (email: string, password: string): Promise<NextStep> => {
    const { next } = await signInWithPassword(email, password);
    return next;
  }, []);

  const enrol = useCallback(() => startMfaEnrolment(), []);

  const verifyCode = useCallback(async (code: string) => {
    const { staff: signedIn } = await verifyMfaCode(code);
    setStaff(signedIn);
    setPhase('signed-in');
  }, []);

  const signOut = useCallback(async () => {
    try {
      await signOutFromServer();
    } catch {
      // If the server cannot be told, the session is still over as far as this
      // panel is concerned. Leaving somebody apparently signed in because the
      // sign-out request failed is the wrong way round.
    }
    setStaff(null);
    setPhase('signed-out');
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      staff,
      // Still counted as signed in while locked, so the panel behind the
      // sign-in stays mounted and nothing typed is lost.
      isSignedIn: phase === 'signed-in' || phase === 'locked',
      loading: phase === 'checking',
      phase,
      signIn,
      enrol,
      verifyCode,
      signOut,
      recheck: () => void check(),
    }),
    [staff, phase, signIn, enrol, verifyCode, signOut, check],
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
