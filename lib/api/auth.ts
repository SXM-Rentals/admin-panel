// SXM Rentals — Created by Giordano Bertin-Maurice
// Copyright (c) 2026 Giordano Bertin-Maurice. All rights reserved.
// WHAT THIS FILE DOES: The five requests that make up signing in and signing
// out. It knows the order they happen in; lib/auth.tsx knows what the panel does
// about each answer.
//
// SIGNING IN TAKES TWO STEPS AND THERE IS NO WAY ROUND IT. Sending the right
// password does NOT sign anybody in. It gets a session that is only allowed to
// do one thing: finish signing in. The second step — a six-digit code from an
// authenticator app — is what turns it into a real one. A panel that can see
// every customer record on the platform is not something a stolen password
// should be enough to open.
//
// WHAT THE COOKIE DOES, AND WHY NOTHING HERE HANDLES IT: the server sets a
// cookie the browser will not let any code read, including ours. That is the
// point of it — a password kept in the page can be stolen by anything that gets
// a script onto the page, and a cookie like this cannot. So none of the
// functions below return a token and none of them take one. The browser carries
// it, invisibly, and the panel simply asks who it belongs to.

import { api } from './http';
import type { AdminStaff } from '@/types';

// What the server says to do next once a password has been accepted. Somebody
// signing in for the first time has no authenticator app set up yet, so they are
// sent to set one up; everybody else is asked straight for a code.
export type NextStep = 'enroll' | 'code';

// ---- WHO IS SIGNED IN ----
// The panel asks this on every load. It is the only thing that decides whether
// somebody is signed in — not anything remembered in the browser, which could
// disagree with the cookie and would then be a lie about something that matters.
//
// Being told "nobody" is an ordinary answer here rather than a session that has
// just ended, which is why it is asked for in a way that does not set off the
// panel's "you have been signed out" handling.
export async function fetchSignedInStaff(): Promise<AdminStaff | null> {
  try {
    return await api.get<AdminStaff>('/admin/me', { expectUnauthorized: true });
  } catch (caught) {
    if (isUnauthorized(caught)) return null;
    throw caught;
  }
}

// ---- STEP ONE: THE PASSWORD ----
// Sets the cookie, and returns what has to happen before it means anything.
export async function signInWithPassword(
  email: string,
  password: string,
): Promise<{ next: NextStep; expiresAt: string }> {
  return api.post<{ next: NextStep; expiresAt: string }>('/admin/auth/login', {
    body: { email, password },
    expectUnauthorized: true,
  });
}

// ---- STEP TWO, FIRST TIME ONLY: SETTING UP THE APP ----
// Handed back once and never again. The otpauthUrl is what the QR code is made
// from; the secret is the same thing written out, for somebody typing it into an
// authenticator by hand because they cannot photograph a screen.
export async function startMfaEnrolment(): Promise<{ secret: string; otpauthUrl: string }> {
  return api.post<{ secret: string; otpauthUrl: string }>('/admin/auth/mfa/enroll', {
    expectUnauthorized: true,
  });
}

// ---- STEP TWO: THE CODE ----
// The only call that actually signs anybody in.
export async function verifyMfaCode(
  code: string,
): Promise<{ staff: AdminStaff; expiresAt: string }> {
  return api.post<{ staff: AdminStaff; expiresAt: string }>('/admin/auth/mfa/verify', {
    body: { code },
    expectUnauthorized: true,
  });
}

// ---- SIGNING OUT ----
// Also used to throw away a half-finished sign-in — somebody who typed their
// password and then went back rather than entering a code should not be left
// holding a session that is waiting for one.
export async function signOutFromServer(): Promise<void> {
  await api.post<void>('/admin/auth/logout', { expectUnauthorized: true });
}

function isUnauthorized(caught: unknown): boolean {
  return (
    typeof caught === 'object' &&
    caught !== null &&
    'status' in caught &&
    (caught as { status: unknown }).status === 401
  );
}
