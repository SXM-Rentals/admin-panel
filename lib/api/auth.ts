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
import type { AdminStaff, AdminTier } from '@/types';

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
//
// THE ANSWER HAS NO INITIALS IN IT. The server's "who am I" sends the id, the
// name and the email and nothing else — unlike the sign-in step, which also
// sends the two letters shown in the corner of the top bar. So after any page
// refresh those letters would simply be missing. They are worked out here from
// the name, the same way the server works them out when it creates an account,
// so the corner looks the same however somebody arrived.
//
// IT ALSO SAYS WHAT THIS ACCOUNT MAY DO — its tier — so the panel can grey out
// what this person cannot use and say why. The server checks it again on every
// request; see lib/tiers.ts.
//
// IT ALSO SAYS WHETHER THEY MUST SET THEIR OWN PASSWORD FIRST. An account made
// or reset from the Staff screen starts with a temporary password somebody
// else chose, and nothing else can be done until its owner replaces it. A
// server that predates staff accounts does not send this at all, which means
// nobody there has to.
export type SignedIn = { staff: AdminStaff; mustChangePassword: boolean };

export async function fetchSignedInStaff(): Promise<SignedIn | null> {
  try {
    const me = await api.get<{
      id: string;
      name: string;
      email: string;
      avatarInitials?: string;
      mustChangePassword?: boolean;
      tier?: AdminTier;
    }>('/admin/me', { expectUnauthorized: true });
    return {
      staff: {
        id: me.id,
        name: me.name,
        email: me.email,
        avatarInitials: me.avatarInitials ?? initialsFor(me.name),
        // What this account may do. Left out by a server from before tiers, and
        // the panel treats that as "nothing it knows to grey out".
        tier: me.tier,
      },
      mustChangePassword: me.mustChangePassword === true,
    };
  } catch (caught) {
    if (isUnauthorized(caught)) return null;
    throw caught;
  }
}

// "Gio Bertin-Maurice" → "GB". The first letter of the first two words; two
// question marks if there is nothing to go on, which is what the server does too.
export function initialsFor(name: string): string {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
  return letters || '??';
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
): Promise<{ staff: AdminStaff; expiresAt: string; mustChangePassword?: boolean }> {
  return api.post<{ staff: AdminStaff; expiresAt: string; mustChangePassword?: boolean }>(
    '/admin/auth/mfa/verify',
    { body: { code }, expectUnauthorized: true },
  );
}

// ---- CHANGING YOUR OWN PASSWORD ----
// Needs the current one, however the person came to be signed in: a session
// left open on a shared machine should not be enough to take over the account.
// On success the server signs this account out everywhere else, and this
// session carries on.
//
// A WRONG CURRENT PASSWORD IS NOT A SIGNED-OUT SESSION. The server answers it
// with a 400, not a 401, precisely so this call does not set off the panel's
// "your session has ended" handling — a typo here should say "that is not your
// current password" and nothing more. A genuine 401 still means what it always
// means, which is why this is NOT asked for as expecting one.
export async function changeOwnPassword(currentPassword: string, newPassword: string): Promise<void> {
  await api.post<void>('/admin/auth/password', { body: { currentPassword, newPassword } });
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
